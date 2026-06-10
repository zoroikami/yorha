import React, { useEffect, useRef } from 'react';

interface User {
  nombre: string;
  email: string;
  foto: string;
  banner: string;
}

interface LandingViewProps {
  onNavigate: (route: 'landing' | 'login' | 'dashboard') => void;
  user: User | null;
}

export const LandingView: React.FC<LandingViewProps> = ({ onNavigate, user }) => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // 1. Custom Cursor Follow
    const handleMouseMove = (e: MouseEvent) => {
      if (cursorRef.current) {
        cursorRef.current.style.left = `${e.clientX}px`;
        cursorRef.current.style.top = `${e.clientY}px`;
      }
    };

    document.addEventListener('mousemove', handleMouseMove);

    // Hover effect for links
    const handleMouseEnter = () => cursorRef.current?.classList.add('hovering');
    const handleMouseLeave = () => cursorRef.current?.classList.remove('hovering');

    const interactiveElements = document.querySelectorAll('a, button, .magnetic-btn');
    interactiveElements.forEach((el) => {
      el.addEventListener('mouseenter', handleMouseEnter);
      el.addEventListener('mouseleave', handleMouseLeave);
    });

    // 2. Video Reverse Loop
    const video = videoRef.current;
    let direction = 1;
    let timeoutId: number;

    const reverseVideo = () => {
      if (video && direction === -1) {
        video.currentTime -= 0.03;
        if (video.currentTime > 0.1) {
          timeoutId = window.setTimeout(reverseVideo, 33);
        } else {
          direction = 1;
          video.play().catch(() => {});
        }
      }
    };

    const handleTimeUpdate = () => {
      if (!video) return;
      if (direction === 1 && video.currentTime >= video.duration - 0.2) {
        direction = -1;
        video.pause();
        reverseVideo();
      }
    };

    if (video) {
      video.addEventListener('timeupdate', handleTimeUpdate);
    }

    // 3. Magnetic Button Effect
    const magneticBtns = document.querySelectorAll('.magnetic-btn');
    const handleBtnMove = (e: Event) => {
      const btn = e.currentTarget as HTMLElement;
      const rect = btn.getBoundingClientRect();
      const me = e as MouseEvent;
      const x = me.clientX - rect.left - rect.width / 2;
      const y = me.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
    };

    const handleBtnLeave = (e: Event) => {
      const btn = e.currentTarget as HTMLElement;
      btn.style.transform = 'translate(0, 0)';
    };

    magneticBtns.forEach((btn) => {
      btn.addEventListener('mousemove', handleBtnMove);
      btn.addEventListener('mouseleave', handleBtnLeave);
    });

    // Cleanup
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timeoutId);
      if (video) {
        video.removeEventListener('timeupdate', handleTimeUpdate);
      }
      magneticBtns.forEach((btn) => {
        btn.removeEventListener('mousemove', handleBtnMove);
        btn.removeEventListener('mouseleave', handleBtnLeave);
      });
    };
  }, []);

  // Simple stellar background rendering in canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const particles: Array<{ x: number; y: number; r: number; d: number; speed: number }> = [];
    const numParticles = 80;

    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.5 + 0.5,
        d: Math.random() * numParticles,
        speed: Math.random() * 0.2 + 0.05,
      });
    }

    const handleResize = () => {
      if (canvas) {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(197, 163, 88, 0.4)'; // Theme gold particles
      ctx.beginPath();
      for (let i = 0; i < numParticles; i++) {
        const p = particles[i];
        ctx.moveTo(p.x, p.y);
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2, true);

        // Update position
        p.y -= p.speed;
        if (p.y < 0) {
          p.y = height;
          p.x = Math.random() * width;
        }
      }
      ctx.fill();
      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="Vynas-body vignette" style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Custom Cursor Overlay */}
      <div id="custom-cursor" ref={cursorRef} aria-hidden="true"></div>

      {/* Partículas Flotantes Canvas */}
      <canvas id="particles-canvas" ref={canvasRef} aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none' }}></canvas>

      {/* Video de Fondo */}
      <video id="saturn-video" ref={videoRef} autoPlay loop muted playsInline className="bg-video" aria-hidden="true" style={{ position: 'fixed', right: 0, bottom: 0, minWidth: '100%', minHeight: '100%', objectFit: 'cover', zIndex: 0, opacity: 0.5 }}>
        <source src="img/tierra.mp4" type="video/mp4" />
      </video>

      {/* Contenido Principal */}
      <main id="main-content" className="hero-main" role="main" style={{ position: 'relative', zIndex: 2 }}>
        <div className="hero-center">
          <h2 className="stagger stagger-1 hero-subtitle font-display">
            Contribución Científica
          </h2>

          <h1 className="stagger stagger-2 font-serif hero-title">
            <span className="shimmer-text">VYNAS</span><br />
            <span className="gradient-flow">PROJECT</span>
          </h1>

          <div className="stagger stagger-3 divider-line" aria-hidden="true"></div>

          <p className="stagger stagger-3 hero-desc">
            Plataforma dedicada a la recolección de datos científicos para la investigación
            científica en Chile.
          </p>

          <nav className="stagger stagger-4 hero-buttons" aria-label="Acciones principales">
            {user ? (
              <button
                onClick={() => onNavigate('dashboard')}
                id="btn-explore"
                className="magnetic-btn glow-btn Vynas-btn Vynas-btn-gold"
                aria-label="Explorar el sistema solar"
              >
                IR AL PANEL
              </button>
            ) : (
              <>
                <button
                  onClick={() => onNavigate('login')}
                  id="btn-explore"
                  className="magnetic-btn glow-btn Vynas-btn Vynas-btn-gold"
                  aria-label="Explorar el sistema solar"
                >
                  EXPLORAR AHORA
                </button>

                <button
                  onClick={() => onNavigate('login')}
                  id="btn-login"
                  className="magnetic-btn glow-btn-white Vynas-btn Vynas-btn-ghost"
                  aria-label="Iniciar sesión o crear una cuenta nueva"
                >
                  Iniciar Sesión / Crear Cuenta
                </button>
              </>
            )}
          </nav>
        </div>
      </main>
    </div>
  );
};
