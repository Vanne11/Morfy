// Módulo para la creación de cilindros paramétricos
import THREE from '../utils/threeUtils.js';
import { addObjectToScene } from '../modules/renderer.js';
import { ParametricObject } from '../modules/objects.js';

// Clase para cilindro paramétrico
export class ParametricCylinder extends ParametricObject {
    constructor(params) {
        const defaultParams = { radiusTop: 0.5, radiusBottom: 0.5, height: 1, segments: 32 };
        super('cylinder', defaultParams, params, 0xff4444);
    }

    createGeometry() {
        const geom = new THREE.CylinderGeometry(
            this.params.radiusTop,
            this.params.radiusBottom,
            this.params.height,
            this.params.segments
        );
        return geom;
    }
    
    create() {
        super.create();
        this.mesh.rotation.x = Math.PI / 2;
    }
}

// Función de creación mejorada
export function createCylinder(params) {
    return new ParametricCylinder(params).mesh;
}
