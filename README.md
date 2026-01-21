# Morfy - Diseño de Férulas Paramétricas para Impresión 3D

## 📋 Tabla de Contenidos

- [Descripción](#descripción)
- [Problema que Resuelve](#problema-que-resuelve)
- [ Público Objetivo](#-público-objetivo)
- [Características Principales](#características-principales)
- [Tecnologías](#tecnologías)
- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Uso](#uso)
- [Arquitectura del Proyecto](#arquitectura-del-proyecto)
- [Funcionalidades](#funcionalidades)
- [Testing](#testing)
- [Despliegue](#despliegue)
- [Contribución](#contribución)
- [Roadmap](#roadmap)
- [Licencia](#licencia)
- [Autores](#autores)

## 📖 Descripción

Morfy es una aplicación web avanzada para el diseño de férulas paramétricas planas, específicamente desarrollada para ser utilizada en entornos médicos. La aplicación permite a los profesionales médicos crear, modificar y preparar férulas personalizadas para impresión 3D y moldeo térmico físico.

## 💡 Problema que Resuelve

En el campo de la medicina ortopédica, la creación de férulas personalizadas para pacientes es un proceso que requiere herramientas especializadas que permitan un diseño preciso, rápido y adaptable. Morfy resuelve la necesidad de contar con una solución digital que permita a los profesionales médicos crear férulas paramétricas sin necesidad de conocimientos avanzados de diseño 3D, facilitando la personalización y optimización del proceso de fabricación.

## 👥 Público Objetivo

- Profesionales médicos (traumatólogos, ortopedistas, terapeutas ocupacionales)
- Técnicos en ortopedia
- Fabricantes de dispositivos médicos personalizados
- Centros de rehabilitación
- Desarrolladores interesados en soluciones médicas digitales

## ✨ Características Principales

- 🎨 **Editor de Férulas Paramétricas**: Modificación de férulas mediante controles paramétricos y sistema de nodos
- 🖼️ **Visor 3D Interactivo**: Visualización en tiempo real con herramientas de medición y manipulación
- 💾 **Base de Datos Local**: Almacenamiento de casos, archivos y plantillas con DexieDB
- 📐 **Herramientas de Medición**: Regla de precisión para medir distancias en cm
- 📦 **Exportación STL**: Generación de archivos listos para impresión 3D
- 🌍 **Soporte Multilingüe**: Internacionalización con i18next
- 🧩 **Sistema de Plantillas**: Catálogo de férulas prediseñadas con posibilidad de personalización
- 📁 **Gestión de Casos**: Creación y administración de casos de pacientes

## 🔧 Tecnologías

### Lenguajes
- **TypeScript**: Superset de JavaScript con tipado estático
- **JavaScript**: Lenguaje principal del frontend

### Frameworks y Librerías
- **React 19.2.0**: Biblioteca para construir interfaces de usuario
- **React Router DOM**: Navegación entre vistas
- **@react-three/fiber**: Renderizado 3D con Three.js en React
- **@react-three/drei**: Conjunto de utilidades para Three.js
- **Three.js**: Biblioteca de gráficos 3D
- **Tailwind CSS**: Framework de estilos CSS
- **Radix UI**: Componentes primitivos accesibles

### Base de Datos
- **DexieDB**: Base de datos cliente-side basada en IndexedDB

### Otras Herramientas
- **Vite**: Herramienta de construcción rápida
- **ESLint**: Linting de código
- **TypeScript**: Verificación de tipos
- **Fabric.js**: Manipulación de gráficos vectoriales
- **i18next**: Internacionalización

## 📋 Requisitos

### Sistema
- Node.js v18.x o superior
- npm v8.x o superior (o yarn v1.x)
- Git v2.0 o superior

### Hardware Mínimo Recomendado
- RAM: 4GB o superior
- GPU compatible con WebGL para visualización 3D
- Espacio en disco: 500MB para desarrollo

### Dependencias Importantes
- @react-three/fiber: ^9.5.0
- three: ^0.182.0
- dexie: ^4.2.1
- react: ^19.2.0
- tailwindcss: ^4.1.18

## 🚀 Instalación

### 1. Clonar el Repositorio

```bash
git clone https://github.com/vaneuribe/morfy.git
cd morfy
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Variables de Entorno (Opcional)

Si el proyecto requiere variables de entorno, créelas en un archivo `.env.local`:

```env
VITE_BASE_URL=/
VITE_API_URL=http://localhost:3000/api
```

### 4. Iniciar el Servidor de Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## 🛠️ Uso

### Comandos Disponibles

```bash
# Iniciar servidor de desarrollo
npm run dev

# Construir para producción
npm run build

# Previsualizar build de producción localmente
npm run preview

# Lintear código
npm run lint

# Ejecutar tests
npm run test
```

### Ejemplo de Uso

1. Accede a la aplicación en tu navegador
2. Crea un nuevo caso desde el dashboard
3. Selecciona una plantilla de férula o importa un modelo
4. Personaliza la férula utilizando los controles paramétricos
5. Utiliza el sistema de nodos para ajustar la geometría
6. Mide distancias con la herramienta de regla
7. Exporta a STL para impresión 3D

## 🏗️ Arquitectura del Proyecto

```
src/
├── app/                    # Configuración de la aplicación
├── assets/                 # Recursos estáticos
├── components/             # Componentes reutilizables
│   └── ui/                 # Componentes de interfaz
├── features/               # Características específicas
│   ├── admin/              # Panel de administración
│   ├── case-details-modal/ # Modal de detalles de caso
│   ├── create-case-modal/  # Modal de creación de caso
│   ├── export/             # Funcionalidad de exportación
│   ├── import/             # Funcionalidad de importación
│   ├── layout/             # Componentes de layout
│   ├── library-modal/      # Modal de biblioteca
│   ├── project-gallery/    # Galería de proyectos
│   ├── properties-panel/   # Panel de propiedades
│   ├── sidebar/            # Barra lateral
│   ├── toolbar/            # Barra de herramientas
│   ├── viewer/             # Visor 3D
│   └── workspace/          # Área de trabajo
├── hooks/                  # Hooks personalizados
├── lib/                    # Bibliotecas y utilidades
├── pages/                  # Páginas de la aplicación
├── services/               # Servicios de negocio
├── types/                  # Tipos TypeScript
├── utils/                  # Utilidades generales
├── App.tsx                 # Componente raíz
├── index.css               # Estilos globales
└── main.tsx                # Punto de entrada
```

## 🎯 Funcionalidades

### Gestión de Casos
- Creación, edición y eliminación de casos de pacientes
- Asociación de modelos 3D con casos específicos
- Historial de modificaciones

### Editor de Férulas
- Sistema paramétrico para modificación de férulas
- Editor de nodos (sistema "Pluma") para personalización geométrica
- Previsualización en tiempo real de cambios

### Visor 3D
- Renderizado de modelos STL y férulas paramétricas
- Controles orbitales para manipulación 3D
- Herramienta de medición de distancias
- Referencia de escala (plátano de referencia)

### Exportación e Importación
- Exportación a formato STL para impresión 3D
- Importación de modelos 3D (STL, JSON paramétrico)
- Conversión de formatos internos

### Sistema de Plantillas
- Catálogo de férulas prediseñadas
- Editor JSON con previsualización 3D
- Generación automática de miniaturas
- Sistema de controles compuestos (ui_controls e impacts)

### Internacionalización
- Soporte multilingüe con i18next
- Traducciones gestionadas centralizadamente
- Adaptación cultural de unidades y formatos

## 🧪 Testing

### Ejecutar Tests

```bash
npm run test
```

### Framework de Testing
- **Vitest**: Framework de testing rápido para Vite
- **React Testing Library**: Pruebas de componentes React

### Buenas Prácticas de Testing
- Pruebas unitarias para componentes individuales
- Pruebas de integración para flujos de usuario
- Cobertura de código para funcionalidades críticas
- Pruebas de accesibilidad

## 🚢 Despliegue

### Opciones de Despliegue

#### Producción
```bash
# Construir para producción
npm run build

# El resultado se encuentra en la carpeta dist/
```

#### Despliegue en GitHub Pages
```bash
# Configurar BASE_URL en vite.config.ts
# Ejecutar build
npm run build
```

#### Despliegue en Servidores Estáticos
- Copiar contenido de la carpeta `dist/` al directorio público del servidor
- Asegurar configuración de rutas para SPA (single page application)

### Entornos
- **Desarrollo**: `npm run dev`
- **Prueba**: `npm run preview` (después de `npm run build`)
- **Producción**: `npm run build` + servidor web estático

## 🤝 Contribución

¡Las contribuciones son bienvenidas! Sigue estos pasos:

### 1. Fork del Repositorio
Haz click en el botón "Fork" en la parte superior derecha de la página.

### 2. Clona tu Fork
```bash
git clone https://github.com/TU_USUARIO/morfy.git
cd morfy
```

### 3. Crea una Rama
```bash
git checkout -b feature/nueva-funcionalidad
```

### 4. Realiza Cambios
- Sigue las convenciones de código del proyecto
- Escribe pruebas para nuevas funcionalidades
- Documenta tus cambios si es necesario

### 5. Commit y Push
```bash
git add .
git commit -m "feat: añade nueva funcionalidad"
git push origin feature/nueva-funcionalidad
```

### 6. Crea un Pull Request
Abre un PR hacia la rama `main` del repositorio original.

### Convención de Commits
- `feat`: Nueva característica
- `fix`: Corrección de bug
- `docs`: Cambios en documentación
- `style`: Cambios de estilo (sin afectar lógica)
- `refactor`: Refactorización de código
- `test`: Añadir o modificar tests
- `chore`: Otros cambios

## 🗺️ Roadmap

### Pendiente
- **Persistencia de Edición**: Implementar el guardado de los cambios hechos en los nodos y sliders directamente en la base de datos del caso
- **Gestión de Usuarios**: Módulo de roles y permisos en el Admin
- **Mejora de Geometría**: Soporte para curvas (Bézier) en los nodos en lugar de solo líneas rectas
- **Configuración del Sistema**: Ajustes generales de la aplicación
- **Galería de Imágenes**: Usar las capturas del Admin en la librería del editor principal

### Futuras Mejoras
- Integración con sistemas PACS médicos
- Soporte para más formatos de archivo 3D
- Colaboración en tiempo real
- Validación médica de diseños
- Integración con servicios de impresión 3D

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 👨‍💻 Autores

- **Vanessa Uribe** - Desarrolladora Principal
  - [GitHub](https://github.com/Vanne11)
- **Nicolás Baier** - Colaborador
  - [GitHub](https://github.com/Debaq)

---

<div align="center">

Made with ❤️ for medical innovation

</div>
