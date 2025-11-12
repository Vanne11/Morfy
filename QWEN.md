# Arquitectura y Convenciones del Proyecto Morfy

Este documento describe la arquitectura, los patrones de diseño y las convenciones de codificación utilizadas en el proyecto Morfy.

## 1. Estructura de Archivos

La estructura del proyecto está organizada de la siguiente manera para separar las responsabilidades y facilitar el mantenimiento:

```
/
├── index.html                # Punto de entrada principal de la aplicación
├── /js
│   ├── main.js               # Orquestador principal de la aplicación
│   ├── /components           # Módulos de UI y componentes de objetos
│   │   ├── toolbar.js
│   │   ├── parameterPanel.js
│   │   ├── sphere.js
│   │   ├── cube.js
│   │   ├── cylinder.js
│   │   ├── cone.js
│   │   ├── torus.js
│   │   └── plane.js
│   ├── /modules              # Lógica de negocio y módulos centrales
│   │   ├── app.js
│   │   ├── export.js
│   │   ├── interaction.js
│   │   ├── objects.js
│   │   ├── operations.js
│   │   ├── renderer.js
│   │   └── history.js
│   └── /utils                # Utilidades compartidas (ej: exportadores de Three.js)
└── /css
    └── main.css              # Hoja de estilos principal
```

## 2. Requisitos Técnicos

- **JavaScript Moderno (ES6+)**: Uso de `class`, `modules`, `const/let`, etc.
- **Sin Frameworks de UI**: Todo el DOM es gestionado con JavaScript vanilla.
- **Librerías Externas vía CDN**: Three.js y OpenCascade.js se cargan desde un CDN gestionado por `importmap`.
- **Módulos ES6 Nativos**: El código está modularizado utilizando los módulos nativos del navegador.

## 3. Patrones Arquitectónicos Modernos

Hemos adoptado varios patrones de diseño para mejorar la modularidad, mantenibilidad y robustez del código.

### 3.1. Clases para Managers y Componentes

- **Managers Centralizados**: La lógica compleja se encapsula en clases "manager" que manejan un dominio específico.
  - `RendererManager`: Gestiona la escena, cámara, renderizado y luces.
  - `InteractionManager`: Controla la interacción del usuario con los objetos 3D.
- **Objetos Paramétricos Basados en Clases**: Los objetos 3D (cubo, cilindro) se definen como clases que heredan de una clase base `ParametricObject`, facilitando la creación y actualización de su geometría.

### 3.2. Patrón Singleton

- **Instancia Única para el Renderizador**: Se utiliza un patrón singleton para `RendererManager` para asegurar que solo exista una instancia del renderizador en toda la aplicación, accesible a través de `getRendererManager()`.

### 3.3. Inyección de Dependencias (Simplificada)

- Los managers y componentes que dependen de otros módulos (ej: la cámara) los obtienen a través de funciones exportadas (`getRendererManager().camera`), en lugar de depender de variables globales.

## 4. Comunicación entre Módulos

- **Llamadas a Funciones Exportadas**: Los módulos se comunican principalmente a través de funciones y clases exportadas.
- **Eventos Personalizados (`CustomEvents`)**: Se utilizan para notificar cambios de estado desacoplados, como la selección de un objeto (`objectSelected`).

## 5. Gestión de Errores

- **Inicialización Robusta**: El proceso de arranque en `app.js` está envuelto en un bloque `try...catch` para capturar cualquier error crítico durante la inicialización y reportarlo en la consola sin bloquear la aplicación.

## 6. Historial de Operaciones

- **Registro de Acciones**: La aplicación mantiene un registro de todas las operaciones booleanas (unión, diferencia, intersección) que realiza el usuario.
- **Visualización y Limpieza**: Este historial se muestra en el panel de "Historial de Operaciones" y puede ser limpiado por el usuario en cualquier momento.

## 7. Estado de los Botones

- **Gestión de Estado**: La aplicación gestiona el estado de los botones de la barra de herramientas para proporcionar una experiencia de usuario más intuitiva.
- **Operaciones Booleanas**: Los botones de operaciones booleanas ("Unir", "Cortar", "Intersectar") se habilitan solo cuando se han seleccionado exactamente dos objetos.
- **Limpiar Selección**: El botón "Limpiar Selección" se habilita solo cuando hay al menos un objeto seleccionado.

## 8. Convenciones de Codificación

- **Nomenclatura**:
  - `PascalCase` para nombres de clases (`RendererManager`, `ParametricCube`).
  - `camelCase` para funciones, métodos y variables (`initializeApp`, `objectInstance`).
  - `UPPER_CASE` para constantes globales si las hubiera.
- **Estilo de Código**:
  - Uso preferente de `const` y `let` sobre `var`.
  - Funciones de flecha `() => {}` para callbacks y eventos.
  - Comentarios JSDoc para funciones públicas y métodos de clase para explicar su propósito, parámetros y valor de retorno.
- **Formato**: Se sigue un formato de código consistente (indentación, espaciado) para mejorar la legibilidad.

## 9. Layout de la Aplicación

- **Diseño de Tres Paneles**: La aplicación utiliza un diseño de tres paneles para proporcionar un espacio de trabajo organizado e intuitivo.
  - **Panel de Parámetros (Izquierda)**: Muestra los parámetros del objeto seleccionado y permite su edición en tiempo real.
  - **Visor 3D (Centro)**: Es el área principal donde se visualizan y manipulan los objetos 3D.
  - **Panel de Operaciones (Derecha)**: Muestra el historial de operaciones booleanas realizadas por el usuario.
