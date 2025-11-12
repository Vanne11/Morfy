// Módulo principal de la aplicación
import { initializeRenderer } from './renderer.js';
import { initializeToolbar } from '../components/toolbar.js';
import { initializeParameterPanel } from '../components/parameterPanel.js';
import { initializeObjectInteraction } from './interaction.js';
import { updateToolButtonsState } from './operations.js';
import { initializeHistory } from './history.js';

class App {
    constructor() {
        this.initializeApp();
    }

    initializeApp() {
        try {
            console.log('Iniciando Morfy...');
            
            // 1. Inicializar componentes centrales
            this.initCore();
            
            // 2. Inicializar la interfaz de usuario
            this.initUI();
            
            // 3. Inicializar la interacción del usuario
            this.initInteraction();
            
            console.log('Aplicación Morfy inicializada correctamente');
        } catch (error) {
            console.error('Error fatal durante la inicialización de la aplicación:', error);
            // Opcionalmente, mostrar un mensaje de error al usuario en la UI
        }
    }

    initCore() {
        console.log('Inicializando el núcleo...');
        initializeRenderer();
        // Aquí podrían ir otros módulos centrales (ej: gestor de estado, etc.)
    }

    initUI() {
        console.log('Inicializando la interfaz de usuario...');
        initializeToolbar();
        initializeParameterPanel();
        updateToolButtonsState();
        initializeHistory();
    }

    initInteraction() {
        console.log('Inicializando la interacción...');
        initializeObjectInteraction();
    }
}

// Exportar una función para crear la instancia de la app
export function initializeApp() {
    new App();
}