/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  Warp Effect — Transición cinematográfica entre estados       ║
 * ║  Incrementa temporalmente chromatic aberration + bloom.       ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */
import { setChromaticAberration } from '../shaders/vignette.js';

export function triggerWarp({ vignettePass, bloom, duration = 3.0, intensity = 1.0 }) {
    if (vignettePass) {
        setChromaticAberration(vignettePass, 1.2 * intensity);
        setTimeout(() => setChromaticAberration(vignettePass, 0.0), duration * 1000 * 0.85);
    }
    if (bloom && typeof gsap !== 'undefined') {
        const originalStrength = bloom.strength;
        gsap.to(bloom, {
            strength: originalStrength * 1.6,
            duration: duration * 0.4,
            yoyo: true,
            repeat: 1,
            ease: 'power2.inOut'
        });
    }
}

export function triggerReturnWarp({ vignettePass, duration = 2.0 }) {
    if (vignettePass) {
        setChromaticAberration(vignettePass, 0.6);
        setTimeout(() => setChromaticAberration(vignettePass, 0.0), duration * 1000 * 0.9);
    }
}
