# Registro de Progreso - Morfy

## Objetivos Actuales
- [x] **Flexibilizar Editor de Plantillas**: Implementado movimiento de grupo (multi-selección) y arrastre sincronizado en `FabricGeometryEditor`.
- [x] **Mejora Visualización 3D**: Implementado material físico (PLA) e iluminación de estudio en `LivePreview` y `SVGParametricModel`.

## Historial de Cambios

### Fase 3: Refinamiento de UX y Visualización (Completado)
- **FabricGeometryEditor**:
  - Añadida lógica para detectar selección múltiple en `mousedown`.
  - Implementado cálculo de delta para mover todos los nodos seleccionados simultáneamente en `moving`.
  - Sincronización visual de líneas y etiquetas de texto durante el arrastre de grupo.
- **Visualización 3D**:
  - Actualizado `SVGParametricModel` a `MeshPhysicalMaterial` (Roughness 0.6, Clearcoat 0.1).
  - Mejorada escena en `LivePreview` con luces direccionales y sombras de contacto suaves.