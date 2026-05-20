/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  Scene / Planet Builder — Factory PBR multicapa               ║
 * ║                                                               ║
 * ║  Cada planeta se construye con:                               ║
 * ║    1. Mesh principal (MeshStandardMaterial PBR)               ║
 * ║       - map (color difuso)                                    ║
 * ║       - normalMap procedural o real                           ║
 * ║       - emissiveMap + emissiveIntensity (luces nocturnas)     ║
 * ║       - roughness / metalness ajustadas por tipo              ║
 * ║    2. Capa de nubes (si aplica, con normal derivada)          ║
 * ║    3. Anillos (si aplica, UVs radiales + sombra custom)       ║
 * ║    4. Atmósfera Fresnel (si tiene atmosphereColor)            ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

import { buildAtmosphereMesh } from '../shaders/atmosphere.js';

const textureLoader = new THREE.TextureLoader();

/**
 * Genera un normal map procedural a partir de una textura color.
 * Útil cuando no hay normalMap real disponible.
 */
function generateProceduralNormal(sourceUrl, strength = 1.2) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const w = Math.min(img.width, 1024);
            const h = Math.min(img.height, 1024);
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            const src = ctx.getImageData(0, 0, w, h);
            const dst = ctx.createImageData(w, h);
            const getLum = (x, y) => {
                x = Math.max(0, Math.min(w - 1, x));
                y = Math.max(0, Math.min(h - 1, y));
                const i = (y * w + x) * 4;
                return (src.data[i] + src.data[i + 1] + src.data[i + 2]) / 3 / 255;
            };
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    const dx = getLum(x + 1, y) - getLum(x - 1, y);
                    const dy = getLum(x, y + 1) - getLum(x, y - 1);
                    const nx = -dx * strength;
                    const ny = -dy * strength;
                    const nz = 1.0;
                    const len = Math.sqrt(nx*nx + ny*ny + nz*nz);
                    const i = (y * w + x) * 4;
                    dst.data[i]     = (nx/len * 0.5 + 0.5) * 255;
                    dst.data[i + 1] = (ny/len * 0.5 + 0.5) * 255;
                    dst.data[i + 2] = (nz/len * 0.5 + 0.5) * 255;
                    dst.data[i + 3] = 255;
                }
            }
            ctx.putImageData(dst, 0, 0);
            const tex = new THREE.CanvasTexture(canvas);
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            resolve(tex);
        };
        img.onerror = () => resolve(null);
        img.src = sourceUrl;
    });
}

function defaultAtmosphereFor(planetData) {
    if (planetData.atmosphereColor) {
        return {
            color: new THREE.Color(planetData.atmosphereColor),
            intensity: planetData.atmosphereIntensity || 1.0,
            fresnelPower: planetData.atmosphereFresnel || 2.5,
            scale: planetData.atmosphereScale || 1.08
        };
    }
    // Presets automáticos por id conocido
    const presets = {
        tierra:  { color: 0x66aaff, intensity: 1.4, fresnelPower: 2.2, scale: 1.08 },
        venus:   { color: 0xffcc77, intensity: 1.6, fresnelPower: 1.8, scale: 1.10 },
        marte:   { color: 0xff8866, intensity: 0.6, fresnelPower: 3.0, scale: 1.05 },
        jupiter: { color: 0xffaa88, intensity: 0.9, fresnelPower: 2.5, scale: 1.04 },
        saturno: { color: 0xffe0a0, intensity: 0.8, fresnelPower: 2.8, scale: 1.04 },
        urano:   { color: 0x88ddff, intensity: 1.1, fresnelPower: 2.4, scale: 1.06 },
        neptuno: { color: 0x4477ff, intensity: 1.2, fresnelPower: 2.2, scale: 1.06 },
        trappist1e: { color: 0x77ddaa, intensity: 1.2, fresnelPower: 2.3, scale: 1.07 },
        kepler186f: { color: 0x99ccff, intensity: 1.1, fresnelPower: 2.4, scale: 1.07 }
    };
    const preset = presets[planetData.id];
    if (preset) {
        return {
            color: new THREE.Color(preset.color),
            intensity: preset.intensity,
            fresnelPower: preset.fresnelPower,
            scale: preset.scale
        };
    }
    return null;
}

/**
 * ══ USGS DEM Displacement Map Support ══
 * Configuración de desplazamiento topográfico por planeta.
 * Los archivos DEM deben descargarse de USGS Astrogeology:
 *   https://astrogeology.usgs.gov/search
 * 
 * Formato esperado: imágenes grayscale 16-bit convertidas a 8-bit PNG/JPG
 * donde blanco = elevación máxima, negro = elevación mínima.
 */
const DEM_CONFIG = {
    // Luna: Lunar Orbiter Laser Altimeter (LOLA)
    luna: {
        displacementScale: 0.08,    // Factor de desplazamiento relativo al radio
        displacementBias: -0.04,    // Centrar el desplazamiento
        segments: 256               // Alta resolución para topografía
    },
    // Marte: Mars Orbiter Laser Altimeter (MOLA)
    marte: {
        displacementScale: 0.06,    // Olympus Mons ~21km / radio 3389km ≈ 0.006, exagerado x10
        displacementBias: -0.02,
        segments: 256
    },
    // Mercurio: MESSENGER DEM
    mercurio: {
        displacementScale: 0.04,
        displacementBias: -0.02,
        segments: 192
    },
    // Tierra: ETOPO1 (terreno + batimetría)
    tierra: {
        displacementScale: 0.015,   // Everest ~8.8km / radio 6371km ≈ 0.0014, exagerado x10
        displacementBias: -0.005,
        segments: 256
    }
};

function buildPlanetMesh(p) {
    const texture = textureLoader.load(p.texture);
    texture.anisotropy = 8;

    let material;
    if (p.isStar) {
        material = new THREE.MeshBasicMaterial({
            map: texture,
            color: p.starColor || 0xffffff
        });
    } else {
        const matOpts = {
            map: texture,
            roughness: p.roughness !== undefined ? p.roughness : 0.85,
            metalness: p.metalness !== undefined ? p.metalness : 0.05
        };

        // Luces nocturnas (Tierra)
        if (p.nightTexture) {
            matOpts.emissiveMap = textureLoader.load(p.nightTexture);
            matOpts.emissive = new THREE.Color(0xffd080);
            matOpts.emissiveIntensity = 0.9;
        }

        // ══ USGS DEM — Displacement Map (topografía real) ══
        if (p.demTexture) {
            const demTex = textureLoader.load(p.demTexture);
            demTex.anisotropy = 8;
            matOpts.displacementMap = demTex;

            const demCfg = DEM_CONFIG[p.id] || { displacementScale: 0.03, displacementBias: -0.015 };
            matOpts.displacementScale = p.radius * demCfg.displacementScale;
            matOpts.displacementBias = p.radius * demCfg.displacementBias;
            
            // MEJORA VISUAL: Usar el mapa de elevación como Roughness Map
            // Las zonas bajas (océanos = oscuras) serán reflectantes (smooth)
            // Las zonas altas (continentes = claras) serán rugosas (rough)
            matOpts.roughnessMap = demTex;
            matOpts.roughness = 0.8; // Base
            matOpts.metalness = 0.2; // Ligero tinte metálico para reflejos del sol en el agua
        }

        material = new THREE.MeshStandardMaterial(matOpts);

        // Normal map: priorizar textura real, fallback a procedural
        if (p.normalTexture) {
            const normalTex = textureLoader.load(p.normalTexture);
            normalTex.anisotropy = 8;
            material.normalMap = normalTex;
            material.normalScale = new THREE.Vector2(
                p.normalScale || 1.3,
                p.normalScale || 1.3
            );
        } else {
            // Normal map procedural asíncrono (fallback)
            const normalStrength = p.normalScale || 1.3;
            generateProceduralNormal(p.texture, normalStrength).then((normalTex) => {
                if (normalTex) {
                    material.normalMap = normalTex;
                    material.normalScale = new THREE.Vector2(normalStrength, normalStrength);
                    material.needsUpdate = true;
                }
            });
        }
    }

    // Usar mayor resolución de segmentos si tiene DEM
    const demCfg = DEM_CONFIG[p.id];
    const segments = (p.demTexture && demCfg) ? demCfg.segments : 96;
    const geom = new THREE.SphereGeometry(p.radius, segments, segments);
    const mesh = new THREE.Mesh(geom, material);
    mesh.castShadow = !p.isStar;
    mesh.receiveShadow = !p.isStar;
    return mesh;
}

function buildCloudLayer(p) {
    if (!p.cloudTexture) return null;
    const tex = textureLoader.load(p.cloudTexture);
    
    // MEJORA VISUAL: Nubes proyectan sombra real sobre la superficie
    const cloudMat = new THREE.MeshStandardMaterial({
        map: tex,
        alphaMap: tex, // Usa la propia textura para recortar las sombras
        alphaTest: 0.05,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.NormalBlending,
        roughness: 1.0,
        metalness: 0.0
    });
    
    const cloudGrp = new THREE.Group();
    cloudGrp.name = 'clouds';

    // Capa principal
    const clouds1 = new THREE.Mesh(new THREE.SphereGeometry(p.radius * 1.012, 96, 96), cloudMat);
    clouds1.castShadow = true;
    clouds1.receiveShadow = true;
    
    // Segunda capa ligeramente más alta para dar efecto volumétrico 3D
    const cloudMat2 = cloudMat.clone();
    cloudMat2.opacity = 0.4;
    const clouds2 = new THREE.Mesh(new THREE.SphereGeometry(p.radius * 1.025, 96, 96), cloudMat2);
    clouds2.castShadow = true;
    clouds2.rotation.y = Math.PI / 4; // Desfase
    
    cloudGrp.add(clouds1, clouds2);
    return cloudGrp;
}

/**
 * Genera una textura de anillos procedural (canvas) para planetas sin textura real.
 * @param {Object} cfg - { bands, color, bgAlpha, width }
 *   bands: array de { pos: 0-1, width: 0-1, opacity: 0-1 }
 */
function generateProceduralRingTexture(cfg) {
    const w = cfg.width || 1024;
    const h = 64;
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');

    // Fondo transparente
    ctx.clearRect(0, 0, w, h);

    // Dibujar cada banda
    (cfg.bands || []).forEach(band => {
        const x = Math.floor(band.pos * w);
        const bw = Math.max(1, Math.floor(band.width * w));
        ctx.fillStyle = cfg.color || 'rgba(200, 200, 220, 0.6)';
        ctx.globalAlpha = band.opacity || 0.4;
        ctx.fillRect(x - bw / 2, 0, bw, h);

        // Sub-textura de ruido para dar irregularidad
        for (let px = x - bw / 2; px < x + bw / 2; px++) {
            if (Math.random() > 0.6) {
                ctx.globalAlpha = (band.opacity || 0.4) * (0.3 + Math.random() * 0.7);
                ctx.fillRect(px, 0, 1, h);
            }
        }
    });
    ctx.globalAlpha = 1.0;

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    return tex;
}

/** Configuraciones de anillos procedurales por planeta */
const PROCEDURAL_RING_PRESETS = {
    urano: {
        innerScale: 1.6,
        outerScale: 2.1,
        color: 'rgba(160, 175, 190, 0.7)',
        opacity: 0.45,
        bands: [
            { pos: 0.15, width: 0.015, opacity: 0.55 },
            { pos: 0.22, width: 0.008, opacity: 0.35 },
            { pos: 0.30, width: 0.020, opacity: 0.65 },
            { pos: 0.38, width: 0.010, opacity: 0.40 },
            { pos: 0.45, width: 0.012, opacity: 0.50 },
            { pos: 0.52, width: 0.025, opacity: 0.70 },  // epsilon (más brillante)
            { pos: 0.60, width: 0.008, opacity: 0.30 },
            { pos: 0.67, width: 0.010, opacity: 0.35 },
            { pos: 0.73, width: 0.015, opacity: 0.45 },
            { pos: 0.80, width: 0.008, opacity: 0.25 },
            { pos: 0.85, width: 0.012, opacity: 0.40 },
            { pos: 0.90, width: 0.020, opacity: 0.55 },
            { pos: 0.95, width: 0.008, opacity: 0.30 }
        ]
    },
    neptuno: {
        innerScale: 1.7,
        outerScale: 2.5,
        color: 'rgba(100, 140, 220, 0.6)',
        opacity: 0.30,
        bands: [
            { pos: 0.18, width: 0.012, opacity: 0.25 },  // Galle
            { pos: 0.35, width: 0.018, opacity: 0.30 },  // Le Verrier
            { pos: 0.42, width: 0.040, opacity: 0.15 },  // Lassell (difuso)
            { pos: 0.55, width: 0.010, opacity: 0.20 },  // Arago
            { pos: 0.82, width: 0.025, opacity: 0.45 },  // Adams (más brillante)
            { pos: 0.85, width: 0.008, opacity: 0.55 },  // Arco en Adams
            { pos: 0.88, width: 0.006, opacity: 0.50 }   // Arco en Adams
        ]
    }
};

function buildRings(p) {
    // 1. Anillos con textura real (Saturno)
    if (p.ringTexture) {
        const rGeom = new THREE.RingGeometry(p.radius * 1.25, p.radius * 2.3, 128);
        const pos = rGeom.attributes.position;
        const uv = rGeom.attributes.uv;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i), y = pos.getY(i);
            const r = Math.sqrt(x * x + y * y);
            const norm = (r - p.radius * 1.25) / (p.radius * 2.3 - p.radius * 1.25);
            uv.setXY(i, norm, 1);
        }
        const ringTex = textureLoader.load(p.ringTexture);
        const rMat = new THREE.MeshStandardMaterial({
            map: ringTex,
            color: 0xffffff,
            transparent: true,
            opacity: 0.95,
            side: THREE.DoubleSide,
            roughness: 0.6,
            metalness: 0.0,
            alphaTest: 0.02
        });
        const rings = new THREE.Mesh(rGeom, rMat);
        rings.rotation.x = -Math.PI / 2;
        rings.receiveShadow = true;
        rings.castShadow = true;
        rings.name = 'rings';

        // Depth material para sombra correcta con alpha
        rings.customDepthMaterial = new THREE.MeshDepthMaterial({
            depthPacking: THREE.RGBADepthPacking,
            map: ringTex,
            alphaTest: 0.5
        });
        return rings;
    }

    // 2. Anillos procedurales (Urano, Neptuno)
    const preset = PROCEDURAL_RING_PRESETS[p.id];
    if (!preset) return null;

    const innerR = p.radius * preset.innerScale;
    const outerR = p.radius * preset.outerScale;
    const rGeom = new THREE.RingGeometry(innerR, outerR, 128);
    const pos = rGeom.attributes.position;
    const uv = rGeom.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i);
        const r = Math.sqrt(x * x + y * y);
        const norm = (r - innerR) / (outerR - innerR);
        uv.setXY(i, norm, 0.5);
    }

    const ringTex = generateProceduralRingTexture(preset);
    const rMat = new THREE.MeshBasicMaterial({
        map: ringTex,
        color: 0xffffff,
        transparent: true,
        opacity: preset.opacity,
        side: THREE.DoubleSide,
        blending: THREE.NormalBlending,
        depthWrite: false
    });

    const rings = new THREE.Mesh(rGeom, rMat);
    rings.rotation.x = -Math.PI / 2;
    rings.name = 'rings-procedural';
    return rings;
}

/**
 * Construye un grupo orbital completo para un planeta.
 * @returns { targetGrp, pMesh, atmosphere, scanOverlay, wireframe, pData }
 */
export function buildPlanet(planetData, scene, sceneState) {
    const p = planetData;
    const pivot = new THREE.Group();
    const a = p.orbRadius;
    const b = a * Math.sqrt(1 - (p.e || 0) * (p.e || 0));
    const f = a * (p.e || 0);
    const pTheme = p.theme || '#ffffff';

    // Órbita elíptica visible
    let orb = null;
    if (a > 0) {
        orb = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(
                new THREE.EllipseCurve(-f, 0, a, b, 0, 2 * Math.PI).getPoints(128)
            ),
            new THREE.LineBasicMaterial({
                color: parseInt(pTheme.slice(1), 16),
                transparent: true,
                opacity: 0.18
            })
        );
        orb.rotation.x = -Math.PI / 2;
        if (p.systemOffset) orb.position.fromArray(p.systemOffset);
        scene.add(orb);
    }

    // Grupo del planeta con su posición inicial en la órbita
    const targetGrp = new THREE.Group();
    targetGrp.position.set(
        a * Math.cos(p.orbAngle || 0) - f,
        0,
        b * Math.sin(p.orbAngle || 0)
    );
    targetGrp.rotation.z = (p.tilt || 0) * Math.PI / 180;

    // Mesh principal
    const pMesh = buildPlanetMesh(p);
    pMesh.userData = { ...p, planetaryKey: p.id };
    targetGrp.add(pMesh);

    // Nubes
    const clouds = buildCloudLayer(p);
    if (clouds) {
        targetGrp.add(clouds);
        p.cloudMesh = clouds;
    }

    // Anillos
    const rings = buildRings(p);
    if (rings) targetGrp.add(rings);

    // Atmósfera — Rayleigh + Mie Scattering (composición química real)
    let atmosphere = null;
    const atmCfg = defaultAtmosphereFor(p);
    if (atmCfg && !p.isStar) {
        atmCfg.planetData = p;  // Pasa datos del planeta para selección de preset químico
        atmosphere = buildAtmosphereMesh(p.radius, atmCfg);
        targetGrp.add(atmosphere);
    }

    // Lunas (satélites naturales)
    const moonMeshes = [];
    if (p.moons && p.moons.length > 0) {
        p.moons.forEach((moon, i) => {
            const moonGrp = new THREE.Group();
            moonGrp.name = `moon-pivot-${moon.name}`;

            const moonGeom = new THREE.SphereGeometry(moon.radius, 64, 64);
            const matOpts = {
                color: moon.color || 0xaaaaaa,
                roughness: 0.9,
                metalness: 0.05
            };
            
            // Asignar textura DEM a la Luna de la Tierra
            if (moon.name === 'Luna') {
                const moonTex = textureLoader.load('img/ldem_3_8bit.jpg');
                matOpts.map = moonTex;
                matOpts.displacementMap = moonTex;
                matOpts.displacementScale = moon.radius * 0.04;
                matOpts.roughnessMap = moonTex;
                matOpts.color = 0xffffff; // Resetear color si hay textura
            } else if (moon.texture) {
                matOpts.map = textureLoader.load(moon.texture);
                matOpts.color = 0xffffff;
            }

            const moonMat = new THREE.MeshStandardMaterial(matOpts);
            const moonMesh = new THREE.Mesh(moonGeom, moonMat);
            moonMesh.castShadow = true;
            moonMesh.receiveShadow = true;
            moonMesh.position.set(moon.orbRadius, 0, 0);
            moonMesh.userData = { isMoon: true, moonName: moon.name, parentPlanet: p.id };

            moonGrp.add(moonMesh);
            moonGrp.rotation.y = i * (Math.PI * 2 / p.moons.length); // Offset initial angle
            targetGrp.add(moonGrp);

            moonMeshes.push({
                pivot: moonGrp,
                mesh: moonMesh,
                orbSpeed: moon.orbSpeed || 0.01,
                data: moon
            });
        });
    }

    // Posicionar en el pivot con offset de sistema estelar
    if (p.systemOffset) pivot.position.fromArray(p.systemOffset);
    pivot.add(targetGrp);
    scene.add(pivot);

    return {
        pivot,
        orb,
        targetGrp,
        pMesh,
        atmosphere,
        moonMeshes,
        pData: p
    };
}

export { generateProceduralNormal };
