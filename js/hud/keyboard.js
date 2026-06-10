/**
 * ╔═══════════════════════════════════════════════════╗
 * ║  Keyboard Shortcuts + Screenshot                  ║
 * ║  Feature 5.8 + 3.5: Atajos y captura 4K          ║
 * ╚═══════════════════════════════════════════════════╝
 */

import { escapeHTML } from '../utils/sanitize.js';

let _renderer = null;
let _scene = null;
let _camera = null;
let _deps = {};

const SHORTCUTS = new Map([
    ['Space',      { desc: 'Pausar / Reanudar tiempo',   action: 'togglePause' }],
    ['KeyF',       { desc: 'Pantalla completa',           action: 'fullscreen' }],
    ['KeyP',       { desc: 'Captura de pantalla',         action: 'screenshot' }],
    ['KeyM',       { desc: 'Mostrar / Ocultar mini-mapa', action: 'toggleMinimap' }],
    ['KeyH',       { desc: 'Mostrar atajos de teclado',   action: 'toggleHelp' }],
    ['Escape',     { desc: 'Volver a órbita / Cerrar',    action: 'escape' }],
    ['ArrowLeft',  { desc: 'Sistema anterior',            action: 'prevSystem' }],
    ['ArrowRight', { desc: 'Sistema siguiente',           action: 'nextSystem' }]
]);

export function initKeyboard(deps) {
    _renderer = deps.renderer;
    _scene    = deps.scene;
    _camera   = deps.camera;
    _deps     = deps;

    document.addEventListener('keydown', handleKey);
}

function handleKey(e) {
    // Don't intercept if user is typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    const shortcut = SHORTCUTS.get(e.code);
    if (!shortcut) return;

    e.preventDefault();

    switch (shortcut.action) {
        case 'togglePause': {
            const btn = document.getElementById('btn-pause');
            const btnPlay = document.getElementById('btn-play');
            if (btn && btnPlay) {
                if (btn.classList.contains('active')) btnPlay.click();
                else btn.click();
            }
            break;
        }
        case 'fullscreen':
            if (!document.fullscreenElement) document.documentElement.requestFullscreen();
            else document.exitFullscreen();
            break;

        case 'screenshot':
            takeScreenshot();
            break;

        case 'toggleMinimap':
            if (_deps.toggleMinimap) _deps.toggleMinimap();
            break;

        case 'toggleHelp':
            toggleHelpOverlay();
            break;

        case 'escape': {
            const helpPanel = document.getElementById('keyboard-help');
            if (helpPanel && helpPanel.classList.contains('active')) {
                helpPanel.classList.remove('active');
                return;
            }
            const btnReturn = document.getElementById('btn-return');
            if (btnReturn) btnReturn.click();
            break;
        }
        case 'prevSystem': {
            const btn = document.getElementById('sys-prev');
            if (btn && window.__interactive) btn.click();
            break;
        }
        case 'nextSystem': {
            const btn = document.getElementById('sys-next');
            if (btn && window.__interactive) btn.click();
            break;
        }
        case 'speed1': {
            const b = document.getElementById('btn-play');
            if (b) b.click();
            break;
        }
        case 'speed10': {
            const b = document.getElementById('btn-fast');
            if (b) b.click();
            break;
        }
        case 'speed100': {
            const b = document.getElementById('btn-warp');
            if (b) b.click();
            break;
        }
    }
}

function takeScreenshot() {
    if (!_renderer) return;

    // Render at high resolution
    _renderer.render(_scene, _camera);
    const dataUrl = _renderer.domElement.toDataURL('image/png');

    // Download
    const link = document.createElement('a');
    link.download = `Vynas_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();

    // Show toast
    showToast('📸 Captura guardada');
}

function toggleHelpOverlay() {
    let panel = document.getElementById('keyboard-help');
    if (panel) {
        panel.classList.toggle('active');
        return;
    }



    // Build help panel
    panel = document.createElement('div');
    panel.id = 'keyboard-help';
    panel.className = 'keyboard-help active';
    panel.innerHTML = `
        <div class="kbh-inner">
            <h3>⌨ Atajos de Teclado</h3>
            <div class="kbh-grid">
                ${Array.from(SHORTCUTS.entries()).map(([key, s]) => `
                    <div class="kbh-key">${escapeHTML(formatKey(key))}</div>
                    <div class="kbh-desc">${escapeHTML(s.desc)}</div>
                `).join('')}
            </div>
            <p class="kbh-close">Presiona <strong>H</strong> o <strong>Esc</strong> para cerrar</p>
        </div>
    `;
    panel.style.pointerEvents = 'auto';
    document.getElementById('ui-layer').appendChild(panel);
}

function formatKey(code) {
    const map = new Map([
        ['Space', 'ESPACIO'],
        ['KeyF', 'F'],
        ['KeyP', 'P'],
        ['KeyM', 'M'],
        ['KeyH', 'H'],
        ['Escape', 'ESC'],
        ['ArrowLeft', '←'],
        ['ArrowRight', '→'],
        ['Digit1', '1'],
        ['Digit2', '2'],
        ['Digit3', '3']
    ]);
    return map.has(code) ? map.get(code) : code;
}

function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'vynas-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, 2500);
}

export { showToast };
