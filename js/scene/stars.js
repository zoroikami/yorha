/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  Scene / Starfield — Estrellas con 3 capas + twinkle          ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

function makeStarLayer(count, spread, size, opacity, colored = false) {
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = [
        [1.0, 1.0, 1.0],   // blanca
        [0.85, 0.9, 1.0],  // azul-blanca
        [1.0, 0.95, 0.85], // cálida
        [1.0, 0.8, 0.75],  // naranja-roja
        [0.8, 0.85, 1.0]   // azul
    ];
    for (let i = 0; i < count; i++) {
        positions[i*3]     = (Math.random() - 0.5) * spread;
        positions[i*3 + 1] = (Math.random() - 0.5) * spread;
        positions[i*3 + 2] = (Math.random() - 0.5) * spread;
        if (colored) {
            const c = palette[Math.floor(Math.random() * palette.length)];
            colors[i*3] = c[0]; colors[i*3 + 1] = c[1]; colors[i*3 + 2] = c[2];
        } else {
            colors[i*3] = colors[i*3 + 1] = colors[i*3 + 2] = 1;
        }
    }
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
        size,
        transparent: true,
        opacity,
        vertexColors: colored,
        color: colored ? 0xffffff : 0xffffff,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true
    });
    return new THREE.Points(geom, mat);
}

export function buildStarfield(scene) {
    const farStars = makeStarLayer(18000, 2200, 0.45, 0.16, false);
    const midStars = makeStarLayer(5000, 2000, 0.8, 0.28, true);
    const nearStars = makeStarLayer(600, 1500, 1.6, 0.55, true);
    farStars.name = 'stars-far';
    midStars.name = 'stars-mid';
    nearStars.name = 'stars-near';
    scene.add(farStars, midStars, nearStars);
    return { farStars, midStars, nearStars };
}

export function animateStarfield(starLayers, time) {
    if (starLayers.midStars) {
        starLayers.midStars.material.opacity = 0.24 + Math.sin(time * 0.002) * 0.08;
    }
    if (starLayers.nearStars) {
        starLayers.nearStars.material.opacity = 0.42 + Math.sin(time * 0.003 + 1.2) * 0.18;
    }
}

export function loadMilkyWayBackground(scene, textureUrl = 'img/8k_stars_milky_way.jpg') {
    const loader = new THREE.TextureLoader();
    loader.load(textureUrl, (t) => {
        t.mapping = THREE.EquirectangularReflectionMapping;
        scene.background = t;
    });
}
