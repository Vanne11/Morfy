// Módulo para la creación de toros paramétricos
import THREE from '../utils/threeUtils.js';
import { addObjectToScene } from '../modules/renderer.js';
import { ParametricObject } from '../modules/objects.js';

// Clase para toro paramétrico
export class ParametricTorus extends ParametricObject {
    constructor(params) {
        const defaultParams = { radius: 1, tube: 0.4, radialSegments: 8, tubularSegments: 6, arc: Math.PI * 2 };
        super('torus', defaultParams, params, 0x9b59b6); // Color morado
    }

    createGeometry() {
        return new THREE.TorusGeometry(
            this.params.radius,
            this.params.tube,
            this.params.radialSegments,
            this.params.tubularSegments,
            this.params.arc
        );
    }
}

// Función de creación mejorada
export function createTorus(params) {
    return new ParametricTorus(params).mesh;
}
