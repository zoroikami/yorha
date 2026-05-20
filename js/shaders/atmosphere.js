/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  Shader de Atmósfera — Rayleigh & Mie Scattering Real         ║
 * ║                                                               ║
 * ║  Implementa dispersión atmosférica física basada en:          ║
 * ║    - Rayleigh scattering (moléculas < λ): cielos azules       ║
 * ║    - Mie scattering (partículas ≈ λ): halos y bruma           ║
 * ║                                                               ║
 * ║  Los coeficientes se ajustan a la composición química real    ║
 * ║  de cada planeta según datos de NASA/ESA:                     ║
 * ║    - Tierra: N₂ 78% / O₂ 21%                                 ║
 * ║    - Marte: CO₂ 95% / N₂ 2.7%                                ║
 * ║    - Venus: CO₂ 96% / N₂ 3.5%                                ║
 * ║    - Titán: N₂ 98% / CH₄ 1.4%                                ║
 * ║                                                               ║
 * ║  Referencia: Nishita et al. 1993, SIGGRAPH                   ║
 * ║              Bruneton & Neyret 2008, EGSR                     ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

// ══ Coeficientes de scattering por composición atmosférica ══
// Unidades: 1/metros, escalados para Three.js
const ATMOSPHERE_PRESETS = {
    // Tierra (N₂/O₂) — azul clásico por Rayleigh
    tierra: {
        rayleighCoefficients: [5.5e-6, 13.0e-6, 22.4e-6],  // RGB (λ⁻⁴)
        mieCoefficient: 21e-6,
        mieDirectionalG: 0.758,      // Forward scattering dominante
        rayleighScaleHeight: 8500,    // metros
        mieScaleHeight: 1200,         // metros
        atmosphereRadius: 1.08,       // factor sobre radio del planeta
        sunIntensity: 22.0,
        groundColor: [0.37, 0.55, 0.27]
    },
    // Marte (CO₂ 95%) — cielo ocre/naranja, azul al atardecer
    marte: {
        rayleighCoefficients: [19.918e-6, 13.57e-6, 5.75e-6],  // Invertido: rojo dominante
        mieCoefficient: 40e-6,        // Polvo marciano abundante
        mieDirectionalG: 0.65,        // Partículas más grandes
        rayleighScaleHeight: 11100,   // Escala mayor (gravedad menor)
        mieScaleHeight: 3000,         // Polvo a mayor altitud
        atmosphereRadius: 1.04,
        sunIntensity: 9.5,            // ~43% de la irradiancia terrestre
        groundColor: [0.72, 0.38, 0.18]
    },
    // Venus (CO₂ 96%, nubes de H₂SO₄) — bruma densa amarillenta
    venus: {
        rayleighCoefficients: [12.0e-6, 10.5e-6, 6.8e-6],
        mieCoefficient: 100e-6,       // Nubes extremadamente densas
        mieDirectionalG: 0.85,        // Forward scattering muy fuerte
        rayleighScaleHeight: 15900,
        mieScaleHeight: 8000,
        atmosphereRadius: 1.12,
        sunIntensity: 42.0,           // Más cerca del Sol
        groundColor: [0.85, 0.65, 0.30]
    },
    // Titán (N₂ 98%, CH₄ bruma) — cielo naranja profundo
    titan: {
        rayleighCoefficients: [25.0e-6, 16.0e-6, 4.0e-6],
        mieCoefficient: 80e-6,        // Bruma de tholins
        mieDirectionalG: 0.70,
        rayleighScaleHeight: 20000,   // Gravedad muy baja
        mieScaleHeight: 5000,
        atmosphereRadius: 1.15,
        sunIntensity: 1.1,            // Muy lejos del Sol
        groundColor: [0.65, 0.40, 0.15]
    },
    // Genérico (para exoplanetas sin datos de composición)
    generic: {
        rayleighCoefficients: [5.5e-6, 13.0e-6, 22.4e-6],
        mieCoefficient: 21e-6,
        mieDirectionalG: 0.758,
        rayleighScaleHeight: 8500,
        mieScaleHeight: 1200,
        atmosphereRadius: 1.08,
        sunIntensity: 15.0,
        groundColor: [0.4, 0.5, 0.6]
    }
};

// ══ VERTEX SHADER ══
const ATMOSPHERE_VERTEX = /* glsl */ `
    varying vec3 vWorldPosition;
    varying vec3 vSunDirection;
    varying vec3 vViewDirection;
    varying vec3 vNormal;

    uniform vec3 uSunDirection;

    void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        vNormal = normalize(normalMatrix * normal);
        vSunDirection = normalize(uSunDirection);
        vViewDirection = normalize(cameraPosition - worldPos.xyz);

        gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
`;

// ══ FRAGMENT SHADER — Rayleigh + Mie Scattering ══
const ATMOSPHERE_FRAGMENT = /* glsl */ `
    #define PI 3.14159265359
    #define NUM_SAMPLES 8
    #define NUM_SAMPLES_LIGHT 4

    uniform vec3 uPlanetCenter;
    uniform float uPlanetRadius;
    uniform float uAtmosphereRadius;
    uniform vec3 uRayleighCoeff;
    uniform float uMieCoeff;
    uniform float uMieDirectionalG;
    uniform float uRayleighScaleHeight;
    uniform float uMieScaleHeight;
    uniform float uSunIntensity;
    uniform vec3 uSunDirection;
    uniform float uTime;

    varying vec3 vWorldPosition;
    varying vec3 vViewDirection;
    varying vec3 vNormal;

    // Fase de Rayleigh
    float rayleighPhase(float cosTheta) {
        return (3.0 / (16.0 * PI)) * (1.0 + cosTheta * cosTheta);
    }

    // Fase de Henyey-Greenstein (Mie)
    float henyeyGreenstein(float cosTheta, float g) {
        float g2 = g * g;
        return (1.0 - g2) / (4.0 * PI * pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5));
    }

    // Intersección rayo-esfera
    vec2 raySphereIntersect(vec3 rayOrigin, vec3 rayDir, vec3 sphereCenter, float sphereRadius) {
        vec3 oc = rayOrigin - sphereCenter;
        float b = dot(oc, rayDir);
        float c = dot(oc, oc) - sphereRadius * sphereRadius;
        float discriminant = b * b - c;

        if (discriminant < 0.0) return vec2(-1.0);

        float sqrtD = sqrt(discriminant);
        return vec2(-b - sqrtD, -b + sqrtD);
    }

    // Densidad óptica a una altura dada
    float opticalDensity(float height, float scaleHeight) {
        return exp(-max(0.0, height) / scaleHeight);
    }

    void main() {
        vec3 viewDir = normalize(vViewDirection);
        vec3 sunDir = normalize(uSunDirection);

        // Intersección del rayo de vista con la esfera atmosférica
        float atmRadius = uPlanetRadius * uAtmosphereRadius;
        vec2 atmHit = raySphereIntersect(cameraPosition, -viewDir, uPlanetCenter, atmRadius);

        if (atmHit.x < 0.0 && atmHit.y < 0.0) {
            gl_FragColor = vec4(0.0);
            return;
        }

        // Comprobar si el rayo golpea el planeta (opaco)
        vec2 planetHit = raySphereIntersect(cameraPosition, -viewDir, uPlanetCenter, uPlanetRadius);
        float pathEnd = atmHit.y;
        if (planetHit.x > 0.0) {
            pathEnd = min(pathEnd, planetHit.x);
        }

        float pathStart = max(0.0, atmHit.x);
        float pathLength = pathEnd - pathStart;

        if (pathLength <= 0.0) {
            gl_FragColor = vec4(0.0);
            return;
        }

        // Integral de scattering a lo largo del rayo
        float stepSize = pathLength / float(NUM_SAMPLES);
        vec3 rayleighScatter = vec3(0.0);
        vec3 mieScatter = vec3(0.0);
        float opticalDepthR = 0.0;
        float opticalDepthM = 0.0;

        for (int i = 0; i < NUM_SAMPLES; i++) {
            float t = pathStart + (float(i) + 0.5) * stepSize;
            vec3 samplePos = cameraPosition - viewDir * t;
            float height = length(samplePos - uPlanetCenter) - uPlanetRadius;

            // Densidad en este punto
            float densityR = opticalDensity(height, uRayleighScaleHeight) * stepSize;
            float densityM = opticalDensity(height, uMieScaleHeight) * stepSize;

            opticalDepthR += densityR;
            opticalDepthM += densityM;

            // Trazar rayo hacia el sol desde este punto
            vec2 sunAtmHit = raySphereIntersect(samplePos, sunDir, uPlanetCenter, atmRadius);
            float sunPathLength = sunAtmHit.y;
            float sunStepSize = sunPathLength / float(NUM_SAMPLES_LIGHT);

            float opticalDepthLightR = 0.0;
            float opticalDepthLightM = 0.0;

            bool shadowed = false;
            for (int j = 0; j < NUM_SAMPLES_LIGHT; j++) {
                float tLight = (float(j) + 0.5) * sunStepSize;
                vec3 lightSamplePos = samplePos + sunDir * tLight;
                float lightHeight = length(lightSamplePos - uPlanetCenter) - uPlanetRadius;

                if (lightHeight < 0.0) {
                    shadowed = true;
                    break;
                }

                opticalDepthLightR += opticalDensity(lightHeight, uRayleighScaleHeight) * sunStepSize;
                opticalDepthLightM += opticalDensity(lightHeight, uMieScaleHeight) * sunStepSize;
            }

            if (!shadowed) {
                // Transmitancia total (vista + sol)
                vec3 tau = uRayleighCoeff * (opticalDepthR + opticalDepthLightR)
                         + uMieCoeff * 1.1 * (opticalDepthM + opticalDepthLightM);
                vec3 attenuation = exp(-tau);

                rayleighScatter += densityR * attenuation;
                mieScatter += densityM * attenuation;
            }
        }

        // Coseno del ángulo entre vista y sol
        float cosTheta = dot(-viewDir, sunDir);
        float phaseR = rayleighPhase(cosTheta);
        float phaseM = henyeyGreenstein(cosTheta, uMieDirectionalG);

        // Color final del scattering
        vec3 color = uSunIntensity * (
            phaseR * uRayleighCoeff * rayleighScatter +
            phaseM * uMieCoeff * mieScatter
        );

        // Fresnel additive en el borde (mantiene el halo visual)
        vec3 N = normalize(vNormal);
        vec3 V = normalize(vViewDirection);
        float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);

        float alpha = clamp(length(color) * 3.0 + fresnel * 0.25, 0.0, 1.0);
        color += fresnel * uRayleighCoeff * uSunIntensity * 0.5;

        gl_FragColor = vec4(color, alpha);
    }
`;

/**
 * Obtiene el preset de atmósfera adecuado para un planeta dado.
 * Detecta por ID o por composición atmosférica conocida.
 */
function getAtmospherePreset(planetData) {
    const id = (planetData.id || '').toLowerCase();

    // Mapeo directo por ID
    if (ATMOSPHERE_PRESETS[id]) return ATMOSPHERE_PRESETS[id];

    // Detección por datos atmosféricos
    const atm = (planetData.atmosphere || '').toLowerCase();
    if (atm.includes('co2') || atm.includes('dióxido de carbono')) {
        if (atm.includes('ácido sulfúrico') || id === 'venus') return ATMOSPHERE_PRESETS.venus;
        return ATMOSPHERE_PRESETS.marte;
    }
    if (atm.includes('metano') && atm.includes('nitrógeno')) return ATMOSPHERE_PRESETS.titan;
    if (atm.includes('nitrógeno') || atm.includes('oxígeno')) return ATMOSPHERE_PRESETS.tierra;

    return ATMOSPHERE_PRESETS.generic;
}


/**
 * Crea el ShaderMaterial de atmósfera con Rayleigh + Mie scattering.
 */
export function createAtmosphereMaterial({
    color = new THREE.Color(0x4488ff),
    intensity = 1.0,
    fresnelPower = 2.5,
    sunDirection = new THREE.Vector3(1, 0, 0),
    planetCenter = new THREE.Vector3(0, 0, 0),
    planetRadius = 1.0,
    preset = null,
    planetData = null
}) {
    // Determinar preset de scattering
    const atmPreset = preset || (planetData ? getAtmospherePreset(planetData) : ATMOSPHERE_PRESETS.generic);

    const material = new THREE.ShaderMaterial({
        uniforms: {
            // Parámetros geométricos
            uPlanetCenter: { value: planetCenter.clone() },
            uPlanetRadius: { value: planetRadius },
            uAtmosphereRadius: { value: atmPreset.atmosphereRadius },

            // Coeficientes de scattering
            uRayleighCoeff: { value: new THREE.Vector3(...atmPreset.rayleighCoefficients) },
            uMieCoeff: { value: atmPreset.mieCoefficient },
            uMieDirectionalG: { value: atmPreset.mieDirectionalG },
            uRayleighScaleHeight: { value: atmPreset.rayleighScaleHeight },
            uMieScaleHeight: { value: atmPreset.mieScaleHeight },

            // Iluminación
            uSunDirection: { value: sunDirection.clone().normalize() },
            uSunIntensity: { value: atmPreset.sunIntensity * intensity },

            // Animación
            uTime: { value: 0.0 }
        },
        vertexShader: ATMOSPHERE_VERTEX,
        fragmentShader: ATMOSPHERE_FRAGMENT,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false
    });

    // Guardar referencia al preset para actualizaciones
    material.userData = { preset: atmPreset, planetId: planetData?.id };

    return material;
}


/**
 * Construye el mesh de atmósfera para un planeta.
 * Detecta automáticamente el preset basándose en los datos del planeta.
 */
export function buildAtmosphereMesh(planetRadius, atmosphereConfig) {
    const {
        color = new THREE.Color(0x4488ff),
        intensity = 1.0,
        fresnelPower = 2.5,
        scale = 1.08,
        planetData = null
    } = atmosphereConfig;

    // Obtener preset específico del planeta
    const preset = planetData ? getAtmospherePreset(planetData) : null;
    const actualScale = preset ? preset.atmosphereRadius : scale;

    const geometry = new THREE.SphereGeometry(planetRadius * actualScale, 64, 64);
    const material = createAtmosphereMaterial({
        color,
        intensity,
        fresnelPower,
        planetRadius,
        preset,
        planetData
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'atmosphere';
    return mesh;
}


/**
 * Actualiza los uniforms de la atmósfera cada frame.
 * Incluye la posición del planeta y dirección solar actualizada.
 */
export function updateAtmosphereTime(mesh, deltaTime) {
    if (!mesh || !mesh.material || !mesh.material.uniforms) return;

    const u = mesh.material.uniforms;

    // Actualizar tiempo
    if (u.uTime) u.uTime.value += deltaTime;

    // Actualizar posición del planeta (si se mueve en su órbita)
    if (u.uPlanetCenter) {
        const worldPos = new THREE.Vector3();
        mesh.getWorldPosition(worldPos);
        // El centro del planeta es el centro del mesh padre (no del mesh atmosférico)
        if (mesh.parent) {
            mesh.parent.getWorldPosition(worldPos);
        }
        u.uPlanetCenter.value.copy(worldPos);
    }

    // Actualizar dirección solar (el sol está en 0,0,0 para el sistema solar)
    if (u.uSunDirection) {
        const planetPos = u.uPlanetCenter ? u.uPlanetCenter.value : new THREE.Vector3();
        u.uSunDirection.value.copy(new THREE.Vector3().sub(planetPos).normalize());
    }
}

/**
 * Exporta los presets para uso externo (HUD, debug, etc.)
 */
export { ATMOSPHERE_PRESETS };
