// Componente del panel de parámetros
import { getSelectedObjects } from '../modules/operations.js';

export function initializeParameterPanel() {
    document.addEventListener('objectSelected', updateParameterPanel);
    updateParameterPanel(); // Inicializar al cargar
}

function updateParameterPanel() {
    const selectedObjects = getSelectedObjects();
    const paramsContainer = document.getElementById('current-params');

    if (!paramsContainer) {
        console.error('No se encontró el contenedor de parámetros');
        return;
    }

    paramsContainer.innerHTML = '';

    if (selectedObjects.length === 0) {
        paramsContainer.innerHTML = '<p>No hay objetos seleccionados</p>';
        return;
    }

    const object = selectedObjects[0]; // Solo manejamos un objeto a la vez
    const objectInstance = object.userData.objectInstance;

    if (objectInstance && objectInstance.params) {
        renderParameterInputs(objectInstance, paramsContainer);
    } else {
        paramsContainer.innerHTML = '<p>El objeto seleccionado no tiene parámetros editables.</p>';
    }
}

function renderParameterInputs(objectInstance, container) {
    const params = objectInstance.getParams();

    for (const [paramName, paramValue] of Object.entries(params)) {
        const paramDiv = document.createElement('div');
        paramDiv.className = 'param-input';

        const label = document.createElement('label');
        label.textContent = paramName;
        label.setAttribute('for', `param-${paramName}`);

        const input = document.createElement('input');
        input.type = 'number';
        input.id = `param-${paramName}`;
        input.value = paramValue;
        input.step = (paramName.toLowerCase().includes('segments')) ? '1' : '0.1'; // Pasos más adecuados

        input.addEventListener('input', (e) => {
            const newValue = parseFloat(e.target.value);
            if (!isNaN(newValue)) {
                objectInstance.update({ [paramName]: newValue });
            }
        });

        paramDiv.appendChild(label);
        paramDiv.appendChild(input);
        container.appendChild(paramDiv);
    }
}