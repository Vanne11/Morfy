// Módulo para la creación de esferas paramétricas
import * as THREE from '../utils/threeUtils.js';
import { addObjectToScene } from '../modules/renderer.js';
import { ParametricObject } from '../modules/objects.js';

// Clase para esfera paramétrica
export class ParametricSphere extends ParametricObject {
    constructor(params) {
        const defaultParams = { radius: 0.5, widthSegments: 32, heightSegments: 32 };
        super('sphere', defaultParams, params, 0x44ff88);
    }

    createGeometry() {
        return new THREE.SphereGeometry(
            this.params.radius,
            this.params.widthSegments,
            this.params.heightSegments
        );
    }
}

// Función de creación mejorada
export function createSphere(params) {
    return new ParametricSphere(params).mesh;
}
