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
      // Implementación de dimensión angular
      // (requiere rotación de una línea para mantener el ángulo)
      return { updates: {}, success: false, reason: 'Dimensión angular en desarrollo' };
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

      const ang = angleBetweenLines(
        { from: posA1, to: posA2 },
        { from: posB1, to: posB2 }
      );

      return (ang * 180) / Math.PI; // Convertir a grados
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
