// Módulo para la creación de conos paramétricos
import THREE from '../utils/threeUtils.js';
import { addObjectToScene } from '../modules/renderer.js';
import { ParametricObject } from '../modules/objects.js';

// Clase para cono paramétrico
export class ParametricCone extends ParametricObject {
    constructor(params) {
        const defaultParams = { radius: 0.5, height: 1, segments: 32 };
        super('cone', defaultParams, params, 0xffa500); // Color naranja
    }

    createGeometry() {
        return new THREE.ConeGeometry(
            this.params.radius,
            this.params.height,
            this.params.segments
        );
    }
}

// Función de creación mejorada
export function createCone(params) {
    return new ParametricCone(params).mesh;
}
