/**
 * ╔═══════════════════════════════════════════════════╗
 * ║  Orbital Trails — Líneas punteadas de órbitas     ║
 * ║  Feature 1.7: Trails orbitales elegantes          ║
 * ╚═══════════════════════════════════════════════════╝
 */

export function buildOrbitalTrails(planets, scene, precomputedOrbits = null) {
    const trails = [];

    for (const key in planets) {
        const rec = planets[key];
        const p = rec.pData;
        if (p.isStar || !p.orbRadius || p.orbRadius <= 0) continue;

        let points = [];
        
        // Use Python precomputed orbits if available
        if (precomputedOrbits && precomputedOrbits.orbits && precomputedOrbits.orbits[key]) {
            const orbitData = precomputedOrbits.orbits[key];
            if (orbitData.positions && orbitData.positions.length > 0) {
                points = orbitData.positions.map(pos => new THREE.Vector3(pos.x, 0, pos.z));
            }
        }
        
        // Fallback to basic math if no precomputed data
        if (points.length === 0) {
            const a   = p.orbRadius;
            const ecc = p.e || 0;
            const b   = a * Math.sqrt(1 - ecc * ecc);

            const segments = 180;
            for (let i = 0; i <= segments; i++) {
                const theta = (i / segments) * Math.PI * 2;
                points.push(new THREE.Vector3(
                    a * Math.cos(theta) - a * ecc,
                    0,
                    b * Math.sin(theta)
                ));
            }
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineDashedMaterial({
            color: 0xc5a358,
            dashSize: 4,
            gapSize: 6,
            opacity: 0.12,
            transparent: true,
            depthWrite: false
        });

        const line = new THREE.Line(geometry, material);
        line.computeLineDistances();
        line.userData.planetKey = key;
        scene.add(line);
        trails.push(line);
    }

    return trails;
}

export function animateOrbitalTrails(trails, time) {
    trails.forEach(line => {
        // Subtle breathing opacity
        line.material.opacity = 0.08 + Math.sin(time * 0.5) * 0.04;
    });
}
