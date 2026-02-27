import * as THREE from 'three';
import { FLOW } from './constants.js';

export class FlowEngine {
    constructor(scene, planet) {
        this.scene = scene;
        this.planet = planet;
        this.activeFlows = [];
        
        this.initTracer();
    }

    initTracer() {
        const geometry = new THREE.SphereGeometry(FLOW.TRACER_RADIUS, 8, 8);
        const material = new THREE.MeshBasicMaterial({ color: 0x00aaff });
        this.tracerMesh = new THREE.Mesh(geometry, material);
        this.tracerMesh.visible = false;
        // Make tracer a child of the planet so it moves with its rotation
        this.planet.mesh.add(this.tracerMesh);
    }

    startFlow(localStartPosition, isWater = true) {
        const flow = {
            position: localStartPosition.clone(),
            distance: 0,
            isWater: isWater,
            active: true
        };
        this.activeFlows.push(flow);
        
        if (this.activeFlows.length === 1) {
            this.tracerMesh.visible = true;
            this.tracerMesh.material.color.set(isWater ? 0x00aaff : 0xff4400);
        }
    }

    computeGradient(pos) {
        const epsilon = 0.2;
        const getElevation = (offset) => {
            const p = pos.clone().add(offset);
            return this.planet.getElevation(p);
        };

        const eX1 = getElevation(new THREE.Vector3(epsilon, 0, 0));
        const eX2 = getElevation(new THREE.Vector3(-epsilon, 0, 0));
        const eY1 = getElevation(new THREE.Vector3(0, epsilon, 0));
        const eY2 = getElevation(new THREE.Vector3(0, -epsilon, 0));
        const eZ1 = getElevation(new THREE.Vector3(0, 0, epsilon));
        const eZ2 = getElevation(new THREE.Vector3(0, 0, -epsilon));

        const grad = new THREE.Vector3(
            (eX1 - eX2) / (2 * epsilon),
            (eY1 - eY2) / (2 * epsilon),
            (eZ1 - eZ2) / (2 * epsilon)
        );

        return grad;
    }

    update() {
        for (let i = this.activeFlows.length - 1; i >= 0; i--) {
            const flow = this.activeFlows[i];
            
            const gradient = this.computeGradient(flow.position);
            const surfaceNormal = flow.position.clone().normalize();
            
            const moveDir = gradient.clone().projectOnPlane(surfaceNormal).negate();
            
            if (moveDir.length() < 0.0001) {
                flow.active = false;
            } else {
                flow.position.add(moveDir.setLength(FLOW.TRACER_SPEED));
                const currentElevation = this.planet.getElevation(flow.position);
                flow.position.normalize().multiplyScalar(5 + currentElevation + 0.05);
                
                flow.distance += FLOW.TRACER_SPEED;
                
                this.planet.addRiverPoint(flow.position, FLOW.INTENSITY_STEP, flow.isWater);
            }

            if (flow.distance > FLOW.MAX_DISTANCE || !flow.active) {
                this.activeFlows.splice(i, 1);
                if (this.activeFlows.length === 0) this.tracerMesh.visible = false;
            } else if (i === 0) {
                this.tracerMesh.position.copy(flow.position);
            }
        }
    }
}