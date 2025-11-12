// Módulo para la creación de cubos paramétricos
import THREE from '../utils/threeUtils.js';
import { addObjectToScene } from '../modules/renderer.js';
import { ParametricObject } from '../modules/objects.js';

// Clase para cubo paramétrico
export class ParametricCube extends ParametricObject {
    constructor(params) {
        const defaultParams = { width: 1, height: 1, depth: 1 };
        super('cube', defaultParams, params, 0x00aaff);
    }

    createGeometry() {
        return new THREE.BoxGeometry(
            this.params.width,
            this.params.height,
            this.params.depth
        );
    }
}

// Función de creación mejorada
export function createCube(params) {
    return new ParametricCube(params).mesh;
}
