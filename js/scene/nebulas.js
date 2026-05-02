/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  Scene / Nebulas — Nebulosas volumétricas procedurales        ║
 * ║  Sprites gigantes con gradiente radial + ruido coloreado      ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

function makeNebulaTexture(colorA, colorB, seed = 0) {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Fondo radial
    const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    grad.addColorStop(0, colorA);
    grad.addColorStop(0.5, colorB);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Nubes de ruido superpuestas
    const img = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < img.data.length; i += 4) {
        const x = (i / 4) % size;
        const y = Math.floor((i / 4) / size);
        const cx = x - size/2, cy = y - size/2;
        const dist = Math.sqrt(cx*cx + cy*cy) / (size/2);
        const noise = Math.sin((x + seed*17) * 0.045) * Math.cos((y + seed*23) * 0.035) * 0.5 + 0.5;
        const puff = Math.exp(-dist * 2.5);
        const factor = noise * puff;
        img.data[i]     = Math.min(255, img.data[i]     * (0.8 + factor * 0.7));
        img.data[i + 1] = Math.min(255, img.data[i + 1] * (0.8 + factor * 0.7));
        img.data[i + 2] = Math.min(255, img.data[i + 2] * (0.8 + factor * 0.7));
        img.data[i + 3] = img.data[i + 3] * puff;
    }
    ctx.putImageData(img, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    return tex;
}

export function buildNebulas(scene) {
    const configs = [
        { pos: [ 1200, -400, -1300], colorA: 'rgba(160, 80, 200, 0.55)', colorB: 'rgba(80, 30, 120, 0.18)', size: 1800, seed: 1 },
        { pos: [-1400,  500,  -900], colorA: 'rgba(60, 160, 220, 0.45)', colorB: 'rgba(20, 70, 140, 0.15)', size: 1600, seed: 2 },
        { pos: [ -900, -700,  1500], colorA: 'rgba(230, 110, 150, 0.42)', colorB: 'rgba(140, 40, 80, 0.14)', size: 1500, seed: 3 },
        { pos: [ 1100,  900,  1200], colorA: 'rgba(80, 220, 180, 0.38)', colorB: 'rgba(30, 110, 90, 0.12)', size: 1400, seed: 4 }
    ];

    const group = new THREE.Group();
    group.name = 'nebulas';
    configs.forEach(cfg => {
        const tex = makeNebulaTexture(cfg.colorA, cfg.colorB, cfg.seed);
        const mat = new THREE.SpriteMaterial({
            map: tex,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            opacity: 0.75
        });
        const sprite = new THREE.Sprite(mat);
        sprite.position.set(...cfg.pos);
        sprite.scale.set(cfg.size, cfg.size, 1);
        sprite.userData.driftSeed = cfg.seed;
        group.add(sprite);
    });
    scene.add(group);
    return group;
}

export function animateNebulas(group, time) {
    if (!group) return;
    group.children.forEach((s, i) => {
        const seed = s.userData.driftSeed || 1;
        s.material.opacity = 0.55 + Math.sin(time * 0.0004 + seed) * 0.18;
    });
}
