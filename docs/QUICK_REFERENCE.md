# Guía Rápida de Referencia - Sistema SVG Paramétrico v2.0

## 🚀 Inicio Rápido

### Estructura Mínima de Template

```json
{
  "name": "Mi Férula",
  "type": "svg_parametric",
  "version": "2.0",

  "params": {
    "longitud": 100,
    "ancho": 50,
    "grosor": 3
  },

  "ui_controls": [
    {
      "id": "longitud",
      "label": "Longitud",
      "type": "slider",
      "min": 50,
      "max": 150,
      "default": 100,
      "impacts": {
        "longitud": { "operation": "set", "value": null }
      }
    }
  ],

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
      "bevelThickness": 0.3,
      "bevelSize": 0.3,
      "bevelSegments": 3
    }
  }
}
```

---

## 📐 Tipos de Elementos SVG

### 1. Línea Recta
```json
{
  "type": "line",
  "from": "v1",
  "to": "v2"
}
```

### 2. Arco Circular
```json
{
  "type": "arc",
  "from": "v1",
  "to": "v2",
  "radius": 10,
  "clockwise": true
}
```

### 3. Curva Bézier Cuadrática (1 punto de control)
```json
{
  "type": "bezier_quadratic",
  "from": "v1",
  "to": "v2",
  "control": "c1"
}
```

### 4. Curva Bézier Cúbica (2 puntos de control)
```json
{
  "type": "bezier_cubic",
  "from": "v1",
  "to": "v2",
  "control1": "c1",
  "control2": "c2"
}
```

---

## 🎯 Expresiones Paramétricas

### Números Literales
```json
{ "x": 10, "y": 20 }
```

### Referencias a Parámetros
```json
{ "x": "params.longitud", "y": "params.ancho" }
```

### Operaciones Aritméticas
```json
{
  "x": "params.longitud * 0.5",
  "y": "params.ancho + 10"
}
```

### Expresiones Complejas
```json
{
  "x": "(params.longitud + params.ancho) / 2",
  "y": "params.ancho * 0.75 - 5"
}
```

### Funciones Matemáticas
```json
{
  "x": "Math.sqrt(params.area)",
  "y": "Math.max(params.a, params.b)",
  "z": "Math.PI * params.radio"
}
```

**Funciones disponibles:**
- `Math.sqrt(x)` - Raíz cuadrada
- `Math.pow(x, y)` - Potencia
- `Math.abs(x)` - Valor absoluto
- `Math.max(a, b, c, ...)` - Máximo
- `Math.min(a, b, c, ...)` - Mínimo
- `Math.sin(x)`, `Math.cos(x)`, `Math.tan(x)` - Trigonométricas
- `Math.PI` - Constante π
- `Math.round(x)`, `Math.floor(x)`, `Math.ceil(x)` - Redondeo

---

## 🕳️ Agujeros y Ventilaciones

### Agujero Rectangular
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

Vértices del agujero:
```json
"h1": { "x": "params.longitud * 0.5 - 5", "y": "params.ancho * 0.5 - 5" },
"h2": { "x": "params.longitud * 0.5 + 5", "y": "params.ancho * 0.5 - 5" },
"h3": { "x": "params.longitud * 0.5 + 5", "y": "params.ancho * 0.5 + 5" },
"h4": { "x": "params.longitud * 0.5 - 5", "y": "params.ancho * 0.5 + 5" }
```

### Agujero Circular (con arcos)
```json
{
  "id": "ventilacion_circular",
  "type": "hole",
  "closed": true,
  "elements": [
    { "type": "arc", "from": "c_top", "to": "c_right", "radius": 3, "clockwise": true },
    { "type": "arc", "from": "c_right", "to": "c_bottom", "radius": 3, "clockwise": true },
    { "type": "arc", "from": "c_bottom", "to": "c_left", "radius": 3, "clockwise": true },
    { "type": "arc", "from": "c_left", "to": "c_top", "radius": 3, "clockwise": true }
  ]
}
```

Vértices (4 puntos cardinales del círculo):
```json
"c_top": { "x": "params.cx", "y": "params.cy - params.radio" },
"c_right": { "x": "params.cx + params.radio", "y": "params.cy" },
"c_bottom": { "x": "params.cx", "y": "params.cy + params.radio" },
"c_left": { "x": "params.cx - params.radio", "y": "params.cy" }
```

---

## 🎚️ Sistema de UI Controls e Impactos

### Tipos de Operaciones

#### 1. Set (Asignar directamente)
```json
{
  "id": "grosor",
  "impacts": {
    "grosor": { "operation": "set", "value": null }
  }
}
```
Resultado: `params.grosor = slider_value`

#### 2. Multiply (Multiplicar)
```json
{
  "id": "escala",
  "impacts": {
    "longitud": { "operation": "multiply", "value": 100 },
    "ancho": { "operation": "multiply", "value": 50 }
  }
}
```
Resultado:
- `params.longitud = slider_value * 100`
- `params.ancho = slider_value * 50`

#### 3. Add (Sumar)
```json
{
  "id": "margen",
  "impacts": {
    "ancho_total": { "operation": "add", "value": null }
  }
}
```
Resultado: `params.ancho_total = base_value + slider_value`

---

## ⚙️ Configuración de Extrusión

### Opciones Completas
```json
"extrusion": {
  "height": "params.grosor",        // Altura de extrusión (REQUERIDO)
  "bevel": true,                    // Activar bordes redondeados
  "bevelThickness": 0.3,            // Grosor del bisel
  "bevelSize": 0.3,                 // Tamaño del bisel
  "bevelSegments": 3,               // Suavidad del bisel (más = más suave)
  "curveSegments": 12,              // Segmentos para curvas (más = más suave)
  "steps": 1                        // Pasos de extrusión
}
```

### Valores Recomendados

**Para férulas suaves (redondeadas):**
```json
{
  "bevel": true,
  "bevelThickness": 0.4,
  "bevelSize": 0.4,
  "bevelSegments": 4,
  "curveSegments": 24
}
```

**Para férulas angulares (más definidas):**
```json
{
  "bevel": true,
  "bevelThickness": 0.2,
  "bevelSize": 0.2,
  "bevelSegments": 2,
  "curveSegments": 12
}
```

**Sin bisel (bordes rectos):**
```json
{
  "bevel": false,
  "curveSegments": 12
}
```

---

## 🔍 Validación y Debugging

### Uso del Evaluador
```ts
import { evaluateExpression, debug } from './utils/paramEvaluator';

const params = { longitud: 100, ancho: 50 };

// Evaluar expresión
const result = evaluateExpression("params.longitud * 0.5", params);
// => 50

// Debugging detallado
debug.traceEvaluation("params.longitud * 0.5 + params.ancho", params);
// Imprime paso a paso la evaluación
```

### Validar Template Completo
```ts
import { debug } from './utils/paramEvaluator';

const validation = debug.validateTemplate(geometry, params);

if (!validation.valid) {
  console.error("Errores:", validation.errors);
}

if (validation.warnings.length > 0) {
  console.warn("Advertencias:", validation.warnings);
}
```

### Validar Geometría
```ts
import { validateGeometryDefinition } from './utils/svgToThree';

const result = validateGeometryDefinition(geometry);

if (!result.valid) {
  console.error("Geometría inválida:", result.errors);
}
```

---

## 🎨 Patrones Comunes

### Forma que se estrecha (Férula de dedo)
```json
"vertices": {
  "base_izq": { "x": 0, "y": 0 },
  "base_der": { "x": 0, "y": "params.ancho_base" },
  "punta_izq": {
    "x": "params.longitud",
    "y": "(params.ancho_base - params.ancho_punta) / 2"
  },
  "punta_der": {
    "x": "params.longitud",
    "y": "(params.ancho_base + params.ancho_punta) / 2"
  }
}
```

### Esquinas redondeadas
```json
// Vértices de las esquinas (con offset de radio)
"esq_inf_izq": { "x": "params.radio", "y": "params.radio" },
"esq_inf_der": { "x": "params.longitud - params.radio", "y": "params.radio" },

// Elementos con arcos
{
  "type": "arc",
  "from": "esq_inf_der",
  "to": "punto_siguiente",
  "radius": "params.radio",
  "clockwise": true
}
```

### Patrón de ventilación en grid
```ts
// Generar programáticamente:
for (let i = 0; i < 3; i++) {
  for (let j = 0; j < 2; j++) {
    const id = `vent_${i}_${j}`;
    const x = `params.longitud * ${(i + 1) / 4}`;
    const y = `params.ancho * ${(j + 1) / 3}`;
    // Crear vértices y contornos...
  }
}
```

### Curva anatómica suave
```json
"vertices": {
  "p1": { "x": 0, "y": "params.ancho * 0.2" },
  "p2": { "x": "params.longitud", "y": "params.ancho * 0.8" },
  "ctrl": {
    "x": "params.longitud * 0.5",
    "y": "params.ancho * 0.5 + params.curvatura"
  }
},
"elements": [
  {
    "type": "bezier_quadratic",
    "from": "p1",
    "to": "p2",
    "control": "ctrl"
  }
]
```

---

## ⚠️ Errores Comunes y Soluciones

### Error: "Contorno no cerrado"
**Problema:** Último elemento no conecta con el primero

**Solución:**
```json
// ❌ MAL
[
  { "from": "v1", "to": "v2" },
  { "from": "v2", "to": "v3" }
]

// ✅ BIEN
[
  { "from": "v1", "to": "v2" },
  { "from": "v2", "to": "v3" },
  { "from": "v3", "to": "v1" }  // Cierra el contorno
]
```

### Error: "Vértice no encontrado"
**Problema:** ID de vértice mal escrito o no existe

**Solución:** Verificar que todos los IDs en `from`, `to`, `control` existan en `vertices`

### Error: "Radio muy pequeño para arco"
**Problema:** El radio es menor que la mitad de la distancia entre puntos

**Solución:**
- Aumentar el `radius`
- O acercar los puntos
- O usar línea recta si no importa el arco

### Warning: "Parámetro no encontrado"
**Problema:** Expresión referencia parámetro inexistente

**Solución:**
```json
// ❌ MAL
{ "x": "params.no_existe" }

// ✅ BIEN - Asegurar que el parámetro exista en params
"params": {
  "no_existe": 10
}
```

---

## 📏 Convenciones y Mejores Prácticas

### Nomenclatura

**Vértices:**
- Descriptivos: `base_izq`, `punta_der`, `ctrl_curva_1`
- O sistemáticos: `v1`, `v2`, `v3`

**Contornos:**
- `exterior` para el contorno principal
- `ventilacion_1`, `ventilacion_2` para agujeros
- `agujero_correa`, `ranura_velcro` para funcionales

**Parámetros:**
- Snake case: `ancho_base`, `longitud_total`
- Unidades implícitas en mm: `grosor` = 3 significa 3mm

### Orden de Elementos

1. Siempre en sentido horario o antihorario consistente
2. Comenzar desde un punto lógico (ej: esquina inferior izquierda)
3. Contornos de agujeros en sentido opuesto al exterior

### Performance

**Para mejor rendimiento:**
- Usar menos `curveSegments` (8-12) en desarrollo
- Aumentar a 24-32 para producción/export
- Minimizar número de vértices cuando sea posible
- Cachear geometría calculada si los parámetros no cambian

---

## 🔗 Uso en Código React

### Renderizar Template v2.0
```tsx
import { svgGeometryToThree } from '@/utils/svgToThree';

function SVGParametricModel({ template, params }) {
  const geometry = useMemo(() => {
    return svgGeometryToThree(template.geometry, params);
  }, [template, params]);

  const color = params.color || '#60a5fa';

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={color} />
    </mesh>
  );
}
```

### Detectar Tipo de Template
```tsx
function ParametricModel({ data }) {
  if (data.type === 'calculated_flat') {
    // Renderizado v1.0 (RoundedBox)
    return <LegacyModel data={data} />;
  }

  if (data.type === 'svg_parametric') {
    // Renderizado v2.0 (ExtrudeGeometry)
    return <SVGParametricModel template={data} params={data.params} />;
  }

  return null;
}
```

---

## 📦 Exports Útiles

```ts
// Evaluador de expresiones
export {
  evaluateExpression,
  evaluateBatch,
  validateExpression,
  detectCircularDependencies,
  debug
} from './utils/paramEvaluator';

// Motor SVG → Three.js
export {
  svgGeometryToThree,
  validateGeometryDefinition,
  calculateBounds2D,
  generateSVGPreview
} from './utils/svgToThree';

// Tipos TypeScript
export type {
  ParamContext,
  VertexDefinition,
  PathElement,
  Contour,
  ExtrusionSettings,
  SVGGeometryDefinition
} from './utils/svgToThree';
```

---

## 📚 Más Información

- **Especificación completa:** `docs/JSON_STRUCTURE_V2.md`
- **Resumen ejecutivo:** `docs/RESUMEN_DISENO.md`
- **Ejemplos completos:** `docs/examples/*.json`
- **Código fuente:** `src/utils/paramEvaluator.ts`, `src/utils/svgToThree.ts`

---

**Última actualización:** 2026-01-04
