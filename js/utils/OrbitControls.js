// utils/OrbitControls.js
import * as THREE from 'three';

class OrbitControls {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        
        this.enabled = true;
        this.target = new THREE.Vector3();
        
        this.minDistance = 1;
        this.maxDistance = Infinity;
        
        this.dampingFactor = 0.25;
        this.enableDamping = false;

        // Iniciar los valores para rotación y desplazamiento
        this.azimuthAngle = 0;
        this.polarAngle = Math.PI / 3;
        this.radius = 5;

        // Definir los límites de movimiento
        this.minPolarAngle = 0;
        this.maxPolarAngle = Math.PI;

        this.mouse = new THREE.Vector2();
        this.prevMouse = new THREE.Vector2();
        
        this._initEvents();
    }

    _initEvents() {
        this.domElement.addEventListener('mousemove', this.onMouseMove.bind(this), false);
        this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this), false);
        this.domElement.addEventListener('mouseup', this.onMouseUp.bind(this), false);
        this.domElement.addEventListener('wheel', this.onMouseWheel.bind(this), false);
    }

    onMouseMove(event) {
        if (!this.enabled) return;
        
        const deltaX = event.clientX - this.prevMouse.x;
        const deltaY = event.clientY - this.prevMouse.y;
        
        this.azimuthAngle -= deltaX * 0.005;
        this.polarAngle += deltaY * 0.005;

        this.polarAngle = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, this.polarAngle));

        this.updateCamera();
        this.prevMouse.set(event.clientX, event.clientY);
    }

    onMouseDown(event) {
        this.prevMouse.set(event.clientX, event.clientY);
    }

    onMouseUp(event) {
        // Puedes agregar acciones si necesitas manejar el "mouse up"
    }

    onMouseWheel(event) {
        if (!this.enabled) return;
        
        const delta = event.deltaY || event.detail || -event.wheelDelta;
        this.radius -= delta * 0.01;
        this.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this.radius));

        this.updateCamera();
    }

    updateCamera() {
        const x = this.radius * Math.sin(this.polarAngle) * Math.sin(this.azimuthAngle);
        const y = this.radius * Math.cos(this.polarAngle);
        const z = this.radius * Math.sin(this.polarAngle) * Math.cos(this.azimuthAngle);
        
        this.camera.position.set(x, y, z);
        this.camera.lookAt(this.target);
        
        if (this.enableDamping) {
            // Agregar suavizado si está habilitado
        }
    }

    update() {
        // Se puede agregar suavizado y control de cámara aquí si es necesario
    }
}

export { OrbitControls };
