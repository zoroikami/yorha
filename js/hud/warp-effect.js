/**
 * ╔═══════════════════════════════════════════════════╗
 * ║  Warp Effect — Transición FTL entre sistemas      ║
 * ║  Feature 1.12: Star-stretch visual al navegar     ║
 * ╚═══════════════════════════════════════════════════╝
 */

let _canvas, _ctx;
let _active = false;
let _stars = [];
let _progress = 0;
let _animId = null;

const WARP_STAR_COUNT = 200;
const WARP_DURATION = 1800; // ms

function initCanvas() {
    _canvas = document.getElementById('warp-canvas');
    if (!_canvas) return false;
    _ctx = _canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    return true;
}

function resize() {
    if (!_canvas) return;
    _canvas.width = window.innerWidth;
    _canvas.height = window.innerHeight;
}

function generateStars() {
    _stars = [];
    const cx = _canvas.width / 2;
    const cy = _canvas.height / 2;

    for (let i = 0; i < WARP_STAR_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist  = 20 + Math.random() * 80;
        _stars.push({
            angle,
            dist,
            speed: 2 + Math.random() * 6,
            x: cx + Math.cos(angle) * dist,
            y: cy + Math.sin(angle) * dist,
            brightness: 0.3 + Math.random() * 0.7,
            isGold: Math.random() < 0.2
        });
    }
}

function drawFrame(timestamp) {
    if (!_active) return;

    const cx = _canvas.width / 2;
    const cy = _canvas.height / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);

    // Fade background
    _ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    _ctx.fillRect(0, 0, _canvas.width, _canvas.height);

    // Acceleration curve
    const accel = 1 + _progress * 8;

    _stars.forEach(s => {
        const prevX = s.x;
        const prevY = s.y;

        s.dist += s.speed * accel;
        s.x = cx + Math.cos(s.angle) * s.dist;
        s.y = cy + Math.sin(s.angle) * s.dist;

        // Draw streak line
        const alpha = s.brightness * (1 - _progress * 0.3);
        const width = 0.5 + _progress * 2.5;

        _ctx.beginPath();
        _ctx.moveTo(prevX, prevY);
        _ctx.lineTo(s.x, s.y);

        if (s.isGold) {
            _ctx.strokeStyle = `rgba(197, 163, 88, ${alpha})`;
        } else {
            _ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        }
        _ctx.lineWidth = width;
        _ctx.stroke();

        // Reset if off screen
        if (s.dist > maxDist) {
            s.dist = 5 + Math.random() * 30;
            s.x = cx + Math.cos(s.angle) * s.dist;
            s.y = cy + Math.sin(s.angle) * s.dist;
        }
    });

    // Center flash at peak
    if (_progress > 0.6) {
        const flashAlpha = (_progress - 0.6) * 2.5;
        const grad = _ctx.createRadialGradient(cx, cy, 0, cx, cy, maxDist * 0.4);
        grad.addColorStop(0, `rgba(197, 163, 88, ${flashAlpha * 0.3})`);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        _ctx.fillStyle = grad;
        _ctx.fillRect(0, 0, _canvas.width, _canvas.height);
    }

    _animId = requestAnimationFrame(drawFrame);
}

export function triggerWarp(onMidpoint) {
    if (!_canvas && !initCanvas()) return;
    if (_active) return;

    _active = true;
    _progress = 0;
    _canvas.style.opacity = '1';
    _canvas.style.display = 'block';

    generateStars();

    const startTime = performance.now();
    const midFired = { done: false };

    function tick() {
        const elapsed = performance.now() - startTime;
        _progress = Math.min(1, elapsed / WARP_DURATION);

        // Fire midpoint callback at 50%
        if (_progress >= 0.45 && !midFired.done) {
            midFired.done = true;
            if (onMidpoint) onMidpoint();
        }

        if (_progress >= 1) {
            // Fade out
            _canvas.style.transition = 'opacity 0.6s ease';
            _canvas.style.opacity = '0';
            setTimeout(() => {
                _active = false;
                _canvas.style.display = 'none';
                _canvas.style.transition = '';
                if (_animId) cancelAnimationFrame(_animId);
                _ctx.clearRect(0, 0, _canvas.width, _canvas.height);
            }, 600);
            return;
        }

        requestAnimationFrame(tick);
    }

    drawFrame();
    tick();

    // Play warp sound if available
    if (typeof window.playWarp === 'function') window.playWarp();
}
