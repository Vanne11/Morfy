// Módulo para controles de transformación de objetos 3D
import { TransformControls } from '../utils/threeUtils.js';
import { getRendererManager } from './renderer.js';
import { getSelectedObjects } from './operations.js';

let transformControls = null;
let currentObject = null;

export function initializeTransformControls() {
    const rendererManager = getRendererManager();
    const camera = rendererManager.camera;
    const renderer = rendererManager.renderer;

    // Crear TransformControls
    transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.setMode('translate'); // Modo inicial: mover

    // Agregar a la escena
    rendererManager.scene.add(transformControls);

    // Eventos de teclado para cambiar modo
    window.addEventListener('keydown', onKeyDown);

    // Cuando se inicia el arrastre, deshabilitar orbit controls
    transformControls.addEventListener('dragging-changed', (event) => {
        rendererManager.controls.enabled = !event.value;
    });

    // Escuchar cuando se selecciona un objeto
    document.addEventListener('objectSelected', onObjectSelected);

    console.log('TransformControls inicializado');
}

function onObjectSelected(event) {
    const selectedObjects = getSelectedObjects();

    if (selectedObjects.length === 1) {
        attachTransformControls(selectedObjects[0]);
    } else {
        detachTransformControls();
    }
}

export function attachTransformControls(object) {
    if (!transformControls) {
        console.warn('TransformControls no está inicializado');
        return;
    }

    currentObject = object;
    transformControls.attach(object);
    transformControls.visible = true;
}

export function detachTransformControls() {
    if (!transformControls) return;

    transformControls.detach();
    transformControls.visible = false;
    currentObject = null;
}

function onKeyDown(event) {
    if (!transformControls || !currentObject) return;

    switch (event.key.toLowerCase()) {
        case 'w':
            transformControls.setMode('translate');
            break;
        case 'e':
            transformControls.setMode('rotate');
            break;
        case 'r':
            transformControls.setMode('scale');
            break;
        case 'escape':
            detachTransformControls();
            break;
        case '+':
        case '=':
            transformControls.setSize(transformControls.size + 0.1);
            break;
        case '-':
        case '_':
            transformControls.setSize(Math.max(0.1, transformControls.size - 0.1));
            break;
        case 'x':
            transformControls.showX = !transformControls.showX;
            break;
        case 'y':
            transformControls.showY = !transformControls.showY;
            break;
        case 'z':
            transformControls.showZ = !transformControls.showZ;
            break;
        case ' ':
            transformControls.enabled = !transformControls.enabled;
            break;
    }
}

export function getTransformControls() {
    return transformControls;
}

export function setTransformMode(mode) {
    if (transformControls && ['translate', 'rotate', 'scale'].includes(mode)) {
        transformControls.setMode(mode);
    }
}

export function cleanup() {
    if (transformControls) {
        window.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('objectSelected', onObjectSelected);
        transformControls.dispose();
    }
}
