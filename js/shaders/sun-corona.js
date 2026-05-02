/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  Shader de Corona Solar + Prominencias                        ║
 * ║  Superficie solar con ruido Perlin animado, glow cromosférico ║
 * ║  y distorsión de borde tipo "boiling plasma"                  ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

export function createSunSurfaceMaterial(texture, baseColor = 0xffffee) {
    return new THREE.ShaderMaterial({
        uniforms: {
            uMap: { value: texture },
            uTime: { value: 0.0 },
            uBaseColor: { value: new THREE.Color(baseColor) }
        },
        vertexShader: /* glsl */ `
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vViewDir;
            void main() {
                vUv = uv;
                vNormal = normalize(normalMatrix * normal);
                vec4 wp = modelMatrix * vec4(position, 1.0);
                vViewDir = normalize(cameraPosition - wp.xyz);
                gl_Position = projectionMatrix * viewMatrix * wp;
            }
        `,
        fragmentShader: /* glsl */ `
            uniform sampler2D uMap;
            uniform float uTime;
            uniform vec3 uBaseColor;
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vViewDir;

            float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
            float noise(vec2 p){
                vec2 i = floor(p);
                vec2 f = fract(p);
                float a = hash(i);
                float b = hash(i + vec2(1.0,0.0));
                float c = hash(i + vec2(0.0,1.0));
                float d = hash(i + vec2(1.0,1.0));
                vec2 u = f*f*(3.0-2.0*f);
                return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
            }

            void main() {
                vec2 flow = vec2(uTime * 0.012, uTime * 0.008);
                float n1 = noise(vUv * 8.0 + flow);
                float n2 = noise(vUv * 20.0 - flow * 1.5);
                float turbulence = n1 * 0.6 + n2 * 0.4;

                vec2 distortedUv = vUv + vec2(n1 * 0.008, n2 * 0.008);
                vec3 tex = texture2D(uMap, distortedUv).rgb;

                // Corona pulsante en el limbo (borde)
                float fresnel = pow(1.0 - max(dot(vNormal, normalize(vViewDir)), 0.0), 2.0);
                vec3 edgeGlow = uBaseColor * fresnel * (1.6 + sin(uTime * 1.5) * 0.25);

                // Temperatura superficial (zonas más calientes)
                vec3 hot = mix(tex, tex * vec3(1.4, 1.15, 0.7), turbulence);

                gl_FragColor = vec4(hot + edgeGlow, 1.0);
            }
        `
    });
}

export function createCoronaSpriteMaterial(color = 0xffdd88) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(256, 256, 50, 256, 256, 256);
    grad.addColorStop(0, 'rgba(255, 240, 180, 0.95)');
    grad.addColorStop(0.15, 'rgba(255, 200, 100, 0.55)');
    grad.addColorStop(0.4, 'rgba(255, 140, 40, 0.22)');
    grad.addColorStop(0.7, 'rgba(255, 90, 20, 0.08)');
    grad.addColorStop(1, 'rgba(255, 60, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(canvas);
    return new THREE.SpriteMaterial({
        map: texture,
        color,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true
    });
}

export function buildCoronaSprite(radius, color) {
    const sprite = new THREE.Sprite(createCoronaSpriteMaterial(color));
    const scale = radius * 4.5;
    sprite.scale.set(scale, scale, 1);
    sprite.name = 'corona';
    sprite.userData.baseScale = scale;
    return sprite;
}

export function buildLensFlare(radius, color = 0xffeecc) {
    const group = new THREE.Group();
    group.name = 'lens-flare';

    const flareSizes = [1.2, 0.55, 0.35, 0.22, 0.9];
    const flareAlphas = [0.45, 0.3, 0.22, 0.18, 0.35];
    const flareColors = [0xffffff, 0xffcc88, 0x88aaff, 0xff8844, 0xffeecc];

    flareSizes.forEach((sz, i) => {
        const mat = createCoronaSpriteMaterial(flareColors[i]);
        mat.opacity = flareAlphas[i];
        const s = new THREE.Sprite(mat);
        const scl = radius * 2.5 * sz;
        s.scale.set(scl, scl, 1);
        s.userData.offset = (i - 2) * 0.45;
        s.userData.baseScale = scl;
        group.add(s);
    });

    return group;
}

export function updateSunEffects(sunGroup, time, camera) {
    sunGroup.traverse(obj => {
        if (obj.isMesh && obj.material && obj.material.uniforms && obj.material.uniforms.uTime) {
            obj.material.uniforms.uTime.value = time;
        }
        if (obj.isSprite && obj.name === 'corona') {
            const pulse = 1.0 + Math.sin(time * 1.2) * 0.06;
            const s = obj.userData.baseScale * pulse;
            obj.scale.set(s, s, 1);
        }
    });

    const flare = sunGroup.getObjectByName('lens-flare');
    if (flare && camera) {
        const sunWorld = new THREE.Vector3();
        sunGroup.getWorldPosition(sunWorld);
        const toSun = sunWorld.clone().sub(camera.position).normalize();
        flare.children.forEach(sprite => {
            const offset = sprite.userData.offset;
            sprite.position.copy(toSun.clone().multiplyScalar(offset * -20));
        });
    }
}
