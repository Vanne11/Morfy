// Módulo para la interacción con objetos 3D
import THREE from '../utils/threeUtils.js';
import { getRendererManager, getAllSceneObjects } from './renderer.js';
import { selectObject } from './operations.js';

class InteractionManager {
    constructor(viewerElement) {
        this.viewerElement = viewerElement;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.camera = getRendererManager().camera; // Obtener la cámara del manager
        
        this.onMouseClick = this.onMouseClick.bind(this);
    }

    start() {
        this.viewerElement.addEventListener('click', this.onMouseClick);
        console.log('InteractionManager iniciado');
    }

    stop() {
        this.viewerElement.removeEventListener('click', this.onMouseClick);
        console.log('InteractionManager detenido');
    }

    onMouseClick(event) {
        this.updateMousePosition(event);
        this.performRaycasting();
    }

    updateMousePosition(event) {
        const rect = this.viewerElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    performRaycasting() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(getAllSceneObjects());

        if (intersects.length > 0) {
            const selected = intersects.find(i => i.object.isMesh);
            if (selected) {
                selectObject(selected.object);
            }
        }
    }
}

export function initializeObjectInteraction() {
    const viewerElement = document.getElementById('viewer');
    if (viewerElement) {
        const interactionManager = new InteractionManager(viewerElement);
        interactionManager.start();
    } else {
        console.error('No se encontró el elemento del visor para la interacción.');
    }
}
