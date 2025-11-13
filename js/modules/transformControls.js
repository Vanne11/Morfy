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
    transformControls.setSize(1.5); // Tamaño más visible del gizmo

    // Agregar a la escena
    rendererManager.scene.add(transformControls);

    // Eventos de teclado para cambiar modo
    window.addEventListener('keydown', onKeyDown);

    // Cuando se inicia el arrastre, deshabilitar orbit controls
    transformControls.addEventListener('dragging-changed', (event) => {
        rendererManager.controls.enabled = !event.value;
        console.log('Dragging:', event.value);
    });

    // Evento cuando cambia el objeto (se mueve, rota, escala)
    transformControls.addEventListener('objectChange', () => {
        // El objeto se está transformando, no necesitamos hacer nada especial
        // Three.js actualiza automáticamente la posición
    });

    // Escuchar cuando se selecciona un objeto
    document.addEventListener('objectSelected', onObjectSelected);

    console.log('TransformControls inicializado correctamente');
    console.log('Presiona W para mover, E para rotar, R para escalar');
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

    console.log('Adjuntando TransformControls a:', object.userData.name || object.userData.type);
    currentObject = object;
    transformControls.attach(object);
    transformControls.visible = true;
    transformControls.enabled = true;
}

export function detachTransformControls() {
    if (!transformControls) return;

    transformControls.detach();
    transformControls.visible = false;
    currentObject = null;
}

function onKeyDown(event) {
    if (!transformControls) return;

    // Permitir cambio de modo incluso sin objeto seleccionado
    switch (event.key.toLowerCase()) {
        case 'w':
            transformControls.setMode('translate');
            console.log('Modo: Mover (Translate)');
            break;
        case 'e':
            transformControls.setMode('rotate');
            console.log('Modo: Rotar (Rotate)');
            break;
        case 'r':
            transformControls.setMode('scale');
            console.log('Modo: Escalar (Scale)');
            break;
        case 'escape':
            if (currentObject) {
                detachTransformControls();
                console.log('TransformControls desactivado');
            }
            break;
        case '+':
        case '=':
            transformControls.setSize(transformControls.size + 0.1);
            console.log('Tamaño gizmo:', transformControls.size);
            break;
        case '-':
        case '_':
            transformControls.setSize(Math.max(0.1, transformControls.size - 0.1));
            console.log('Tamaño gizmo:', transformControls.size);
            break;
        case 'x':
            transformControls.showX = !transformControls.showX;
            console.log('Eje X:', transformControls.showX);
            break;
        case 'y':
            transformControls.showY = !transformControls.showY;
            console.log('Eje Y:', transformControls.showY);
            break;
        case 'z':
            transformControls.showZ = !transformControls.showZ;
            console.log('Eje Z:', transformControls.showZ);
            break;
        case ' ':
            event.preventDefault(); // Evitar scroll de página
            transformControls.enabled = !transformControls.enabled;
            console.log('Controles:', transformControls.enabled ? 'activados' : 'desactivados');
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
