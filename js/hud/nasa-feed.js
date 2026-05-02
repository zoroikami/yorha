/**
 * ╔═══════════════════════════════════════════════════╗
 * ║  NASA Feed — Datos en tiempo real de NASA APIs    ║
 * ║  Feature 2.1: APOD + Near Earth Objects           ║
 * ╚═══════════════════════════════════════════════════╝
 */

const NASA_KEY = 'DEMO_KEY';
const APOD_URL = `https://api.nasa.gov/planetary/apod?api_key=${NASA_KEY}`;
const NEO_URL  = `https://api.nasa.gov/neo/rest/v1/feed/today?detailed=false&api_key=${NASA_KEY}`;
const ISS_URL  = 'http://api.open-notify.org/iss-now.json';
const SPACEX_URL = 'https://api.spacexdata.com/v4/launches/upcoming';

let _panel = null;

export async function initNasaFeed() {
    _panel = document.getElementById('nasa-feed-panel');
    if (!_panel) return;

    // Load APOD
    try {
        const apod = await fetchJson(APOD_URL);
        if (apod) renderAPOD(apod);
    } catch (e) { console.warn('[YoRHa Feed] APOD failed:', e); }

    // Load NEO
    try {
        const neo = await fetchJson(NEO_URL);
        if (neo) renderNEO(neo);
    } catch (e) { console.warn('[YoRHa Feed] NEO failed:', e); }

    // Load ISS
    try {
        const iss = await fetchJson(ISS_URL);
        if (iss) renderISS(iss);
    } catch (e) { console.warn('[YoRHa Feed] ISS failed:', e); }

    // Load SpaceX
    try {
        const sx = await fetchJson(SPACEX_URL);
        if (sx && sx.length > 0) renderSpaceX(sx[0]);
    } catch (e) { console.warn('[YoRHa Feed] SpaceX failed:', e); }
}

async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json();
}

function renderAPOD(data) {
    if (!_panel) return;
    const el = document.createElement('div');
    el.className = 'nasa-apod';
    el.innerHTML = `
        <div class="nasa-header">
            <span class="nasa-badge">NASA APOD</span>
            <span class="nasa-date">${data.date || ''}</span>
        </div>
        <h4 class="nasa-title">${data.title || 'Imagen del Día'}</h4>
        ${data.media_type === 'image'
            ? `<img src="${data.url}" alt="${data.title}" class="nasa-img" loading="lazy">`
            : ''
        }
        <p class="nasa-explanation">${(data.explanation || '').slice(0, 150)}...</p>
    `;
    _panel.appendChild(el);
    _panel.style.display = 'block';
}

function renderNEO(data) {
    if (!_panel || !data.element_count) return;
    const el = document.createElement('div');
    el.className = 'nasa-neo';
    el.innerHTML = `
        <div class="nasa-header">
            <span class="nasa-badge neo">NEO TODAY</span>
            <span class="nasa-count">${data.element_count} obj</span>
        </div>
        <div class="neo-alert">
            <span class="neo-icon">☄️</span>
            <span>${data.element_count} asteroides cercanos hoy</span>
        </div>
    `;
    _panel.appendChild(el);
}

function renderISS(data) {
    if (!_panel || !data.iss_position) return;
    const el = document.createElement('div');
    el.className = 'nasa-neo';
    el.innerHTML = `
        <div class="nasa-header">
            <span class="nasa-badge" style="background: #1e3a8a; color: #93c5fd;">ISS TRACKER</span>
            <span class="nasa-count">EN VIVO</span>
        </div>
        <div class="neo-alert" style="background: rgba(30, 58, 138, 0.2); border-color: rgba(30, 58, 138, 0.5);">
            <span class="neo-icon">🛰️</span>
            <span>Lat: ${parseFloat(data.iss_position.latitude).toFixed(4)} | Lng: ${parseFloat(data.iss_position.longitude).toFixed(4)}</span>
        </div>
    `;
    _panel.appendChild(el);
}

function renderSpaceX(data) {
    if (!_panel || !data.name) return;
    const date = new Date(data.date_utc).toLocaleDateString();
    const el = document.createElement('div');
    el.className = 'nasa-neo';
    el.innerHTML = `
        <div class="nasa-header">
            <span class="nasa-badge" style="background: #374151; color: #d1d5db;">SPACEX</span>
            <span class="nasa-count">${date}</span>
        </div>
        <div class="neo-alert" style="background: rgba(55, 65, 81, 0.2); border-color: rgba(55, 65, 81, 0.5);">
            <span class="neo-icon">🚀</span>
            <span>Misión: ${data.name}</span>
        </div>
    `;
    _panel.appendChild(el);
}

export function toggleNasaPanel() {
    if (!_panel) return;
    _panel.classList.toggle('collapsed');
}
