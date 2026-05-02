/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  Engine / Camera Controls — OrbitControls wrapper             ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

export function createControls(camera, canvas) {
    const controls = new THREE.OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.4;
    controls.enabled = false;
    controls.minDistance = 10;
    controls.maxDistance = 2500;
    return controls;
}
