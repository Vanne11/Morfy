# Morfy - Estado del Proyecto

**Fecha:** 4 de enero de 2026
**Objetivo:** Aplicación web para el diseño de férulas paramétricas planas, listas para impresión 3D y moldeado térmico físico.

---

## ✅ Lo que se ha hecho

### 1. Núcleo y Base de Datos
*   **Dexie DB**: Implementación de base de datos local robusta para Casos, Archivos (Blobs) y Plantillas.
*   **Despliegue Flexible**: Configuración de `BASE_URL` en Vite y React Router para permitir el alojamiento en subcarpetas (ej: `/vaneuribe/morfy/`).

### 2. Gestión de Casos (Dashboard)
*   Sistema real de creación, visualización y eliminación de casos de pacientes.
*   Conexión de la galería de modelos con la base de datos local.

### 3. Administración de Plantillas (Admin)
*   **Catálogo Unificado**: Visualización de plantillas del sistema (protegidas) y personalizadas.
*   **Editor JSON Inteligente**: Editor de código con previsualización 3D en tiempo real.
*   **Captura Automática**: Generación de miniaturas (thumbnails) automáticas al guardar usando capturas del canvas WebGL.
*   **Sistema Compuesto**: Lógica de `ui_controls` e `impacts` para que un slider clínico controle múltiples parámetros técnicos.

### 4. Visor 3D (Editor Principal)
*   **Renderizado Paramétrico**: Soporte para piezas básicas (RoundedBox) y piezas complejas (Extruded Geometry via Nodos).
*   **Sistema de Nodos (Pluma)**: Herramienta interactiva para mover, añadir (doble clic) y borrar nodos para definir siluetas personalizadas.
*   **Regla de Medición**: Herramienta de precisión para medir distancias en mm sobre el plano de trabajo.
*   **Referencia de Escala**: Incorporación del "Plátano de referencia" con controles de movimiento manual.
*   **Exportación STL**: Generación y descarga de archivos STL limpios (sin ayudas visuales) para impresión 3D.

---

## ⏳ Pendiente

*   **Persistencia de Edición**: Implementar el guardado de los cambios hechos en los nodos y sliders directamente en la base de datos del caso (actualmente se mantienen en memoria durante la sesión).
*   **Gestión de Usuarios**: Módulo de roles y permisos en el Admin.
*   **Mejora de Geometría**: Soporte para curvas (Bézier) en los nodos en lugar de solo líneas rectas.
*   **Configuración del Sistema**: Ajustes generales de la aplicación.
*   **Galería de Imágenes**: Usar las capturas del Admin en la librería del editor principal.

---

## 🚀 En lo que estoy trabajando ahora

*   **Refinamiento del Sistema de Nodos**: Asegurando que la manipulación de puntos sea fluida y no genere errores de geometría (como polígonos auto-intersecantes).
*   **Preparación para Persistencia**: Diseñando la lógica para que al salir del editor y volver, la férula mantenga la forma personalizada definida por el médico.
