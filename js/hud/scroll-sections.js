/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  Scroll Sections — Dashboard scrollable + APIs en vivo         ║
 * ║  Metrics, Catálogo, Mars Rover, EPIC, Clima Espacial, Easter  ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

import { APIS } from '../config.js';
import { escapeHTML } from '../utils/sanitize.js';

const PROXY = 'php/nasa_proxy.php';
const CACHE_PREFIX = 'Vynas_cache_';

// ── Cache helpers ──
function cacheGet(key, maxAge) {
    try {
        const raw = localStorage.getItem(CACHE_PREFIX + key);
        if (!raw) return null;
        const { ts, data } = JSON.parse(raw);
        if (Date.now() - ts > maxAge) return null;
        return data;
    } catch { return null; }
}
function cacheSet(key, data) {
    try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ ts: Date.now(), data })); }
    catch { /* quota */ }
}

async function fetchCached(url, cacheKey, maxAge) {
    const cached = cacheGet(cacheKey, maxAge);
    if (cached) return cached;
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        cacheSet(cacheKey, data);
        return data;
    } catch { return null; }
}

// ══════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════
export function initScrollSections(planetsData, spaceWeather = null, epicImages = null, marsImages = null) {
    setupRevealObserver();
    setupScrollIndicator();
    setupScrollHeroFade();
    buildMetricCards(planetsData);
    buildCatalog(planetsData);
    loadMarsPhotos('curiosity', marsImages);
    setupMarsControls(marsImages);
    loadKpIndex(spaceWeather);
    loadSolarFlares(spaceWeather);
    loadEpicEarth(epicImages);
    setupKonamiCode();
    setupCustomCursor();
}

// ══════════════════════════════════════════════════
//  INTERSECTION OBSERVER — Reveal on scroll
// ══════════════════════════════════════════════════
function setupRevealObserver() {
    const sections = document.querySelectorAll('.dash-section');
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.classList.add('revealed');
                // Animate counters on mission section
                if (e.target.id === 'mission-section') animateCounters();
            }
        });
    }, { threshold: 0.15 });
    sections.forEach(s => obs.observe(s));
}

// ══════════════════════════════════════════════════
//  SCROLL INDICATOR
// ══════════════════════════════════════════════════
function setupScrollIndicator() {
    const indicator = document.getElementById('scroll-indicator');
    if (!indicator) return;
    indicator.addEventListener('click', () => {
        const target = document.getElementById('mission-section');
        if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
}

function setupScrollHeroFade() {
    const indicator = document.getElementById('scroll-indicator');
    const introTitle = document.getElementById('intro-title');
    const heroFooter = document.getElementById('footer');
    const btnInt = document.getElementById('btn-toggle-interaction');

    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        const halfVH = window.innerHeight * 0.4;
        const fade = Math.max(0, 1 - scrollY / halfVH);

        if (indicator) indicator.style.opacity = fade * 0.5;
        if (introTitle) introTitle.style.opacity = fade;
        if (heroFooter) heroFooter.style.opacity = fade * 0.55;
        if (btnInt) btnInt.style.opacity = fade;
        if (btnInt) btnInt.style.pointerEvents = fade < 0.3 ? 'none' : 'auto';
    }, { passive: true });
}

// ══════════════════════════════════════════════════
//  INTERACTIVE MODE TOGGLE
// ══════════════════════════════════════════════════
export function enableInteractiveMode() {
    document.body.classList.add('interactive-mode');
    window.scrollTo(0, 0);
}

export function disableInteractiveMode() {
    document.body.classList.remove('interactive-mode');
}

// ══════════════════════════════════════════════════
//  METRIC CARDS
// ══════════════════════════════════════════════════
let _counterTargets = [];

function buildMetricCards(pd) {
    const grid = document.getElementById('metric-grid');
    if (!grid) return;

    const planetCount = Object.keys(pd).filter(k => !pd[k].isStar && !pd[k].isConstellation).length;
    const starCount = Object.keys(pd).filter(k => pd[k].isStar).length;
    const systems = new Set();
    Object.values(pd).forEach(p => { if (p.sector) systems.add(p.sector.split('/').pop().split(' ').pop()); });
    const alertCount = Object.values(pd).filter(p => p.alert).length;

    const metrics = [
        { icon: '🌍', value: planetCount, label: 'Planetas Registrados' },
        { icon: '⭐', value: starCount, label: 'Estrellas Catalogadas' },
        { icon: '🛰️', value: systems.size, label: 'Sistemas Estelares' },
        { icon: '⚠️', value: alertCount, label: 'Alertas Activas' },
        { icon: '🔭', value: 4, label: 'Constelaciones' },
        { icon: '📡', value: 0, label: 'NEO Cercanos Hoy', id: 'metric-neo' },
    ];

    _counterTargets = [];
    metrics.forEach((m, i) => {
        const card = document.createElement('div');
        card.className = 'metric-card';
        card.style.transitionDelay = `${i * 0.08}s`;
        card.innerHTML = `
            <div class="metric-icon">${m.icon}</div>
            <div class="metric-value" ${m.id ? `id="${m.id}"` : ''}>0</div>
            <div class="metric-label">${m.label}</div>
        `;
        grid.appendChild(card);
        _counterTargets.push({ el: card.querySelector('.metric-value'), target: m.value });
    });

    // Fetch NEO count
    fetchNEOCount();
}

async function fetchNEOCount() {
    const data = await fetchCached(
        `${PROXY}?endpoint=neo_feed`,
        'neo_today', 3600000
    );
    if (data && data.element_count) {
        const el = document.getElementById('metric-neo');
        if (el) {
            const idx = _counterTargets.findIndex(t => t.el === el);
            if (idx >= 0) _counterTargets[idx].target = data.element_count;
        }
    }
}

function animateCounters() {
    _counterTargets.forEach(({ el, target }) => {
        if (!el || el.dataset.animated) return;
        el.dataset.animated = '1';
        const duration = 1500;
        const start = performance.now();
        function step(now) {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.round(eased * target);
            if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    });
}

// ══════════════════════════════════════════════════
//  STELLAR CATALOG
// ══════════════════════════════════════════════════
function buildCatalog(pd) {
    const solarGrid = document.getElementById('catalog-solar');
    const trappistGrid = document.getElementById('catalog-trappist');
    const keplerGrid = document.getElementById('catalog-kepler');

    for (const [k, p] of Object.entries(pd)) {
        if (p.isConstellation) continue;

        let grid = solarGrid;
        if (p.sector && p.sector.includes('TRAPPIST')) grid = trappistGrid;
        if (p.sector && p.sector.includes('Kepler')) grid = keplerGrid;
        if (!grid) continue;

        const card = document.createElement('div');
        card.className = 'planet-card';
        card.style.borderColor = `${p.theme}15`;

        card.innerHTML = `
            <span class="pc-symbol" style="color:${escapeHTML(p.theme)}">${escapeHTML(p.symbol || '●')}</span>
            <div class="pc-name" style="color:${escapeHTML(p.theme)}">${escapeHTML(p.name)}</div>
            <div class="pc-sector">${escapeHTML(p.sector || '')}</div>
            <div class="pc-desc">${escapeHTML(p.unique || p.desc || '')}</div>
            ${p.alert ? `<span class="pc-alert" style="background:${escapeHTML(p.theme)}20;color:${escapeHTML(p.theme)};border:1px solid ${escapeHTML(p.theme)}40">${escapeHTML(p.alertText || 'Alerta')}</span>` : ''}
        `;

        card.addEventListener('mouseenter', () => {
            card.style.borderColor = `${p.theme}50`;
            card.style.boxShadow = `0 0 20px ${p.theme}15`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.borderColor = `${p.theme}15`;
            card.style.boxShadow = 'none';
        });

        grid.appendChild(card);
    }
}

// ══════════════════════════════════════════════════
//  MARS ROVER PHOTOS
// ══════════════════════════════════════════════════
let _currentRover = 'curiosity';

function setupMarsControls(marsImages) {
    document.querySelectorAll('.mars-rover-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mars-rover-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            _currentRover = btn.dataset.rover;
            loadMarsPhotos(_currentRover, marsImages);
        });
    });
}

async function loadMarsPhotos(rover, preloadedData = null) {
    const gallery = document.getElementById('mars-gallery');
    const status = document.getElementById('mars-status');
    if (!gallery) return;

    gallery.innerHTML = '';
    if (status) { status.textContent = `Contactando ${rover}...`; status.style.display = 'block'; }

    let photos = [];
    
    // Try to use Python processed data first
    if (preloadedData && preloadedData[rover] && preloadedData[rover].photos && preloadedData[rover].photos.length > 0) {
        photos = preloadedData[rover].photos.map(p => ({
            img_src: p.thumb_path ? p.thumb_path.replace('c:\\wamp64\\www\\ispep\\', '').replace('c:\\wamp64\\www\\Vynas\\', '').replace(/\\/g, '/') : p.original_url,
            camera: p.camera,
            sol: p.sol,
            earth_date: p.earth_date,
            original_url: p.original_url
        }));
    } else {
        // Fallback: NASA Image and Video Library (la Mars Rover API fue archivada)
        const data = await fetchCached(
            `https://images-api.nasa.gov/search?q=Mars+${rover}+rover+surface&media_type=image&year_start=2023&page_size=12`,
            `mars_${rover}_imglib`, 3600000
        );
        if (data && data.collection && data.collection.items) {
            photos = data.collection.items.map(item => {
                const d = item.data?.[0] || {};
                const link = item.links?.[0] || {};
                return {
                    img_src: link.href || '',
                    camera: { name: d.secondary_creator || 'NAV/MAST', full_name: d.title || '' },
                    sol: null,
                    earth_date: (d.date_created || '').slice(0, 10),
                    original_url: link.href || ''
                };
            }).filter(p => p.img_src);
        }
    }

    if (!photos || photos.length === 0) {
        if (status) status.textContent = `Sin fotos disponibles para ${rover}. Intente más tarde.`;
        return;
    }

    if (status) status.style.display = 'none';

    photos.forEach(photo => {
        const div = document.createElement('div');
        div.className = 'mars-photo';
        div.innerHTML = `
            <img src="${escapeHTML(photo.img_src.replace(/\\/g, '/'))}" alt="Mars - ${escapeHTML(photo.camera.name || photo.camera.full_name)}" loading="lazy">
            <div class="mp-info">
                <span class="mp-cam">${escapeHTML(photo.camera.name || '')}</span> · Sol ${escapeHTML(photo.sol || '')} · ${escapeHTML(photo.earth_date || '')}
            </div>
        `;
        div.addEventListener('click', () => window.open(photo.original_url || photo.img_src, '_blank'));
        gallery.appendChild(div);
    });
}

// ══════════════════════════════════════════════════
//  NOAA Kp INDEX
// ══════════════════════════════════════════════════
async function loadKpIndex(spaceWeather = null) {
    const gauge = document.getElementById('kp-gauge');
    const label = document.getElementById('kp-label');
    if (!gauge) return;

    let kpVal = 0, kpTrend = '';
    
    if (spaceWeather && spaceWeather.kp_index) {
        kpVal = spaceWeather.kp_index.current;
        kpTrend = spaceWeather.kp_index.trend;
    } else {
        const data = await fetchCached(
            'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json',
            'noaa_kp', 120000
        );
        if (data && data.length > 0) kpVal = Math.round(data[data.length - 1].estimated_kp || data[data.length - 1].kp_index);
    }

    const kpColors = ['#4ade80','#4ade80','#a3e635','#facc15','#f59e0b','#ef4444','#dc2626','#b91c1c','#991b1b','#7f1d1d'];
    const kpStatus = ['Calma Total','Calma','Baja Actividad','Inestable','Tormenta Menor','Tormenta Moderada','Tormenta Fuerte','Tormenta Severa','Tormenta Extrema','Evento Extremo'];

    gauge.innerHTML = '';
    // Simular historial basado en el actual para el gráfico si usamos el Python feed que solo trae el actual (o hacer el gauge de 1 solo valor grande)
    for (let i = 0; i < 9; i++) {
        // Añadir algo de ruido para que se vea como un gráfico
        const val = Math.max(0, Math.min(9, kpVal + (Math.random() * 2 - 1) * (i===8 ? 0 : 1)));
        const bar = document.createElement('div');
        bar.className = 'kp-bar';
        bar.style.height = `${Math.max(8, (val / 9) * 100)}%`;
        bar.style.background = kpColors[Math.round(val)] || '#4ade80';
        gauge.appendChild(bar);
    }

    const latestKp = Math.round(kpVal);
    if (label) {
        label.innerHTML = `<strong style="color:${kpColors[latestKp]}">${escapeHTML('Kp ' + latestKp)}</strong> — ${escapeHTML(kpStatus[latestKp] || 'Desconocido')} ${kpTrend ? `(${escapeHTML(kpTrend)})` : ''} · Condiciones de observación: ${latestKp <= 2 ? '✅ Óptimas' : latestKp <= 4 ? '⚠️ Aceptables' : '🔴 Degradadas'}`;
    }
}

// ══════════════════════════════════════════════════
//  DONKI SOLAR FLARES
// ══════════════════════════════════════════════════
async function loadSolarFlares(spaceWeather = null) {
    const timeline = document.getElementById('flare-timeline');
    if (!timeline) return;

    let flaresData = [];

    if (spaceWeather && spaceWeather.solar_flares && spaceWeather.solar_flares.flares) {
        flaresData = spaceWeather.solar_flares.flares;
    } else {
        // Fechas calculadas en el proxy server-side
        const data = await fetchCached(
            `${PROXY}?endpoint=donki_flares`,
            'donki_flr_7d', 900000
        );
        if (data) flaresData = data;
    }

    if (!flaresData || flaresData.length === 0) {
        timeline.innerHTML = '<p style="color:#666;font-size:0.7rem;text-align:center;">Sin llamaradas registradas esta semana.</p>';
        return;
    }

    // Sort newest first
    const sorted = [...flaresData].reverse();

    sorted.forEach(flare => {
        const cls = flare.classType || flare.class || '?';
        const letter = cls.charAt(0);
        const colors = { C: '#4ade80', M: '#facc15', X: '#ef4444' };
        const color = colors[letter] || '#888';
        const hasCME = flare.linkedEvents && flare.linkedEvents.some(e => e.activityID && e.activityID.includes('CME')) || flare.linked_events > 0;
        const pkTime = flare.peakTime || flare.peak;
        const peakTime = pkTime ? new Date(pkTime).toLocaleString('es-CL', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Desconocido';

        const item = document.createElement('div');
        item.className = 'flare-item';
        item.style.borderColor = color;
        item.innerHTML = `
            <span class="flare-class" style="color:${color}">${escapeHTML(cls)}</span>
            <div class="flare-details">
                <div class="fd-time">${escapeHTML(peakTime)}</div>
                <div class="fd-region">${escapeHTML(flare.sourceLocation || flare.source || '—')}</div>
            </div>
            ${hasCME ? '<span class="flare-badge" style="background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid rgba(239,68,68,0.3)">CME</span>' : ''}
        `;
        timeline.appendChild(item);
    });
}

// ══════════════════════════════════════════════════
//  EPIC — Foto de la Tierra desde DSCOVR
// ══════════════════════════════════════════════════
async function loadEpicEarth(epicImages = null) {
    const container = document.getElementById('epic-container');
    if (!container) return;

    let latest = null;
    let imgUrl = '';

    if (epicImages && epicImages.images && epicImages.images.length > 0) {
        latest = epicImages.images[0];
        imgUrl = latest.thumb_path ? latest.thumb_path.replace('c:\\wamp64\\www\\ispep\\', '').replace('c:\\wamp64\\www\\Vynas\\', '').replace(/\\/g, '/') : latest.original_url;
    } else {
        const data = await fetchCached(
            `${PROXY}?endpoint=epic_images`,
            'epic_latest', APIS.cache.epic
        );

        if (data && data.length > 0) {
            latest = data[0];
            const d = latest.date.split(' ')[0].split('-');
            imgUrl = `https://epic.gsfc.nasa.gov/archive/natural/${d[0]}/${d[1]}/${d[2]}/png/${latest.image}.png`;
        }
    }

    if (!latest) {
        container.innerHTML = '<p style="color:#666;text-align:center;font-size:0.7rem">Imagen no disponible</p>';
        return;
    }

    container.innerHTML = `
        <div class="epic-photo">
            <img src="${escapeHTML(imgUrl)}" alt="Tierra desde DSCOVR" loading="lazy">
            <div class="epic-info">
                <div class="epic-date">${escapeHTML(new Date(latest.date).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' }))}</div>
                <div class="epic-caption">Satélite DSCOVR · ${escapeHTML(latest.caption || 'Imagen de color natural')}</div>
            </div>
        </div>
    `;
}

// ══════════════════════════════════════════════════
//  EASTER EGG — Konami Code
// ══════════════════════════════════════════════════
function setupKonamiCode() {
    const konami = [38,38,40,40,37,39,37,39,66,65]; // ↑↑↓↓←→←→BA
    let pos = 0;
    document.addEventListener('keydown', (e) => {
        if (e.keyCode === konami[pos]) {
            pos++;
            if (pos === konami.length) {
                pos = 0;
                activateEasterEgg();
            }
        } else {
            pos = 0;
        }
    });
}

function activateEasterEgg() {
    // Flash dorado + mensaje secreto
    const flash = document.createElement('div');
    flash.style.cssText = 'position:fixed;inset:0;z-index:9999;background:radial-gradient(circle,rgba(197,163,88,0.3),transparent);pointer-events:none;animation:eggFlash 2s ease-out forwards';
    document.body.appendChild(flash);

    const msg = document.createElement('div');
    msg.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:10000;font-family:Cinzel,serif;font-size:1.5rem;color:#c5a358;text-align:center;letter-spacing:0.3em;text-shadow:0 0 30px rgba(197,163,88,0.8);pointer-events:none;animation:eggFade 4s ease-out forwards';
    msg.innerHTML = '✦ MODO GLORIA ETERNA ACTIVADO ✦<br><span style="font-size:0.6rem;letter-spacing:0.5em;color:#888">TODO ES PARA SER OLVIDADO</span>';
    document.body.appendChild(msg);

    // Cambiar temporalmente todos los temas a dorado brillante
    document.documentElement.style.setProperty('--theme-color', '#ffd700');
    setTimeout(() => {
        document.documentElement.style.setProperty('--theme-color', '#c5a358');
        flash.remove();
        msg.remove();
    }, 5000);
}

// ══════════════════════════════════════════════════
//  CUSTOM CURSOR
// ══════════════════════════════════════════════════
function setupCustomCursor() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes eggFlash { from { opacity:1 } to { opacity:0 } }
        @keyframes eggFade { 0% { opacity:0;transform:translate(-50%,-50%) scale(0.8) } 20% { opacity:1;transform:translate(-50%,-50%) scale(1) } 80% { opacity:1 } 100% { opacity:0;transform:translate(-50%,-50%) scale(1.1) } }
        body { cursor: crosshair; }
        .clickable, button, a, .planet-card, .mars-photo, .mars-rover-btn { cursor: pointer; }
        .planet-card:active, .mars-photo:active { cursor: grabbing; }
    `;
    document.head.appendChild(style);
}

