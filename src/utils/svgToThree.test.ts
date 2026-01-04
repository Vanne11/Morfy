import { describe, it, expect } from 'vitest';
import {
  svgGeometryToThree,
  validateGeometryDefinition,
  calculateBounds2D,
  type SVGGeometryDefinition
} from './svgToThree';

describe('validateGeometryDefinition', () => {
  it('debe validar geometría básica correcta', () => {
    const geometry: SVGGeometryDefinition = {
      vertices: {
        v1: { x: 0, y: 0 },
        v2: { x: 10, y: 0 },
        v3: { x: 10, y: 10 },
        v4: { x: 0, y: 10 }
      },
      contours: [
        {
          id: 'exterior',
          type: 'outer',
          closed: true,
          elements: [
            { type: 'line', from: 'v1', to: 'v2' },
            { type: 'line', from: 'v2', to: 'v3' },
            { type: 'line', from: 'v3', to: 'v4' },
            { type: 'line', from: 'v4', to: 'v1' }
          ]
        }
      ],
      extrusion: {
        height: 3
      }
    };

    const result = validateGeometryDefinition(geometry);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('debe detectar falta de vértices', () => {
    const geometry: any = {
      vertices: {},
      contours: [],
      extrusion: { height: 3 }
    };

    const result = validateGeometryDefinition(geometry);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('No hay vértices definidos');
  });

  it('debe detectar falta de contorno exterior', () => {
    const geometry: SVGGeometryDefinition = {
      vertices: {
        v1: { x: 0, y: 0 }
      },
      contours: [
        {
          id: 'agujero',
          type: 'hole',
          closed: true,
          elements: []
        }
      ],
      extrusion: { height: 3 }
    };

    const result = validateGeometryDefinition(geometry);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('contorno exterior'))).toBe(true);
  });

  it('debe detectar vértices no encontrados', () => {
    const geometry: SVGGeometryDefinition = {
      vertices: {
        v1: { x: 0, y: 0 },
        v2: { x: 10, y: 0 }
      },
      contours: [
        {
          id: 'exterior',
          type: 'outer',
          closed: true,
          elements: [
            { type: 'line', from: 'v1', to: 'v_inexistente' }
          ]
        }
      ],
      extrusion: { height: 3 }
    };

    const result = validateGeometryDefinition(geometry);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('v_inexistente'))).toBe(true);
  });

  it('debe detectar contornos no cerrados', () => {
    const geometry: SVGGeometryDefinition = {
      vertices: {
        v1: { x: 0, y: 0 },
        v2: { x: 10, y: 0 },
        v3: { x: 10, y: 10 }
      },
      contours: [
        {
          id: 'exterior',
          type: 'outer',
          closed: true,
          elements: [
            { type: 'line', from: 'v1', to: 'v2' },
            { type: 'line', from: 'v2', to: 'v3' }
            // Falta: v3 -> v1
          ]
        }
      ],
      extrusion: { height: 3 }
    };

    const result = validateGeometryDefinition(geometry);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('marcado como cerrado'))).toBe(true);
  });

  it('debe validar vértices de control en Bézier cuadrática', () => {
    const geometry: SVGGeometryDefinition = {
      vertices: {
        v1: { x: 0, y: 0 },
        v2: { x: 10, y: 0 }
      },
      contours: [
        {
          id: 'exterior',
          type: 'outer',
          closed: true,
          elements: [
            {
              type: 'bezier_quadratic',
              from: 'v1',
              to: 'v2',
              control: 'control_inexistente'
            }
          ]
        }
      ],
      extrusion: { height: 3 }
    };

    const result = validateGeometryDefinition(geometry);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('control_inexistente'))).toBe(true);
  });
});

describe('calculateBounds2D', () => {
  it('debe calcular bounds de un cuadrado', () => {
    const geometry: SVGGeometryDefinition = {
      vertices: {
        v1: { x: 0, y: 0 },
        v2: { x: 100, y: 0 },
        v3: { x: 100, y: 50 },
        v4: { x: 0, y: 50 }
      },
      contours: [],
      extrusion: { height: 3 }
    };

    const bounds = calculateBounds2D(geometry, {});
    expect(bounds.minX).toBe(0);
    expect(bounds.maxX).toBe(100);
    expect(bounds.minY).toBe(0);
    expect(bounds.maxY).toBe(50);
  });

  it('debe calcular bounds con expresiones paramétricas', () => {
    const geometry: SVGGeometryDefinition = {
      vertices: {
        v1: { x: 0, y: 0 },
        v2: { x: 'params.longitud', y: 0 },
        v3: { x: 'params.longitud', y: 'params.ancho' },
        v4: { x: 0, y: 'params.ancho' }
      },
      contours: [],
      extrusion: { height: 3 }
    };

    const params = { longitud: 80, ancho: 40 };
    const bounds = calculateBounds2D(geometry, params);

    expect(bounds.minX).toBe(0);
    expect(bounds.maxX).toBe(80);
    expect(bounds.minY).toBe(0);
    expect(bounds.maxY).toBe(40);
  });

  it('debe manejar bounds negativos', () => {
    const geometry: SVGGeometryDefinition = {
      vertices: {
        v1: { x: -10, y: -20 },
        v2: { x: 10, y: 20 }
      },
      contours: [],
      extrusion: { height: 3 }
    };

    const bounds = calculateBounds2D(geometry, {});
    expect(bounds.minX).toBe(-10);
    expect(bounds.maxX).toBe(10);
    expect(bounds.minY).toBe(-20);
    expect(bounds.maxY).toBe(20);
  });
});

describe('svgGeometryToThree', () => {
  it('debe generar geometría desde cuadrado simple', () => {
    const geometry: SVGGeometryDefinition = {
      vertices: {
        v1: { x: 0, y: 0 },
        v2: { x: 10, y: 0 },
        v3: { x: 10, y: 10 },
        v4: { x: 0, y: 10 }
      },
      contours: [
        {
          id: 'exterior',
          type: 'outer',
          closed: true,
          elements: [
            { type: 'line', from: 'v1', to: 'v2' },
            { type: 'line', from: 'v2', to: 'v3' },
            { type: 'line', from: 'v3', to: 'v4' },
            { type: 'line', from: 'v4', to: 'v1' }
          ]
        }
      ],
      extrusion: {
        height: 3,
        bevel: false
      }
    };

    const extrudedGeometry = svgGeometryToThree(geometry, {});

    expect(extrudedGeometry).toBeDefined();
    expect(extrudedGeometry.type).toBe('ExtrudeGeometry');
    expect(extrudedGeometry.parameters).toBeDefined();
  });

  it('debe generar geometría con parámetros', () => {
    const geometry: SVGGeometryDefinition = {
      vertices: {
        v1: { x: 0, y: 0 },
        v2: { x: 'params.longitud', y: 0 },
        v3: { x: 'params.longitud', y: 'params.ancho' },
        v4: { x: 0, y: 'params.ancho' }
      },
      contours: [
        {
          id: 'exterior',
          type: 'outer',
          closed: true,
          elements: [
            { type: 'line', from: 'v1', to: 'v2' },
            { type: 'line', from: 'v2', to: 'v3' },
            { type: 'line', from: 'v3', to: 'v4' },
            { type: 'line', from: 'v4', to: 'v1' }
          ]
        }
      ],
      extrusion: {
        height: 'params.grosor',
        bevel: true,
        bevelThickness: 0.3,
        bevelSize: 0.3
      }
    };

    const params = {
      longitud: 100,
      ancho: 50,
      grosor: 3
    };

    const extrudedGeometry = svgGeometryToThree(geometry, params);

    expect(extrudedGeometry).toBeDefined();
    expect(extrudedGeometry.type).toBe('ExtrudeGeometry');
  });

  it('debe generar geometría con agujero', () => {
    const geometry: SVGGeometryDefinition = {
      vertices: {
        // Exterior
        v1: { x: 0, y: 0 },
        v2: { x: 100, y: 0 },
        v3: { x: 100, y: 50 },
        v4: { x: 0, y: 50 },
        // Agujero
        h1: { x: 40, y: 20 },
        h2: { x: 60, y: 20 },
        h3: { x: 60, y: 30 },
        h4: { x: 40, y: 30 }
      },
      contours: [
        {
          id: 'exterior',
          type: 'outer',
          closed: true,
          elements: [
            { type: 'line', from: 'v1', to: 'v2' },
            { type: 'line', from: 'v2', to: 'v3' },
            { type: 'line', from: 'v3', to: 'v4' },
            { type: 'line', from: 'v4', to: 'v1' }
          ]
        },
        {
          id: 'agujero',
          type: 'hole',
          closed: true,
          elements: [
            { type: 'line', from: 'h1', to: 'h2' },
            { type: 'line', from: 'h2', to: 'h3' },
            { type: 'line', from: 'h3', to: 'h4' },
            { type: 'line', from: 'h4', to: 'h1' }
          ]
        }
      ],
      extrusion: {
        height: 3,
        bevel: false
      }
    };

    const extrudedGeometry = svgGeometryToThree(geometry, {});

    expect(extrudedGeometry).toBeDefined();
    // La geometría debe tener el agujero procesado
  });

  it('debe lanzar error si falta contorno exterior', () => {
    const geometry: SVGGeometryDefinition = {
      vertices: {
        v1: { x: 0, y: 0 }
      },
      contours: [],
      extrusion: { height: 3 }
    };

    expect(() => {
      svgGeometryToThree(geometry, {});
    }).toThrow('contorno exterior');
  });

  it('debe generar geometría con curvas Bézier cuadráticas', () => {
    const geometry: SVGGeometryDefinition = {
      vertices: {
        v1: { x: 0, y: 0 },
        v2: { x: 100, y: 0 },
        v3: { x: 100, y: 50 },
        v4: { x: 0, y: 50 },
        ctrl1: { x: 50, y: -10 },
        ctrl2: { x: 110, y: 25 }
      },
      contours: [
        {
          id: 'exterior',
          type: 'outer',
          closed: true,
          elements: [
            {
              type: 'bezier_quadratic',
              from: 'v1',
              to: 'v2',
              control: 'ctrl1'
            },
            {
              type: 'bezier_quadratic',
              from: 'v2',
              to: 'v3',
              control: 'ctrl2'
            },
            { type: 'line', from: 'v3', to: 'v4' },
            { type: 'line', from: 'v4', to: 'v1' }
          ]
        }
      ],
      extrusion: {
        height: 3,
        bevel: true,
        bevelThickness: 0.5,
        bevelSegments: 4,
        curveSegments: 24
      }
    };

    const extrudedGeometry = svgGeometryToThree(geometry, {});

    expect(extrudedGeometry).toBeDefined();
    expect(extrudedGeometry.type).toBe('ExtrudeGeometry');
  });
});

describe('casos de uso reales', () => {
  it('debe generar férula rectangular simple', () => {
    const geometry: SVGGeometryDefinition = {
      vertices: {
        v1: { x: 0, y: 0 },
        v2: { x: 'params.longitud', y: 0 },
        v3: { x: 'params.longitud', y: 'params.ancho' },
        v4: { x: 0, y: 'params.ancho' }
      },
      contours: [
        {
          id: 'exterior',
          type: 'outer',
          closed: true,
          elements: [
            { type: 'line', from: 'v1', to: 'v2' },
            { type: 'line', from: 'v2', to: 'v3' },
            { type: 'line', from: 'v3', to: 'v4' },
            { type: 'line', from: 'v4', to: 'v1' }
          ]
        }
      ],
      extrusion: {
        height: 'params.grosor',
        bevel: true,
        bevelThickness: 0.3,
        bevelSize: 0.3,
        bevelSegments: 3
      }
    };

    const params = {
      longitud: 70,
      ancho: 30,
      grosor: 2.5
    };

    const extrudedGeometry = svgGeometryToThree(geometry, params);

    expect(extrudedGeometry).toBeDefined();
    expect(extrudedGeometry.type).toBe('ExtrudeGeometry');
  });

  it('debe generar férula con ventilaciones', () => {
    const geometry: SVGGeometryDefinition = {
      vertices: {
        // Exterior
        v1: { x: 0, y: 0 },
        v2: { x: 'params.longitud', y: 0 },
        v3: { x: 'params.longitud', y: 'params.ancho' },
        v4: { x: 0, y: 'params.ancho' },
        // Ventilación 1
        h1: { x: 'params.longitud * 0.25 - 3', y: 'params.ancho * 0.5 - 3' },
        h2: { x: 'params.longitud * 0.25 + 3', y: 'params.ancho * 0.5 - 3' },
        h3: { x: 'params.longitud * 0.25 + 3', y: 'params.ancho * 0.5 + 3' },
        h4: { x: 'params.longitud * 0.25 - 3', y: 'params.ancho * 0.5 + 3' }
      },
      contours: [
        {
          id: 'exterior',
          type: 'outer',
          closed: true,
          elements: [
            { type: 'line', from: 'v1', to: 'v2' },
            { type: 'line', from: 'v2', to: 'v3' },
            { type: 'line', from: 'v3', to: 'v4' },
            { type: 'line', from: 'v4', to: 'v1' }
          ]
        },
        {
          id: 'ventilacion_1',
          type: 'hole',
          closed: true,
          elements: [
            { type: 'line', from: 'h1', to: 'h2' },
            { type: 'line', from: 'h2', to: 'h3' },
            { type: 'line', from: 'h3', to: 'h4' },
            { type: 'line', from: 'h4', to: 'h1' }
          ]
        }
      ],
      extrusion: {
        height: 'params.grosor',
        bevel: true,
        bevelThickness: 0.3
      }
    };

    const params = {
      longitud: 80,
      ancho: 30,
      grosor: 3
    };

    const extrudedGeometry = svgGeometryToThree(geometry, params);

    expect(extrudedGeometry).toBeDefined();
  });
});
