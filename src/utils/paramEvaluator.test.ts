import { describe, it, expect } from 'vitest';
import {
  evaluateExpression,
  evaluateBatch,
  validateExpression,
  detectCircularDependencies
} from './paramEvaluator';

describe('evaluateExpression', () => {
  const params = {
    longitud: 100,
    ancho: 50,
    grosor: 3,
    radio: 5
  };

  it('debe evaluar números literales', () => {
    expect(evaluateExpression(42, params)).toBe(42);
    expect(evaluateExpression(0, params)).toBe(0);
    expect(evaluateExpression(-10, params)).toBe(-10);
    expect(evaluateExpression(3.14, params)).toBe(3.14);
  });

  it('debe evaluar strings numéricos', () => {
    expect(evaluateExpression('100', params)).toBe(100);
    expect(evaluateExpression('3.14', params)).toBe(3.14);
    expect(evaluateExpression('-5', params)).toBe(-5);
  });

  it('debe evaluar referencias a parámetros', () => {
    expect(evaluateExpression('params.longitud', params)).toBe(100);
    expect(evaluateExpression('params.ancho', params)).toBe(50);
    expect(evaluateExpression('params.grosor', params)).toBe(3);
  });

  it('debe evaluar operaciones aritméticas simples', () => {
    expect(evaluateExpression('params.longitud + 10', params)).toBe(110);
    expect(evaluateExpression('params.ancho - 5', params)).toBe(45);
    expect(evaluateExpression('params.longitud * 2', params)).toBe(200);
    expect(evaluateExpression('params.ancho / 2', params)).toBe(25);
  });

  it('debe evaluar expresiones complejas', () => {
    expect(
      evaluateExpression('params.longitud * 0.5 + params.ancho', params)
    ).toBe(100);

    expect(
      evaluateExpression('(params.longitud + params.ancho) / 2', params)
    ).toBe(75);

    expect(
      evaluateExpression('params.longitud - params.ancho * 2', params)
    ).toBe(0);
  });

  it('debe evaluar múltiples referencias al mismo parámetro', () => {
    expect(
      evaluateExpression('params.ancho + params.ancho', params)
    ).toBe(100);

    expect(
      evaluateExpression('params.longitud / 2 - params.longitud / 4', params)
    ).toBe(25);
  });

  it('debe soportar funciones Math', () => {
    expect(
      evaluateExpression('Math.sqrt(params.longitud)', params)
    ).toBe(10);

    expect(
      evaluateExpression('Math.max(params.ancho, params.grosor)', params)
    ).toBe(50);

    expect(
      evaluateExpression('Math.min(params.ancho, params.longitud)', params)
    ).toBe(50);

    expect(
      evaluateExpression('Math.abs(-params.grosor)', params)
    ).toBe(3);

    expect(
      evaluateExpression('Math.pow(params.radio, 2)', params)
    ).toBe(25);

    expect(
      evaluateExpression('Math.PI * params.radio', params)
    ).toBeCloseTo(15.707, 2);
  });

  it('debe manejar parámetros con guiones bajos', () => {
    const paramsWithUnderscore = {
      ancho_base: 30,
      ancho_punta: 20
    };

    expect(
      evaluateExpression('params.ancho_base', paramsWithUnderscore)
    ).toBe(30);

    expect(
      evaluateExpression('params.ancho_punta * 2', paramsWithUnderscore)
    ).toBe(40);

    expect(
      evaluateExpression(
        'params.ancho_base - params.ancho_punta',
        paramsWithUnderscore
      )
    ).toBe(10);
  });

  it('debe evitar reemplazos parciales de nombres', () => {
    const paramsWithSimilarNames = {
      ancho: 50,
      ancho_base: 60,
      ancho_base_extra: 70
    };

    // "ancho_base" no debe reemplazar parcialmente "ancho_base_extra"
    expect(
      evaluateExpression('params.ancho_base_extra', paramsWithSimilarNames)
    ).toBe(70);

    expect(
      evaluateExpression('params.ancho_base', paramsWithSimilarNames)
    ).toBe(60);

    expect(
      evaluateExpression('params.ancho', paramsWithSimilarNames)
    ).toBe(50);
  });

  it('debe retornar 0 en expresiones inválidas', () => {
    expect(evaluateExpression('params.noexiste', params)).toBe(0);
    expect(evaluateExpression('invalid syntax +++', params)).toBe(0);
  });

  it('debe manejar espacios en blanco', () => {
    expect(
      evaluateExpression('  params.longitud  *  0.5  ', params)
    ).toBe(50);
  });
});

describe('evaluateBatch', () => {
  const params = {
    longitud: 100,
    ancho: 50
  };

  it('debe evaluar múltiples expresiones', () => {
    const expressions = {
      x: 'params.longitud * 0.5',
      y: 'params.ancho + 10',
      z: 0
    };

    const result = evaluateBatch(expressions, params);

    expect(result).toEqual({
      x: 50,
      y: 60,
      z: 0
    });
  });

  it('debe manejar objetos vacíos', () => {
    const result = evaluateBatch({}, params);
    expect(result).toEqual({});
  });
});

describe('validateExpression', () => {
  const availableParams = ['longitud', 'ancho', 'grosor'];

  it('debe validar números literales', () => {
    expect(validateExpression(42, availableParams).valid).toBe(true);
    expect(validateExpression('3.14', availableParams).valid).toBe(true);
  });

  it('debe validar expresiones con parámetros existentes', () => {
    expect(
      validateExpression('params.longitud', availableParams).valid
    ).toBe(true);

    expect(
      validateExpression('params.longitud * 0.5', availableParams).valid
    ).toBe(true);

    expect(
      validateExpression(
        'params.longitud + params.ancho',
        availableParams
      ).valid
    ).toBe(true);
  });

  it('debe rechazar expresiones con parámetros inexistentes', () => {
    const result = validateExpression('params.noexiste', availableParams);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('noexiste');
  });

  it('debe validar expresiones con Math', () => {
    expect(
      validateExpression('Math.sqrt(params.longitud)', availableParams).valid
    ).toBe(true);

    expect(
      validateExpression(
        'Math.max(params.ancho, params.grosor)',
        availableParams
      ).valid
    ).toBe(true);
  });

  it('debe rechazar caracteres peligrosos', () => {
    const result = validateExpression(
      'params.longitud; alert("hack")',
      availableParams
    );
    expect(result.valid).toBe(false);
  });
});

describe('detectCircularDependencies', () => {
  it('debe detectar dependencias lineales (sin ciclos)', () => {
    const params = {
      a: 10,
      b: 'params.a * 2',
      c: 'params.b + 5'
    };

    const result = detectCircularDependencies(params);
    expect(result.circular).toBe(false);
  });

  it('debe detectar ciclos simples', () => {
    const params = {
      a: 'params.b + 1',
      b: 'params.a + 1'
    };

    const result = detectCircularDependencies(params);
    expect(result.circular).toBe(true);
    expect(result.cycle).toBeDefined();
  });

  it('debe detectar ciclos complejos', () => {
    const params = {
      a: 'params.b',
      b: 'params.c',
      c: 'params.a'
    };

    const result = detectCircularDependencies(params);
    expect(result.circular).toBe(true);
  });

  it('debe manejar parámetros sin dependencias', () => {
    const params = {
      a: 10,
      b: 20,
      c: 30
    };

    const result = detectCircularDependencies(params);
    expect(result.circular).toBe(false);
  });

  it('debe manejar mezcla de literales y expresiones', () => {
    const params = {
      base: 100,
      mitad: 'params.base / 2',
      cuarto: 'params.mitad / 2',
      literal: 42
    };

    const result = detectCircularDependencies(params);
    expect(result.circular).toBe(false);
  });
});

describe('casos de uso reales', () => {
  it('debe evaluar vértices de férula anatómica', () => {
    const params = {
      longitud: 70,
      ancho_proximal: 22,
      ancho_distal: 16,
      curvatura_lateral: 3
    };

    const vertices = {
      base_izq: {
        x: 0,
        y: 0
      },
      base_der: {
        x: 0,
        y: 'params.ancho_proximal'
      },
      punta_izq: {
        x: 'params.longitud',
        y: 'params.ancho_proximal / 2 - params.ancho_distal / 2'
      },
      punta_der: {
        x: 'params.longitud',
        y: 'params.ancho_proximal / 2 + params.ancho_distal / 2'
      },
      ctrl_base_izq: {
        x: 'params.longitud * 0.3',
        y: '-params.curvatura_lateral'
      }
    };

    // Evaluar todos los vértices
    const evaluatedVertices = Object.fromEntries(
      Object.entries(vertices).map(([id, vertex]) => [
        id,
        {
          x: evaluateExpression(vertex.x, params),
          y: evaluateExpression(vertex.y, params)
        }
      ])
    );

    expect(evaluatedVertices.base_izq).toEqual({ x: 0, y: 0 });
    expect(evaluatedVertices.base_der).toEqual({ x: 0, y: 22 });
    expect(evaluatedVertices.punta_izq).toEqual({ x: 70, y: 3 });
    expect(evaluatedVertices.punta_der).toEqual({ x: 70, y: 19 });
    expect(evaluatedVertices.ctrl_base_izq).toEqual({ x: 21, y: -3 });
  });

  it('debe evaluar extrusión paramétrica', () => {
    const params = {
      grosor: 2.5
    };

    const extrusion = {
      height: 'params.grosor',
      bevelThickness: 0.3,
      bevelSize: 0.3
    };

    expect(evaluateExpression(extrusion.height, params)).toBe(2.5);
    expect(evaluateExpression(extrusion.bevelThickness, params)).toBe(0.3);
  });

  it('debe manejar cálculos de ventilaciones', () => {
    const params = {
      longitud: 90,
      ancho: 60,
      radio_ventilacion: 3
    };

    const ventilacionCentro = {
      x: 'params.longitud * 0.5',
      y: 'params.ancho * 0.5'
    };

    const ventilacionTop = {
      x: 'params.longitud * 0.5',
      y: 'params.ancho * 0.5 - params.radio_ventilacion'
    };

    expect(
      evaluateExpression(ventilacionCentro.x, params)
    ).toBe(45);

    expect(
      evaluateExpression(ventilacionCentro.y, params)
    ).toBe(30);

    expect(
      evaluateExpression(ventilacionTop.y, params)
    ).toBe(27);
  });
});
