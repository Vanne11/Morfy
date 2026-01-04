/**
 * Motor de Extrusión SVG → Three.js
 *
 * Convierte geometría definida en JSON (vértices, paths, contornos)
 * a geometría 3D de Three.js mediante extrusión.
 */

import { Shape, ExtrudeGeometry } from 'three';
import type { ExtrudeGeometryOptions } from 'three';
import { evaluateExpression } from './paramEvaluator';
import type { ParamContext } from './paramEvaluator';

/**
 * Tipos para la definición de geometría SVG paramétrica
 */
export interface VertexDefinition {
  x: string | number;
  y: string | number;
}

export interface LineElement {
  type: 'line';
  from: string;
  to: string;
}

export interface ArcElement {
  type: 'arc';
  from: string;
  to: string;
  radius: string | number;
  clockwise?: boolean;
}

export interface BezierQuadraticElement {
  type: 'bezier_quadratic';
  from: string;
  to: string;
  control: string;
}

export interface BezierCubicElement {
  type: 'bezier_cubic';
  from: string;
  to: string;
  control1: string;
  control2: string;
}

export type PathElement =
  | LineElement
  | ArcElement
  | BezierQuadraticElement
  | BezierCubicElement;

export interface Contour {
  id: string;
  type: 'outer' | 'hole';
  closed: boolean;
  elements: PathElement[];
}

export interface ExtrusionSettings {
  height: string | number;
  bevel?: boolean;
  bevelThickness?: number;
  bevelSize?: number;
  bevelSegments?: number;
  curveSegments?: number;
  steps?: number;
}

export interface SVGGeometryDefinition {
  vertices: Record<string, VertexDefinition>;
  contours: Contour[];
  extrusion: ExtrusionSettings;
}

/**
 * Punto 2D evaluado (con valores numéricos)
 */
interface EvaluatedVertex {
  x: number;
  y: number;
}

/**
 * Evalúa todos los vértices de la definición
 */
function evaluateVertices(
  vertices: Record<string, VertexDefinition>,
  params: ParamContext
): Record<string, EvaluatedVertex> {
  const evaluated: Record<string, EvaluatedVertex> = {};

  for (const [id, vertex] of Object.entries(vertices)) {
    evaluated[id] = {
      x: evaluateExpression(vertex.x, params),
      y: evaluateExpression(vertex.y, params)
    };
  }

  return evaluated;
}

/**
 * Crea un Shape de Three.js a partir de un contorno
 */
function createShapeFromContour(
  contour: Contour,
  vertices: Record<string, EvaluatedVertex>,
  params: ParamContext
): Shape {
  const shape = new Shape();

  if (contour.elements.length === 0) {
    console.warn(`Contorno "${contour.id}" no tiene elementos`);
    return shape;
  }

  // Validar que el contorno esté cerrado
  if (contour.closed) {
    const firstElem = contour.elements[0];
    const lastElem = contour.elements[contour.elements.length - 1];

    if (lastElem.to !== firstElem.from) {
      console.error(
        `Contorno "${contour.id}" marcado como cerrado pero no conecta: ` +
        `último elemento va a "${lastElem.to}", primero inicia en "${firstElem.from}"`
      );
    }
  }

  // Procesar cada elemento del path
  contour.elements.forEach((element, index) => {
    const fromVertex = vertices[element.from];
    const toVertex = vertices[element.to];

    if (!fromVertex) {
      console.error(`Vértice no encontrado: ${element.from}`);
      return;
    }

    if (!toVertex) {
      console.error(`Vértice no encontrado: ${element.to}`);
      return;
    }

    // Si es el primer elemento, mover a la posición inicial
    if (index === 0) {
      shape.moveTo(fromVertex.x, fromVertex.y);
    }

    // Procesar según el tipo de elemento
    switch (element.type) {
      case 'line':
        shape.lineTo(toVertex.x, toVertex.y);
        break;

      case 'arc':
        createArc(shape, fromVertex, toVertex, element, params);
        break;

      case 'bezier_quadratic':
        const controlVertex = vertices[element.control];
        if (!controlVertex) {
          console.error(`Vértice de control no encontrado: ${element.control}`);
          shape.lineTo(toVertex.x, toVertex.y);
          break;
        }
        shape.quadraticCurveTo(
          controlVertex.x,
          controlVertex.y,
          toVertex.x,
          toVertex.y
        );
        break;

      case 'bezier_cubic':
        const control1Vertex = vertices[element.control1];
        const control2Vertex = vertices[element.control2];

        if (!control1Vertex || !control2Vertex) {
          console.error(
            `Vértices de control no encontrados: ${element.control1}, ${element.control2}`
          );
          shape.lineTo(toVertex.x, toVertex.y);
          break;
        }

        shape.bezierCurveTo(
          control1Vertex.x,
          control1Vertex.y,
          control2Vertex.x,
          control2Vertex.y,
          toVertex.x,
          toVertex.y
        );
        break;

      default:
        console.warn(`Tipo de elemento no soportado: ${(element as any).type}`);
        shape.lineTo(toVertex.x, toVertex.y);
    }
  });

  return shape;
}

/**
 * Crea un arco circular entre dos puntos
 *
 * Nota: Three.js Shape no tiene método directo para arcos, así que
 * aproximamos con absarc() o con múltiples segmentos curvos
 */
function createArc(
  shape: Shape,
  from: EvaluatedVertex,
  to: EvaluatedVertex,
  arcElement: ArcElement,
  params: ParamContext
): void {
  const radius = evaluateExpression(arcElement.radius, params);
  const clockwise = arcElement.clockwise ?? true;

  // Calcular el centro del arco
  // Hay dos posibles centros para un arco entre dos puntos con un radio dado
  // Elegimos basándonos en la dirección (clockwise)

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Si la distancia es mayor que 2*radius, el arco no es posible
  if (distance > 2 * radius) {
    console.warn(
      `Radio muy pequeño para el arco (${radius} < ${distance / 2}). Usando línea recta.`
    );
    shape.lineTo(to.x, to.y);
    return;
  }

  // Punto medio
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;

  // Vector perpendicular normalizado
  const perpX = -dy / distance;
  const perpY = dx / distance;

  // Distancia del punto medio al centro
  const halfChord = distance / 2;
  const centerDistance = Math.sqrt(radius * radius - halfChord * halfChord);

  // Centro del arco (ajustar según dirección)
  const centerX = midX + perpX * centerDistance * (clockwise ? 1 : -1);
  const centerY = midY + perpY * centerDistance * (clockwise ? 1 : -1);

  // Ángulos de inicio y fin
  const startAngle = Math.atan2(from.y - centerY, from.x - centerX);
  const endAngle = Math.atan2(to.y - centerY, to.x - centerX);

  // Usar absarc() de Three.js
  shape.absarc(
    centerX,
    centerY,
    radius,
    startAngle,
    endAngle,
    !clockwise // Three.js usa antiClockwise como parámetro
  );
}

/**
 * Convierte la definición de geometría SVG a ExtrudeGeometry de Three.js
 */
export function svgGeometryToThree(
  geometryDef: SVGGeometryDefinition,
  params: ParamContext
): ExtrudeGeometry {
  // 1. Evaluar todos los vértices
  const evaluatedVertices = evaluateVertices(geometryDef.vertices, params);

  // 2. Encontrar el contorno exterior
  const outerContour = geometryDef.contours.find(c => c.type === 'outer');

  if (!outerContour) {
    throw new Error('No se encontró contorno exterior (type: "outer")');
  }

  // 3. Crear el shape principal
  const mainShape = createShapeFromContour(
    outerContour,
    evaluatedVertices,
    params
  );

  // 4. Agregar agujeros (holes)
  const holeContours = geometryDef.contours.filter(c => c.type === 'hole');

  for (const holeContour of holeContours) {
    const holeShape = createShapeFromContour(
      holeContour,
      evaluatedVertices,
      params
    );

    // Los holes en Three.js son Paths, no Shapes
    // Convertimos el Shape a Path tomando sus curves
    mainShape.holes.push(holeShape as any);
  }

  // 5. Configurar opciones de extrusión
  const extrusionHeight = evaluateExpression(
    geometryDef.extrusion.height,
    params
  );

  const extrudeSettings: ExtrudeGeometryOptions = {
    depth: extrusionHeight,
    bevelEnabled: geometryDef.extrusion.bevel ?? true,
    bevelThickness: geometryDef.extrusion.bevelThickness ?? 0.3,
    bevelSize: geometryDef.extrusion.bevelSize ?? 0.3,
    bevelSegments: geometryDef.extrusion.bevelSegments ?? 3,
    curveSegments: geometryDef.extrusion.curveSegments ?? 12,
    steps: geometryDef.extrusion.steps ?? 1
  };

  // 6. Crear y retornar la geometría extruida
  const geometry = new ExtrudeGeometry(mainShape, extrudeSettings);

  // Rotar la geometría para que quede en el plano XZ (y la extrusión sea en Y)
  // Por defecto ExtrudeGeometry extruye en Z, pero queremos extruir en Y
  geometry.rotateX(Math.PI / 2);

  return geometry;
}

/**
 * Valida la definición de geometría antes de procesarla
 */
export function validateGeometryDefinition(
  geometryDef: SVGGeometryDefinition
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Verificar que haya vértices
  if (!geometryDef.vertices || Object.keys(geometryDef.vertices).length === 0) {
    errors.push('No hay vértices definidos');
  }

  // Verificar que haya contornos
  if (!geometryDef.contours || geometryDef.contours.length === 0) {
    errors.push('No hay contornos definidos');
  }

  // Verificar que haya exactamente 1 contorno exterior
  const outerContours = geometryDef.contours?.filter(c => c.type === 'outer') || [];
  if (outerContours.length === 0) {
    errors.push('No hay contorno exterior (type: "outer")');
  } else if (outerContours.length > 1) {
    errors.push(`Hay ${outerContours.length} contornos exteriores, debe haber solo 1`);
  }

  // Verificar que todos los contornos tengan elementos
  for (const contour of geometryDef.contours || []) {
    if (!contour.elements || contour.elements.length === 0) {
      errors.push(`Contorno "${contour.id}" no tiene elementos`);
    }

    // Verificar que los contornos cerrados realmente cierren
    if (contour.closed && contour.elements && contour.elements.length > 0) {
      const firstElem = contour.elements[0];
      const lastElem = contour.elements[contour.elements.length - 1];

      if (lastElem.to !== firstElem.from) {
        errors.push(
          `Contorno "${contour.id}" está marcado como cerrado pero ` +
          `el último elemento termina en "${lastElem.to}" ` +
          `y el primero inicia en "${firstElem.from}"`
        );
      }
    }
  }

  // Verificar que todas las referencias a vértices existan
  const vertexIds = new Set(Object.keys(geometryDef.vertices || {}));

  for (const contour of geometryDef.contours || []) {
    for (const element of contour.elements || []) {
      if (!vertexIds.has(element.from)) {
        errors.push(
          `Contorno "${contour.id}": vértice "${element.from}" no existe`
        );
      }

      if (!vertexIds.has(element.to)) {
        errors.push(
          `Contorno "${contour.id}": vértice "${element.to}" no existe`
        );
      }

      // Verificar vértices de control en bezier
      if (element.type === 'bezier_quadratic') {
        if (!vertexIds.has(element.control)) {
          errors.push(
            `Contorno "${contour.id}": vértice de control "${element.control}" no existe`
          );
        }
      }

      if (element.type === 'bezier_cubic') {
        if (!vertexIds.has(element.control1)) {
          errors.push(
            `Contorno "${contour.id}": vértice de control "${element.control1}" no existe`
          );
        }
        if (!vertexIds.has(element.control2)) {
          errors.push(
            `Contorno "${contour.id}": vértice de control "${element.control2}" no existe`
          );
        }
      }
    }
  }

  // Verificar configuración de extrusión
  if (!geometryDef.extrusion) {
    errors.push('No hay configuración de extrusión');
  } else if (!geometryDef.extrusion.height) {
    errors.push('No hay altura de extrusión definida');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Calcula el bounding box de la geometría 2D (antes de extruir)
 */
export function calculateBounds2D(
  geometryDef: SVGGeometryDefinition,
  params: ParamContext
): { minX: number; maxX: number; minY: number; maxY: number } {
  const evaluatedVertices = evaluateVertices(geometryDef.vertices, params);

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const vertex of Object.values(evaluatedVertices)) {
    minX = Math.min(minX, vertex.x);
    maxX = Math.max(maxX, vertex.x);
    minY = Math.min(minY, vertex.y);
    maxY = Math.max(maxY, vertex.y);
  }

  return { minX, maxX, minY, maxY };
}

/**
 * Utilidad para debugging: genera un string SVG a partir de la definición
 */
export function generateSVGPreview(
  geometryDef: SVGGeometryDefinition,
  params: ParamContext
): string {
  const evaluatedVertices = evaluateVertices(geometryDef.vertices, params);
  const bounds = calculateBounds2D(geometryDef, params);

  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const padding = 10;

  let svgPaths = '';

  // Generar paths para cada contorno
  for (const contour of geometryDef.contours) {
    let pathData = '';

    contour.elements.forEach((element, index) => {
      const fromVertex = evaluatedVertices[element.from];
      const toVertex = evaluatedVertices[element.to];

      if (index === 0) {
        pathData += `M ${fromVertex.x} ${fromVertex.y} `;
      }

      switch (element.type) {
        case 'line':
          pathData += `L ${toVertex.x} ${toVertex.y} `;
          break;

        case 'bezier_quadratic':
          const ctrl = evaluatedVertices[element.control];
          pathData += `Q ${ctrl.x} ${ctrl.y} ${toVertex.x} ${toVertex.y} `;
          break;

        case 'bezier_cubic':
          const ctrl1 = evaluatedVertices[element.control1];
          const ctrl2 = evaluatedVertices[element.control2];
          pathData += `C ${ctrl1.x} ${ctrl1.y} ${ctrl2.x} ${ctrl2.y} ${toVertex.x} ${toVertex.y} `;
          break;

        case 'arc':
          const radius = evaluateExpression(element.radius, params);
          const sweep = element.clockwise ? 1 : 0;
          pathData += `A ${radius} ${radius} 0 0 ${sweep} ${toVertex.x} ${toVertex.y} `;
          break;
      }
    });

    if (contour.closed) {
      pathData += 'Z';
    }

    const strokeColor = contour.type === 'outer' ? 'blue' : 'red';
    const fillColor = contour.type === 'outer' ? 'lightblue' : 'white';

    svgPaths += `<path d="${pathData}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1" />\n`;
  }

  return `
<svg width="${width + padding * 2}" height="${height + padding * 2}"
     viewBox="${bounds.minX - padding} ${bounds.minY - padding} ${width + padding * 2} ${height + padding * 2}"
     xmlns="http://www.w3.org/2000/svg">
  ${svgPaths}
</svg>
  `.trim();
}
