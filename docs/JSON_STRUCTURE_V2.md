# Estructura JSON v2.0 - Sistema SVG Paramétrico

## Conceptos Clave

1. **Vértices**: Puntos con coordenadas fijas o paramétricas
2. **Contornos**: Paths SVG que forman formas cerradas
3. **Extrusión**: Altura para convertir 2D → 3D
4. **Agujeros**: Contornos interiores (ventilaciones, cortes)

---

## Estructura General

```json
{
  "name": "Nombre del Template",
  "type": "svg_parametric",
  "version": "2.0",

  "ui_controls": [
    {
      "id": "longitud",
      "label": "Longitud de Férula",
      "type": "slider",
      "min": 50,
      "max": 150,
      "step": 5,
      "default": 100,
      "unit": "mm"
    }
  ],

  "params": {
    "longitud": 100,
    "ancho": 40,
    "grosor": 3,
    "radio_esquina": 5,
    "color": "#60a5fa"
  },

  "geometry": {
    "vertices": {
      "v1": { "x": 0, "y": 0 },
      "v2": { "x": "params.longitud", "y": 0 },
      "v3": { "x": "params.longitud", "y": "params.ancho" },
      "v4": { "x": 0, "y": "params.ancho" }
    },

    "contours": [
      {
        "id": "exterior",
        "type": "outer",
        "closed": true,
        "elements": [
          { "type": "line", "from": "v1", "to": "v2" },
          { "type": "line", "from": "v2", "to": "v3" },
          { "type": "line", "from": "v3", "to": "v4" },
          { "type": "line", "from": "v4", "to": "v1" }
        ]
      }
    ],

    "extrusion": {
      "height": "params.grosor",
      "bevel": true,
      "bevelThickness": 0.5,
      "bevelSize": 0.5,
      "bevelSegments": 3
    }
  }
}
```

---

## 1. Definición de Vértices

### Vértices Fijos
```json
"vertices": {
  "origen": { "x": 0, "y": 0 },
  "esquina_superior_derecha": { "x": 100, "y": 50 }
}
```

### Vértices Paramétricos
```json
"vertices": {
  "v1": { "x": 0, "y": 0 },
  "v2": { "x": "params.longitud", "y": 0 },
  "v3": {
    "x": "params.longitud * 0.8",
    "y": "params.ancho + 10"
  },
  "v4": {
    "x": "params.longitud / 2",
    "y": "params.ancho * 1.5"
  }
}
```

### Operadores Soportados
- Aritméticos: `+`, `-`, `*`, `/`
- Paréntesis: `(params.a + params.b) * 2`
- Funciones matemáticas: `Math.sqrt()`, `Math.sin()`, `Math.cos()`

---

## 2. Tipos de Elementos en Contornos

### Line (Línea Recta)
```json
{
  "type": "line",
  "from": "v1",
  "to": "v2"
}
```

### Arc (Arco Circular)
```json
{
  "type": "arc",
  "from": "v1",
  "to": "v2",
  "radius": 10,
  "clockwise": true
}
```

### Bezier Quadratic (Curva Cuadrática)
```json
{
  "type": "bezier_quadratic",
  "from": "v1",
  "to": "v3",
  "control": "v2"
}
```

### Bezier Cubic (Curva Cúbica)
```json
{
  "type": "bezier_cubic",
  "from": "v1",
  "to": "v4",
  "control1": "v2",
  "control2": "v3"
}
```

---

## 3. Contornos (Outer + Holes)

### Contorno Exterior
```json
{
  "id": "exterior",
  "type": "outer",
  "closed": true,
  "elements": [
    { "type": "line", "from": "v1", "to": "v2" },
    { "type": "arc", "from": "v2", "to": "v3", "radius": 5 },
    { "type": "line", "from": "v3", "to": "v4" },
    { "type": "line", "from": "v4", "to": "v1" }
  ]
}
```

### Agujeros/Ventilaciones
```json
{
  "id": "ventilacion_1",
  "type": "hole",
  "closed": true,
  "elements": [
    { "type": "line", "from": "h1", "to": "h2" },
    { "type": "line", "from": "h2", "to": "h3" },
    { "type": "line", "from": "h3", "to": "h4" },
    { "type": "line", "from": "h4", "to": "h1" }
  ]
}
```

---

## 4. Configuración de Extrusión

```json
"extrusion": {
  "height": "params.grosor",          // Altura de extrusión (paramétrico)
  "bevel": true,                      // Bordes redondeados
  "bevelThickness": 0.5,              // Grosor del bisel
  "bevelSize": 0.5,                   // Tamaño del bisel
  "bevelSegments": 3,                 // Suavidad del bisel
  "curveSegments": 12,                // Segmentos para curvas
  "steps": 1                          // Pasos de extrusión
}
```

---

## 5. Sistema de Parámetros e Impactos

### Definición de UI Controls
```json
"ui_controls": [
  {
    "id": "talla",
    "label": "Talla del Paciente",
    "type": "slider",
    "min": 0.7,
    "max": 1.3,
    "step": 0.05,
    "default": 1.0,
    "impacts": {
      "longitud": { "operation": "multiply", "value": 100 },
      "ancho": { "operation": "multiply", "value": 40 }
    }
  },
  {
    "id": "grosor_material",
    "label": "Grosor del Material",
    "type": "slider",
    "min": 2,
    "max": 5,
    "step": 0.5,
    "default": 3,
    "impacts": {
      "grosor": { "operation": "set", "value": null }
    }
  }
]
```

### Tipos de Impactos
1. **multiply**: `param_final = slider_value * base_value`
2. **set**: `param_final = slider_value`
3. **add**: `param_final = base_value + slider_value`

---

## Ejemplo Completo 1: Férula Rectangular con Ventilaciones

```json
{
  "name": "Férula Básica con Ventilación",
  "type": "svg_parametric",
  "version": "2.0",

  "ui_controls": [
    {
      "id": "largo",
      "label": "Largo de Férula",
      "type": "slider",
      "min": 60,
      "max": 120,
      "step": 5,
      "default": 80,
      "unit": "mm",
      "impacts": {
        "longitud": { "operation": "set", "value": null }
      }
    },
    {
      "id": "ancho",
      "label": "Ancho de Férula",
      "type": "slider",
      "min": 20,
      "max": 50,
      "step": 2,
      "default": 30,
      "unit": "mm",
      "impacts": {
        "ancho": { "operation": "set", "value": null }
      }
    },
    {
      "id": "grosor",
      "label": "Grosor Material",
      "type": "slider",
      "min": 2,
      "max": 5,
      "step": 0.5,
      "default": 3,
      "unit": "mm",
      "impacts": {
        "grosor": { "operation": "set", "value": null }
      }
    }
  ],

  "params": {
    "longitud": 80,
    "ancho": 30,
    "grosor": 3,
    "radio_esquina": 3,
    "margen_agujero": 10,
    "tam_agujero": 8,
    "color": "#60a5fa"
  },

  "geometry": {
    "vertices": {
      "v1": { "x": 0, "y": 0 },
      "v2": { "x": "params.longitud", "y": 0 },
      "v3": { "x": "params.longitud", "y": "params.ancho" },
      "v4": { "x": 0, "y": "params.ancho" },

      "h1": {
        "x": "params.longitud / 2 - params.tam_agujero / 2",
        "y": "params.ancho / 2 - params.tam_agujero / 2"
      },
      "h2": {
        "x": "params.longitud / 2 + params.tam_agujero / 2",
        "y": "params.ancho / 2 - params.tam_agujero / 2"
      },
      "h3": {
        "x": "params.longitud / 2 + params.tam_agujero / 2",
        "y": "params.ancho / 2 + params.tam_agujero / 2"
      },
      "h4": {
        "x": "params.longitud / 2 - params.tam_agujero / 2",
        "y": "params.ancho / 2 + params.tam_agujero / 2"
      }
    },

    "contours": [
      {
        "id": "exterior",
        "type": "outer",
        "closed": true,
        "elements": [
          { "type": "line", "from": "v1", "to": "v2" },
          { "type": "line", "from": "v2", "to": "v3" },
          { "type": "line", "from": "v3", "to": "v4" },
          { "type": "line", "from": "v4", "to": "v1" }
        ]
      },
      {
        "id": "agujero_central",
        "type": "hole",
        "closed": true,
        "elements": [
          { "type": "line", "from": "h1", "to": "h2" },
          { "type": "line", "from": "h2", "to": "h3" },
          { "type": "line", "from": "h3", "to": "h4" },
          { "type": "line", "from": "h4", "to": "h1" }
        ]
      }
    ],

    "extrusion": {
      "height": "params.grosor",
      "bevel": true,
      "bevelThickness": 0.3,
      "bevelSize": 0.3,
      "bevelSegments": 3,
      "curveSegments": 12
    }
  }
}
```

---

## Ejemplo Completo 2: Férula con Curvas y Múltiples Ventilaciones

```json
{
  "name": "Férula Ergonómica con Ventilación",
  "type": "svg_parametric",
  "version": "2.0",

  "ui_controls": [
    {
      "id": "escala",
      "label": "Escala General",
      "type": "slider",
      "min": 0.7,
      "max": 1.5,
      "step": 0.1,
      "default": 1.0,
      "impacts": {
        "longitud": { "operation": "multiply", "value": 100 },
        "ancho_base": { "operation": "multiply", "value": 35 },
        "ancho_punta": { "operation": "multiply", "value": 25 }
      }
    }
  ],

  "params": {
    "longitud": 100,
    "ancho_base": 35,
    "ancho_punta": 25,
    "grosor": 3,
    "color": "#34d399"
  },

  "geometry": {
    "vertices": {
      "v1": { "x": 0, "y": 0 },
      "v2": { "x": "params.longitud", "y": 0 },
      "v3": { "x": "params.longitud", "y": "params.ancho_punta" },
      "v4": { "x": 0, "y": "params.ancho_base" },

      "c1": { "x": "params.longitud * 0.5", "y": "-5" },
      "c2": { "x": "params.longitud * 1.1", "y": "params.ancho_punta / 2" },
      "c3": { "x": "params.longitud * 0.5", "y": "params.ancho_base + 5" },
      "c4": { "x": "-10", "y": "params.ancho_base / 2" },

      "hole1_v1": { "x": "params.longitud * 0.3 - 4", "y": "params.ancho_base * 0.5 - 4" },
      "hole1_v2": { "x": "params.longitud * 0.3 + 4", "y": "params.ancho_base * 0.5 - 4" },
      "hole1_v3": { "x": "params.longitud * 0.3 + 4", "y": "params.ancho_base * 0.5 + 4" },
      "hole1_v4": { "x": "params.longitud * 0.3 - 4", "y": "params.ancho_base * 0.5 + 4" },

      "hole2_v1": { "x": "params.longitud * 0.7 - 3", "y": "params.ancho_punta * 0.5 - 3" },
      "hole2_v2": { "x": "params.longitud * 0.7 + 3", "y": "params.ancho_punta * 0.5 - 3" },
      "hole2_v3": { "x": "params.longitud * 0.7 + 3", "y": "params.ancho_punta * 0.5 + 3" },
      "hole2_v4": { "x": "params.longitud * 0.7 - 3", "y": "params.ancho_punta * 0.5 + 3" }
    },

    "contours": [
      {
        "id": "exterior",
        "type": "outer",
        "closed": true,
        "elements": [
          { "type": "bezier_quadratic", "from": "v1", "to": "v2", "control": "c1" },
          { "type": "bezier_quadratic", "from": "v2", "to": "v3", "control": "c2" },
          { "type": "bezier_quadratic", "from": "v3", "to": "v4", "control": "c3" },
          { "type": "bezier_quadratic", "from": "v4", "to": "v1", "control": "c4" }
        ]
      },
      {
        "id": "ventilacion_1",
        "type": "hole",
        "closed": true,
        "elements": [
          { "type": "line", "from": "hole1_v1", "to": "hole1_v2" },
          { "type": "line", "from": "hole1_v2", "to": "hole1_v3" },
          { "type": "line", "from": "hole1_v3", "to": "hole1_v4" },
          { "type": "line", "from": "hole1_v4", "to": "hole1_v1" }
        ]
      },
      {
        "id": "ventilacion_2",
        "type": "hole",
        "closed": true,
        "elements": [
          { "type": "line", "from": "hole2_v1", "to": "hole2_v2" },
          { "type": "line", "from": "hole2_v2", "to": "hole2_v3" },
          { "type": "line", "from": "hole2_v3", "to": "hole2_v4" },
          { "type": "line", "from": "hole2_v4", "to": "hole2_v1" }
        ]
      }
    ],

    "extrusion": {
      "height": "params.grosor",
      "bevel": true,
      "bevelThickness": 0.4,
      "bevelSize": 0.4,
      "bevelSegments": 4,
      "curveSegments": 24
    }
  }
}
```

---

## Validaciones Requeridas

### Al cargar/editar template:

1. **Vértices únicos**: No puede haber IDs duplicados
2. **Referencias válidas**: Todos los `from`/`to`/`control` deben existir en `vertices`
3. **Contornos cerrados**: El último elemento debe conectar con el primero
4. **Al menos 1 outer**: Debe haber exactamente 1 contorno tipo "outer"
5. **Holes dentro de outer**: Agujeros deben estar contenidos en el exterior
6. **Expresiones válidas**: Las expresiones paramétricas deben ser evaluables

### Errores comunes a detectar:

```json
// ❌ MAL: Contorno no cerrado
{
  "elements": [
    { "type": "line", "from": "v1", "to": "v2" },
    { "type": "line", "from": "v2", "to": "v3" }
    // Falta cerrar: v3 → v1
  ]
}

// ✅ BIEN: Contorno cerrado
{
  "elements": [
    { "type": "line", "from": "v1", "to": "v2" },
    { "type": "line", "from": "v2", "to": "v3" },
    { "type": "line", "from": "v3", "to": "v1" }
  ]
}
```

---

## Migración desde v1.0

Los templates antiguos (tipo `calculated_flat`) seguirán funcionando:

```js
// Detector de versión
if (template.type === "calculated_flat") {
  // Usar renderizado antiguo (RoundedBox)
  return <RoundedBox args={[w, t, l]} />
}

if (template.type === "svg_parametric") {
  // Usar nuevo renderizado (ExtrudeGeometry)
  return <ExtrudedSVGModel geometry={template.geometry} />
}
```

---

## Próximos Pasos

1. ✅ Diseñar estructura JSON
2. ⏳ Crear parser de expresiones paramétricas
3. ⏳ Implementar generador de Shape de Three.js
4. ⏳ Integrar ExtrudeGeometry con bevel
5. ⏳ Actualizar TemplateEditor con validaciones
6. ⏳ Crear templates de ejemplo reales

---

## Notas de Implementación

### Parser de Expresiones
```ts
function evaluateExpression(expr: string, params: Record<string, number>): number {
  // Si es número literal, retornar directo
  if (!isNaN(Number(expr))) return Number(expr);

  // Reemplazar "params.xxx" por valores reales
  let evaluated = expr;
  for (const [key, value] of Object.entries(params)) {
    evaluated = evaluated.replace(new RegExp(`params\\.${key}`, 'g'), String(value));
  }

  // Evaluar matemática con Function constructor (sandbox seguro)
  try {
    return new Function(`return ${evaluated}`)();
  } catch (e) {
    console.error(`Error evaluando expresión: ${expr}`, e);
    return 0;
  }
}
```

### Generador de Shape
```ts
import { Shape, Vector2 } from 'three';

function createShapeFromContour(contour, vertices, params) {
  const shape = new Shape();

  contour.elements.forEach((element, index) => {
    const fromVertex = vertices[element.from];
    const toVertex = vertices[element.to];

    const fromX = evaluateExpression(String(fromVertex.x), params);
    const fromY = evaluateExpression(String(fromVertex.y), params);
    const toX = evaluateExpression(String(toVertex.x), params);
    const toY = evaluateExpression(String(toVertex.y), params);

    if (index === 0) {
      shape.moveTo(fromX, fromY);
    }

    switch (element.type) {
      case 'line':
        shape.lineTo(toX, toY);
        break;

      case 'arc':
        // Implementar lógica de arco
        break;

      case 'bezier_quadratic':
        const ctrlVertex = vertices[element.control];
        const ctrlX = evaluateExpression(String(ctrlVertex.x), params);
        const ctrlY = evaluateExpression(String(ctrlVertex.y), params);
        shape.quadraticCurveTo(ctrlX, ctrlY, toX, toY);
        break;

      // ... otros tipos
    }
  });

  return shape;
}
```

---

## Compatibilidad con STL Export

El sistema actual de exportación STL funcionará sin cambios, ya que Three.js `ExtrudeGeometry` genera mallas estándar exportables.

```ts
// En export.ts - sin cambios necesarios
const exporter = new STLExporter();
const stlString = exporter.parse(scene, { binary: true });
```
