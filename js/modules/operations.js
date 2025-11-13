// Módulo para operaciones booleanas (unión, diferencia, intersección)
import THREE from '../utils/threeUtils.js';
import { addObjectToScene } from './renderer.js';
import { addOperationToHistory } from './history.js';

let selectedObjects = [];
const booleanButtons = ['union-tool', 'difference-tool', 'intersection-tool'];
const clearSelectionButton = 'clear-selection-tool';

export function updateToolButtonsState() {
    const booleanButtonsEnabled = selectedObjects.length === 2;
    booleanButtons.forEach(id => {
        const button = document.getElementById(id);
        if (button) {
            button.disabled = !booleanButtonsEnabled;
        }
    });

    const clearSelectionButtonEnabled = selectedObjects.length > 0;
    const clearButton = document.getElementById(clearSelectionButton);
    if (clearButton) {
        clearButton.disabled = !clearSelectionButtonEnabled;
    }
}

function setObjectColor(object, color) {
    if (object.material) {
        // Guardar el color original si no existe
        if (!object.userData.originalColor) {
            object.userData.originalColor = object.material.color.getHex();
        }

        // Clonar el material solo si no está clonado ya
        if (!object.userData.materialCloned) {
            object.material = object.material.clone();
            object.userData.materialCloned = true;
        }

        object.material.color.setHex(color);
        object.material.needsUpdate = true;
    }
}

export function selectObject(object) {
    const index = selectedObjects.indexOf(object);

    if (index > -1) {
        // Deseleccionar: restaurar color original
        selectedObjects.splice(index, 1);
        const originalColor = object.userData.originalColor || 0x3498db;
        setObjectColor(object, originalColor);
    } else {
        // Si ya hay 2 objetos seleccionados, deseleccionar el más antiguo
        if (selectedObjects.length >= 1) {
            // Para TransformControls solo permitimos 1 objeto seleccionado
            const oldestObject = selectedObjects.shift();
            const originalColor = oldestObject.userData.originalColor || 0x3498db;
            setObjectColor(oldestObject, originalColor);
        }
        selectedObjects.push(object);
        setObjectColor(object, 0xffaa00); // Color amarillo brillante para selección
    }

    updateToolButtonsState();
    document.dispatchEvent(new CustomEvent('objectSelected', {
        detail: { selectedObjects: [...selectedObjects] }
    }));
}

export function getSelectedObjects() {
    return [...selectedObjects];
}

export function clearSelection() {
    selectedObjects.forEach(obj => {
        const originalColor = obj.userData.originalColor || 0x3498db;
        setObjectColor(obj, originalColor);
    });
    selectedObjects = [];

    updateToolButtonsState();
    document.dispatchEvent(new CustomEvent('objectSelected', { detail: { selectedObjects: [] } }));
}

function performOperation(operationType, color) {
    if (selectedObjects.length !== 2) {
        alert(`Por favor, selecciona dos objetos para realizar la operación de ${operationType}`);
        return;
    }

    const [obj1, obj2] = selectedObjects;
    const operationDescription = `${operationType} entre ${obj1.userData.type} y ${obj2.userData.type}`;
    
    console.log(`Realizando ${operationDescription}`);
    addOperationToHistory(operationDescription);

    obj1.parent.remove(obj1);
    obj2.parent.remove(obj2);

    let resultGeometry;
    if (operationType === 'unión') {
        resultGeometry = mergeGeometries([obj1.geometry, obj2.geometry]);
    } else if (operationType === 'diferencia') {
        resultGeometry = obj1.geometry.clone();
    } else {
        resultGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    }

    const material = new THREE.MeshPhongMaterial({ color, transparent: true, opacity: 0.8 });
    const resultMesh = new THREE.Mesh(resultGeometry, material);
    addObjectToScene(resultMesh);

    clearSelection();
    console.log(`${operationType} de objetos completada (simulación)`);
}

export function performUnion() {
    performOperation('unión', 0x9b59b6);
}

export function performDifference() {
    performOperation('diferencia', 0xf39c12);
}

export function performIntersection() {
    performOperation('intersección', 0x2ecc71);
}

function mergeGeometries(geometries) {
    const positions = [];
    const normals = [];
    
    for (const geometry of geometries) {
        const positionAttribute = geometry.getAttribute('position');
        const normalAttribute = geometry.getAttribute('normal');
        
        for (let i = 0; i < positionAttribute.count; i++) {
            positions.push(positionAttribute.getX(i), positionAttribute.getY(i), positionAttribute.getZ(i));
        }
        
        if (normalAttribute) {
            for (let i = 0; i < normalAttribute.count; i++) {
                normals.push(normalAttribute.getX(i), normalAttribute.getY(i), normalAttribute.getZ(i));
            }
        }
    }
    
    const combinedGeometry = new THREE.BufferGeometry();
    combinedGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    
    if (normals.length > 0) {
        combinedGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    } else {
        combinedGeometry.computeVertexNormals();
    }
    
    return combinedGeometry;
}
