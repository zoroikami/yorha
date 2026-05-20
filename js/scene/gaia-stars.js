/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  Scene / Gaia Stars — Catálogo Estelar ESA Gaia DR3           ║
 * ║                                                               ║
 * ║  Carga el buffer binario gaia_stars.bin y renderiza ~100k     ║
 * ║  estrellas en coordenadas reales del catálogo Gaia.           ║
 * ║                                                               ║
 * ║  Cada estrella tiene:                                         ║
 * ║    - Posición 3D real (ICRS → cartesiano desde paralaje)      ║
 * ║    - Color derivado del índice BP-RP (temperatura espectral)  ║
 * ║    - Tamaño proporcional a Magnitud G                         ║
 * ║                                                               ║
 * ║  Fuente: ESA/Gaia/DPAC — CC BY-SA 3.0 IGO                    ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

const GAIA_VERTEX_SHADER = /* glsl */ `
    attribute float aSize;
    attribute float aBrightness;
    varying vec3 vColor;
    varying float vBrightness;

    uniform float uTime;
    uniform float uPixelRatio;

    void main() {
        vColor = color;
        vBrightness = aBrightness;

        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        
        // Atenuación por distancia con floor mínimo
        float distAtten = 300.0 / max(1.0, -mvPosition.z);
        
        // Twinkle sutil basado en posición + tiempo
        float twinkle = 1.0 + 0.15 * sin(uTime * 1.5 + position.x * 0.1)
                                   * sin(uTime * 1.2 + position.z * 0.08);

        gl_PointSize = aSize * distAtten * twinkle * uPixelRatio;
        gl_PointSize = clamp(gl_PointSize, 0.5, 8.0);
        
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const GAIA_FRAGMENT_SHADER = /* glsl */ `
    varying vec3 vColor;
    varying float vBrightness;

    void main() {
        // Punto circular suave con halo
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);

        // Core brillante + halo difuso
        float core = exp(-dist * dist * 18.0);
        float halo = exp(-dist * dist * 4.0) * 0.3;
        float alpha = (core + halo) * vBrightness;

        if (alpha < 0.01) discard;

        // Las estrellas más brillantes son ligeramente más blancas (saturación reducida)
        vec3 finalColor = mix(vColor, vec3(1.0), core * 0.3);

        gl_FragColor = vec4(finalColor, alpha);
    }
`;

/**
 * Carga el buffer binario de Gaia y crea un sistema de puntos.
 * Formato: Header (8B) + N × 7 floats (posX, posY, posZ, r, g, b, size)
 * 
 * @param {THREE.Scene} scene
 * @param {string} binUrl - Ruta al archivo .bin
 * @param {Object} options - { scale, offset, layer }
 * @returns {Promise<{points: THREE.Points, count: number, uniforms: Object}>}
 */
export async function loadGaiaCatalog(scene, binUrl = 'data/gaia_stars.bin', options = {}) {
    const {
        scale = 50.0,    // Factor de escala para ajustar al espacio de la simulación
        offset = [0, 0, 0],
        minBrightness = 0.15
    } = options;

    let buffer;
    try {
        const response = await fetch(binUrl + '?t=' + Date.now());
        if (!response.ok) {
            console.warn('[Vynas/Gaia] Catálogo no encontrado. Ejecuta: python scripts/fetch_gaia_catalog.py');
            return null;
        }
        buffer = await response.arrayBuffer();
    } catch (e) {
        console.warn('[Vynas/Gaia] Error cargando catálogo:', e);
        return null;
    }

    // Leer header
    const headerView = new DataView(buffer);
    const magic = String.fromCharCode(
        headerView.getUint8(0), headerView.getUint8(1),
        headerView.getUint8(2), headerView.getUint8(3)
    );

    if (magic !== 'GAIA') {
        console.error('[Vynas/Gaia] Formato inválido — magic:', magic);
        return null;
    }

    const starCount = headerView.getUint32(4, true); // little-endian
    console.log(`%c[Vynas/Gaia]%c Cargando ${starCount.toLocaleString()} estrellas del catálogo ESA Gaia DR3`,
        'color:#ffd966;font-weight:bold', 'color:#aaa');

    // Leer datos (7 floats por estrella, empezando en byte 8)
    const dataView = new Float32Array(buffer, 8);
    const FLOATS_PER_STAR = 7;

    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    const brightness = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
        const base = i * FLOATS_PER_STAR;

        // Posición escalada
        positions[i * 3]     = dataView[base + 0] * scale + offset[0];
        positions[i * 3 + 1] = dataView[base + 1] * scale + offset[1];
        positions[i * 3 + 2] = dataView[base + 2] * scale + offset[2];

        // Color (ya en sRGB [0-1])
        colors[i * 3]     = dataView[base + 3];
        colors[i * 3 + 1] = dataView[base + 4];
        colors[i * 3 + 2] = dataView[base + 5];

        // Tamaño
        sizes[i] = dataView[base + 6];

        // Brillo normalizado desde tamaño (más grande = más brillante)
        brightness[i] = Math.max(minBrightness, Math.min(1.0, dataView[base + 6] / 3.5));
    }

    // Geometría
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aBrightness', new THREE.BufferAttribute(brightness, 1));

    // Material con shaders custom
    const uniforms = {
        uTime: { value: 0.0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
    };

    const material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: GAIA_VERTEX_SHADER,
        fragmentShader: GAIA_FRAGMENT_SHADER,
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    points.name = 'gaia-catalog';
    points.frustumCulled = false; // Las estrellas envuelven la escena completa
    scene.add(points);

    console.log(`%c[Vynas/Gaia]%c ✓ ${starCount.toLocaleString()} estrellas renderizadas (ESA Gaia DR3)`,
        'color:#4ade80;font-weight:bold', 'color:#aaa');

    return { points, count: starCount, uniforms };
}

/**
 * Actualiza el tiempo para el efecto de twinkle del catálogo Gaia.
 * Llamar desde el animation loop.
 */
export function animateGaiaCatalog(gaiaResult, time) {
    if (gaiaResult && gaiaResult.uniforms) {
        gaiaResult.uniforms.uTime.value = time;
    }
}

/**
 * Genera una capa procedural de fondo para estrellas fuera del rango de Gaia.
 * Complementa el catálogo real con estrellas decorativas a distancia extrema.
 */
export function buildGaiaFallbackLayer(scene, count = 8000, spread = 100000) {
    const geom = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    // Colores de cuerpo negro para la capa de fondo
    const spectra = [
        [1.0, 0.85, 0.72],  // K-type (naranja)
        [1.0, 0.95, 0.88],  // G-type (amarillo-blanco)
        [0.92, 0.93, 1.0],  // A-type (blanco-azul)
        [0.78, 0.82, 1.0],  // B-type (azul)
        [1.0, 1.0, 1.0]     // Blanco genérico
    ];

    for (let i = 0; i < count; i++) {
        // Distribución esférica uniforme
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = spread * (0.5 + Math.random() * 0.5);

        pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        pos[i * 3 + 2] = r * Math.cos(phi);

        const c = spectra[Math.floor(Math.random() * spectra.length)];
        col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
    }

    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(col, 3));

    const mat = new THREE.PointsMaterial({
        size: 0.8,
        transparent: true,
        opacity: 0.12,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: false
    });

    const points = new THREE.Points(geom, mat);
    points.name = 'gaia-fallback-layer';
    points.frustumCulled = false;
    scene.add(points);

    return points;
}
