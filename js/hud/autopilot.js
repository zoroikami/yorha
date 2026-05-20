/**
 * Autopilot — "MODO WAR ROOM": cicla por todos los planetas cambiando de sistema
 * cuando corresponde. Extraído de dashboard.js líneas 384-423.
 */
import { setSystem, hideNavArrows } from './system-selector.js';

let _timer = null;
let _active = false;
let _ctx = null;

export function initAutopilot(ctx) {
    _ctx = ctx;
    const btnAuto = document.getElementById('btn-autopilot');
    if (!btnAuto) return;

    btnAuto.onclick = () => {
        if (typeof window.playBeep === 'function') window.playBeep(1000, 'square', 0.1, 0.03);

        if (_active) {
            stopAutopilot();
            return;
        }

        Swal.fire({
            title: '¿Iniciar Secuencia War Room?',
            text: "El sistema tomará el control de la navegación y ciclará por todos los cuerpos celestes registrados. ¿Confirmar piloto automático?",
            icon: 'warning',
            showCancelButton: true,
            background: 'rgba(10, 10, 12, 0.95)',
            color: '#fff',
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#333',
            confirmButtonText: 'INICIAR',
            cancelButtonText: 'CANCELAR',
            customClass: {
                popup: 'yorha-swal-popup',
                title: 'yorha-swal-title',
                confirmButton: 'swal2-confirm',
                cancelButton: 'swal2-confirm'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                if (typeof window.playBeep === 'function') window.playBeep(1400, 'triangle', 0.08, 0.03);
                startAutopilot();
            }
        });
    };
}

function setBtnStopState() {
    const btnAuto = document.getElementById('btn-autopilot');
    if (!btnAuto) return;
    btnAuto.textContent = '[ DETENER WAR ROOM ]';
    btnAuto.style.color = '#4ade80';
    btnAuto.style.borderColor = 'rgba(74, 222, 128, 0.5)';
}

function setBtnStartState() {
    const btnAuto = document.getElementById('btn-autopilot');
    if (!btnAuto) return;
    btnAuto.textContent = '[ MODO WAR ROOM ]';
    btnAuto.style.color = '#ef4444';
    btnAuto.style.borderColor = 'rgba(239, 68, 68, 0.5)';
}

function toggleWireframe(scene, state) {
    if (!scene) return;
    scene.traverse((child) => {
        if (child.isMesh && child.material) {
            if (child.userData && child.userData.isStar) return;
            
            if (Array.isArray(child.material)) {
                child.material.forEach(m => { if (m.wireframe !== undefined) m.wireframe = state; });
            } else if (child.material.wireframe !== undefined) {
                child.material.wireframe = state;
            }
        }
    });

    if (state) {
        if (!window.__gridHelper) {
            // Usa global THREE namespace ya que está importado globalmente
            window.__gridHelper = new THREE.GridHelper(2000, 100, 0x00ffff, 0x004444);
            scene.add(window.__gridHelper);
        }
        window.__gridHelper.visible = true;
        const overlay = document.getElementById('cinematic-overlay');
        if (overlay) overlay.style.background = 'rgba(0, 50, 50, 0.2)';
    } else {
        if (window.__gridHelper) window.__gridHelper.visible = false;
        const overlay = document.getElementById('cinematic-overlay');
        if (overlay) overlay.style.background = '';
    }
}

function startAutopilot() {
    if (!_ctx) return;
    const { planets, enterDetailMode, isDetailed, btnInteraction, scene } = _ctx;

    _active = true;
    window.__autopilotActive = true;
    setBtnStopState();
    
    toggleWireframe(scene, true);

    // Si no está en modo interacción, activar
    if (!window.__interactive && btnInteraction) btnInteraction.click();
    hideNavArrows();

    const planetKeys = Object.keys(planets);
    let cIdx = 0;

    const nextAction = () => {
        if (!_active) return;

        if (isDetailed()) {
            const ret = document.getElementById('btn-return');
            if (ret) ret.click();
            _timer = setTimeout(nextAction, 4000);
        } else {
            const pk = planetKeys[cIdx];
            const rec = planets[pk];
            if (rec && rec.pData) {
                const p = rec.pData;

                // Cambiar sistema si corresponde
                let sys = 'Sol';
                if (p.sector && p.sector.includes('TRAPPIST')) sys = 'TRAPPIST';
                if (p.sector && p.sector.includes('Kepler')) sys = 'Kepler';
                setSystem(sys);

                enterDetailMode(p);
                
                // Aplicar efecto táctico (scramble) al título del hub si la función existe
                const hubName = document.getElementById('hub-name');
                if (hubName && typeof window.scrambleText === 'function') {
                    window.scrambleText(hubName, hubName.innerText, 800);
                }
            }
            cIdx = (cIdx + 1) % planetKeys.length;
            _timer = setTimeout(nextAction, 10000);
        }
    };

    _timer = setTimeout(nextAction, 3000);
}

function stopAutopilot() {
    _active = false;
    window.__autopilotActive = false;
    if (_timer) clearTimeout(_timer);
    _timer = null;
    setBtnStartState();
    
    if (_ctx && _ctx.scene) {
        toggleWireframe(_ctx.scene, false);
    }

    if (_ctx && _ctx.isDetailed && _ctx.isDetailed()) {
        const ret = document.getElementById('btn-return');
        if (ret) ret.click();
    }
}

export function isAutopilotActive() {
    return _active;
}
