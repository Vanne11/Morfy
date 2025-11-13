// Importar THREE y complementos desde Three.js
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';

// Exportar THREE y sus complementos
export default THREE;

// Exportar OrbitControls, TransformControls y STLExporter
export { OrbitControls, TransformControls, STLExporter };
