/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  Scene / Constellation Builder                                ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

function createGlowTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'white');
    g.addColorStop(0.4, 'rgba(100,160,255,0.4)');
    g.addColorStop(1, 'transparent');
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
}

function toXYZ(ra, dec, r) {
    if (ra === undefined || dec === undefined) return new THREE.Vector3();
    const p = (90 - dec) * (Math.PI / 180);
    const t = ra * (Math.PI / 180);
    return new THREE.Vector3(
        r * Math.sin(p) * Math.cos(t),
        r * Math.cos(p),
        r * Math.sin(p) * Math.sin(t)
    );
}

export function buildConstellations(constellationsData, scene) {
    const glow = createGlowTexture();
    const constels = [];
    const activeMeshes = [];

    for (const k in constellationsData) {
        try {
            const c = constellationsData[k];
            if (!c.stars || c.stars.length === 0) continue;
            const group = new THREE.Group();
            const r = c.coord.radius;

            c.stars.forEach(s => {
                const sp = new THREE.Sprite(new THREE.SpriteMaterial({
                    map: glow,
                    transparent: true,
                    opacity: 0.4,
                    blending: THREE.AdditiveBlending
                }));
                sp.position.copy(toXYZ(s.ra, s.dec, r));
                const size = Math.max(7, (5 - s.mag) * 8);
                sp.scale.set(size, size, 1);
                group.add(sp);
            });

            const linePts = [];
            c.shape_lines.forEach(pair => {
                if (c.stars[pair[0]] && c.stars[pair[1]]) {
                    const v1 = toXYZ(c.stars[pair[0]].ra, c.stars[pair[0]].dec, r);
                    const v2 = toXYZ(c.stars[pair[1]].ra, c.stars[pair[1]].dec, r);
                    linePts.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
                }
            });

            const tColor = c.theme || '#ffffff';
            const tsColor = c.themeSec || '#444444';
            group.add(new THREE.LineSegments(
                new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(linePts, 3)),
                new THREE.LineBasicMaterial({
                    color: parseInt(tColor.slice(1), 16),
                    transparent: true,
                    opacity: 0.22
                })
            ));

            const centerPos = toXYZ(c.stars[0].ra, c.stars[0].dec, r);
            const beacon = new THREE.Mesh(
                new THREE.OctahedronGeometry(12, 0),
                new THREE.MeshBasicMaterial({
                    color: parseInt(tsColor.slice(1), 16),
                    wireframe: true,
                    transparent: true,
                    opacity: 0.8
                })
            );
            beacon.position.copy(centerPos);
            scene.add(group);
            scene.add(beacon);
            constels.push({ b: beacon, g: group });

            const pickMesh = new THREE.Mesh(
                new THREE.SphereGeometry(350, 8, 8),
                new THREE.MeshBasicMaterial({ visible: false })
            );
            pickMesh.position.copy(centerPos);
            pickMesh.userData = { ...c, isConstellation: true };
            scene.add(pickMesh);
            activeMeshes.push(pickMesh);
        } catch (e) {
            console.warn('[YoRHa] Constellation error:', k, e);
        }
    }

    return { constels, activeMeshes };
}

export function animateConstellations(constels, timescale = 1.0) {
    const rMat = new THREE.Matrix4().makeRotationY(0.000025 * timescale);
    constels.forEach(c => {
        c.b.position.applyMatrix4(rMat);
        c.g.position.applyMatrix4(rMat);
        c.b.rotation.y += 0.01;
    });
}
