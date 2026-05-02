/**
 * System Selector — cambia la visibilidad de los grupos estelares (Sol / TRAPPIST / Kepler)
 * y anima la cámara hacia el centro del sistema seleccionado.
 * Extraído de dashboard.js líneas 274-287.
 * Integra warp effect (Feature 1.12).
 */

import { triggerWarp } from './warp-effect.js';

const SYSTEM_CENTERS = {
    Sol:      { x: 0,    y: 0, z: 0 },
    TRAPPIST: { x: 800,  y: 0, z: -500 },
    Kepler:   { x: -900, y: 0, z: 600 }
};

const SYSTEMS = ['Sol', 'TRAPPIST', 'Kepler'];
const SYSTEM_NAMES = {
    Sol: 'Sistema Solar',
    TRAPPIST: 'TRAPPIST-1',
    Kepler: 'Kepler-186'
};
let currentIndex = 0;
let _systemGroups, _camera, _controls, _scene;

export function hideNavArrows() {
    const arrows = document.getElementById('system-nav-arrows');
    if (arrows) {
        arrows.style.opacity = '0';
        arrows.style.pointerEvents = 'none';
    }
}

export function showNavArrows() {
    const arrows = document.getElementById('system-nav-arrows');
    if (arrows) {
        arrows.style.opacity = '1';
        arrows.style.pointerEvents = '';
        arrows.style.transition = 'opacity 0.5s ease';
    }
}

export function setSystem(s) {
    if (!SYSTEMS.includes(s)) return;
    currentIndex = SYSTEMS.indexOf(s);
    
    const indicator = document.getElementById('system-indicator');
    if (indicator) indicator.textContent = SYSTEM_NAMES[s];

    // Alternar visibilidad de cada grupo
    Object.keys(_systemGroups).forEach(k => {
        _systemGroups[k].forEach(obj => {
            if (obj) obj.visible = (k === s);
        });
    });

    const center = SYSTEM_CENTERS[s] || SYSTEM_CENTERS.Sol;

    gsap.to(_controls.target, {
        duration: 1.5,
        x: center.x, y: center.y, z: center.z,
        ease: 'power2.inOut'
    });
    gsap.to(_camera.position, {
        duration: 1.5,
        x: center.x, y: center.y + 150, z: center.z + 400,
        ease: 'power2.inOut'
    });

    if (_scene) {
        const sunLight = _scene.getObjectByName('sun-light');
        if (sunLight) {
            gsap.to(sunLight.position, {
                duration: 1.5,
                x: center.x, y: center.y, z: center.z,
                ease: 'power2.inOut'
            });
        }
    }
}

export function initSystemSelector({ systemGroups, camera, controls, scene }) {
    _systemGroups = systemGroups;
    _camera = camera;
    _controls = controls;
    _scene = scene;

    const btnPrev = document.getElementById('sys-prev');
    const btnNext = document.getElementById('sys-next');

    if (btnPrev) {
        btnPrev.onclick = () => {
            if (typeof window.playBeep === 'function') window.playBeep(1000, 'square', 0.1, 0.03);
            const nextIdx = (currentIndex - 1 + SYSTEMS.length) % SYSTEMS.length;
            triggerWarp(() => {
                currentIndex = nextIdx;
                setSystem(SYSTEMS[currentIndex]);
            });
        };
    }

    if (btnNext) {
        btnNext.onclick = () => {
            if (typeof window.playBeep === 'function') window.playBeep(1000, 'square', 0.1, 0.03);
            const nextIdx = (currentIndex + 1) % SYSTEMS.length;
            triggerWarp(() => {
                currentIndex = nextIdx;
                setSystem(SYSTEMS[currentIndex]);
            });
        };
    }

    // Trigger inicial para aplicar visibilidad
    setSystem(SYSTEMS[currentIndex]);
}
