// Importamos THREE y OrbitControls desde threeUtils.js
import THREE, { OrbitControls } from '../utils/threeUtils.js';

class RendererManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`El contenedor con id "${containerId}" no fue encontrado.`);
        }

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.objects = [];

        this.init();
    }

    init() {
        // Configuración de la escena y cámara
        this.scene.background = new THREE.Color(0x1e1e1e);
        this.camera.position.set(3, 4, 5);
        this.camera.lookAt(0, 0, 0);

        // Configuración del renderizador
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.innerHTML = '';
        this.container.appendChild(this.renderer.domElement);

        // Configuración de luces
        this.setupLights();

        // Configuración de controles
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 500;

        // Manejador de redimensionamiento
        window.addEventListener('resize', this.onWindowResize.bind(this));

        // Iniciar bucle de animación
        this.animate();
        console.log('Renderizador 3D inicializado y gestionado por RendererManager');
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
        keyLight.position.set(-5, 5, 5);
        this.scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
        fillLight.position.set(5, 0, 5);
        this.scene.add(fillLight);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    addObject(object) {
        this.scene.add(object);
        if (!this.objects.includes(object)) {
            this.objects.push(object);
        }
    }

    removeObject(object) {
        this.scene.remove(object);
        this.objects = this.objects.filter(obj => obj !== object);
    }

    clearScene() {
        this.objects.forEach(obj => this.scene.remove(obj));
        this.objects = [];
    }

    getSceneObjects() {
        return [...this.objects];
    }
}

// Singleton para el RendererManager
let rendererManagerInstance = null;

export function initializeRenderer(containerId = 'viewer') {
    if (!rendererManagerInstance) {
        rendererManagerInstance = new RendererManager(containerId);
    }
    return rendererManagerInstance;
}

// Exportar acceso a la instancia y sus propiedades importantes
export function getRendererManager() {
    if (!rendererManagerInstance) {
        throw new Error("RendererManager no ha sido inicializado. Llama a initializeRenderer() primero.");
    }
    return rendererManagerInstance;
}

// Para mantener compatibilidad con módulos que importan 'camera' directamente
export let camera = new THREE.PerspectiveCamera(); // Placeholder
if (rendererManagerInstance) {
    camera = rendererManagerInstance.camera;
}

// Funciones de utilidad para interactuar con el singleton
export function addObjectToScene(object) {
    getRendererManager().addObject(object);
}

export function getAllSceneObjects() {
    return getRendererManager().getSceneObjects();
}
