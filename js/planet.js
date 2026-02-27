import * as THREE from 'three';
import { PLANET } from './constants.js';

export class Planet {
    constructor(scene) {
        this.scene = scene;
        this.heightmap = new Map();
        this.riverIntensity = new Map();
        
        this.initTexture();
        this.initMesh();
    }

    initTexture() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = PLANET.TEXTURE_SIZE;
        this.canvas.height = PLANET.TEXTURE_SIZE / 2;
        this.ctx = this.canvas.getContext('2d');
        
        this.texture = new THREE.CanvasTexture(this.canvas);
        this.texture.wrapS = THREE.RepeatWrapping;
        this.texture.wrapT = THREE.RepeatWrapping;
        
        this.clearRivers();
    }

    initMesh() {
        const geometry = new THREE.SphereGeometry(PLANET.RADIUS, PLANET.SEGMENTS, PLANET.SEGMENTS);
        const material = new THREE.MeshStandardMaterial({
            color: PLANET.COLOR_BASE,
            roughness: 0.8,
            metalness: 0.1,
            flatShading: true,
            map: this.texture
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.mesh);
        
        // Save initial positions for deformation relative to sphere surface
        this.initialPositions = geometry.attributes.position.array.slice();
    }

    getKey(x, y, z) {
        return `${x.toFixed(2)},${y.toFixed(2)},${z.toFixed(2)}`;
    }

    getElevation(position) {
        const key = this.getKey(position.x, position.y, position.z);
        return this.heightmap.get(key) || 0;
    }

    setElevation(position, value, isRelative = false) {
        const key = this.getKey(position.x, position.y, position.z);
        const current = this.heightmap.get(key) || 0;
        const next = isRelative ? current + value : value;
        this.heightmap.set(key, THREE.MathUtils.clamp(next, -1.0, 2.0));
        this.updateGeometry();
    }

    updateGeometry() {
        const positions = this.mesh.geometry.attributes.position;
        
        for (let i = 0; i < positions.count; i++) {
            const idx = i * 3;
            const ox = this.initialPositions[idx];
            const oy = this.initialPositions[idx + 1];
            const oz = this.initialPositions[idx + 2];
            
            const normal = new THREE.Vector3(ox, oy, oz).normalize();
            const elevation = this.heightmap.get(this.getKey(ox, oy, oz)) || 0;
            
            const newPos = normal.clone().multiplyScalar(PLANET.RADIUS + elevation);
            positions.setXYZ(i, newPos.x, newPos.y, newPos.z);
        }
        
        positions.needsUpdate = true;
        this.mesh.geometry.computeVertexNormals();
    }

    clearRivers() {
        this.ctx.fillStyle = PLANET.COLOR_RIVER_BASE;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.texture.needsUpdate = true;
    }

    addRiverPoint(pos, intensity, isWater = true) {
        const key = this.getKey(pos.x, pos.y, pos.z);
        const current = this.riverIntensity.get(key) || 0;
        this.riverIntensity.set(key, Math.min(255, current + intensity));
        this.drawToCanvas(pos, current + intensity, isWater);
    }

    drawToCanvas(pos, intensity, isWater) {
        if (intensity < 5) return;

        // Spherical to UV
        const normal = pos.clone().normalize();
        const u = (Math.atan2(normal.z, normal.x) / (2 * Math.PI)) + 0.5;
        const v = (Math.acos(normal.y) / Math.PI);
        
        const x = u * this.canvas.width;
        const y = v * this.canvas.height;
        
        const size = Math.max(2, intensity / 30);
        this.ctx.fillStyle = isWater ? 
            `rgba(0, 136, 255, ${intensity/255})` : 
            `rgba(255, 68, 0, ${intensity/255})`;
            
        this.ctx.beginPath();
        this.ctx.arc(x, y, size, 0, Math.PI * 2);
        this.ctx.fill();
        this.texture.needsUpdate = true;
    }

    update() {
        // Rotate slowly
        this.mesh.rotation.y += 0.002;
    }
}