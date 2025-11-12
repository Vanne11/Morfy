// Componente de la barra de herramientas
import { createCube } from './cube.js';
import { createCylinder } from './cylinder.js';
import { createSphere } from './sphere.js';
import { createCone } from './cone.js';
import { createTorus } from './torus.js';
import { createPlane } from './plane.js';
import { performUnion, performDifference, performIntersection, clearSelection } from '../modules/operations.js';
import { exportSceneToSTL } from '../modules/export.js';

class ToolManager {
    constructor() {
        this.tools = [
            { id: 'cube-tool', action: createCube, type: 'tool' },
            { id: 'cylinder-tool', action: createCylinder, type: 'tool' },
            { id: 'sphere-tool', action: createSphere, type: 'tool' },
            { id: 'cone-tool', action: createCone, type: 'tool' },
            { id: 'torus-tool', action: createTorus, type: 'tool' },
            { id: 'plane-tool', action: createPlane, type: 'tool' },
            { id: 'union-tool', action: performUnion, type: 'action' },
            { id: 'difference-tool', action: performDifference, type: 'action' },
            { id: 'intersection-tool', action: performIntersection, type: 'action' },
            { id: 'export-stl', action: this.handleExport, type: 'action' },
            { id: 'clear-selection-tool', action: clearSelection, type: 'action' }
        ];
        this.activeTool = null;
        this.initialize();
    }

    initialize() {
        this.tools.forEach(tool => {
            const button = document.getElementById(tool.id);
            if (button) {
                button.addEventListener('click', () => {
                    if (tool.type === 'tool') {
                        this.setActiveTool(tool.id);
                    }
                    tool.action();
                });
            }
        });
    }

    setActiveTool(toolId) {
        if (this.activeTool) {
            const oldButton = document.getElementById(this.activeTool);
            if (oldButton) {
                oldButton.classList.remove('active');
            }
        }
        const newButton = document.getElementById(toolId);
        if (newButton) {
            newButton.classList.add('active');
        }
        this.activeTool = toolId;
    }

    handleExport() {
        const format = prompt('¿Qué formato desea para la exportación?\n1. ASCII\n2. Binario\n\nEscriba "1" o "2":');
        if (format === '1') {
            exportSceneToSTL({ binary: false, filename: 'modelo_ascii.stl' });
        } else if (format === '2') {
            exportSceneToSTL({ binary: true, filename: 'modelo_binario.stl' });
        }
    }
}

export function initializeToolbar() {
    new ToolManager();
}