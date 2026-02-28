import * as THREE from 'three';
import { PLANET } from './constants.js';

export class Planet {
    constructor(scene) {
        this.scene = scene;
        this.riverIntensity = new Map();
        
        this.initTexture();
        this.initMesh();
        
        // Use an array for elevations for better performance and easier lookup
        this.elevations = new Float32Array(this.mesh.geometry.attributes.position.count);
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
            color: 0xffffff, // Use white so the texture colors show through correctly
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

    getElevation(localPos) {
        // Map local position to spherical coordinates to find grid index
        const normal = localPos.clone().normalize();
        let u = (Math.atan2(normal.z, normal.x) / (Math.PI * 2)) + 0.5;
        const v = (Math.acos(normal.y) / Math.PI);
        
        // Ensure u is in [0, 1]
        u = ((u % 1) + 1) % 1;

        const xIdx = Math.round(u * PLANET.SEGMENTS);
        const yIdx = Math.round(v * PLANET.SEGMENTS);
        const index = yIdx * (PLANET.SEGMENTS + 1) + xIdx;
        
        return this.elevations[index] || 0;
    }

    getKey(x, y, z) {
        // Use a spatial key for accumulation tracking
        const precision = 10;
        return `${Math.round(x * precision)},${Math.round(y * precision)},${Math.round(z * precision)}`;
    }

    deform(localPoint, delta, radius) {
        const posAttr = this.mesh.geometry.attributes.position;
        const v = new THREE.Vector3();
        // Project localPoint to the base sphere to ensure brush works consistently on hills/valleys
        const projectedHit = localPoint.clone().normalize().multiplyScalar(PLANET.RADIUS);
        let changed = false;

        for (let i = 0; i < posAttr.count; i++) {
            v.fromArray(this.initialPositions, i * 3);
            const dist = v.distanceTo(projectedHit);
            
            if (dist < radius) {
                const falloff = 1.0 - (dist / radius);
                this.elevations[i] += delta * falloff;
                this.elevations[i] = THREE.MathUtils.clamp(this.elevations[i], -1.0, 2.5);
                changed = true;
            }
        }

        if (changed) {
            this.updateGeometry();
        }
    }

    updateGeometry() {
        const positions = this.mesh.geometry.attributes.position;
        const v = new THREE.Vector3();
        
        for (let i = 0; i < positions.count; i++) {
            v.fromArray(this.initialPositions, i * 3);
            const normal = v.clone().normalize();
            const elevation = this.elevations[i];
            
            const newPos = normal.multiplyScalar(PLANET.RADIUS + elevation);
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