import * as THREE from 'three';
import { SceneManager } from './scene.js';
import { Planet } from './planet.js';
import { FlowEngine } from './flow-engine.js';
import { UIManager } from './ui-manager.js';
import { MODES, TOOLS } from './constants.js';

class App {
    constructor() {
        this.sceneManager = new SceneManager('canvas-container');
        this.planet = new Planet(this.sceneManager.scene);
        this.flowEngine = new FlowEngine(this.sceneManager.scene, this.planet);
        this.ui = new UIManager();
        
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.isMouseDown = false;
        
        this.setupInteractions();
        this.animate();
    }

    setupInteractions() {
        const container = this.sceneManager.container;
        
        const updateMouse = (e) => {
            const rect = container.getBoundingClientRect();
            this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        };

        container.addEventListener('mousedown', (e) => {
            this.isMouseDown = true;
            updateMouse(e);
            this.handleInteraction(true);
        });

        window.addEventListener('mousemove', (e) => {
            updateMouse(e);
            if (this.isMouseDown && this.ui.state.mode === MODES.EDIT) {
                this.handleInteraction(false);
            }
        });

        window.addEventListener('mouseup', () => {
            this.isMouseDown = false;
        });

        // Mobile support
        container.addEventListener('touchstart', (e) => {
            if (e.touches.length > 0) {
                this.isMouseDown = true;
                updateMouse(e.touches[0]);
                this.handleInteraction(true);
            }
        }, { passive: false });
    }

    handleInteraction(isInitialClick) {
        this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);
        const intersects = this.raycaster.intersectObject(this.planet.mesh);

        if (intersects.length > 0) {
            const hit = intersects[0];
            const pos = hit.point.clone();
            
            // Map hit point back to sphere surface (ignoring current deformation)
            // We use the initial vertex data logic here
            const surfacePos = pos.clone().normalize().multiplyScalar(5);

            if (this.ui.state.mode === MODES.EDIT) {
                const delta = this.ui.state.tool === TOOLS.ADD ? 0.05 : -0.05;
                this.planet.setElevation(surfacePos, delta, true);
            } else if (isInitialClick) {
                if (this.ui.state.mode === MODES.FLOW) {
                    this.flowEngine.startFlow(pos, true);
                } else if (this.ui.state.mode === MODES.SPRING) {
                    this.flowEngine.startFlow(pos, true);
                } else if (this.ui.state.mode === MODES.VOLCANO) {
                    this.flowEngine.startFlow(pos, false);
                }
            }
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.planet.update();
        this.flowEngine.update();
        this.sceneManager.render();
    }
}

// Start the application
new App();