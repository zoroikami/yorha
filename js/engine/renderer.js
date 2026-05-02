/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  Engine / Renderer — WebGL setup con shadow maps              ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */
import { ENGINE } from '../config.js';

export function createRenderer(canvas) {
    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, ENGINE.pixelRatioMax));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding || renderer.outputEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    return renderer;
}

export function createCamera() {
    const { fov, near, far, initialPos } = ENGINE.camera;
    const camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, near, far);
    camera.position.set(initialPos[0], initialPos[1], initialPos[2]);
    return camera;
}

export function attachResizeHandler(camera, renderer, composer) {
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        if (composer) composer.setSize(window.innerWidth, window.innerHeight);
    });
}
