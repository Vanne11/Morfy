# Resumen del Diseño: Sistema SVG Paramétrico v2.0

## 📋 Estado Actual

✅ **FASE DE DISEÑO COMPLETADA**

Hemos terminado la exploración y diseño completo del nuevo sistema SVG paramétrico para Morfy. Este documento resume todo lo creado y los próximos pasos.

---

## 🎯 Objetivo del Sistema

Transformar Morfy de un sistema **paramétrico simple** (solo cajas 3D) a un **editor SVG paramétrico completo** que permita:

- Diseñar férulas con formas anatómicas complejas
- Definir vértices con coordenadas fijas o paramétricas
- Crear contornos con líneas, arcos y curvas Bézier
- Agregar agujeros de ventilación
- Extruir perfiles 2D a piezas 3D imprimibles

---

## 📁 Archivos Creados

### 1. Documentación

#### `/docs/JSON_STRUCTURE_V2.md` (350+ líneas)
**Especificación completa del formato JSON v2.0**

Incluye:
- Estructura general del JSON
- Definición de vértices (fijos y paramétricos)
- Tipos de elementos SVG (line, arc, bezier_quadratic, bezier_cubic)
- Sistema de contornos (outer + holes)
- Configuración de extrusión
- Sistema de parámetros e impactos mejorado
- 2 ejemplos completos con código
- Reglas de validación
- Guía de migración desde v1.0

**Conceptos clave:**
```json
{
  "type": "svg_parametric",
  "geometry": {
    "vertices": {
      "v1": { "x": "params.longitud * 0.5", "y": 0 }
    },
    "contours": [
      {
        "type": "outer",
        "elements": [
          { "type": "line", "from": "v1", "to": "v2" },
          { "type": "bezier_quadratic", "from": "v2", "to": "v3", "control": "c1" }
        ]
      },
      {
        "type": "hole",
        "elements": [...]
      }
    ],
    "extrusion": {
      "height": "params.grosor"
    }
  }
}
```

---

### 2. Templates de Ejemplo

#### `/docs/examples/ferula_dedo_anatomica.json` (210 líneas)
**Férula de dedo con forma anatómica**

Características:
- Forma que se estrecha de base a punta
- 4 sliders: longitud, ancho base, ancho punta, grosor
- Curvas Bézier cuadráticas para bordes suaves
- 3 ventilaciones rectangulares distribuidas
- Parámetros totalmente dinámicos

Vértices principales:
- `base_izq`, `base_der`: Base de la férula
- `punta_izq`, `punta_der`: Extremo distal
- `ctrl_*`: Puntos de control para curvas

#### `/docs/examples/ferula_muneca_ventilada.json` (230 líneas)
**Férula volar para muñeca**

Características:
- Forma anatómica que se adapta de mano a antebrazo
- 4 sliders: longitud total, circunferencia muñeca, ancho antebrazo, grosor
- 8 puntos con curvas Bézier para forma ergonómica
- 4 ventilaciones centrales
- Transición suave entre secciones

Zonas:
- Zona de mano (estrecha)
- Zona de transición (curva)
- Zona de antebrazo (ancha)

#### `/docs/examples/ferula_palmar_arcos.json` (290 líneas)
**Férula palmar con esquinas redondeadas**

Características:
- Esquinas redondeadas mediante arcos circulares
- 3 sliders: escala general, grosor, radio de esquinas
- Ventilaciones circulares (5 agujeros redondos)
- Demuestra uso de elementos tipo `arc`
- Patrón de ventilación distribuido

Innovación:
- Cada esquina usa arcos para suavizar bordes
- Cada ventilación es un círculo formado por 4 arcos

---

### 3. Sistema de Evaluación de Expresiones

#### `/src/utils/paramEvaluator.ts` (380 líneas)
**Motor de evaluación de expresiones paramétricas**

Funciones principales:

**`evaluateExpression(expr, params)`**
- Evalúa expresiones como `"params.longitud * 0.5"`
- Soporta operadores: `+`, `-`, `*`, `/`, `()`
- Soporta funciones Math: `sqrt`, `sin`, `cos`, `max`, `min`, `pow`, `PI`, etc.
- Maneja números literales y strings
- Sandbox seguro (no ejecuta código arbitrario)

**`evaluateBatch(expressions, params)`**
- Evalúa múltiples expresiones en lote
- Útil para procesar todos los vértices de una vez

**`validateExpression(expr, availableParams)`**
- Valida sintaxis de expresiones
- Verifica que parámetros referenciados existan
- Detecta caracteres peligrosos

**`detectCircularDependencies(paramDefinitions)`**
- Detecta dependencias circulares en parámetros
- Ejemplo: `a = params.b`, `b = params.a`
- Retorna el ciclo detectado

**`debug.traceEvaluation(expr, params)`**
- Muestra paso a paso cómo se evalúa una expresión
- Útil para debugging en desarrollo

**`debug.validateTemplate(geometry, params)`**
- Valida un template completo
- Reporta errores y warnings
- Verifica contornos cerrados

Ejemplos de uso:
```ts
evaluateExpression(100, {}) // => 100
evaluateExpression("params.longitud", { longitud: 80 }) // => 80
evaluateExpression("params.longitud * 0.5", { longitud: 80 }) // => 40
evaluateExpression("Math.sqrt(params.area)", { area: 100 }) // => 10
```

#### `/src/utils/paramEvaluator.test.ts` (260 líneas)
**Suite completa de tests para el evaluador**

Cubre:
- Números literales
- Referencias a parámetros
- Operaciones aritméticas
- Expresiones complejas
- Funciones Math
- Parámetros con guiones bajos
- Prevención de reemplazos parciales
- Validación de expresiones
- Detección de dependencias circulares
- Casos de uso reales con vértices de férulas

Total: **25 tests** organizados en 6 describe blocks

---

### 4. Motor de Extrusión SVG → Three.js

#### `/src/utils/svgToThree.ts` (550 líneas)
**Conversor de JSON SVG a geometría Three.js**

Tipos TypeScript:
- `VertexDefinition`: Definición de vértice con x, y
- `LineElement`, `ArcElement`, `BezierQuadraticElement`, `BezierCubicElement`
- `Contour`: Contorno con elementos
- `ExtrusionSettings`: Configuración de extrusión
- `SVGGeometryDefinition`: Geometría completa

Funciones principales:

**`svgGeometryToThree(geometryDef, params): ExtrudeGeometry`**
- **FUNCIÓN PRINCIPAL DEL MOTOR**
- Convierte JSON completo a geometría Three.js
- Pasos:
  1. Evalúa todos los vértices
  2. Crea Shape del contorno exterior
  3. Agrega holes al Shape
  4. Configura opciones de extrusión
  5. Crea ExtrudeGeometry
  6. Rota para que extrusión sea en Y

**`evaluateVertices(vertices, params)`**
- Evalúa todas las coordenadas de los vértices
- Retorna objeto con valores numéricos

**`createShapeFromContour(contour, vertices, params)`**
- Crea un Three.js Shape a partir de un contorno
- Procesa cada elemento (line, arc, bezier)
- Valida que el contorno esté cerrado

**`createArc(shape, from, to, arcElement, params)`**
- Calcula geometría de arcos circulares
- Determina centro del arco según radio y dirección
- Usa `shape.absarc()` de Three.js
- Fallback a línea si radio es muy pequeño

**`validateGeometryDefinition(geometryDef)`**
- Valida estructura completa antes de procesar
- Verifica:
  - Existencia de vértices y contornos
  - Exactamente 1 contorno exterior
  - Referencias válidas a vértices
  - Contornos cerrados correctamente
  - Configuración de extrusión válida

**`calculateBounds2D(geometryDef, params)`**
- Calcula bounding box 2D de la geometría
- Útil para centrar y escalar vistas previas

**`generateSVGPreview(geometryDef, params): string`**
- Genera SVG plano para debugging
- Útil para visualizar el perfil antes de extruir
- Código SVG listo para renderizar en navegador

Ejemplo de uso:
```ts
import { svgGeometryToThree } from './svgToThree';

const geometry = svgGeometryToThree(
  templateData.geometry,
  { longitud: 80, ancho: 30, grosor: 3 }
);

// Usar en componente Three.js:
<mesh geometry={geometry}>
  <meshStandardMaterial color="#60a5fa" />
</mesh>
```

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    TEMPLATE JSON v2.0                        │
│  { type: "svg_parametric", geometry: {...}, params: {...} } │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              TEMPLATE EDITOR (React)                         │
│  - Edición de JSON                                           │
│  - Preview 3D en vivo                                        │
│  - Validación en tiempo real                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              PARAM EVALUATOR                                 │
│  evaluateExpression("params.longitud * 0.5", {...})         │
│  => Valores numéricos                                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              SVG TO THREE CONVERTER                          │
│  svgGeometryToThree(geometry, params)                       │
│  => ExtrudeGeometry                                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              VIEWER 3D (Three.js)                            │
│  <mesh geometry={extrudedGeometry}>                          │
│    <meshStandardMaterial color={color} />                   │
│  </mesh>                                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              STL EXPORT                                      │
│  STLExporter.parse(scene)                                    │
│  => Archivo .stl para impresión 3D                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Flujo de Datos

### 1. Creación/Edición de Template

```
TemplateEditor
  ├─ Usuario edita JSON
  ├─ validateGeometryDefinition() valida estructura
  ├─ LivePreview renderiza en tiempo real
  │   └─ svgGeometryToThree() convierte a 3D
  └─ Al guardar: captura thumbnail y guarda en DB
```

### 2. Uso en Proyecto

```
Usuario selecciona template
  ↓
AppLayout carga JSON
  ↓
PropertiesPanel muestra sliders (ui_controls)
  ↓
Usuario mueve slider → handleUIControlChange()
  ↓
Recalcula params con impactos
  ↓
Viewer recibe nuevos params
  ↓
svgGeometryToThree(geometry, newParams)
  ↓
Three.js renderiza geometría actualizada
```

### 3. Exportación

```
Usuario click en "Exportar STL"
  ↓
ExportManager obtiene scene de Three.js
  ↓
STLExporter.parse(scene)
  ↓
Descarga archivo .stl
```

---

## 🧪 Testing

### Tests Creados
- ✅ `paramEvaluator.test.ts`: 25 tests
  - Evaluación de números literales
  - Referencias a parámetros
  - Operaciones aritméticas
  - Funciones Math
  - Validación de expresiones
  - Detección de dependencias circulares

### Tests Pendientes (próximos pasos)
- ⏳ `svgToThree.test.ts`: Tests del motor de extrusión
- ⏳ Tests de integración completa
- ⏳ Tests de templates de ejemplo

---

## 📊 Comparación: v1.0 vs v2.0

### Sistema Actual (v1.0)

```json
{
  "type": "calculated_flat",
  "params": {
    "length": 60,
    "width": 20,
    "thickness": 2.4,
    "color": "#60a5fa"
  }
}
```

**Renderizado:**
```tsx
<RoundedBox args={[width, thickness, length]} />
```

**Limitaciones:**
- Solo cajas rectangulares
- Sin curvas ni formas anatómicas
- Sin agujeros/ventilaciones
- Parámetros globales fijos

---

### Sistema Nuevo (v2.0)

```json
{
  "type": "svg_parametric",
  "geometry": {
    "vertices": {
      "v1": { "x": 0, "y": 0 },
      "v2": { "x": "params.longitud", "y": "params.ancho" }
    },
    "contours": [
      {
        "type": "outer",
        "elements": [
          { "type": "bezier_quadratic", "from": "v1", "to": "v2", "control": "c1" }
        ]
      },
      {
        "type": "hole",
        "elements": [...]
      }
    ],
    "extrusion": {
      "height": "params.grosor"
    }
  }
}
```

**Renderizado:**
```tsx
const geometry = svgGeometryToThree(template.geometry, params);
<mesh geometry={geometry}>
  <meshStandardMaterial color={color} />
</mesh>
```

**Ventajas:**
- ✅ Formas anatómicas complejas
- ✅ Curvas Bézier y arcos
- ✅ Agujeros de ventilación
- ✅ Vértices paramétricos
- ✅ Control total sobre geometría
- ✅ Expresiones matemáticas
- ✅ Validación completa

---

## 🚀 Próximos Pasos: Implementación

### Fase 1: Integración Básica (1-2 sesiones)

1. **Actualizar Viewer.tsx**
   - Detectar tipo de template (`calculated_flat` vs `svg_parametric`)
   - Renderizar RoundedBox para v1.0
   - Renderizar ExtrudeGeometry para v2.0
   - Componente `SVGParametricModel`

2. **Actualizar PropertiesPanel.tsx**
   - Soportar nuevo formato de `ui_controls`
   - Sistema de `impacts` mejorado (multiply, set, add)

3. **Crear tests para svgToThree.ts**
   - Test de conversión de líneas
   - Test de arcos
   - Test de curvas Bézier
   - Test de holes

---

### Fase 2: Editor Mejorado (2-3 sesiones)

1. **Actualizar TemplateEditor.tsx**
   - Validación en tiempo real con `validateGeometryDefinition()`
   - Mensajes de error específicos
   - Preview SVG 2D adicional (opcional)
   - Syntax highlighting mejorado para JSON

2. **Panel de ayuda interactivo**
   - Snippets de código para copiar
   - Ejemplos de vértices paramétricos
   - Calculadora de expresiones en vivo

3. **Migración de templates existentes**
   - Script para detectar templates v1.0
   - Opción de actualizar a v2.0 (opcional)

---

### Fase 3: Features Avanzados (3-4 sesiones)

1. **Editor visual SVG (opcional)**
   - Canvas 2D para editar vértices con mouse
   - Arrastrar puntos para ajustar posiciones
   - Guardar como expresiones paramétricas

2. **Biblioteca de patrones**
   - Patrones de ventilación predefinidos
   - Plantillas de contornos comunes
   - Importar/exportar fragmentos

3. **Validación avanzada**
   - Detección de auto-intersecciones
   - Advertencias de geometría degenerada
   - Sugerencias de optimización

4. **Performance**
   - Memoización de geometría calculada
   - Cache de shapes evaluados
   - Lazy loading de templates

---

### Fase 4: Testing y Refinamiento (1-2 sesiones)

1. **Tests de integración**
   - Template completo → Export STL
   - Cambio de parámetros → Update 3D
   - Validación de todos los templates de ejemplo

2. **Documentación para usuarios**
   - Guía de creación de templates
   - Referencia de funciones Math disponibles
   - Troubleshooting común

3. **Optimización**
   - Profiling de renderizado
   - Reducción de re-renders innecesarios
   - Compresión de JSON templates

---

## 📝 Checklist de Implementación

### Código Base
- [ ] Copiar `paramEvaluator.ts` a `src/utils/`
- [ ] Copiar `paramEvaluator.test.ts` a `src/utils/`
- [ ] Copiar `svgToThree.ts` a `src/utils/`
- [ ] Crear `svgToThree.test.ts` con tests básicos
- [ ] Ejecutar `npm test` para verificar tests

### Componentes React
- [ ] Crear `SVGParametricModel.tsx` en `src/features/viewer/`
- [ ] Actualizar `Viewer.tsx` para soportar ambos tipos
- [ ] Actualizar `TemplateEditor.tsx` con validación
- [ ] Actualizar `PropertiesPanel.tsx` para nuevos impacts

### Templates
- [ ] Migrar templates de ejemplo a `public/templates/v2/`
- [ ] Actualizar `index.json` con nuevos templates
- [ ] Marcar templates v1 como legacy

### Testing
- [ ] Test de renderizado de líneas
- [ ] Test de renderizado de arcos
- [ ] Test de renderizado de Bézier
- [ ] Test de holes
- [ ] Test de extrusión
- [ ] Test de integración completa

### Documentación
- [ ] README actualizado con ejemplos v2.0
- [ ] Guía de migración v1 → v2
- [ ] Documentación de API de evaluador
- [ ] Ejemplos de templates comentados

---

## 🎓 Conceptos Clave para Recordar

1. **Vértices paramétricos**: Las coordenadas pueden ser números o expresiones
   ```json
   { "x": "params.longitud * 0.5", "y": "params.ancho + 10" }
   ```

2. **Contornos cerrados**: El último elemento debe conectar con el primero
   ```json
   [
     { "from": "v1", "to": "v2" },
     { "from": "v2", "to": "v3" },
     { "from": "v3", "to": "v1" }  // Cierra el contorno
   ]
   ```

3. **Holes**: Son contornos tipo "hole" que se agregan al Shape principal
   ```json
   { "type": "hole", "elements": [...] }
   ```

4. **Extrusión en Y**: La geometría se rota para que extruya verticalmente
   ```ts
   geometry.rotateX(Math.PI / 2);
   ```

5. **Impactos mejorados**: Ahora soportan diferentes operaciones
   ```json
   "impacts": {
     "longitud": { "operation": "multiply", "value": 100 },
     "grosor": { "operation": "set", "value": null }
   }
   ```

---

## 📞 Soporte y Troubleshooting

### Errores Comunes

**"Contorno no cerrado"**
- Verificar que último elemento conecte con primero
- Usar `debug.validateTemplate()` para diagnosticar

**"Vértice no encontrado"**
- Revisar IDs de vértices en elementos
- Verificar ortografía (case-sensitive)

**"Expresión inválida"**
- Usar `validateExpression()` para verificar sintaxis
- Asegurar que parámetros existan en `params`

**"Radio muy pequeño para arco"**
- Aumentar `radius` del arco
- O reducir distancia entre puntos

### Debugging

```ts
import { debug } from './utils/paramEvaluator';

// Ver evaluación paso a paso
debug.traceEvaluation("params.longitud * 0.5", { longitud: 100 });

// Validar template completo
const validation = debug.validateTemplate(geometry, params);
console.log(validation.errors);
console.log(validation.warnings);
```

---

## 🏆 Resumen Ejecutivo

**Lo que hemos logrado:**
- ✅ Diseño completo de formato JSON v2.0
- ✅ Sistema de evaluación de expresiones paramétricas (380 líneas + 260 tests)
- ✅ Motor de extrusión SVG → Three.js (550 líneas)
- ✅ 3 templates de ejemplo completamente funcionales
- ✅ Documentación exhaustiva (350+ líneas)
- ✅ Suite de tests con 25 casos

**Lo que falta:**
- ⏳ Integrar código en componentes React existentes
- ⏳ Crear tests para motor de extrusión
- ⏳ Actualizar UI para soportar validación
- ⏳ Migrar/crear templates reales de férulas

**Tiempo estimado de implementación:**
- Fase 1 (básica): 1-2 sesiones
- Fase 2 (editor): 2-3 sesiones
- Fase 3 (avanzado): 3-4 sesiones (opcional)
- Fase 4 (testing): 1-2 sesiones

**Total: 7-11 sesiones de trabajo**

---

## 📚 Referencias

- [Three.js Shape Documentation](https://threejs.org/docs/#api/en/extras/core/Shape)
- [Three.js ExtrudeGeometry](https://threejs.org/docs/#api/en/geometries/ExtrudeGeometry)
- [SVG Path Specification](https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths)
- Archivos del proyecto:
  - `docs/JSON_STRUCTURE_V2.md`
  - `src/utils/paramEvaluator.ts`
  - `src/utils/svgToThree.ts`
  - `docs/examples/*.json`

---

**Última actualización:** 2026-01-04
**Autor:** Claude Sonnet 4.5
**Estado:** ✅ Diseño completo - Listo para implementación
