/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  Scene / Asteroid Belt                                        ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

export function buildAsteroidBelt(scene, count = 2500, innerR = 82, outerR = 112) {
    const group = new THREE.Group();
    group.name = 'asteroid-belt';
    scene.add(group);

    const geom = new THREE.DodecahedronGeometry(0.5, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0x777770, roughness: 0.92, metalness: 0.08 });
    const mesh = new THREE.InstancedMesh(geom, mat, count);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
        const r = innerR + Math.random() * (outerR - innerR);
        const angle = Math.random() * Math.PI * 2;
        const y = (Math.random() + Math.random() - 1.0) * 5;
        dummy.position.set(r * Math.cos(angle), y, r * Math.sin(angle));
        dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        const scale = 0.4 + Math.random() * 1.2;
        dummy.scale.set(scale, scale * (0.7 + Math.random() * 0.6), scale * (0.7 + Math.random() * 0.6));
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
    }

    group.add(mesh);
    return group;
}
