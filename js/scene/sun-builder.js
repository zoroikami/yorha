/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  Scene / Sun Builder — Sol cinematográfico con:               ║
 * ║    • Superficie con ruido Perlin animado                      ║
 * ║    • Corona pulsante (sprite radial)                          ║
 * ║    • Lens flare anamórfico                                    ║
 * ║    • Puntos de luz intensos para disparar bloom               ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

import { createSunSurfaceMaterial, buildCoronaSprite, buildLensFlare } from '../shaders/sun-corona.js';

const textureLoader = new THREE.TextureLoader();

export function buildSun(planetData, scene) {
    const p = planetData;
    const group = new THREE.Group();
    group.name = `sun-${p.id}`;

    const tex = textureLoader.load(p.texture);
    tex.anisotropy = 8;

    // Superficie solar con shader procedural
    const surfaceMat = createSunSurfaceMaterial(tex, p.starColor || 0xffee88);
    const surface = new THREE.Mesh(
        new THREE.SphereGeometry(p.radius, 96, 96),
        surfaceMat
    );
    surface.userData = { ...p, planetaryKey: p.id };
    surface.name = 'sun-surface';
    group.add(surface);

    // Corona grande
    const corona = buildCoronaSprite(p.radius, p.starColor || 0xffdd99);
    group.add(corona);

    // Corona interna más intensa
    const innerCorona = buildCoronaSprite(p.radius * 0.6, p.starColor || 0xffeebb);
    innerCorona.material.opacity = 0.9;
    group.add(innerCorona);

    // Lens flare (se actualiza por frame según posición de la cámara)
    const flare = buildLensFlare(p.radius, p.starColor || 0xffeecc);
    group.add(flare);

    if (p.systemOffset) group.position.fromArray(p.systemOffset);
    scene.add(group);

    return {
        group,
        pMesh: surface,
        targetGrp: group,
        pData: p
    };
}
