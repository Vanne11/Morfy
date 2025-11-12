// Módulo para exportar a STL
import * as THREE from '../utils/threeUtils.js';  // Asegúrate de importar THREE correctamente
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';  // Importar STLExporter desde la ruta correcta
import { getAllSceneObjects } from './renderer.js';

/**
 * Exporta la escena a un archivo STL.
 * @param {object} options - Opciones de exportación.
 * @param {boolean} [options.binary=false] - Si se exporta en formato binario.
 * @param {string} [options.filename='modelo.stl'] - Nombre del archivo.
 */
export function exportSceneToSTL(options = {}) {
    const { binary = false, filename = 'modelo.stl' } = options;

    const sceneObjects = getAllSceneObjects();

    if (sceneObjects.length === 0) {
        alert('No hay objetos para exportar');
        return;
    }

    const group = new THREE.Group();
    sceneObjects.forEach(obj => {
        const clonedObj = obj.clone();
        if (clonedObj.geometry && clonedObj.geometry.attributes.position) {
            clonedObj.geometry.computeVertexNormals();
        }
        group.add(clonedObj);
    });

    group.updateMatrixWorld();

    const exporter = new STLExporter();  // Crear instancia de STLExporter
    const result = exporter.parse(group, { binary });  // Exportar la escena

    const blob = new Blob([result], {
        type: binary ? 'application/octet-stream' : 'text/plain'
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);

    console.log(`Archivo ${filename} descargado.`);
}
