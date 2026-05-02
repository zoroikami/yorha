/**
 * ╔═══════════════════════════════════════════════════╗
 * ║  Minimap — Vista cenital 2D del sistema actual    ║
 * ║  Feature 5.1: Mini-mapa orbital en esquina        ║
 * ╚═══════════════════════════════════════════════════╝
 */

let _canvas, _ctx;
let _planets = {};
let _camera = null;
let _visible = true;
const SIZE = 180;
const PADDING = 12;

export function initMinimap(planets, camera) {
    _planets = planets;
    _camera  = camera;

    _canvas = document.getElementById('minimap-canvas');
    if (!_canvas) return;
    _canvas.width  = SIZE;
    _canvas.height = SIZE;
    _ctx = _canvas.getContext('2d');
}

export function toggleMinimap() {
    _visible = !_visible;
    const container = document.getElementById('minimap-container');
    if (container) container.style.opacity = _visible ? '1' : '0';
}

export function updateMinimap() {
    if (!_ctx || !_visible) return;

    const cx = SIZE / 2;
    const cy = SIZE / 2;

    // Clear
    _ctx.clearRect(0, 0, SIZE, SIZE);

    // Background
    _ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    _ctx.beginPath();
    _ctx.arc(cx, cy, SIZE / 2 - 2, 0, Math.PI * 2);
    _ctx.fill();

    // Border
    _ctx.strokeStyle = 'rgba(197, 163, 88, 0.3)';
    _ctx.lineWidth = 1;
    _ctx.stroke();

    // Find scale — max orbit radius
    let maxR = 0;
    for (const key in _planets) {
        const p = _planets[key].pData;
        if (!p.isStar && p.orbRadius > maxR) maxR = p.orbRadius;
    }
    if (maxR === 0) maxR = 500;
    const scale = (SIZE / 2 - PADDING) / maxR;

    // Draw orbits and planets
    for (const key in _planets) {
        const rec = _planets[key];
        const p   = rec.pData;

        if (p.isStar) {
            // Draw star at center
            _ctx.beginPath();
            _ctx.arc(cx, cy, 4, 0, Math.PI * 2);
            _ctx.fillStyle = '#fcd34d';
            _ctx.fill();
            _ctx.shadowColor = '#fcd34d';
            _ctx.shadowBlur = 8;
            _ctx.fill();
            _ctx.shadowBlur = 0;
            continue;
        }

        if (!p.orbRadius || p.orbRadius <= 0) continue;

        const a   = p.orbRadius * scale;
        const ecc = p.e || 0;
        const b   = a * Math.sqrt(1 - ecc * ecc);

        // Draw orbit ellipse
        _ctx.beginPath();
        _ctx.ellipse(cx - a * ecc, cy, a, b, 0, 0, Math.PI * 2);
        _ctx.strokeStyle = 'rgba(197, 163, 88, 0.12)';
        _ctx.lineWidth = 0.5;
        _ctx.stroke();

        // Get planet position from 3D scene
        if (rec.targetGrp) {
            const worldPos = new THREE.Vector3();
            rec.targetGrp.getWorldPosition(worldPos);
            const px = cx + worldPos.x * scale;
            const py = cy + worldPos.z * scale;

            // Planet dot
            const dotSize = Math.max(1.5, Math.min(3, p.radius * 0.3));
            _ctx.beginPath();
            _ctx.arc(px, py, dotSize, 0, Math.PI * 2);
            _ctx.fillStyle = p.color || '#c5a358';
            _ctx.fill();
        }
    }

    // Camera position indicator
    if (_camera) {
        const camX = cx + _camera.position.x * scale;
        const camZ = cy + _camera.position.z * scale;

        // Only draw if within bounds
        if (camX > 0 && camX < SIZE && camZ > 0 && camZ < SIZE) {
            _ctx.beginPath();
            _ctx.arc(camX, camZ, 2, 0, Math.PI * 2);
            _ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            _ctx.fill();

            // FOV cone
            const camAngle = Math.atan2(
                -_camera.position.x,
                -_camera.position.z
            );
            const fovHalf = 0.3;
            _ctx.beginPath();
            _ctx.moveTo(camX, camZ);
            _ctx.lineTo(
                camX + Math.sin(camAngle - fovHalf) * 15,
                camZ + Math.cos(camAngle - fovHalf) * 15
            );
            _ctx.lineTo(
                camX + Math.sin(camAngle + fovHalf) * 15,
                camZ + Math.cos(camAngle + fovHalf) * 15
            );
            _ctx.closePath();
            _ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
            _ctx.fill();
            _ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            _ctx.lineWidth = 0.5;
            _ctx.stroke();
        }
    }
}
