/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  Scene / Sun Builder — Sol cinematográfico con:               ║
 * ║    • Superficie con ruido Perlin animado                      ║
 * ║    • Corona pulsante (sprite radial)                          ║
 * ║    • Lens flare anamórfico                                    ║
 * ║    • Puntos de luz intensos para disparar bloom               ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

import { createSunSurfaceMaterial, buildCoronaSprite, buildLensFlare, createFlareTexture0, createFlareTexture3 } from '../shaders/sun-corona.js';

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

    // Corona grande — DESACTIVADO
    // const corona = buildCoronaSprite(p.radius, p.starColor || 0xffdd99);
    // group.add(corona);

    // Corona interna más intensa — DESACTIVADO
    // const innerCorona = buildCoronaSprite(p.radius * 0.6, p.starColor || 0xffeebb);
    // innerCorona.material.opacity = 0.9;
    // group.add(innerCorona);

    // ══ THREE.Lensflare Óptico Real ══
    if (typeof THREE.Lensflare !== 'undefined') {
        const texFlare0 = createFlareTexture0();
        const texFlare3 = createFlareTexture3();
        
        // Creamos una PointLight dentro del sol para atar el lensflare
        // Esta luz no ilumina la escena porque la iluminación general viene de lighting.js,
        // pero la usamos para el efecto óptico
        const light = new THREE.PointLight(p.starColor || 0xffffff, 1.5, 2000);
        
        const lensflare = new THREE.Lensflare();
        lensflare.addElement(new THREE.LensflareElement(texFlare0, p.radius * 60, 0.0, new THREE.Color(p.starColor || 0xffffff)));
        lensflare.addElement(new THREE.LensflareElement(texFlare3, p.radius * 15, 0.6));
        lensflare.addElement(new THREE.LensflareElement(texFlare3, p.radius * 10, 0.7));
        lensflare.addElement(new THREE.LensflareElement(texFlare3, p.radius * 25, 0.9));
        lensflare.addElement(new THREE.LensflareElement(texFlare3, p.radius * 12, 1.0));
        
        light.add(lensflare);
        group.add(light);
    }

    if (p.systemOffset) group.position.fromArray(p.systemOffset);
    scene.add(group);

    return {
        group,
        pMesh: surface,
        targetGrp: group,
        pData: p
    };
}
