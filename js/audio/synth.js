/**
 * Synth — Paisaje sonoro inmersivo via Web Audio API.
 * Dos osciladores graves (sine 55Hz + triangle 110Hz) que alimentan un lowpass.
 * Se modulan según las características del planeta observado.
 *
 * Expone window.modulateSynth, window.playBeep, window.playWarp para
 * compatibilidad con el código que aún depende de globales.
 */

let _ctx = null;
let _humGain = null;
let _osc1 = null;
let _osc2 = null;
let _filter = null;

export function initAudio() {
    if (_ctx) return _ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;

    _ctx = new AC();
    _osc1 = _ctx.createOscillator();
    _osc1.type = 'sine';
    _osc1.frequency.value = 55;

    _osc2 = _ctx.createOscillator();
    _osc2.type = 'triangle';
    _osc2.frequency.value = 110;

    _filter = _ctx.createBiquadFilter();
    _filter.type = 'lowpass';
    _filter.frequency.value = 400;

    _humGain = _ctx.createGain();
    _humGain.gain.value = 0.0;

    _osc1.connect(_filter);
    _osc2.connect(_filter);
    _filter.connect(_humGain);
    _humGain.connect(_ctx.destination);

    _osc1.start();
    _osc2.start();
    _humGain.gain.linearRampToValueAtTime(0.02, _ctx.currentTime + 2.0);

    return _ctx;
}

export function modulateSynth(p) {
    if (!_ctx) return;

    if (!p) {
        _osc1.frequency.exponentialRampToValueAtTime(55, _ctx.currentTime + 2);
        _osc2.frequency.exponentialRampToValueAtTime(110, _ctx.currentTime + 2);
        _filter.frequency.exponentialRampToValueAtTime(400, _ctx.currentTime + 2);
        _humGain.gain.linearRampToValueAtTime(0.02, _ctx.currentTime + 2);
        _osc1.type = 'sine';
        _osc2.type = 'triangle';
        return;
    }

    const isGasGiant = (p.radius || 0) > 5;
    const isStar = !!p.isStar;

    const f1    = isStar ? 40   : (isGasGiant ? 50  : 180);
    const f2    = isStar ? 60   : (isGasGiant ? 75  : 220);
    const fFilt = isStar ? 1200 : (isGasGiant ? 250 : 800);
    const vol   = isStar ? 0.06 : 0.03;

    _osc1.frequency.exponentialRampToValueAtTime(f1, _ctx.currentTime + 1.5);
    _osc2.frequency.exponentialRampToValueAtTime(f2, _ctx.currentTime + 1.5);
    _filter.frequency.exponentialRampToValueAtTime(fFilt, _ctx.currentTime + 1.5);
    _humGain.gain.linearRampToValueAtTime(vol, _ctx.currentTime + 1.5);

    _osc1.type = isGasGiant ? 'triangle' : 'sine';
    _osc2.type = isStar ? 'sawtooth' : 'triangle';
}

export function playBeep(freq = 800, type = 'sine', duration = 0.1, vol = 0.05) {
    if (!_ctx) return;
    const osc = _ctx.createOscillator();
    const gain = _ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, _ctx.currentTime);
    gain.gain.setValueAtTime(vol, _ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, _ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(_ctx.destination);
    osc.start();
    osc.stop(_ctx.currentTime + duration);
}

export function playWarp() {
    if (!_ctx) return;
    const osc = _ctx.createOscillator();
    const gain = _ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, _ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, _ctx.currentTime + 3.0);
    gain.gain.setValueAtTime(0.15, _ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, _ctx.currentTime + 3.0);
    osc.connect(gain);
    gain.connect(_ctx.destination);
    osc.start();
    osc.stop(_ctx.currentTime + 3.0);
}

/**
 * Expone las funciones en window para compatibilidad con código legado.
 * Registra además el bootstrap de audio en el primer click del usuario
 * (requerido por la autoplay policy de los navegadores).
 */
export function initSynthWindows() {
    window.modulateSynth = modulateSynth;
    window.playBeep = playBeep;
    window.playWarp = playWarp;

    document.addEventListener('click', initAudio, { once: true });
}
