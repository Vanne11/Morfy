// Punto de entrada de la aplicación Morfy
import { initializeApp } from './modules/app.js';

// Bandera para asegurar que la app se inicialice solo una vez
let isAppInitialized = false;

function startApp() {
    if (isAppInitialized) {
        console.warn('La aplicación ya ha sido inicializada. Se omite la reinicialización.');
        return;
    }
    
    initializeApp();
    isAppInitialized = true;
}

// Inicializar la aplicación cuando el DOM esté listo
if (document.readyState === 'loading') {
    // El DOM todavía se está cargando, esperar al evento
    document.addEventListener('DOMContentLoaded', startApp);
} else {
    // El DOM ya está listo, iniciar inmediatamente
    startApp();
}