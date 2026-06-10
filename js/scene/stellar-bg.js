/**
 * Vynas — Stellar Background (Dynamic 2D Constellation Canvas)
 * Unifica las portadas de Vynas (index.html y login.html) con un fondo estelar
 * interactivo, elegante, de altísimo rendimiento y libre del peso de motores 3D masivos.
 */
(function () {
    const canvas = document.getElementById('particles-canvas') || document.getElementById('stardust-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let particles = [];
    const maxParticles = 90;
    const connectionDist = 100;
    let mouse = { x: null, y: null, radius: 150 };

    // Ajustar dimensiones del canvas
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // Rastrear movimiento del ratón
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    window.addEventListener('mouseleave', () => {
        mouse.x = null;
        mouse.y = null;
    });

    class Particle {
        constructor() {
            this.reset(true);
        }

        reset(initial = false) {
            this.x = Math.random() * canvas.width;
            this.y = initial ? Math.random() * canvas.height : canvas.height + 10;
            this.size = Math.random() * 1.5 + 0.4;
            this.speedY = -(Math.random() * 0.4 + 0.1);
            this.speedX = (Math.random() - 0.5) * 0.3;
            this.opacity = Math.random() * 0.5 + 0.1;
            this.pulse = Math.random() * Math.PI * 2;
            this.pulseSpeed = Math.random() * 0.02 + 0.005;
            this.isGold = Math.random() < 0.18; // 18% estrellas doradas
        }

        update() {
            this.y += this.speedY;
            this.x += this.speedX;
            this.pulse += this.pulseSpeed;

            // Variar opacidad sutilmente (efecto titileo)
            this.currentOpacity = this.opacity + Math.sin(this.pulse) * 0.08;
            this.currentOpacity = Math.max(0.05, Math.min(0.7, this.currentOpacity));

            // Interacción magnética suave con el cursor
            if (mouse.x !== null && mouse.y !== null) {
                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                const distance = Math.hypot(dx, dy);

                if (distance < mouse.radius) {
                    const force = (mouse.radius - distance) / mouse.radius;
                    // Atracción suave
                    this.x += dx * force * 0.02;
                    this.y += dy * force * 0.02;
                }
            }

            // Reiniciar estrella si sale de la pantalla
            if (this.y < -10 || this.x < -10 || this.x > canvas.width + 10) {
                this.reset(false);
            }
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            
            if (this.isGold) {
                ctx.fillStyle = `rgba(197, 163, 88, ${this.currentOpacity})`;
                ctx.shadowColor = 'rgba(197, 163, 88, 0.4)';
                ctx.shadowBlur = 5;
            } else {
                ctx.fillStyle = `rgba(255, 255, 255, ${this.currentOpacity})`;
                ctx.shadowColor = 'rgba(255, 255, 255, 0.2)';
                ctx.shadowBlur = 3;
            }
            
            ctx.fill();
            ctx.shadowBlur = 0; // Resetear blur para rendimiento
        }
    }

    // Inicializar estrellas
    for (let i = 0; i < maxParticles; i++) {
        particles.push(new Particle());
    }

    // Dibujar líneas finas de constelación entre estrellas cercanas (sin accesos de corchetes)
    function drawConnections() {
        let index = 0;
        for (const p1 of particles) {
            index++;
            const remaining = particles.slice(index);
            for (const p2 of remaining) {
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const distance = Math.hypot(dx, dy);

                if (distance < connectionDist) {
                    // Calcular opacidad en base a la cercanía
                    const alpha = (1 - distance / connectionDist) * 0.12;
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    
                    // Si alguna es dorada, dar un tinte dorado a la conexión
                    if (p1.isGold || p2.isGold) {
                        ctx.strokeStyle = `rgba(197, 163, 88, ${alpha})`;
                    } else {
                        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
                    }
                    
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
    }

    // Ciclo de animación principal
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach(p => {
            p.update();
            p.draw();
        });

        drawConnections();
        requestAnimationFrame(animate);
    }

    animate();
})();
