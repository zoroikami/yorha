/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  Scene / Lighting — Iluminación cinematográfica del sistema   ║
 * ║  Contraste dramático tipo "fotografía espacial real"          ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */
import { ENGINE } from '../config.js';

export function setupLighting(scene) {
    // Luz ambiental ultra-sutil (contraste dramático día/noche)
    scene.add(new THREE.AmbientLight(0x223344, 0.18));

    // Hemisférica muy baja — aporta azul sutil al "espacio profundo"
    scene.add(new THREE.HemisphereLight(0x1a2340, 0x0a0a14, 0.22));

    // Sol — luz direccional puntual con sombras ultra-definidas
    const sun = new THREE.PointLight(0xfff0cc, 2.4, 0, 1.0);
    sun.name = 'sun-light';
    sun.castShadow = true;
    sun.shadow.mapSize.width = ENGINE.shadowMapSize;
    sun.shadow.mapSize.height = ENGINE.shadowMapSize;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 2000;
    sun.shadow.bias = -0.0004;
    sun.shadow.radius = 2;
    scene.add(sun);

    // Luz de relleno desde atrás (rim light) — separa planetas del fondo
    const rim = new THREE.DirectionalLight(0x4466aa, 0.12);
    rim.position.set(-300, 100, -400);
    scene.add(rim);

    return { sun, rim };
}
