// Módulo para la creación de objetos paramétricos
import THREE from '../utils/threeUtils.js';
import { addObjectToScene } from './renderer.js';
import { assignObjectId } from '../components/objectsList.js';

// Contador para posicionar objetos en espiral
let objectSpawnCounter = 0;

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

        // Posicionar el objeto en una posición única (patrón espiral)
        const position = getNextObjectPosition();
        this.mesh.position.set(position.x, position.y, position.z);

        addObjectToScene(this.mesh);

        // Asignar ID y nombre al objeto
        assignObjectId(this.mesh, this.type);
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

// Función para obtener la siguiente posición de objeto (patrón espiral)
function getNextObjectPosition() {
    if (objectSpawnCounter === 0) {
        objectSpawnCounter++;
        // Primer objeto en el origen
        return { x: 0, y: 0, z: 0 };
    }

    // Patrón espiral: cada objeto se coloca en un círculo que crece gradualmente
    const radius = Math.ceil(objectSpawnCounter / 6) * 2; // Radio crece cada 6 objetos
    const angle = (objectSpawnCounter * Math.PI * 2) / 6; // 6 objetos por círculo

    const x = radius * Math.cos(angle);
    const z = radius * Math.sin(angle);
    const y = 0;

    objectSpawnCounter++;

    return { x, y, z };
}