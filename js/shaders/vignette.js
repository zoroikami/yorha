/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  Vignette + Chromatic Aberration Shader Pass                  ║
 * ║  Post-FX que oscurece esquinas y añade aberración cromática.  ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

export const VignetteChromaticShader = {
    uniforms: {
        "tDiffuse": { value: null },
        "uOffset":     { value: 1.1 },
        "uDarkness":   { value: 1.3 },
        "uChromatic":  { value: 0.0 },
        "uResolution": { value: new THREE.Vector2(1, 1) }
    },
    vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse;
        uniform float uOffset;
        uniform float uDarkness;
        uniform float uChromatic;
        uniform vec2 uResolution;
        varying vec2 vUv;

        void main() {
            vec2 uv = vUv;
            vec2 c = uv - 0.5;
            float dist = length(c);

            // Aberración cromática radial (más intensa en los bordes)
            float ca = uChromatic * dist * 0.035;
            vec3 col;
            col.r = texture2D(tDiffuse, uv + c * ca).r;
            col.g = texture2D(tDiffuse, uv).g;
            col.b = texture2D(tDiffuse, uv - c * ca).b;

            // Vignette
            float vig = smoothstep(uOffset, uOffset * 0.4, dist * 2.0);
            vig = mix(1.0, vig, uDarkness);

            gl_FragColor = vec4(col * vig, 1.0);
        }
    `
};

export function createVignetteChromaticPass() {
    const pass = new THREE.ShaderPass(VignetteChromaticShader);
    pass.uniforms.uOffset.value = 1.1;
    pass.uniforms.uDarkness.value = 1.25;
    pass.uniforms.uChromatic.value = 0.0;
    pass.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    return pass;
}

export function setChromaticAberration(pass, amount) {
    if (!pass) return;
    if (typeof gsap !== 'undefined') {
        gsap.to(pass.uniforms.uChromatic, { value: amount, duration: 0.8, ease: 'power2.out' });
    } else {
        pass.uniforms.uChromatic.value = amount;
    }
}
