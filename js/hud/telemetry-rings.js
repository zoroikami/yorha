/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  HUD / Telemetry Rings — Anillos 3D con datos flotantes       ║
 * ║  3 anillos concéntricos rotando a distinta velocidad con      ║
 * ║  texto SVG (LAT / LON / TEMP / ATM_PRESS) fluctuante.         ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

function makeRingTexture(labels, color = '#ffd966', accent = '#ffeeaa') {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Marcas tick
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 64; i++) {
        const x = (i / 64) * canvas.width;
        const tall = i % 8 === 0;
        ctx.beginPath();
        ctx.moveTo(x, tall ? 10 : 40);
        ctx.lineTo(x, tall ? 118 : 88);
        ctx.stroke();
    }

    // Texto labels
    ctx.fillStyle = accent;
    ctx.font = 'bold 38px "Courier New", monospace';
    ctx.textBaseline = 'middle';
    const segment = canvas.width / labels.length;
    labels.forEach((lbl, i) => {
        ctx.fillText(lbl, i * segment + 40, 64);
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.needsUpdate = true;
    return { texture: tex, canvas, ctx, accent, color, labels };
}

export function buildTelemetryRings(planetRadius, color = 0xffd966) {
    const group = new THREE.Group();
    group.name = 'telemetry-rings';
    group.visible = false;

    const ringConfigs = [
        {
            radius: planetRadius * 1.55,
            width: planetRadius * 0.08,
            tilt: 0.1,
            speed: 0.004,
            labels: ['LAT  0.0000', 'LON  0.0000', 'ALT  0.000 KM', 'ORB  STABLE', 'SIG  100%', 'LAT  0.0000', 'LON  0.0000', 'ALT  0.000 KM'],
            axis: 'y'
        },
        {
            radius: planetRadius * 1.85,
            width: planetRadius * 0.06,
            tilt: -0.4,
            speed: -0.0025,
            labels: ['TEMP  0.0C', 'ATM  0.000 ATM', 'MAG  0.0 uT', 'GRAV  0.00g', 'TEMP  0.0C', 'ATM  0.000 ATM', 'MAG  0.0 uT', 'GRAV  0.00g'],
            axis: 'x'
        },
        {
            radius: planetRadius * 2.15,
            width: planetRadius * 0.05,
            tilt: 0.7,
            speed: 0.0015,
            labels: ['YORHA_SCAN_ACTIVE', 'DATA_LINK_OK', 'BUFFER  12%', 'CRC  00000000', 'YORHA_SCAN_ACTIVE', 'DATA_LINK_OK', 'BUFFER  12%', 'CRC  00000000'],
            axis: 'z'
        }
    ];

    const ringRecords = [];

    ringConfigs.forEach((cfg) => {
        const { texture, canvas, ctx, accent, color: strokeColor, labels } = makeRingTexture(cfg.labels, '#' + color.toString(16).padStart(6, '0'));

        const geom = new THREE.RingGeometry(cfg.radius, cfg.radius + cfg.width, 128, 1);
        // ajustar UVs para que la textura se envuelva alrededor del anillo
        const uv = geom.attributes.uv;
        const pos = geom.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i), y = pos.getY(i);
            const angle = Math.atan2(y, x);
            const r = Math.sqrt(x * x + y * y);
            const norm = (r - cfg.radius) / cfg.width;
            uv.setXY(i, (angle + Math.PI) / (Math.PI * 2) * 4, norm);
        }

        const mat = new THREE.MeshBasicMaterial({
            map: texture,
            color: 0xffffff,
            transparent: true,
            opacity: 0.0,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const mesh = new THREE.Mesh(geom, mat);

        // Orientación base: plano XY a plano horizontal
        if (cfg.axis === 'y') mesh.rotation.x = Math.PI / 2 + cfg.tilt;
        if (cfg.axis === 'x') mesh.rotation.y = cfg.tilt;
        if (cfg.axis === 'z') { mesh.rotation.x = cfg.tilt; mesh.rotation.z = Math.PI / 4; }

        mesh.userData = { speed: cfg.speed, axis: cfg.axis, ctx, canvas, texture, labels };
        group.add(mesh);
        ringRecords.push(mesh);
    });

    return group;
}

export function setTelemetryRingsActive(group, active) {
    if (!group) return;
    group.visible = true;
    const target = active ? 0.8 : 0.0;
    group.children.forEach(mesh => {
        if (typeof gsap !== 'undefined') {
            gsap.to(mesh.material, {
                opacity: target,
                duration: 0.7,
                ease: 'power2.inOut',
                onComplete: () => { if (!active) group.visible = false; }
            });
        } else {
            mesh.material.opacity = target;
            if (!active) group.visible = false;
        }
    });
}

export function updateTelemetryRings(group, time, planetData) {
    if (!group || !group.visible) return;
    group.children.forEach((mesh, idx) => {
        mesh.rotation.z += mesh.userData.speed;

        // Actualizar texto cada 300ms (redibujo canvas)
        if (!mesh.userData.nextUpdate) mesh.userData.nextUpdate = 0;
        if (time > mesh.userData.nextUpdate) {
            mesh.userData.nextUpdate = time + 0.3;
            const { ctx, canvas, texture } = mesh.userData;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Redibujar ticks
            ctx.strokeStyle = '#ffd966';
            ctx.lineWidth = 1.5;
            for (let i = 0; i < 64; i++) {
                const x = (i / 64) * canvas.width;
                const tall = i % 8 === 0;
                ctx.beginPath();
                ctx.moveTo(x, tall ? 10 : 40);
                ctx.lineTo(x, tall ? 118 : 88);
                ctx.stroke();
            }

            // Texto dinámico según anillo
            ctx.fillStyle = '#ffeeaa';
            ctx.font = 'bold 36px "Courier New", monospace';
            ctx.textBaseline = 'middle';
            const segment = canvas.width / 8;
            const t = time;
            let dynLabels;
            if (idx === 0) {
                dynLabels = [
                    `LAT ${(Math.sin(t * 0.7) * 89.9).toFixed(4)}`,
                    `LON ${(Math.cos(t * 0.5) * 179.9).toFixed(4)}`,
                    `ALT ${(380 + Math.sin(t) * 4).toFixed(3)}KM`,
                    `ORB  STABLE`,
                    `SIG ${(95 + Math.sin(t * 3) * 4).toFixed(1)}%`,
                    `LAT ${(Math.sin(t * 0.7 + 1) * 89.9).toFixed(4)}`,
                    `LON ${(Math.cos(t * 0.5 + 1) * 179.9).toFixed(4)}`,
                    `ALT ${(380 + Math.sin(t + 1) * 4).toFixed(3)}KM`
                ];
            } else if (idx === 1) {
                dynLabels = [
                    `TEMP ${(15 + Math.sin(t * 0.4) * 3).toFixed(2)}C`,
                    `ATM  ${(1.000 + Math.sin(t * 0.6) * 0.02).toFixed(4)}ATM`,
                    `MAG  ${(24 + Math.sin(t * 0.9) * 2).toFixed(2)}uT`,
                    `GRAV ${(9.81 + Math.sin(t * 0.3) * 0.02).toFixed(4)}g`,
                    `TEMP ${(15 + Math.sin(t * 0.4 + 2) * 3).toFixed(2)}C`,
                    `ATM  ${(1.000 + Math.sin(t * 0.6 + 2) * 0.02).toFixed(4)}ATM`,
                    `MAG  ${(24 + Math.sin(t * 0.9 + 2) * 2).toFixed(2)}uT`,
                    `GRAV ${(9.81 + Math.sin(t * 0.3 + 2) * 0.02).toFixed(4)}g`
                ];
            } else {
                const crc = Math.floor((Math.sin(t * 0.1) * 0.5 + 0.5) * 0xffffffff).toString(16).padStart(8, '0').toUpperCase();
                const buf = Math.floor(10 + Math.abs(Math.sin(t * 0.2)) * 85);
                dynLabels = [
                    'YORHA_SCAN_ACTIVE',
                    'DATA_LINK_OK',
                    `BUFFER  ${buf}%`,
                    `CRC ${crc}`,
                    'YORHA_SCAN_ACTIVE',
                    'DATA_LINK_OK',
                    `BUFFER  ${buf}%`,
                    `CRC ${crc}`
                ];
            }
            dynLabels.forEach((lbl, i) => {
                ctx.fillText(lbl, i * segment + 20, 64);
            });
            texture.needsUpdate = true;
        }
    });
}
