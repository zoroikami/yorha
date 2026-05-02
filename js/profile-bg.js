/**
 * YorHa — Profile Background
 * Un renderizado ligero y estético del espacio (sin HUD ni lógicas pesadas)
 */

import { createRenderer, createCamera, attachResizeHandler } from './engine/renderer.js';
import { createComposer } from './engine/composer.js';
import { setupLighting } from './scene/lighting.js';
import { buildStarfield, animateStarfield, loadMilkyWayBackground } from './scene/stars.js';
import { buildNebulas, animateNebulas } from './scene/nebulas.js';
import { buildAsteroidBelt } from './scene/asteroid-belt.js';

(function () {
    const canvas = document.getElementById('three-canvas');
    if (!canvas) return;

    // 1. Motor Básico
    const renderer = createRenderer(canvas);
    const camera = createCamera();
    const scene = new THREE.Scene();
    
    // El composer de postprocesado para bloom y vignette
    const { composer, filmPass } = createComposer(renderer, scene, camera);

    // 2. Escena Estética
    setupLighting(scene);
    loadMilkyWayBackground(scene);
    const starLayers = buildStarfield(scene);
    const nebulas = buildNebulas(scene);
    const belt = buildAsteroidBelt(scene);
    
    if (belt) {
        belt.position.set(0, -50, 0); // Bajar un poco para que se vea de fondo
        belt.scale.set(0.5, 0.5, 0.5); 
    }

    // Posición inicial de cámara (vista panorámica lejana)
    camera.position.set(0, 100, 300);
    camera.lookAt(0, 0, 0);

    attachResizeHandler(camera, renderer, composer);

    // 3. Animación Suave (sin controles)
    const clock = new THREE.Clock();
    let timeAngle = 0;

    function animate() {
        requestAnimationFrame(animate);
        const time = clock.getElapsedTime();
        const now = Date.now();

        // Rotar cámara lentamente en órbita alrededor del centro
        timeAngle += 0.0005;
        camera.position.x = Math.cos(timeAngle) * 300;
        camera.position.z = Math.sin(timeAngle) * 300;
        camera.lookAt(0, 0, 0);

        // Actualizar efectos de polvo cósmico y nebulosas
        if (filmPass) filmPass.uniforms.time.value += 0.01;
        animateStarfield(starLayers, now);
        animateNebulas(nebulas, now);
        
        if (belt) belt.rotation.y += 0.0002;

        composer.render();
    }

    animate();
})();
