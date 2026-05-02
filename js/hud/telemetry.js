/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  HUD / Telemetry — Fluctuación de valores + osciloscopio DOM  ║
 * ║  Simula un sistema vivo procesando datos en tiempo real.      ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

let state = {
    active: false,
    planet: null,
    baseValues: {},
    oscPoints: [],
    packetCount: 0,
    signalStrength: 5,
    rafId: null,
    lastPacketUpdate: 0
};

function parseNumericBase(str) {
    if (!str) return null;
    const match = String(str).match(/-?\d+(?:[.,]\d+)?/);
    if (!match) return null;
    return { value: parseFloat(match[0].replace(',', '.')), prefix: str.slice(0, match.index), suffix: str.slice(match.index + match[0].length) };
}

function fmt(value, decimals = 4) {
    return value.toFixed(decimals).replace('.', ',');
}

function fluctuate(base, amplitude, time, phase = 0) {
    return base + Math.sin(time * 0.8 + phase) * amplitude * 0.5 + Math.sin(time * 2.3 + phase * 1.7) * amplitude * 0.25;
}

function captureBaseValues() {
    const fields = ['hub-rotation', 'hub-orbit', 'hub-distance', 'hub-diameter'];
    const base = {};
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const parsed = parseNumericBase(el.textContent);
        if (parsed) {
            base[id] = { ...parsed, el, originalText: el.textContent };
        }
    });
    return base;
}

function updateFluctuatingValues(time) {
    const entries = Object.entries(state.baseValues);
    entries.forEach(([id, data], i) => {
        if (!data.el) return;
        const amp = Math.abs(data.value) * 0.0006 + 0.002;
        const v = fluctuate(data.value, amp, time, i);
        let decimals = 4;
        if (Math.abs(data.value) >= 1000) decimals = 3;
        if (Math.abs(data.value) >= 100000) decimals = 1;
        data.el.textContent = `${data.prefix}${fmt(v, decimals)}${data.suffix}`;
    });
}

function updateOscilloscope(time) {
    const line = document.getElementById('osc-line');
    if (!line) return;
    const points = [];
    for (let x = 0; x <= 200; x += 4) {
        const y = 20
            + Math.sin(time * 4 + x * 0.1) * 6
            + Math.sin(time * 11 + x * 0.25) * 3
            + (Math.random() - 0.5) * 1.5;
        points.push(`${x},${y.toFixed(1)}`);
    }
    line.setAttribute('points', points.join(' '));
}

function updatePacketCounter(now) {
    if (now - state.lastPacketUpdate > 0.18) {
        state.lastPacketUpdate = now;
        state.packetCount += Math.floor(Math.random() * 5) + 1;
        const el = document.getElementById('packet-counter');
        if (el) el.textContent = String(state.packetCount).padStart(7, '0');
    }
}

function updateSignalBars(time) {
    const container = document.querySelector('.signal-bars');
    if (!container) return;
    const bars = container.children;
    const strength = Math.floor(3 + Math.abs(Math.sin(time * 0.7)) * 2.99);
    for (let i = 0; i < bars.length; i++) {
        bars[i].classList.toggle('active', i < strength);
    }
}

function loop() {
    if (!state.active) return;
    const time = performance.now() / 1000;
    updateFluctuatingValues(time);
    updateOscilloscope(time);
    updatePacketCounter(time);
    updateSignalBars(time);
    state.rafId = requestAnimationFrame(loop);
}

export function startPlanetTelemetry(planetData) {
    state.planet = planetData;
    state.baseValues = captureBaseValues();
    state.active = true;
    state.packetCount = Math.floor(Math.random() * 9000);
    if (!state.rafId) loop();
}

export function stopPlanetTelemetry() {
    state.active = false;
    if (state.rafId) {
        cancelAnimationFrame(state.rafId);
        state.rafId = null;
    }
    // Restaurar textos originales
    Object.values(state.baseValues).forEach(d => {
        if (d.el && d.originalText) d.el.textContent = d.originalText;
    });
}

export function initTelemetry() {
    // Asegurar que el DOM tiene los nodos necesarios (inyectar si faltan).
    const hubLeftContent = document.querySelector('.hub-left-content');
    if (hubLeftContent && !document.getElementById('telemetry-oscilloscope')) {
        const panel = document.createElement('div');
        panel.className = 'telemetry-panel';
        panel.innerHTML = `
            <div class="telemetry-header">
                <span>LIVE_FEED</span>
                <span class="pulse-dot"></span>
            </div>
            <svg id="telemetry-oscilloscope" viewBox="0 0 200 40" preserveAspectRatio="none">
                <polyline id="osc-line" fill="none" stroke="#ffd966" stroke-width="1"
                    points="0,20 200,20"/>
            </svg>
            <div class="telemetry-row">
                <span class="label">PKT</span>
                <span id="packet-counter">0000000</span>
            </div>
            <div class="telemetry-row">
                <span class="label">SIG</span>
                <div class="signal-bars">
                    <span></span><span></span><span></span><span></span><span></span>
                </div>
            </div>
        `;
        const btnReturn = document.getElementById('btn-return');
        if (btnReturn && btnReturn.parentNode === hubLeftContent) {
            hubLeftContent.insertBefore(panel, btnReturn);
        } else {
            hubLeftContent.appendChild(panel);
        }
    }
}
