// Módulo para la creación de planos paramétricos
import * as THREE from '../utils/threeUtils.js';
import { addObjectToScene } from '../modules/renderer.js';
import { ParametricObject } from '../modules/objects.js';

// Clase para plano paramétrico
export class ParametricPlane extends ParametricObject {
    constructor(params) {
        const defaultParams = { width: 1, height: 1 };
        super('plane', defaultParams, params, 0xcccccc); // Color gris
    }

    createGeometry() {
        return new THREE.PlaneGeometry(
            this.params.width,
            this.params.height
        );
    }
}

// Función de creación mejorada
export function createPlane(params) {
    return new ParametricPlane(params).mesh;
}
