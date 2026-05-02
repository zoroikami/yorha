/**
 * ╔═══════════════════════════════════════════════════╗
 * ║  Ambient Info — Paneles científicos en modo pasivo ║
 * ║  Papers, datos y descubrimientos rotativos         ║
 * ╚═══════════════════════════════════════════════════╝
 */

const PAPERS = [
    {
        category: 'DESCUBRIMIENTO',
        title: 'Seven temperate terrestrial planets around TRAPPIST-1',
        authors: 'Gillon, M. et al.',
        journal: 'Nature, 542, 456–460',
        year: 2017,
        abstract: 'Se reporta la detección de siete planetas de tamaño terrestre orbitando TRAPPIST-1, una estrella enana ultrafría a 12 parsecs. Tres planetas se encuentran en la zona habitable, lo que permite la existencia de agua líquida en sus superficies.',
        doi: 'https://doi.org/10.1038/nature21360',
        impact: 'Citado +4,500 veces'
    },
    {
        category: 'EXOPLANETOLOGÍA',
        title: 'A terrestrial-sized exoplanet in the habitable zone of Kepler-186',
        authors: 'Quintana, E. F. et al.',
        journal: 'Science, 344, 277–280',
        year: 2014,
        abstract: 'Kepler-186f es el primer exoplaneta validado del tamaño de la Tierra que orbita en la zona habitable de una estrella distinta al Sol. Este hallazgo marca un hito en la búsqueda de mundos potencialmente habitables más allá de nuestro sistema solar.',
        doi: 'https://doi.org/10.1126/science.1249403',
        impact: 'Citado +2,800 veces'
    },
    {
        category: 'COSMOLOGÍA',
        title: 'Planck 2018 results: Cosmological parameters',
        authors: 'Planck Collaboration',
        journal: 'Astronomy & Astrophysics, 641, A6',
        year: 2020,
        abstract: 'Los resultados finales de la misión Planck establecen que el universo tiene 13.787 ± 20 millones de años, está compuesto por 4.9% materia bariónica, 26.8% materia oscura y 68.3% energía oscura.',
        doi: 'https://doi.org/10.1051/0004-6361/201833910',
        impact: 'Citado +12,000 veces'
    },
    {
        category: 'ASTROBIOLOGÍA',
        title: 'Phosphine gas in the cloud deck of Venus',
        authors: 'Greaves, J. S. et al.',
        journal: 'Nature Astronomy, 5, 655–664',
        year: 2021,
        abstract: 'Se detectó fosfina (PH₃) en la atmósfera de Venus a una altitud donde las condiciones podrían permitir vida microbiana. La presencia de esta molécula no puede explicarse por procesos geológicos o fotoquímicos conocidos.',
        doi: 'https://doi.org/10.1038/s41550-020-1174-4',
        impact: 'Debate activo en la comunidad'
    },
    {
        category: 'JWST',
        title: 'JWST reveals CO₂ in the atmosphere of WASP-39b',
        authors: 'JWST Transiting Exoplanet Community ERS',
        journal: 'Nature, 614, 649–652',
        year: 2023,
        abstract: 'Primera detección inequívoca de dióxido de carbono en la atmósfera de un exoplaneta. El telescopio espacial James Webb demostró su capacidad para analizar atmósferas exoplanetarias con una precisión sin precedentes.',
        doi: 'https://doi.org/10.1038/s41586-022-05269-w',
        impact: 'Hito del JWST'
    },
    {
        category: 'ONDAS GRAVITACIONALES',
        title: 'Observation of Gravitational Waves from a Binary Black Hole Merger',
        authors: 'Abbott, B. P. et al. (LIGO/Virgo)',
        journal: 'Physical Review Letters, 116, 061102',
        year: 2016,
        abstract: 'Primera detección directa de ondas gravitacionales, provenientes de la fusión de dos agujeros negros a 1.3 mil millones de años luz. Confirmó la predicción de Einstein de 1915 y abrió una nueva era en la astronomía.',
        doi: 'https://doi.org/10.1103/PhysRevLett.116.061102',
        impact: 'Premio Nobel 2017'
    }
];

const FACTS = [
    { icon: '🌍', text: 'La Tierra recibe aproximadamente 1.74 × 10¹⁷ watts de radiación solar continuamente.' },
    { icon: '🔭', text: 'El JWST puede detectar el calor de un abejorro a la distancia de la Luna.' },
    { icon: '☀️', text: 'Cada segundo, el Sol convierte 600 millones de toneladas de hidrógeno en helio.' },
    { icon: '🌌', text: 'La Vía Láctea contiene entre 100 y 400 mil millones de estrellas.' },
    { icon: '🪐', text: 'Un año en Neptuno dura 164.8 años terrestres.' },
    { icon: '🚀', text: 'Voyager 1 está a más de 24 mil millones de km del Sol y sigue transmitiendo.' },
    { icon: '⭐', text: 'TRAPPIST-1 es tan tenue que no es visible a simple vista desde la Tierra.' },
    { icon: '🌊', text: 'Europa (luna de Júpiter) podría tener más agua líquida que todos los océanos de la Tierra.' },
    { icon: '💫', text: 'Betelgeuse es tan grande que si reemplazara al Sol, su superficie llegaría más allá de la órbita de Marte.' },
    { icon: '🛰️', text: 'Kepler descubrió más de 2.700 exoplanetas confirmados durante su misión.' }
];

let _container = null;
let _currentPaper = 0;
let _currentFact = 0;
let _interval = null;
let _factInterval = null;

export function initAmbientInfo() {
    _container = document.getElementById('ambient-info');
    if (!_container) return;

    renderPaper(0);
    renderFact(0);

    // Rotate papers every 20s
    _interval = setInterval(() => {
        _currentPaper = (_currentPaper + 1) % PAPERS.length;
        renderPaper(_currentPaper);
    }, 20000);

    // Rotate facts every 12s
    _factInterval = setInterval(() => {
        _currentFact = (_currentFact + 1) % FACTS.length;
        renderFact(_currentFact);
    }, 12000);
}

function renderPaper(index) {
    const p = PAPERS[index];
    const paperEl = _container.querySelector('.ambient-paper');
    if (!paperEl) return;

    paperEl.style.opacity = '0';
    paperEl.style.transform = 'translateY(10px)';

    setTimeout(() => {
        paperEl.innerHTML = `
            <div class="ap-category">${p.category}</div>
            <h3 class="ap-title">${p.title}</h3>
            <p class="ap-authors">${p.authors}</p>
            <p class="ap-journal">${p.journal} (${p.year})</p>
            <p class="ap-abstract">${p.abstract}</p>
            <div class="ap-footer">
                <a href="${p.doi}" target="_blank" class="ap-doi">DOI ↗</a>
                <span class="ap-impact">${p.impact}</span>
            </div>
            <div class="ap-counter">${index + 1} / ${PAPERS.length}</div>
        `;
        paperEl.style.opacity = '1';
        paperEl.style.transform = 'translateY(0)';
    }, 400);
}

function renderFact(index) {
    const f = FACTS[index];
    const factEl = _container.querySelector('.ambient-fact');
    if (!factEl) return;

    factEl.style.opacity = '0';
    setTimeout(() => {
        factEl.innerHTML = `
            <span class="af-icon">${f.icon}</span>
            <span class="af-text">${f.text}</span>
        `;
        factEl.style.opacity = '1';
    }, 300);
}

export function showAmbientInfo() {
    if (_container) {
        _container.style.opacity = '1';
        _container.style.pointerEvents = 'auto';
    }
}

export function hideAmbientInfo() {
    if (_container) {
        _container.style.opacity = '0';
        _container.style.pointerEvents = 'none';
    }
}

export function destroyAmbientInfo() {
    if (_interval) clearInterval(_interval);
    if (_factInterval) clearInterval(_factInterval);
}
