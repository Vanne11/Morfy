/**
 * Sistema de Solver de Restricciones y Dimensiones para Editor CAD
 *
 * Este módulo implementa un solver geométrico para manejar restricciones
 * y dimensiones en un editor CAD 2D paramétrico.
 */

// ============================================================================
// TIPOS DE DATOS
// ============================================================================

export interface Vertex2D {
  x: number;
  y: number;
}

export type ConstraintType =
  | 'fixed'        // Nodo no se puede mover
  | 'horizontal'   // Nodos se mueven juntos en Y
  | 'vertical'     // Nodos se mueven juntos en X
  | 'distance'     // Mantener distancia entre nodos
  | 'coincident'   // Dos nodos siempre en la misma posición
  | 'angle';       // Mantener ángulo entre líneas

export type DimensionType =
  | 'linear'       // Longitud de línea o distancia entre nodos
  | 'horizontal'   // Distancia horizontal
  | 'vertical'     // Distancia vertical
  | 'angular'      // Ángulo entre dos líneas
  | 'radial'       // Radio de un arco
  | 'diameter';    // Diámetro de un círculo

export interface Constraint {
  id: string;
  type: ConstraintType;
  nodes: string[];         // IDs de nodos afectados
  lines?: string[];        // IDs de líneas (para restricciones angulares)
  value?: number | string; // Valor de la restricción (puede ser paramétrico)
  enabled: boolean;
}

export interface Dimension {
  id: string;
  type: DimensionType;
  elements: {
    nodes?: string[];  // Para dimensiones lineales entre nodos
    line?: { from: string; to: string }; // Para dimensión de una línea
    lines?: Array<{ from: string; to: string }>; // Para dimensiones angulares
  };
  value: number | string; // Puede ser un número o expresión paramétrica
  label?: string;         // Nombre del parámetro (si se convierte en parámetro editable)
  isParameter: boolean;   // Si aparece en el panel de parámetros
  offset?: { x: number; y: number }; // Posición de la cota en el canvas
  inverted?: boolean;     // Para ángulos: si true, muestra y controla el ángulo reflex (exterior) en lugar del interno
}

// ============================================================================
// UTILIDADES GEOMÉTRICAS
// ============================================================================

export function distance(p1: Vertex2D, p2: Vertex2D): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

export function angle(p1: Vertex2D, p2: Vertex2D): number {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x);
}

export function angleBetweenLines(
  line1: { from: Vertex2D; to: Vertex2D },
  line2: { from: Vertex2D; to: Vertex2D }
): number {
  const angle1 = angle(line1.from, line1.to);
  const angle2 = angle(line2.from, line2.to);
  let diff = angle2 - angle1;

  // Normalizar a rango [-π, π]
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;

  return diff;
}

/**
 * Calcula el área signada de un polígono usando la fórmula del shoelace
 * Área positiva = sentido antihorario (CCW)
 * Área negativa = sentido horario (CW)
 */
export function signedArea(vertices: Vertex2D[]): number {
  let area = 0;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  return area / 2;
}

/**
 * Determina si un polígono está orientado en sentido antihorario (CCW)
 */
export function isCounterClockwise(vertices: Vertex2D[]): boolean {
  return signedArea(vertices) > 0;
}

/**
 * Calcula el ángulo interno en un vértice de un polígono
 * @param prev Vértice anterior
 * @param current Vértice actual (donde se calcula el ángulo)
 * @param next Vértice siguiente
 * @param isCCW Si el polígono está en sentido antihorario
 * @returns Ángulo interno en grados (0-360)
 */
export function calculateInternalAngle(
  prev: Vertex2D,
  current: Vertex2D,
  next: Vertex2D,
  isCCW: boolean
): number {
  // Vectores desde el vértice actual hacia los adyacentes
  const v1 = { x: prev.x - current.x, y: prev.y - current.y };
  const v2 = { x: next.x - current.x, y: next.y - current.y };

  // Producto cruzado (determina orientación)
  const cross = v1.x * v2.y - v1.y * v2.x;

  // Producto punto (para calcular el ángulo)
  const dot = v1.x * v2.x + v1.y * v2.y;

  // Magnitudes de los vectores
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

  if (mag1 === 0 || mag2 === 0) return 0;

  // Ángulo entre vectores usando atan2
  let angleRad = Math.atan2(cross, dot);

  // Ajustar según la orientación del polígono
  if (isCCW) {
    // Para CCW, ángulo interno es el ángulo en sentido antihorario
    if (angleRad < 0) angleRad += 2 * Math.PI;
  } else {
    // Para CW, ángulo interno es el ángulo en sentido horario
    if (angleRad > 0) angleRad = 2 * Math.PI - angleRad;
    else angleRad = -angleRad;
  }

  // Convertir a grados
  return (angleRad * 180) / Math.PI;
}

export function midpoint(p1: Vertex2D, p2: Vertex2D): Vertex2D {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

// ============================================================================
// SOLVER DE RESTRICCIONES
// ============================================================================

export class ConstraintSolver {
  /**
   * Resuelve el movimiento de un nodo considerando todas las restricciones
   */
  solveNodeMove(
    nodeId: string,
    newX: number,
    newY: number,
    vertices: Record<string, Vertex2D>,
    constraints: Constraint[]
  ): { updates: Record<string, Vertex2D>; blocked: boolean; reason?: string } {
    const updates: Record<string, Vertex2D> = {};

    // 1. Verificar si el nodo tiene restricción FIXED
    const fixedConstraint = constraints.find(
      c => c.type === 'fixed' && c.nodes.includes(nodeId) && c.enabled
    );
    if (fixedConstraint) {
      return {
        updates: {},
        blocked: true,
        reason: `El nodo ${nodeId} está fijo y no se puede mover`
      };
    }

    const originalPos = vertices[nodeId];
    const deltaX = newX - originalPos.x;
    const deltaY = newY - originalPos.y;

    // 2. Aplicar movimiento al nodo principal
    updates[nodeId] = { x: newX, y: newY };

    // 3. Propagar restricciones a otros nodos
    const visited = new Set<string>([nodeId]);
    this.propagateConstraints(nodeId, deltaX, deltaY, vertices, constraints, updates, visited);

    // 4. Verificar conflictos con restricciones de distancia
    const distanceConflict = this.checkDistanceConstraints(updates, vertices, constraints);
    if (distanceConflict) {
      return {
        updates: {},
        blocked: true,
        reason: distanceConflict
      };
    }

    return { updates, blocked: false };
  }

  /**
   * Propaga el movimiento de un nodo a otros nodos vinculados
   */
  private propagateConstraints(
    nodeId: string,
    deltaX: number,
    deltaY: number,
    vertices: Record<string, Vertex2D>,
    constraints: Constraint[],
    updates: Record<string, Vertex2D>,
    visited: Set<string>
  ): void {
    constraints.forEach(constraint => {
      if (!constraint.enabled || !constraint.nodes.includes(nodeId)) return;

      constraint.nodes.forEach(otherId => {
        if (visited.has(otherId)) return;

        const otherNode = updates[otherId] || vertices[otherId];
        let newPos: Vertex2D | null = null;

        switch (constraint.type) {
          case 'horizontal':
            // Los nodos vinculados horizontalmente se mueven en Y juntos
            newPos = {
              x: otherNode.x, // X no cambia
              y: otherNode.y + deltaY // Y se mueve igual
            };
            break;

          case 'vertical':
            // Los nodos vinculados verticalmente se mueven en X juntos
            newPos = {
              x: otherNode.x + deltaX, // X se mueve igual
              y: otherNode.y // Y no cambia
            };
            break;

          case 'coincident':
            // Los nodos coincidentes se mueven juntos completamente
            newPos = {
              x: otherNode.x + deltaX,
              y: otherNode.y + deltaY
            };
            break;
        }

        if (newPos) {
          // Verificar que el nodo no esté fijo
          const isFixed = constraints.some(
            c => c.type === 'fixed' && c.nodes.includes(otherId) && c.enabled
          );

          if (!isFixed) {
            updates[otherId] = newPos;
            visited.add(otherId);

            // Propagar recursivamente
            this.propagateConstraints(
              otherId,
              newPos.x - vertices[otherId].x,
              newPos.y - vertices[otherId].y,
              vertices,
              constraints,
              updates,
              visited
            );
          }
        }
      });
    });
  }

  /**
   * Verifica que las restricciones de distancia se mantengan
   */
  private checkDistanceConstraints(
    updates: Record<string, Vertex2D>,
    vertices: Record<string, Vertex2D>,
    constraints: Constraint[]
  ): string | null {
    for (const constraint of constraints) {
      if (!constraint.enabled || constraint.type !== 'distance') continue;

      const [nodeA, nodeB] = constraint.nodes;
      const requiredDist = typeof constraint.value === 'number' ? constraint.value : 0;

      const posA = updates[nodeA] || vertices[nodeA];
      const posB = updates[nodeB] || vertices[nodeB];

      const actualDist = distance(posA, posB);
      const tolerance = 0.1; // 0.1cm de tolerancia

      if (Math.abs(actualDist - requiredDist) > tolerance) {
        return `La restricción de distancia entre ${nodeA} y ${nodeB} no se puede mantener`;
      }
    }

    return null;
  }

  /**
   * Verifica si se puede aplicar una dimensión
   */
  canApplyDimension(
    dimension: Dimension,
    _vertices: Record<string, Vertex2D>,
    constraints: Constraint[]
  ): { canApply: boolean; reason?: string } {
    if (dimension.type === 'linear' && dimension.elements.nodes) {
      const [nodeA, nodeB] = dimension.elements.nodes;

      const isNodeAFixed = constraints.some(
        c => c.type === 'fixed' && c.nodes.includes(nodeA) && c.enabled
      );
      const isNodeBFixed = constraints.some(
        c => c.type === 'fixed' && c.nodes.includes(nodeB) && c.enabled
      );

      if (isNodeAFixed && isNodeBFixed) {
        return {
          canApply: false,
          reason: 'Ambos nodos están fijos. No se puede cambiar la dimensión.'
        };
      }
    }

    if (dimension.type === 'angular' && dimension.elements.lines && dimension.elements.lines.length === 2) {
      const [line1, line2] = dimension.elements.lines;

      // Helper function para verificar si un nodo está fijo
      const isNodeFixed = (nodeId: string) => constraints.some(
        c => c.type === 'fixed' && c.nodes.includes(nodeId) && c.enabled
      );

      // Verificar si ambas líneas están completamente fijas
      const line1Fixed = isNodeFixed(line1.from) && isNodeFixed(line1.to);
      const line2Fixed = isNodeFixed(line2.from) && isNodeFixed(line2.to);

      if (line1Fixed && line2Fixed) {
        return {
          canApply: false,
          reason: 'No se puede cambiar el ángulo: ambas líneas están fijas'
        };
      }
    }

    return { canApply: true };
  }

  /**
   * Aplica una dimensión (ajusta posiciones de nodos según el valor objetivo)
   */
  applyDimension(
    dimension: Dimension,
    targetValue: number,
    vertices: Record<string, Vertex2D>,
    constraints: Constraint[]
  ): { updates: Record<string, Vertex2D>; success: boolean; reason?: string } {
    const updates: Record<string, Vertex2D> = {};

    // Verificar si se puede aplicar
    const check = this.canApplyDimension(dimension, vertices, constraints);
    if (!check.canApply) {
      return { updates: {}, success: false, reason: check.reason };
    }

    if (dimension.type === 'linear' && dimension.elements.nodes) {
      const [nodeA, nodeB] = dimension.elements.nodes;
      const posA = vertices[nodeA];
      const posB = vertices[nodeB];

      const currentDist = distance(posA, posB);

      if (currentDist === 0) {
        return {
          updates: {},
          success: false,
          reason: 'Los nodos están en la misma posición'
        };
      }

      const isNodeAFixed = constraints.some(
        c => c.type === 'fixed' && c.nodes.includes(nodeA) && c.enabled
      );
      const isNodeBFixed = constraints.some(
        c => c.type === 'fixed' && c.nodes.includes(nodeB) && c.enabled
      );

      if (!isNodeAFixed && !isNodeBFixed) {
        // Ambos libres: crecer desde el centro
        const mid = midpoint(posA, posB);
        const scale = targetValue / currentDist;

        updates[nodeA] = {
          x: mid.x + (posA.x - mid.x) * scale,
          y: mid.y + (posA.y - mid.y) * scale
        };
        updates[nodeB] = {
          x: mid.x + (posB.x - mid.x) * scale,
          y: mid.y + (posB.y - mid.y) * scale
        };
      } else if (isNodeAFixed && !isNodeBFixed) {
        // A fijo, mover solo B
        const ang = angle(posA, posB);
        updates[nodeB] = {
          x: posA.x + targetValue * Math.cos(ang),
          y: posA.y + targetValue * Math.sin(ang)
        };
      } else if (!isNodeAFixed && isNodeBFixed) {
        // B fijo, mover solo A
        const ang = angle(posB, posA);
        updates[nodeA] = {
          x: posB.x + targetValue * Math.cos(ang),
          y: posB.y + targetValue * Math.sin(ang)
        };
      }

      return { updates, success: true };
    }

    if (dimension.type === 'horizontal' && dimension.elements.nodes) {
      const [nodeA, nodeB] = dimension.elements.nodes;
      const posA = vertices[nodeA];
      const posB = vertices[nodeB];

      const currentDist = Math.abs(posB.x - posA.x);
      const deltaX = targetValue - currentDist;

      const isNodeAFixed = constraints.some(
        c => c.type === 'fixed' && c.nodes.includes(nodeA) && c.enabled
      );
      const isNodeBFixed = constraints.some(
        c => c.type === 'fixed' && c.nodes.includes(nodeB) && c.enabled
      );

      if (!isNodeAFixed && !isNodeBFixed) {
        updates[nodeA] = { ...posA, x: posA.x - deltaX / 2 };
        updates[nodeB] = { ...posB, x: posB.x + deltaX / 2 };
      } else if (isNodeAFixed && !isNodeBFixed) {
        updates[nodeB] = { ...posB, x: posA.x + targetValue * Math.sign(posB.x - posA.x) };
      } else if (!isNodeAFixed && isNodeBFixed) {
        updates[nodeA] = { ...posA, x: posB.x - targetValue * Math.sign(posB.x - posA.x) };
      }

      return { updates, success: true };
    }

    if (dimension.type === 'vertical' && dimension.elements.nodes) {
      const [nodeA, nodeB] = dimension.elements.nodes;
      const posA = vertices[nodeA];
      const posB = vertices[nodeB];

      const currentDist = Math.abs(posB.y - posA.y);
      const deltaY = targetValue - currentDist;

      const isNodeAFixed = constraints.some(
        c => c.type === 'fixed' && c.nodes.includes(nodeA) && c.enabled
      );
      const isNodeBFixed = constraints.some(
        c => c.type === 'fixed' && c.nodes.includes(nodeB) && c.enabled
      );

      if (!isNodeAFixed && !isNodeBFixed) {
        updates[nodeA] = { ...posA, y: posA.y - deltaY / 2 };
        updates[nodeB] = { ...posB, y: posB.y + deltaY / 2 };
      } else if (isNodeAFixed && !isNodeBFixed) {
        updates[nodeB] = { ...posB, y: posA.y + targetValue * Math.sign(posB.y - posA.y) };
      } else if (!isNodeAFixed && isNodeBFixed) {
        updates[nodeA] = { ...posA, y: posB.y - targetValue * Math.sign(posB.y - posA.y) };
      }

      return { updates, success: true };
    }

    if (dimension.type === 'angular' && dimension.elements.lines && dimension.elements.lines.length === 2) {
      const [line1, line2] = dimension.elements.lines;

      // Paso 1: Extraer posiciones de vértices
      const posA1 = vertices[line1.from];
      const posA2 = vertices[line1.to];
      const posB1 = vertices[line2.from];
      const posB2 = vertices[line2.to];

      if (!posA1 || !posA2 || !posB1 || !posB2) {
        return { updates: {}, success: false, reason: 'Vértices no encontrados' };
      }

      // Paso 2: Encontrar punto de intersección (vértice común)
      let pivotId: string | null = null;
      let pivot: Vertex2D | null = null;
      let other1: Vertex2D | null = null; // Punto extremo de línea 1
      let other2: Vertex2D | null = null; // Punto extremo de línea 2
      let p1Id: string | null = null;
      let p2Id: string | null = null;

      if (line1.from === line2.from) { pivotId = line1.from; pivot = posA1; p1Id = line1.to; other1 = posA2; p2Id = line2.to; other2 = posB2; }
      else if (line1.from === line2.to) { pivotId = line1.from; pivot = posA1; p1Id = line1.to; other1 = posA2; p2Id = line2.from; other2 = posB1; }
      else if (line1.to === line2.from) { pivotId = line1.to; pivot = posA2; p1Id = line1.from; other1 = posA1; p2Id = line2.to; other2 = posB2; }
      else if (line1.to === line2.to) { pivotId = line1.to; pivot = posA2; p1Id = line1.from; other1 = posA1; p2Id = line2.from; other2 = posB1; }

      if (!pivotId || !pivot || !other1 || !other2) {
        return {
          updates: {},
          success: false,
          reason: 'Las líneas no comparten un vértice común'
        };
      }

      // Paso 3: Calcular ángulos absolutos de los vectores desde el pivote
      const ang1 = Math.atan2(other1.y - pivot.y, other1.x - pivot.x);
      const ang2 = Math.atan2(other2.y - pivot.y, other2.x - pivot.x);

      // Calcular diferencia angular normalizada (-PI a PI)
      let diffRad = ang2 - ang1;
      while (diffRad > Math.PI) diffRad -= 2 * Math.PI;
      while (diffRad < -Math.PI) diffRad += 2 * Math.PI;

      // El ángulo actual (interno) es el valor absoluto
      // const currentInnerDeg = Math.abs(diffRad * 180 / Math.PI);

      // Paso 4: Determinar el ángulo objetivo INTERNO (0-180)
      // Si la dimensión está invertida, el usuario quiere controlar el ángulo reflex (ej: 270°)
      // Por tanto, el ángulo interno objetivo debe ser 360 - target
      let targetInnerDeg = targetValue;
      if (dimension.inverted) {
        targetInnerDeg = 360 - targetValue;
      }
      
      // Validar rango
      if (targetInnerDeg < 0) targetInnerDeg = 0;
      // if (targetInnerDeg > 180) targetInnerDeg = 180; // Permitir > 180 si el usuario lo fuerza

      // Paso 5: Calcular rotación necesaria
      // Queremos que el nuevo ángulo relativo (abs(diff)) sea targetInnerDeg.
      // Respetamos el signo original de la apertura para no "voltear" la geometría innecesariamente
      // Si diffRad es 0, asumimos positivo
      const sign = diffRad >= 0 ? 1 : -1;
      const targetDiffRad = sign * (targetInnerDeg * Math.PI / 180);
      
      const rotationNeededRad = targetDiffRad - diffRad;

      // Helper para verificar si un nodo está fijo
      const isNodeFixed = (nodeId: string) => constraints.some(
        c => c.type === 'fixed' && c.nodes.includes(nodeId) && c.enabled
      );

      const line1Fixed = isNodeFixed(line1.from) && isNodeFixed(line1.to);
      const line2Fixed = isNodeFixed(line2.from) && isNodeFixed(line2.to);

      // Helper para rotar un punto alrededor de un pivote
      const rotatePoint = (
        point: Vertex2D,
        pivot: Vertex2D,
        angleRad: number
      ): Vertex2D => {
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);
        const dx = point.x - pivot.x;
        const dy = point.y - pivot.y;

        return {
          x: pivot.x + dx * cos - dy * sin,
          y: pivot.y + dx * sin + dy * cos
        };
      };

      // Paso 6: Aplicar rotación
      if (line1Fixed && !line2Fixed) {
        // Línea 1 fija, rotar línea 2
        // Si diff = ang2 - ang1, entonces ang2 = ang1 + diff
        // Queremos nuevo ang2' = ang1 + targetDiff
        // Delta = targetDiff - diff (rotationNeededRad)
        // Rotamos Line2 por rotationNeededRad
        if (p2Id && p2Id !== pivotId) updates[p2Id] = rotatePoint(other2, pivot, rotationNeededRad);
      } else if (!line1Fixed && line2Fixed) {
        // Línea 2 fija, rotar línea 1
        // Queremos nuevo ang1'
        // diff = ang2 - ang1 => ang1 = ang2 - diff
        // Nuevo ang1' = ang2 - targetDiff
        // Delta1 = (ang2 - targetDiff) - (ang2 - diff) = diff - targetDiff = -rotationNeededRad
        if (p1Id && p1Id !== pivotId) updates[p1Id] = rotatePoint(other1, pivot, -rotationNeededRad);
      } else if (!line1Fixed && !line2Fixed) {
        // Ambas libres, rotar simétricamente
        const halfRot = rotationNeededRad / 2;
        if (p2Id && p2Id !== pivotId) updates[p2Id] = rotatePoint(other2, pivot, halfRot);
        if (p1Id && p1Id !== pivotId) updates[p1Id] = rotatePoint(other1, pivot, -halfRot);
      }

      return { updates, success: true };
    }

    return { updates: {}, success: false, reason: 'Tipo de dimensión no soportado' };
  }

  /**
   * Calcula el valor actual de una dimensión
   */
  calculateDimensionValue(
    dimension: Dimension,
    vertices: Record<string, Vertex2D>
  ): number {
    if ((dimension.type === 'linear' || dimension.type === 'horizontal' || dimension.type === 'vertical')
        && dimension.elements.nodes) {
      const [nodeA, nodeB] = dimension.elements.nodes;
      const posA = vertices[nodeA];
      const posB = vertices[nodeB];

      if (!posA || !posB) return 0;

      if (dimension.type === 'linear') {
        return distance(posA, posB);
      } else if (dimension.type === 'horizontal') {
        return Math.abs(posB.x - posA.x);
      } else if (dimension.type === 'vertical') {
        return Math.abs(posB.y - posA.y);
      }
    }

    if (dimension.type === 'angular' && dimension.elements.lines && dimension.elements.lines.length === 2) {
      const [line1, line2] = dimension.elements.lines;
      const posA1 = vertices[line1.from];
      const posA2 = vertices[line1.to];
      const posB1 = vertices[line2.from];
      const posB2 = vertices[line2.to];

      if (!posA1 || !posA2 || !posB1 || !posB2) return 0;

      // Determinar pivote y otros puntos
      let pivot: Vertex2D | null = null;
      let other1: Vertex2D | null = null;
      let other2: Vertex2D | null = null;

      if (line1.from === line2.from) { pivot = posA1; other1 = posA2; other2 = posB2; }
      else if (line1.from === line2.to) { pivot = posA1; other1 = posA2; other2 = posB1; }
      else if (line1.to === line2.from) { pivot = posA2; other1 = posA1; other2 = posB2; }
      else if (line1.to === line2.to) { pivot = posA2; other1 = posA1; other2 = posB1; }

      if (pivot && other1 && other2) {
        // Calcular vectores desde el pivote
        const v1 = { x: other1.x - pivot.x, y: other1.y - pivot.y };
        const v2 = { x: other2.x - pivot.x, y: other2.y - pivot.y };

        const mag1 = Math.sqrt(v1.x*v1.x + v1.y*v1.y);
        const mag2 = Math.sqrt(v2.x*v2.x + v2.y*v2.y);

        if (mag1 === 0 || mag2 === 0) return 0;

        const dot = v1.x * v2.x + v1.y * v2.y;
        // Clamp para evitar errores de coma flotante fuera de [-1, 1]
        const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
        
        let angleDeg = Math.acos(cosTheta) * 180 / Math.PI;

        if (dimension.inverted) {
          angleDeg = 360 - angleDeg;
        }

        return angleDeg;
      }
      
      return 0;
    }

    return 0;
  }

  /**
   * Detecta si hay sobre-restricción (demasiadas restricciones conflictivas)
   */
  detectOverConstraint(
    vertices: Record<string, Vertex2D>,
    constraints: Constraint[]
  ): { isOverConstrained: boolean; conflicts: string[] } {
    const conflicts: string[] = [];

    // Verificar si hay nodos con múltiples restricciones incompatibles
    for (const nodeId of Object.keys(vertices)) {
      const nodeConstraints = constraints.filter(
        c => c.enabled && c.nodes.includes(nodeId)
      );

      const hasFixed = nodeConstraints.some(c => c.type === 'fixed');
      const hasHorizontal = nodeConstraints.some(c => c.type === 'horizontal');
      const hasVertical = nodeConstraints.some(c => c.type === 'vertical');

      if (hasFixed && (hasHorizontal || hasVertical)) {
        conflicts.push(`Nodo ${nodeId} está fijo pero también tiene restricciones de alineación`);
      }
    }

    return {
      isOverConstrained: conflicts.length > 0,
      conflicts
    };
  }
}

// ============================================================================
// EXPORTAR INSTANCIA SINGLETON
// ============================================================================

export const constraintSolver = new ConstraintSolver();
