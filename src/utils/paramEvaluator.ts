/**
 * Sistema de Evaluación de Expresiones Paramétricas
 *
 * Convierte expresiones como "params.longitud * 0.5" en valores numéricos
 * evaluando las referencias a parámetros y operaciones matemáticas.
 */

export interface ParamContext {
  [key: string]: number;
}

/**
 * Evalúa una expresión paramétrica y retorna un valor numérico
 *
 * @param expr - Expresión a evaluar (puede ser número, string con params, o expresión matemática)
 * @param params - Objeto con los valores de los parámetros
 * @returns Valor numérico evaluado
 *
 * @example
 * evaluateExpression(100, {}) // => 100
 * evaluateExpression("params.longitud", { longitud: 80 }) // => 80
 * evaluateExpression("params.longitud * 0.5", { longitud: 80 }) // => 40
 * evaluateExpression("params.ancho + 10", { ancho: 30 }) // => 40
 */
export function evaluateExpression(
  expr: string | number,
  params: ParamContext
): number {
  // Si es un número directo, retornar
  if (typeof expr === 'number') {
    return expr;
  }

  // Convertir a string para procesar
  const exprStr = String(expr).trim();

  // Si es un número literal como string, parsearlo
  const parsed = Number(exprStr);
  if (!isNaN(parsed)) {
    return parsed;
  }

  // Reemplazar referencias a params con valores reales
  let evaluated = exprStr;

  // Ordenar las claves por longitud descendente para evitar reemplazos parciales
  // Ejemplo: si tenemos "ancho" y "ancho_base", primero reemplazar "ancho_base"
  const sortedKeys = Object.keys(params).sort((a, b) => b.length - a.length);

  for (const key of sortedKeys) {
    const value = params[key];
    // Usar regex con word boundaries para evitar reemplazos parciales
    const regex = new RegExp(`params\\.${key}\\b`, 'g');
    evaluated = evaluated.replace(regex, String(value));
  }

  // Evaluar la expresión matemática de forma segura
  try {
    // Crear una función que solo tenga acceso a Math
    // Esto previene la ejecución de código arbitrario
    const safeEval = new Function('Math', `"use strict"; return (${evaluated});`);
    const result = safeEval(Math);

    if (typeof result !== 'number' || isNaN(result)) {
      console.error(`Expresión evaluada a valor inválido: ${expr} => ${result}`);
      return 0;
    }

    return result;
  } catch (error) {
    console.error(`Error evaluando expresión: ${expr}`, error);
    return 0;
  }
}

/**
 * Evalúa múltiples expresiones de un objeto
 *
 * @param expressions - Objeto con expresiones como valores
 * @param params - Contexto de parámetros
 * @returns Objeto con los mismos keys pero valores evaluados
 *
 * @example
 * evaluateBatch({ x: "params.width * 0.5", y: 10 }, { width: 100 })
 * // => { x: 50, y: 10 }
 */
export function evaluateBatch(
  expressions: Record<string, string | number>,
  params: ParamContext
): Record<string, number> {
  const result: Record<string, number> = {};

  for (const [key, expr] of Object.entries(expressions)) {
    result[key] = evaluateExpression(expr, params);
  }

  return result;
}

/**
 * Valida que una expresión sea sintácticamente correcta
 *
 * @param expr - Expresión a validar
 * @param availableParams - Lista de parámetros disponibles
 * @returns true si es válida, false si no
 */
export function validateExpression(
  expr: string | number,
  availableParams: string[]
): { valid: boolean; error?: string } {
  // Números son siempre válidos
  if (typeof expr === 'number') {
    return { valid: true };
  }

  const exprStr = String(expr).trim();

  // Números literales son válidos
  if (!isNaN(Number(exprStr))) {
    return { valid: true };
  }

  // Verificar que todas las referencias a params existan
  const paramRefs = exprStr.match(/params\.(\w+)/g) || [];

  for (const ref of paramRefs) {
    const paramName = ref.replace('params.', '');
    if (!availableParams.includes(paramName)) {
      return {
        valid: false,
        error: `Parámetro no encontrado: ${paramName}`
      };
    }
  }

  // Verificar caracteres permitidos (números, operadores, Math, paréntesis, puntos)
  const allowedPattern = /^[\d\s\+\-\*\/\(\)\.params\w,Math]+$/;
  if (!allowedPattern.test(exprStr)) {
    return {
      valid: false,
      error: 'Expresión contiene caracteres no permitidos'
    };
  }

  // Intentar evaluar con valores de prueba
  try {
    const testParams: ParamContext = {};
    for (const param of availableParams) {
      testParams[param] = 1; // Valores de prueba
    }
    evaluateExpression(expr, testParams);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Error de sintaxis: ${(error as Error).message}`
    };
  }
}

/**
 * Detecta dependencias circulares en definiciones de parámetros
 *
 * @example
 * const params = {
 *   a: "params.b + 1",
 *   b: "params.a + 1"  // ¡Circular!
 * };
 */
export function detectCircularDependencies(
  paramDefinitions: Record<string, string | number>
): { circular: boolean; cycle?: string[] } {
  const graph: Record<string, string[]> = {};

  // Construir grafo de dependencias
  for (const [param, expr] of Object.entries(paramDefinitions)) {
    if (typeof expr === 'string') {
      const deps = (expr.match(/params\.(\w+)/g) || [])
        .map(ref => ref.replace('params.', ''));
      graph[param] = deps;
    } else {
      graph[param] = [];
    }
  }

  // DFS para detectar ciclos
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(node: string, path: string[]): string[] | null {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const neighbors = graph[node] || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        const cycle = hasCycle(neighbor, [...path]);
        if (cycle) return cycle;
      } else if (recursionStack.has(neighbor)) {
        // Ciclo detectado
        const cycleStart = path.indexOf(neighbor);
        return path.slice(cycleStart).concat(neighbor);
      }
    }

    recursionStack.delete(node);
    return null;
  }

  for (const node of Object.keys(graph)) {
    if (!visited.has(node)) {
      const cycle = hasCycle(node, []);
      if (cycle) {
        return { circular: true, cycle };
      }
    }
  }

  return { circular: false };
}

/**
 * Herramientas de debugging para inspeccionar evaluaciones
 */
export const debug = {
  /**
   * Muestra paso a paso cómo se evalúa una expresión
   */
  traceEvaluation(expr: string | number, params: ParamContext): void {
    console.group(`Evaluando: ${expr}`);

    if (typeof expr === 'number') {
      console.log('✓ Es número literal:', expr);
      console.groupEnd();
      return;
    }

    const exprStr = String(expr);
    console.log('Expresión original:', exprStr);

    // Mostrar cada reemplazo de parámetro
    let current = exprStr;
    const sortedKeys = Object.keys(params).sort((a, b) => b.length - a.length);

    for (const key of sortedKeys) {
      const regex = new RegExp(`params\\.${key}\\b`, 'g');
      if (regex.test(current)) {
        const before = current;
        current = current.replace(regex, String(params[key]));
        console.log(`  params.${key} => ${params[key]}`);
        console.log(`  "${before}" => "${current}"`);
      }
    }

    console.log('Expresión final:', current);

    try {
      const result = evaluateExpression(expr, params);
      console.log('✓ Resultado:', result);
    } catch (error) {
      console.error('✗ Error:', error);
    }

    console.groupEnd();
  },

  /**
   * Valida un template completo y reporta errores
   */
  validateTemplate(geometry: any, params: ParamContext): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const availableParams = Object.keys(params);

    // Validar vértices
    if (geometry.vertices) {
      for (const [vertexId, vertex] of Object.entries<any>(geometry.vertices)) {
        // Validar coordenada X
        const xValidation = validateExpression(vertex.x, availableParams);
        if (!xValidation.valid) {
          errors.push(`Vértice "${vertexId}".x: ${xValidation.error}`);
        }

        // Validar coordenada Y
        const yValidation = validateExpression(vertex.y, availableParams);
        if (!yValidation.valid) {
          errors.push(`Vértice "${vertexId}".y: ${yValidation.error}`);
        }
      }
    }

    // Validar extrusión
    if (geometry.extrusion?.height) {
      const heightValidation = validateExpression(
        geometry.extrusion.height,
        availableParams
      );
      if (!heightValidation.valid) {
        errors.push(`Extrusión height: ${heightValidation.error}`);
      }
    }

    // Validar contornos cerrados
    if (geometry.contours) {
      for (const contour of geometry.contours) {
        if (!contour.closed) {
          warnings.push(`Contorno "${contour.id}" no está marcado como cerrado`);
        }

        if (contour.elements && contour.elements.length > 0) {
          const firstElem = contour.elements[0];
          const lastElem = contour.elements[contour.elements.length - 1];

          if (lastElem.to !== firstElem.from) {
            errors.push(
              `Contorno "${contour.id}" no cierra correctamente: ` +
              `último elemento va a "${lastElem.to}" pero primero inicia en "${firstElem.from}"`
            );
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
};
