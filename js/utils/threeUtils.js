// Importar THREE y complementos desde Three.js
import * as THREE from 'three';  // Asegúrate de que THREE.js está importado correctamente
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'; // Correcta importación de OrbitControls
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'; // Correcta importación de STLExporter

// Exportar THREE y sus complementos
export default THREE;

// Exportar OrbitControls y STLExporter
export { OrbitControls, STLExporter };
