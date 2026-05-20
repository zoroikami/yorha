/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  Engine / Composer — Pipeline de Post-Processing              ║
 * ║  Render → Bloom → Film Grain → Vignette+ChromaticAberration   ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */
import { ENGINE } from '../config.js';
import { createVignetteChromaticPass } from '../shaders/vignette.js';

const FilmShader = {
    uniforms: {
        "tDiffuse": { value: null },
        "time":       { value: 0.0 },
        "nIntensity": { value: ENGINE.filmNoise },
        "sIntensity": { value: ENGINE.filmScanlines },
        "sCount":     { value: 1100 }
    },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
        uniform float time; uniform float nIntensity; uniform float sIntensity; uniform float sCount;
        uniform sampler2D tDiffuse; varying vec2 vUv;
        void main() {
            vec4 c = texture2D(tDiffuse, vUv);
            float x = vUv.x * vUv.y * time * 1000.0;
            x = mod(x, 13.0) * mod(x, 123.0);
            float dx = mod(x, 0.01);
            vec3 cResult = c.rgb + c.rgb * clamp(0.1 + dx * 100.0, 0.0, 1.0);
            vec2 sc = vec2(sin(vUv.y * sCount), cos(vUv.y * sCount));
            cResult += c.rgb * vec3(sc.x, sc.y, sc.x) * sIntensity;
            cResult = c.rgb + clamp(nIntensity, 0.0, 1.0) * (cResult - c.rgb);
            gl_FragColor = vec4(cResult, c.a);
        }
    `
};

export function createComposer(renderer, scene, camera) {
    const composer = new THREE.EffectComposer(renderer);

    // 1. Render base
    const renderPass = new THREE.RenderPass(scene, camera);
    composer.addPass(renderPass);

    // 2. Bloom — sol, luces, emisivos
    const bloom = new THREE.UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        ENGINE.bloomStrength,
        ENGINE.bloomRadius,
        ENGINE.bloomThreshold
    );
    bloom.threshold = ENGINE.bloomThreshold;
    bloom.strength  = ENGINE.bloomStrength;
    bloom.radius    = ENGINE.bloomRadius;
    bloom.renderToScreen = false;
    composer.addPass(bloom);

    // 3. Film grain cinematográfico YoRHa - DESACTIVADO
    // const filmPass = new THREE.ShaderPass(FilmShader);
    // filmPass.renderToScreen = false;
    // composer.addPass(filmPass);
    const filmPass = null;

    // 4. Vignette + Chromatic Aberration (final)
    const vignettePass = createVignetteChromaticPass();
    vignettePass.renderToScreen = true;
    composer.addPass(vignettePass);

    return { composer, bloom, filmPass, vignettePass };
}
