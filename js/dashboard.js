/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  ISPEP / YoRHa OS — Dashboard Orchestrator                    ║
 * ║  Módulo principal que importa y conecta todos los subsistemas ║
 * ║  engine, scene, shaders, hud, audio.                          ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

import { getAstronomyData } from './api.js';
import { ENGINE } from './config.js';
import { createRenderer, createCamera, attachResizeHandler } from './engine/renderer.js';
import { createComposer } from './engine/composer.js';
import { createControls } from './engine/camera-controls.js';
import { setupLighting } from './scene/lighting.js';
import { buildStarfield, animateStarfield, loadMilkyWayBackground } from './scene/stars.js';
import { buildNebulas, animateNebulas } from './scene/nebulas.js';
import { buildPlanet } from './scene/planet-builder.js';
import { buildSun } from './scene/sun-builder.js';
import { buildAsteroidBelt } from './scene/asteroid-belt.js';
import { buildConstellations, animateConstellations } from './scene/constellation-builder.js';
import { updateSunEffects } from './shaders/sun-corona.js';
import { updateAtmosphereTime } from './shaders/atmosphere.js';

import { updateTelemetryRings } from './hud/telemetry-rings.js';
import { initTelemetry } from './hud/telemetry.js';
import { initPlanetHub, enterDetailMode, exitDetailMode, isDetailed, isTransitioning, followTargetMesh } from './hud/planet-hub.js';
import { initAutopilot } from './hud/autopilot.js';
import { initSystemSelector, showNavArrows, hideNavArrows } from './hud/system-selector.js';
import { initAudio, initSynthWindows } from './audio/synth.js';
import { attachUISounds } from './audio/sfx.js';

// ── NEW FEATURES ──
import { buildOrbitalTrails, animateOrbitalTrails } from './scene/orbital-trails.js';
import { buildComets, animateComets } from './scene/comets.js';
import { initKeyboard } from './hud/keyboard.js';
import { initTutorial } from './hud/tutorial.js';
import { initNasaFeed } from './hud/nasa-feed.js';
import { initAmbientInfo, showAmbientInfo, hideAmbientInfo } from './hud/ambient-info.js';

(async function () {
    /* ── 0. PRELOADER ─────────────────────────────────────────── */
    const preloader = document.getElementById('yorha-preloader');
    const bBar = document.getElementById('preloader-bar');
    const bStatus = document.getElementById('preloader-status');
    const loadState = { assets: false, data: false, ready: false };

    function sync() {
        if (loadState.assets && loadState.data && !loadState.ready) {
            loadState.ready = true;
            if (bStatus) bStatus.textContent = 'Enlace Neuronal Completo.';
            setTimeout(() => {
                if (preloader) {
                    preloader.classList.add('fade-out');
                    setTimeout(() => preloader.style.display = 'none', 800);
                }
            }, 1000);
        }
    }

    THREE.DefaultLoadingManager.onProgress = (u, l, t) => {
        if (bBar) bBar.style.width = (10 + (l / t) * 50) + '%';
    };
    THREE.DefaultLoadingManager.onLoad = () => { loadState.assets = true; sync(); };

    /* ── 1. MOTOR ─────────────────────────────────────────────── */
    const canvas = document.getElementById('three-canvas');
    const renderer = createRenderer(canvas);
    const camera = createCamera();
    const scene = new THREE.Scene();
    const { composer, bloom, filmPass, vignettePass } = createComposer(renderer, scene, camera);
    const controls = createControls(camera, canvas);

    /* ── 2. ESCENA ESTÁTICA ───────────────────────────────────── */
    setupLighting(scene);
    loadMilkyWayBackground(scene);
    const starLayers = buildStarfield(scene);
    const nebulas = buildNebulas(scene);
    const belt = buildAsteroidBelt(scene);

    /* ── 3. DATOS ─────────────────────────────────────────────── */
    if (bStatus) bStatus.textContent = 'Solicitando Topología Estelar...';
    const data = await getAstronomyData();
    const PD = data.PLANETS_DATA || {};
    const CD = data.CONSTELLATIONS_DATA || {};

    const systemGroups = { Sol: [belt], TRAPPIST: [], Kepler: [] };
    const planets = {};
    const activeMshes = [];

    // Constelaciones
    const { constels, activeMeshes: constActiveMeshes } = buildConstellations(CD, scene);
    activeMshes.push(...constActiveMeshes);

    // Satélite genérico (para Tierra/Marte sin gltfUrl)
    const gltfLoader = new THREE.GLTFLoader();
    function createSatellite() {
        const sat = new THREE.Group();
        const body = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.15, 0.8, 8),
            new THREE.MeshLambertMaterial({ color: 0xbbbbbb })
        );
        body.rotation.z = Math.PI / 2;
        const pMat = new THREE.MeshLambertMaterial({ color: 0x1144aa, side: THREE.DoubleSide });
        const p1 = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.4), pMat);
        p1.position.set(0, 0.3, 0);
        const p2 = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.4), pMat);
        p2.position.set(0, -0.3, 0);
        sat.add(body, p1, p2);
        return sat;
    }

    // Construir planetas y soles
    for (const k in PD) {
        try {
            const p = PD[k];
            const rec = p.isStar ? buildSun(p, scene) : buildPlanet(p, scene);
            planets[k] = rec;
            activeMshes.push(rec.pMesh);

            // Satélites (GLTF o genérico)
            if (!p.isStar && rec.targetGrp) {
                if (p.gltfUrl) {
                    gltfLoader.load(p.gltfUrl, (gltf) => {
                        gltf.scene.scale.setScalar(p.gltfScale || 1);
                        gltf.scene.position.set(p.radius * 1.4, 0, 0);
                        const satOrbit = new THREE.Group();
                        satOrbit.add(gltf.scene);
                        rec.targetGrp.add(satOrbit);
                        p.satelliteGroup = satOrbit;
                    });
                } else if (k === 'tierra' || k === 'marte') {
                    const satOrbit = new THREE.Group();
                    const sat = createSatellite();
                    sat.position.set(p.radius * 1.6, 0, 0);
                    satOrbit.add(sat);
                    rec.targetGrp.add(satOrbit);
                    p.satelliteGroup = satOrbit;
                }
            }

            // Clasificar por sistema
            let sys = 'Sol';
            if (p.sector && p.sector.includes('TRAPPIST')) sys = 'TRAPPIST';
            if (p.sector && p.sector.includes('Kepler')) sys = 'Kepler';
            if (rec.pivot) systemGroups[sys].push(rec.pivot);
            if (rec.orb) systemGroups[sys].push(rec.orb);
            if (rec.group) systemGroups[sys].push(rec.group);
        } catch (e) { console.warn('[YoRHa] P-Err:', k, e); }
    }

    loadState.data = true;
    sync();

    /* ── 4. HUD INIT ──────────────────────────────────────────── */
    initTelemetry();

    const tit = document.getElementById('intro-title');
    initPlanetHub({
        camera, controls, canvas, planets, activeMshes,
        vignettePass, bloom, titleEl: tit
    });

    const btnInt = document.getElementById('btn-toggle-interaction');
    initAutopilot({
        planets,
        enterDetailMode,
        isDetailed,
        btnInteraction: btnInt,
        btnReturn: document.getElementById('btn-return')
    });
    initSystemSelector({ systemGroups, camera, controls, scene });

    // ── NEW: Orbital Trails ──
    const orbitalTrails = buildOrbitalTrails(planets, scene);

    // ── NEW: Comets ──
    const comets = buildComets(scene);

    // ── NEW: Keyboard Shortcuts ──
    initKeyboard({
        renderer, scene, camera
    });

    // ── NEW: Tutorial (first visit only) ──
    initTutorial();

    // ── NEW: NASA Live Feed ──
    initNasaFeed();

    // ── NEW: Ambient Info (papers & facts) ──
    initAmbientInfo();

    // Audio
    initSynthWindows();
    attachUISounds();

    /* ── 5. INTERACCIÓN ───────────────────────────────────────── */
    let interactive = false;
    window.__interactive = false;

    const btnReturnHub = document.getElementById('btn-return-hub');

    // ── NEW: Physics Panel Toggle ──
    const btnPhysics = document.getElementById('btn-physics');
    const physicsPanel = document.getElementById('physics-panel');
    const btnClosePhysics = document.getElementById('btn-close-physics');

    if (btnPhysics && physicsPanel && btnClosePhysics) {
        btnPhysics.onclick = () => {
            if (typeof window.playBeep === 'function') window.playBeep(1200, 'square', 0.1, 0.03);
            physicsPanel.classList.add('active');
        };
        btnClosePhysics.onclick = () => {
            if (typeof window.playBeep === 'function') window.playBeep(800, 'triangle', 0.1, 0.03);
            physicsPanel.classList.remove('active');
        };
    }

    if (btnInt) btnInt.onclick = () => {
        if (typeof window.playBeep === 'function') window.playBeep(1000, 'square', 0.1, 0.03);
        if (!interactive) {
            interactive = true;
            window.__interactive = true;
            
            // Ocultar UI
            document.getElementById('navbar').style.display = 'none';
            document.getElementById('footer').style.display = 'none';
            document.getElementById('intro-title').style.display = 'none';
            hideAmbientInfo();
            hideNavArrows();

            // Cambiar Botones
            btnInt.style.display = 'none';
            if (btnReturnHub) btnReturnHub.style.display = 'block';

            gsap.to(camera.position, {
                duration: 2.5, x: 0, y: 150, z: 400, ease: 'power3.inOut',
                onComplete: () => { controls.enabled = true; controls.autoRotate = false; }
            });
        }
    };

    if (btnReturnHub) btnReturnHub.onclick = () => {
        if (typeof window.playBeep === 'function') window.playBeep(800, 'triangle', 0.1, 0.03);
        if (interactive) {
            interactive = false;
            window.__interactive = false;
            
            // Restaurar UI
            document.getElementById('navbar').style.display = 'flex';
            document.getElementById('footer').style.display = 'flex';
            document.getElementById('intro-title').style.display = 'flex';
            showAmbientInfo();
            
            // Cambiar Botones
            btnInt.style.display = 'block';
            btnReturnHub.style.display = 'none';

            controls.enabled = false;
            controls.autoRotate = true;

            gsap.to(camera.position, { duration: 2.5, x: 0, y: 350, z: 900, ease: 'power3.inOut' });
        }
    };

    // Ocultar al iniciar si no está interactivo
    hideNavArrows();

    // Raycasting
    const rc = new THREE.Raycaster();
    const ptr = new THREE.Vector2();
    canvas.addEventListener('click', (e) => {
        if (window.__autopilotActive) {
            const btnAuto = document.getElementById('btn-autopilot');
            if (btnAuto) btnAuto.click();
        }
        if (!window.__interactive || isDetailed()) return;
        ptr.x = (e.clientX / window.innerWidth) * 2 - 1;
        ptr.y = -(e.clientY / window.innerHeight) * 2 + 1;
        rc.setFromCamera(ptr, camera);
        const hits = rc.intersectObjects(activeMshes);
        if (hits.length > 0) enterDetailMode(hits[0].object.userData);
    });

    /* ── 6. TIME CONTROLS ELIMINADOS ── */
    let timescale = 1.0, paused = false;

    // Era modals
    window.openEraModal = (e) => {
        if (typeof window.playBeep === 'function') window.playBeep(1400, 'triangle', 0.08, 0.03);
        const m = document.getElementById('era-info-modal');
        if (!m) return;
        const title = document.getElementById('era-modal-title');
        const desc = document.getElementById('era-modal-desc');
        const dur = document.getElementById('era-modal-duration');
        if (title) title.textContent = e.name || '';
        if (desc) desc.textContent = e.ext || e.desc || '';
        if (dur) dur.textContent = e.duration || '';
        m.classList.add('active');
    };
    window.closeEraModal = () => {
        if (typeof window.playBeep === 'function') window.playBeep(800, 'triangle', 0.05, 0.03);
        const m = document.getElementById('era-info-modal');
        if (m) m.classList.remove('active');
    };

    attachResizeHandler(camera, renderer, composer);

    /* ── 7. ANIMATION LOOP ────────────────────────────────────── */
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        const dt = clock.getDelta();
        const time = clock.getElapsedTime();

        // Film grain
        filmPass.uniforms.time.value += 0.01;

        // Planetas — órbita, rotación, shaders
        for (const k in planets) {
            const rec = planets[k];
            const { pMesh, targetGrp, pData, atmosphere } = rec;

            // Rotación propia
            if (pMesh && pData.rotSpeed) pMesh.rotation.y += pData.rotSpeed * timescale;
            if (pData.cloudMesh) pData.cloudMesh.rotation.y += (pData.rotSpeed || 0) * 1.5 * timescale;
            if (pData.satelliteGroup && !paused) pData.satelliteGroup.rotation.y += 0.02 * timescale;

            // Mecánica orbital Kepleriana
            if (!paused && pData.orbRadius > 0) {
                if (pData.meanAnomaly === undefined) pData.meanAnomaly = pData.orbAngle || 0;
                pData.meanAnomaly -= (pData.orbSpeed || 0) * timescale;
                let E = pData.meanAnomaly;
                const ecc = pData.e || 0;
                for (let i = 0; i < 5; i++) {
                    E = E - (E - ecc * Math.sin(E) - pData.meanAnomaly) / (1 - ecc * Math.cos(E));
                }
                const a = pData.orbRadius;
                const b = a * Math.sqrt(1 - ecc * ecc);
                if (targetGrp) targetGrp.position.set(a * Math.cos(E) - a * ecc, 0, b * Math.sin(E));
            }

            // Shader updates
            if (atmosphere) updateAtmosphereTime(atmosphere, dt);
            if (rec.telemetryRings) updateTelemetryRings(rec.telemetryRings, time, pData);

            // Sol: corona + lens flare
            if (pData.isStar && rec.group) updateSunEffects(rec.group, time, camera);
        }

        // Scene-level animations
        animateStarfield(starLayers, Date.now());
        animateNebulas(nebulas, Date.now());
        animateConstellations(constels, timescale);
        if (belt) belt.rotation.y += 0.0002 * timescale;

        // Cámara sigue al planeta si está en modo detalle
        if (!paused && !isTransitioning()) followTargetMesh();

        controls.update();

        // ── NEW: Orbital trails breathing ──
        animateOrbitalTrails(orbitalTrails, time);

        // ── NEW: Comets ──
        animateComets();

        composer.render();
    }

    animate();
})();
