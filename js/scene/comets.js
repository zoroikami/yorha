/**
 * ╔═══════════════════════════════════════════════════╗
 * ║  Comets — Cometas con colas de partículas         ║
 * ║  Feature 1.4: Objetos transeúntes dinámicos       ║
 * ╚═══════════════════════════════════════════════════╝
 */

const COMET_COUNT = 3;
const TAIL_LENGTH = 60;
const SCENE_RADIUS = 800;

class Comet {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();

        // Head (bright point)
        const headGeo = new THREE.SphereGeometry(0.6, 8, 8);
        const headMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9
        });
        this.head = new THREE.Mesh(headGeo, headMat);
        this.group.add(this.head);

        // Glow
        const glowGeo = new THREE.SphereGeometry(2.0, 8, 8);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0xc5a358,
            transparent: true,
            opacity: 0.15
        });
        this.glow = new THREE.Mesh(glowGeo, glowMat);
        this.group.add(this.glow);

        // Tail (particle trail)
        const tailPositions = new Float32Array(TAIL_LENGTH * 3);
        const tailOpacities = new Float32Array(TAIL_LENGTH);
        const tailSizes     = new Float32Array(TAIL_LENGTH);

        for (let i = 0; i < TAIL_LENGTH; i++) {
            tailOpacities[i] = 1.0 - (i / TAIL_LENGTH);
            tailSizes[i]     = 2.0 * (1.0 - i / TAIL_LENGTH);
        }

        const tailGeo = new THREE.BufferGeometry();
        tailGeo.setAttribute('position', new THREE.BufferAttribute(tailPositions, 3));
        tailGeo.setAttribute('opacity',  new THREE.BufferAttribute(tailOpacities, 1));

        const tailMat = new THREE.PointsMaterial({
            color: 0xc5a358,
            size: 1.5,
            transparent: true,
            opacity: 0.5,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.tail = new THREE.Points(tailGeo, tailMat);
        this.group.add(this.tail);
        this.tailPositions = tailPositions;

        scene.add(this.group);
        this.reset();
    }

    reset() {
        // Random start position outside scene
        const angle = Math.random() * Math.PI * 2;
        const y = (Math.random() - 0.5) * 200;

        this.position = new THREE.Vector3(
            Math.cos(angle) * SCENE_RADIUS,
            y,
            Math.sin(angle) * SCENE_RADIUS
        );

        // Aim roughly toward center with some randomness
        const target = new THREE.Vector3(
            (Math.random() - 0.5) * 200,
            (Math.random() - 0.5) * 100,
            (Math.random() - 0.5) * 200
        );

        this.velocity = target.sub(this.position).normalize().multiplyScalar(
            1.5 + Math.random() * 2.5
        );

        // Initialize tail positions to head position
        for (let i = 0; i < TAIL_LENGTH; i++) {
            this.tailPositions[i * 3]     = this.position.x;
            this.tailPositions[i * 3 + 1] = this.position.y;
            this.tailPositions[i * 3 + 2] = this.position.z;
        }

        this.life = 0;
        this.maxLife = 400 + Math.random() * 300;
    }

    update() {
        this.life++;
        if (this.life > this.maxLife || this.position.length() > SCENE_RADIUS * 1.5) {
            this.reset();
            return;
        }

        // Move head
        this.position.add(this.velocity);
        this.head.position.copy(this.position);
        this.glow.position.copy(this.position);

        // Shift tail positions
        for (let i = TAIL_LENGTH - 1; i > 0; i--) {
            this.tailPositions[i * 3]     = this.tailPositions[(i - 1) * 3];
            this.tailPositions[i * 3 + 1] = this.tailPositions[(i - 1) * 3 + 1];
            this.tailPositions[i * 3 + 2] = this.tailPositions[(i - 1) * 3 + 2];
        }
        this.tailPositions[0] = this.position.x;
        this.tailPositions[1] = this.position.y;
        this.tailPositions[2] = this.position.z;

        this.tail.geometry.attributes.position.needsUpdate = true;

        // Fade based on life
        const fadeIn  = Math.min(1, this.life / 30);
        const fadeOut = Math.min(1, (this.maxLife - this.life) / 50);
        const alpha   = fadeIn * fadeOut;
        this.head.material.opacity = alpha * 0.9;
        this.glow.material.opacity = alpha * 0.15;
        this.tail.material.opacity = alpha * 0.4;
    }
}

let _comets = [];

export function buildComets(scene) {
    for (let i = 0; i < COMET_COUNT; i++) {
        // Stagger spawn times
        const comet = new Comet(scene);
        comet.life = -i * 150; // negative = delay before appearing
        _comets.push(comet);
    }
    return _comets;
}

export function animateComets() {
    _comets.forEach(c => {
        if (c.life >= 0) c.update();
        else c.life++;
    });
}
