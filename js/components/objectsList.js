// Componente de lista de objetos
import { getAllSceneObjects } from '../modules/renderer.js';
import { selectObject, getSelectedObjects } from '../modules/operations.js';

let objectCounter = 0;

export function initializeObjectsList() {
    // Escuchar cuando se agregue un objeto
    document.addEventListener('objectAdded', updateObjectsList);

    // Escuchar cuando se seleccione un objeto
    document.addEventListener('objectSelected', updateObjectsList);

    // Escuchar cuando se elimine un objeto
    document.addEventListener('objectRemoved', updateObjectsList);

    updateObjectsList(); // Inicializar al cargar
}

function updateObjectsList() {
    const sceneObjects = getAllSceneObjects();
    const selectedObjects = getSelectedObjects();
    const listContainer = document.getElementById('objects-list');

    if (!listContainer) {
        console.error('No se encontró el contenedor de lista de objetos');
        return;
    }

    listContainer.innerHTML = '';

    if (sceneObjects.length === 0) {
        listContainer.innerHTML = '<p>No hay objetos en la escena</p>';
        return;
    }

    const ul = document.createElement('ul');
    ul.className = 'objects-list-items';

    sceneObjects.forEach((obj, index) => {
        const li = document.createElement('li');
        li.className = 'object-list-item';

        // Verificar si está seleccionado
        if (selectedObjects.includes(obj)) {
            li.classList.add('selected');
        }

        // Obtener información del objeto
        const objectType = obj.userData?.type || 'Objeto';
        const objectId = obj.userData?.id || `obj-${index}`;
        const objectName = obj.userData?.name || `${capitalize(objectType)} ${objectId}`;

        // Crear contenido del item
        const itemContent = document.createElement('div');
        itemContent.className = 'object-item-content';

        const icon = document.createElement('span');
        icon.className = 'object-icon';
        icon.textContent = getObjectIcon(objectType);

        const name = document.createElement('span');
        name.className = 'object-name';
        name.textContent = objectName;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'object-delete-btn';
        deleteBtn.textContent = '×';
        deleteBtn.title = 'Eliminar objeto';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteObject(obj);
        });

        itemContent.appendChild(icon);
        itemContent.appendChild(name);
        itemContent.appendChild(deleteBtn);

        li.appendChild(itemContent);

        // Click para seleccionar
        li.addEventListener('click', () => {
            selectObject(obj);
        });

        ul.appendChild(li);
    });

    listContainer.appendChild(ul);
}

function getObjectIcon(type) {
    const icons = {
        cube: '◼',
        cylinder: '⬭',
        sphere: '●',
        cone: '▲',
        torus: '◯',
        plane: '▭'
    };
    return icons[type] || '◆';
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function deleteObject(object) {
    if (!confirm('¿Estás seguro de eliminar este objeto?')) {
        return;
    }

    // Importar dinámicamente para evitar dependencia circular
    import('../modules/renderer.js').then(({ getRendererManager }) => {
        const renderer = getRendererManager();
        renderer.removeObject(object);

        // Liberar geometría y material
        if (object.geometry) object.geometry.dispose();
        if (object.material) object.material.dispose();

        // Notificar que se eliminó el objeto
        document.dispatchEvent(new CustomEvent('objectRemoved', { detail: { object } }));
    });
}

export function assignObjectId(mesh, type) {
    objectCounter++;
    const id = objectCounter;
    const name = `${capitalize(type)} ${id}`;

    mesh.userData.id = id;
    mesh.userData.name = name;

    // Notificar que se agregó un objeto
    document.dispatchEvent(new CustomEvent('objectAdded', {
        detail: { object: mesh, type, id, name }
    }));

    return { id, name };
}
