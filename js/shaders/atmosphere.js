/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  Shader de Atmósfera — Fresnel + Rayleigh Scattering          ║
 * ║  Genera halo volumétrico con tono dependiente del planeta     ║
 * ║  y respuesta direccional al sol (más intenso en día).         ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

export function createAtmosphereMaterial({
    color = new THREE.Color(0x4488ff),
    intensity = 1.0,
    fresnelPower = 2.5,
    sunDirection = new THREE.Vector3(1, 0, 0)
}) {
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uColor: { value: color },
            uIntensity: { value: intensity },
            uFresnelPower: { value: fresnelPower },
            uSunDirection: { value: sunDirection.clone().normalize() },
            uTime: { value: 0.0 }
        },
        vertexShader: /* glsl */ `
            varying vec3 vNormal;
            varying vec3 vWorldPos;
            varying vec3 vViewDir;

            void main() {
                vNormal = normalize(normalMatrix * normal);
                vec4 worldPos = modelMatrix * vec4(position, 1.0);
                vWorldPos = worldPos.xyz;
                vViewDir = normalize(cameraPosition - worldPos.xyz);
                gl_Position = projectionMatrix * viewMatrix * worldPos;
            }
        `,
        fragmentShader: /* glsl */ `
            uniform vec3 uColor;
            uniform float uIntensity;
            uniform float uFresnelPower;
            uniform vec3 uSunDirection;
            uniform float uTime;

            varying vec3 vNormal;
            varying vec3 vWorldPos;
            varying vec3 vViewDir;

            void main() {
                vec3 N = normalize(vNormal);
                vec3 V = normalize(vViewDir);

                // Fresnel: glow solo en el borde
                float fresnel = pow(1.0 - max(dot(N, V), 0.0), uFresnelPower);

                // Día/noche: la atmósfera brilla más en el lado iluminado
                float sunDot = max(dot(N, normalize(uSunDirection)), 0.0);
                float dayFactor = 0.35 + sunDot * 0.85;

                // Dispersión Rayleigh aproximada (azul al borde, color base en el centro del halo)
                vec3 rayleighTint = mix(uColor, uColor * 1.4, fresnel);

                float alpha = fresnel * uIntensity * dayFactor;
                gl_FragColor = vec4(rayleighTint, alpha);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false
    });

    return material;
}

export function buildAtmosphereMesh(planetRadius, atmosphereConfig) {
    const geometry = new THREE.SphereGeometry(planetRadius * (atmosphereConfig.scale || 1.08), 64, 64);
    const material = createAtmosphereMaterial(atmosphereConfig);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'atmosphere';
    return mesh;
}

export function updateAtmosphereTime(mesh, deltaTime) {
    if (mesh && mesh.material && mesh.material.uniforms && mesh.material.uniforms.uTime) {
        mesh.material.uniforms.uTime.value += deltaTime;
    }
}
