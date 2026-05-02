/**
 * ╔═══════════════════════════════════════════════════╗
 * ║  Tutorial — Guía interactiva de primer uso        ║
 * ║  Feature 5.4: Onboarding para nuevos usuarios     ║
 * ╚═══════════════════════════════════════════════════╝
 */

const STORAGE_KEY = 'yorha_tutorial_done';

const STEPS = [
    {
        title: 'Bienvenido a YorHa',
        text: 'Plataforma de simulación astronómica en tiempo real. Este breve tutorial te mostrará los controles básicos.',
        icon: '🌌'
    },
    {
        title: 'Iniciar Interacción',
        text: 'Haz clic en "INICIAR INTERACCIÓN" para activar el control orbital. Podrás rotar, acercar y explorar libremente el sistema estelar.',
        icon: '🖱️',
        highlight: '#btn-toggle-interaction'
    },
    {
        title: 'Seleccionar Planetas',
        text: 'Haz clic en cualquier planeta para ver su información detallada: composición, órbita, cronología evolutiva y datos científicos certificados.',
        icon: '🪐'
    },
    {
        title: 'Navegar entre Sistemas',
        text: 'Usa las flechas laterales ‹ › o las teclas ← → para viajar entre el Sistema Solar, TRAPPIST-1 y Kepler-186.',
        icon: '🚀'
    },
    {
        title: 'Control de Tiempo',
        text: 'Acelera o pausa el tiempo con los controles inferiores. También puedes usar las teclas 1 (normal), 2 (x10) y 3 (x100).',
        icon: '⏱️',
        highlight: '.time-controls'
    },
    {
        title: 'Atajos de Teclado',
        text: 'Presiona H para ver todos los atajos. P para captura de pantalla. M para el mini-mapa. F para pantalla completa.',
        icon: '⌨️'
    },
    {
        title: '¡Listo para explorar!',
        text: 'Ahora tienes el control total. El universo te espera, investigador.',
        icon: '✨'
    }
];

let _currentStep = 0;
let _overlay = null;

export function initTutorial() {
    // Skip if already completed
    if (localStorage.getItem(STORAGE_KEY)) return;

    // Wait for preloader to finish
    setTimeout(() => {
        buildOverlay();
        showStep(0);
    }, 3000);
}

function buildOverlay() {
    _overlay = document.createElement('div');
    _overlay.id = 'tutorial-overlay';
    _overlay.className = 'tutorial-overlay';
    _overlay.innerHTML = `
        <div class="tutorial-card">
            <div class="tutorial-icon" id="tutorial-icon"></div>
            <div class="tutorial-progress" id="tutorial-progress"></div>
            <h3 id="tutorial-title"></h3>
            <p id="tutorial-text"></p>
            <div class="tutorial-actions">
                <button id="tutorial-skip" class="tutorial-btn-skip">OMITIR</button>
                <button id="tutorial-next" class="tutorial-btn-next">SIGUIENTE</button>
            </div>
        </div>
    `;
    _overlay.style.pointerEvents = 'auto';
    document.getElementById('ui-layer').appendChild(_overlay);

    document.getElementById('tutorial-next').onclick = nextStep;
    document.getElementById('tutorial-skip').onclick = closeTutorial;
}

function showStep(index) {
    if (index >= STEPS.length) {
        closeTutorial();
        return;
    }

    _currentStep = index;
    const step = STEPS[index];

    document.getElementById('tutorial-icon').textContent = step.icon;
    document.getElementById('tutorial-title').textContent = step.title;
    document.getElementById('tutorial-text').textContent = step.text;

    // Progress dots
    const progress = document.getElementById('tutorial-progress');
    progress.innerHTML = STEPS.map((_, i) =>
        `<span class="dot ${i === index ? 'active' : ''} ${i < index ? 'done' : ''}"></span>`
    ).join('');

    // Change button text for last step
    const nextBtn = document.getElementById('tutorial-next');
    nextBtn.textContent = index === STEPS.length - 1 ? 'COMENZAR' : 'SIGUIENTE';

    // Highlight target element if specified
    clearHighlight();
    if (step.highlight) {
        const el = document.querySelector(step.highlight);
        if (el) el.classList.add('tutorial-highlight');
    }

    // Animate in
    const card = _overlay.querySelector('.tutorial-card');
    card.style.animation = 'none';
    card.offsetHeight; // force reflow
    card.style.animation = 'tutorialSlideIn 0.5s ease forwards';
}

function nextStep() {
    if (typeof window.playBeep === 'function') window.playBeep(1200, 'triangle', 0.08, 0.03);
    showStep(_currentStep + 1);
}

function closeTutorial() {
    localStorage.setItem(STORAGE_KEY, '1');
    clearHighlight();
    if (_overlay) {
        _overlay.style.opacity = '0';
        _overlay.style.transition = 'opacity 0.5s ease';
        setTimeout(() => _overlay.remove(), 500);
    }
}

function clearHighlight() {
    document.querySelectorAll('.tutorial-highlight').forEach(el => {
        el.classList.remove('tutorial-highlight');
    });
}

export function resetTutorial() {
    localStorage.removeItem(STORAGE_KEY);
}
