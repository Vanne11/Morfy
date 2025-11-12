// Módulo para la creación de objetos paramétricos
import * as THREE from '../utils/threeUtils.js';
import { addObjectToScene } from './renderer.js';

// Clase base para objetos paramétricos (exportada para ser extendida)
export class ParametricObject {
    constructor(type, defaultParams, userParams, color) {
        this.type = type;
        this.params = { ...defaultParams, ...userParams };
        this.color = color;
        this.mesh = null;
        this.create();
    }

    create() {
        const geometry = this.createGeometry();
        const material = new THREE.MeshPhongMaterial({
            color: this.color,
            transparent: true,
            opacity: 0.9,
            shininess: 50
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.userData = {
            type: this.type,
            params: { ...this.params },
            objectInstance: this
        };

        addObjectToScene(this.mesh);
    }

    createGeometry() {
        throw new Error('createGeometry() debe ser implementado por la subclase');
    }

    update(newParams) {
        this.params = { ...this.params, ...newParams };
        if (this.mesh) {
            this.mesh.geometry.dispose();
            this.mesh.geometry = this.createGeometry();
        }
    }

    getParams() {
        return { ...this.params };
    }
}