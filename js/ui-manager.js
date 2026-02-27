import { MODES, TOOLS } from './constants.js';

export class UIManager {
    constructor() {
        this.state = {
            mode: MODES.EDIT,
            tool: TOOLS.ADD,
            intensity: 1.0
        };

        this.initElements();
        this.setupListeners();
    }

    initElements() {
        this.buttons = document.querySelectorAll('button[data-mode]');
        this.toolButtons = document.querySelectorAll('button[data-tool]');
        this.editControls = document.getElementById('edit-controls');
        this.intensityControls = document.getElementById('intensity-controls');
        this.intensitySlider = document.getElementById('intensity-slider');
        this.intensityValueDisplay = document.getElementById('intensity-value');
        this.intensityLabel = document.getElementById('intensity-label');
    }

    setupListeners() {
        this.buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.setMode(btn.dataset.mode);
            });
        });

        this.toolButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.setTool(btn.dataset.tool);
            });
        });

        this.intensitySlider.addEventListener('input', (e) => {
            this.state.intensity = parseFloat(e.target.value);
            this.intensityValueDisplay.textContent = this.state.intensity.toFixed(1);
        });
    }

    setMode(mode) {
        this.state.mode = mode;
        this.buttons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        // Toggle UI panels
        this.editControls.classList.toggle('hidden', mode !== MODES.EDIT);
        this.intensityControls.classList.toggle('hidden', mode === MODES.EDIT || mode === MODES.FLOW);
        
        if (mode === MODES.SPRING) {
            this.intensityLabel.textContent = '💧 Water Flow Rate';
        } else if (mode === MODES.VOLCANO) {
            this.intensityLabel.textContent = '🌋 Lava Flow Rate';
        }
    }

    setTool(tool) {
        this.state.tool = tool;
        this.toolButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });
    }
}