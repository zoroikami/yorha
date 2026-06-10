/**
 * Planet Hub — modo detalle (zoom a planeta/constelación + overlay holográfico)
 * Extraído y potenciado de dashboard.js::enterD / ret.onclick originales.
 * Activa anillos de telemetría y chromatic aberration al entrar;
 * los desactiva al salir.
 */

import { setTelemetryRingsActive, buildTelemetryRings } from './telemetry-rings.js';
import { startPlanetTelemetry, stopPlanetTelemetry } from './telemetry.js';
import { triggerWarp, triggerReturnWarp } from '../engine/warp-effect.js';
import { escapeHTML } from '../utils/sanitize.js';
import { hideNavArrows, showNavArrows } from './system-selector.js';

let _detailed = false;
let _isTransitioning = false;
let _targetMesh = null;
let _currentRecord = null;
const _camSave = new THREE.Vector3();
const _tgtSave = new THREE.Vector3();
const _prevPos = new THREE.Vector3();

let _ctx = null; // {camera, controls, canvas, planets, activeMshes, vignettePass, bloom, titleEl}
let _ui = null;
let _hub = null;
let _ret = null;

function collectUI() {
    return {
        n: document.getElementById('hub-name'),
        s: document.getElementById('hub-sector'),
        d: document.getElementById('hub-desc'),
        r: document.getElementById('hub-rotation'),
        o: document.getElementById('hub-orbit'),
        a: document.getElementById('hub-age'),
        dist: document.getElementById('hub-distance'),
        diam: document.getElementById('hub-diameter'),
        atm: document.getElementById('hub-atmosphere'),
        uni: document.getElementById('hub-unique'),
        alG: document.getElementById('hub-alert-group'),
        alT: document.getElementById('hub-alert'),
        eras: document.getElementById('hub-eras-container'),
        srcN: document.getElementById('hub-source-name'),
        srcL: document.getElementById('hub-source-link')
    };
}

function populateUI(p) {
    if (_ui.n) _ui.n.textContent = p.name || '';
    if (_ui.s) _ui.s.textContent = p.sector || '';
    if (_ui.d) _ui.d.textContent = p.desc || '';
    if (_ui.r) _ui.r.textContent = p.rotation || '';
    if (_ui.o) _ui.o.textContent = p.orbit || '';
    if (_ui.a) _ui.a.textContent = p.age || '';
    if (_ui.dist) _ui.dist.textContent = p.distance || '';
    if (_ui.diam) _ui.diam.textContent = p.diameter || '';
    if (_ui.atm) _ui.atm.textContent = p.atmosphere || '';
    if (_ui.uni) _ui.uni.textContent = p.unique || '';
    if (_ui.srcN) _ui.srcN.textContent = p.source || '';
    if (_ui.srcL) _ui.srcL.href = p.source_url || '#';
    if (_ui.alG) _ui.alG.style.display = p.alert ? 'block' : 'none';
    if (p.alert && _ui.alT) _ui.alT.textContent = p.alertText || '';

    if (_ui.eras) {
        _ui.eras.innerHTML = '';
        (p.eras || []).forEach(e => {
            const div = document.createElement('div');
            div.className = 'era-item';
            div.innerHTML = `<div class="era-name">${escapeHTML(e.name)}</div><div class="era-desc">${escapeHTML(e.desc)}</div>`;
            div.onclick = () => window.openEraModal && window.openEraModal(e);
            _ui.eras.appendChild(div);
        });
    }

    if (p.theme) document.documentElement.style.setProperty('--theme-color', p.theme);
    if (p.themeSec) document.documentElement.style.setProperty('--theme-color-secondary', p.themeSec);
    if (p.themeRGB) document.documentElement.style.setProperty('--theme-color-rgb', p.themeRGB);
}

function activateHolographicOverlay(record, p) {
    if (!record) return;

    // Crear anillos de telemetría bajo demanda (lazy) y cachearlos en el record
    if (!record.telemetryRings && record.targetGrp && p && p.radius) {
        const color = p.theme || '#ffd966';
        const colorHex = (typeof color === 'string')
            ? parseInt(color.replace('#', ''), 16)
            : color;
        const ringsGroup = buildTelemetryRings(p.radius, colorHex);
        record.targetGrp.add(ringsGroup);
        record.telemetryRings = ringsGroup;
    }
    if (record.telemetryRings) setTelemetryRingsActive(record.telemetryRings, true);
}

function deactivateHolographicOverlay(record) {
    if (!record) return;
    if (record.telemetryRings) setTelemetryRingsActive(record.telemetryRings, false);
}

export function initPlanetHub(ctx) {
    _ctx = ctx;
    _ui = collectUI();
    _hub = document.getElementById('planet-hub');
    _ret = document.getElementById('btn-return');

    if (_ret) {
        _ret.onclick = () => exitDetailMode();
    }
}

export function enterDetailMode(p) {
    if (!_ctx || !p || _detailed || _isTransitioning) return;

    const { camera, controls, planets, activeMshes, titleEl } = _ctx;

    // Audio + visual warp FX
    if (typeof window.playWarp === 'function') window.playWarp();
    triggerWarp({ vignettePass: _ctx.vignettePass, bloom: _ctx.bloom, duration: 3.5 });

    _detailed = true;
    _isTransitioning = true;
    _camSave.copy(camera.position);
    _tgtSave.copy(controls.target);

    hideNavArrows();

    populateUI(p);
    if (titleEl) titleEl.style.opacity = '0';

    const wP = new THREE.Vector3();
    const tr = { p: 0 };
    const startCam = camera.position.clone();
    const startTgt = controls.target.clone();

    const finishEnter = () => {
        _isTransitioning = false;
        if (_hub) _hub.classList.add('active');
        document.querySelectorAll('.hub-data-row').forEach(el => el.classList.add('animate-in'));
        startPlanetTelemetry(p);
    };

    if (!p.isConstellation) {
        const record = planets[p.planetaryKey || p.id];
        if (!record) { _isTransitioning = false; return; }
        _currentRecord = record;
        _targetMesh = record.pMesh;
        activateHolographicOverlay(record, p);

        gsap.to(tr, {
            duration: 3.5, p: 1, ease: 'power3.inOut',
            onUpdate: () => {
                _targetMesh.getWorldPosition(wP);
                const sysCenter = p.systemOffset
                    ? new THREE.Vector3().fromArray(p.systemOffset)
                    : new THREE.Vector3(0, 0, 0);
                const relPos = wP.clone().sub(sysCenter);
                const ang = (relPos.length() < 0.1)
                    ? (Math.PI / 4)
                    : (Math.atan2(relPos.z, relPos.x) - 0.4);
                const dst = Math.max((p.radius || 1) * 5.2, 15);
                const tCam = new THREE.Vector3(
                    wP.x + Math.cos(ang) * dst,
                    wP.y + (p.radius || 1) * 0.8,
                    wP.z + Math.sin(ang) * dst
                );
                camera.position.lerpVectors(startCam, tCam, tr.p);
                controls.target.lerpVectors(startTgt, wP, tr.p);
                _prevPos.copy(wP);
            },
            onComplete: finishEnter
        });
    } else {
        const m = activeMshes.find(x => x.userData && x.userData.id === p.id);
        if (!m) { _isTransitioning = false; return; }
        _currentRecord = null;
        _targetMesh = m;

        gsap.to(tr, {
            duration: 3.5, p: 1, ease: 'power3.inOut',
            onUpdate: () => {
                _targetMesh.getWorldPosition(wP);
                const tCam = new THREE.Vector3(wP.x * 0.5, wP.y * 0.5 + 40, wP.z * 0.5);
                camera.position.lerpVectors(startCam, tCam, tr.p);
                controls.target.lerpVectors(startTgt, wP, tr.p);
                _prevPos.copy(wP);
            },
            onComplete: finishEnter
        });
    }

    if (typeof window.modulateSynth === 'function') window.modulateSynth(p);
}

export function exitDetailMode() {
    if (!_ctx || !_detailed) return;
    const { camera, controls, titleEl } = _ctx;

    if (typeof window.playBeep === 'function') window.playBeep(600, 'sine', 0.15, 0.05);
    if (typeof window.modulateSynth === 'function') window.modulateSynth(null);
    triggerReturnWarp({ vignettePass: _ctx.vignettePass, duration: 2.0 });

    deactivateHolographicOverlay(_currentRecord);
    stopPlanetTelemetry();

    _detailed = false;
    _targetMesh = null;
    _currentRecord = null;

    if (_hub) _hub.classList.remove('active');
    document.querySelectorAll('.hub-data-row').forEach(el => el.classList.remove('animate-in'));

    gsap.to(camera.position, {
        duration: 2.0, x: _camSave.x, y: _camSave.y, z: _camSave.z, ease: 'power3.inOut'
    });
    gsap.to(controls.target, {
        duration: 2.0, x: _tgtSave.x, y: _tgtSave.y, z: _tgtSave.z, ease: 'power3.inOut',
        onComplete: () => {
            controls.enabled = !!window.__interactive;
            if (titleEl) titleEl.style.opacity = '1';
            if (window.__interactive && !window.__autopilotActive) {
                showNavArrows();
            }
        }
    });
}

export function isDetailed() {
    return _detailed;
}

export function isTransitioning() {
    return _isTransitioning;
}

export function followTargetMesh() {
    if (!_detailed || !_targetMesh || _isTransitioning) return;
    const cur = new THREE.Vector3();
    _targetMesh.getWorldPosition(cur);
    const delta = cur.clone().sub(_prevPos);
    if (_ctx) {
        _ctx.camera.position.add(delta);
        _ctx.controls.target.add(delta);
    }
    _prevPos.copy(cur);
}

export function getCurrentRecord() {
    return _currentRecord;
}
