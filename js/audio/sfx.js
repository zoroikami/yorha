/**
 * SFX — Enlaza sonidos a controles de UI (botones de tiempo, etc.).
 */

import { playBeep } from './synth.js';

export function attachUISounds() {
    document.querySelectorAll('.time-controls button').forEach(b => {
        b.addEventListener('click', () => playBeep(1200, 'square', 0.05, 0.02));
    });
}
