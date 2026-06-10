import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';

interface User {
  nombre: string;
  email: string;
  foto: string;
  banner: string;
}

interface LoginViewProps {
  onNavigate: (route: 'landing' | 'login' | 'dashboard') => void;
  onLoginSuccess: (user: User) => void;
}

const spaceImagesData = [
  {
    url: "img/bg/carina.jpg",
    title: "Nebulosa de la Quilla (Carina Nebula)",
    desc: "Una vasta región de formación estelar. Las nubes de gas y polvo colapsan para formar nuevas estrellas, ionizando el gas circundante.",
    source: "NASA/ESA - Telescopios Espaciales Hubble y Webb",
    colorHex: "#c5a358",
    colorRgb: "197, 163, 88"
  },
  {
    url: "img/bg/milky_way.jpg",
    title: "Centro Galáctico de la Vía Láctea",
    desc: "El núcleo de nuestra galaxia, hogar de Sagitario A*, un agujero negro supermasivo, rodeado por densos cúmulos de estrellas y polvo oscuro.",
    source: "ESO/VISTA - Datos del Observatorio Paranal",
    colorHex: "#2299cc",
    colorRgb: "34, 153, 204"
  },
  {
    url: "img/bg/deep_space.jpg",
    title: "Campo Profundo",
    desc: "Una visión profunda del cosmos donde cada punto de luz no es una estrella, sino una galaxia entera con miles de millones de estrellas.",
    source: "Observaciones de Campo Profundo (NASA/ESA)",
    colorHex: "#7a22cc",
    colorRgb: "122, 34, 204"
  },
  {
    url: "img/bg/andromeda.jpg",
    title: "Galaxia de Andrómeda (M31)",
    desc: "Nuestra vecina galáctica más grande. Es una galaxia espiral que en unos 4.000 millones de años colisionará con la Vía Láctea.",
    source: "Astrofotografía de dominio público / SDSS",
    colorHex: "#e28a2b",
    colorRgb: "226, 138, 43"
  },
  {
    url: "img/bg/nebula_colorful.jpg",
    title: "Remanente de Supernova",
    desc: "Estructuras complejas en el medio interestelar creadas por gases eyectados a velocidades supersónicas tras la explosión de una estrella masiva.",
    source: "Chandra X-ray Observatory (NASA)",
    colorHex: "#cc2255",
    colorRgb: "204, 34, 85"
  }
];

const spaceFacts = [
  "\"En Saturno llueven diamantes y sus vientos alcanzan los 1.800 km/h.\"",
  "\"Los anillos de Saturno podrían ser restos de una luna desaparecida llamada Chrysalis.\"",
  "\"El cometa 3I/ATLAS es casi tan antiguo como nuestra propia galaxia.\"",
  "\"La Tierra se ha vuelto un 16% más brillante de noche desde el año 2014.\"",
  "\"El rover Perseverance ya ha recolectado muestras clave en el cráter Jezero de Marte.\""
];

export const LoginView: React.FC<LoginViewProps> = ({ onNavigate, onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [regNombre, setRegNombre] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');
  
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegPasswordConfirm, setShowRegPasswordConfirm] = useState(false);
  
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [csrfToken, setCsrfToken] = useState('');
  const [bgData, setBgData] = useState(spaceImagesData[0]);
  const [factIndex, setFactIndex] = useState(0);
  const [infoCollapsed, setInfoCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Background, Fact rotation, CSRF token, Google Auth & Stardust canvas
  useEffect(() => {
    // Select random background on load
    const randomBg = spaceImagesData[Math.floor(Math.random() * spaceImagesData.length)];
    setBgData(randomBg);

    // Rotate space facts
    const factInterval = setInterval(() => {
      setFactIndex((prev) => (prev + 1) % spaceFacts.length);
    }, 8000);

    // Fetch CSRF Token
    const getCsrf = async () => {
      try {
        const response = await fetch('php/csrf_token.php');
        const data = await response.json();
        setCsrfToken(data.token);
      } catch (e) {
        console.warn('CSRF token fetch failed (dev mode)');
      }
    };
    getCsrf();

    // 1. Google OAuth Initialization
    const initGoogleSignIn = () => {
      const google = (window as any).google;
      if (google && google.accounts) {
        google.accounts.id.initialize({
          client_id: "977516655506-vr13tt7l77ghiie2kbff4cqjo7645vb1.apps.googleusercontent.com",
          callback: (response: any) => {
            window.location.href = "php/auth_google.php?token=" + response.credential;
          }
        });

        const container = document.getElementById('google-auth-btn-container');
        if (container) {
          google.accounts.id.renderButton(container, {
            theme: "filled_black",
            size: "large",
            type: "standard",
            width: 450, // Match the panel content width perfectly (550px panel - 96px padding)
            text: "continue_with"
          });
        }
      }
    };

    let googleScriptElement: HTMLScriptElement | null = null;
    if ((window as any).google) {
      initGoogleSignIn();
    } else {
      googleScriptElement = document.createElement('script');
      googleScriptElement.src = "https://accounts.google.com/gsi/client";
      googleScriptElement.async = true;
      googleScriptElement.defer = true;
      googleScriptElement.onload = initGoogleSignIn;
      document.head.appendChild(googleScriptElement);
    }

    // 2. Interactive 2D Constellation Stardust Canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        let animationId: number;
        let width = (canvas.width = window.innerWidth);
        let height = (canvas.height = window.innerHeight);

        const particles: any[] = [];
        const maxParticles = 90;
        const connectionDist = 100;
        const mouse = { x: null as number | null, y: null as number | null, radius: 150 };

        const handleResize = () => {
          if (canvas) {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
          }
        };
        window.addEventListener('resize', handleResize);

        const handleMouseMove = (e: MouseEvent) => {
          mouse.x = e.clientX;
          mouse.y = e.clientY;
        };
        window.addEventListener('mousemove', handleMouseMove);

        const handleMouseLeave = () => {
          mouse.x = null;
          mouse.y = null;
        };
        window.addEventListener('mouseleave', handleMouseLeave);

        class Particle {
          x = 0;
          y = 0;
          size = 0;
          speedY = 0;
          speedX = 0;
          opacity = 0;
          pulse = 0;
          pulseSpeed = 0;
          isGold = false;
          currentOpacity = 0;

          constructor() {
            this.reset(true);
          }

          reset(initial = false) {
            this.x = Math.random() * width;
            this.y = initial ? Math.random() * height : height + 10;
            this.size = Math.random() * 1.5 + 0.4;
            this.speedY = -(Math.random() * 0.4 + 0.1);
            this.speedX = (Math.random() - 0.5) * 0.3;
            this.opacity = Math.random() * 0.5 + 0.1;
            this.pulse = Math.random() * Math.PI * 2;
            this.pulseSpeed = Math.random() * 0.02 + 0.005;
            this.isGold = Math.random() < 0.18; // 18% Gold stars
          }

          update() {
            this.y += this.speedY;
            this.x += this.speedX;
            this.pulse += this.pulseSpeed;

            this.currentOpacity = this.opacity + Math.sin(this.pulse) * 0.08;
            this.currentOpacity = Math.max(0.05, Math.min(0.7, this.currentOpacity));

            if (mouse.x !== null && mouse.y !== null) {
              const dx = mouse.x - this.x;
              const dy = mouse.y - this.y;
              const distance = Math.hypot(dx, dy);

              if (distance < mouse.radius) {
                const force = (mouse.radius - distance) / mouse.radius;
                this.x += dx * force * 0.02;
                this.y += dy * force * 0.02;
              }
            }

            if (this.y < -10 || this.x < -10 || this.x > width + 10) {
              this.reset(false);
            }
          }

          draw() {
            ctx!.beginPath();
            ctx!.arc(this.x, this.y, this.size, 0, Math.PI * 2);

            if (this.isGold) {
              ctx!.fillStyle = `rgba(197, 163, 88, ${this.currentOpacity})`;
              ctx!.shadowColor = 'rgba(197, 163, 88, 0.4)';
              ctx!.shadowBlur = 5;
            } else {
              ctx!.fillStyle = `rgba(255, 255, 255, ${this.currentOpacity})`;
              ctx!.shadowColor = 'rgba(255, 255, 255, 0.2)';
              ctx!.shadowBlur = 3;
            }

            ctx!.fill();
            ctx!.shadowBlur = 0;
          }
        }

        // Initialize particles
        for (let i = 0; i < maxParticles; i++) {
          particles.push(new Particle());
        }

        const drawConnections = () => {
          let index = 0;
          for (const p1 of particles) {
            index++;
            const remaining = particles.slice(index);
            for (const p2 of remaining) {
              const dx = p1.x - p2.x;
              const dy = p1.y - p2.y;
              const distance = Math.hypot(dx, dy);

              if (distance < connectionDist) {
                const alpha = (1 - distance / connectionDist) * 0.12;
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);

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
        };

        const animate = () => {
          ctx.clearRect(0, 0, width, height);
          particles.forEach((p) => {
            p.update();
            p.draw();
          });
          drawConnections();
          animationId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
          window.removeEventListener('resize', handleResize);
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseleave', handleMouseLeave);
          cancelAnimationFrame(animationId);
        };
      }
    }

    return () => {
      clearInterval(factInterval);
      if (googleScriptElement) {
        googleScriptElement.remove();
      }
    };
  }, []);

  // Update password strength
  useEffect(() => {
    let score = 0;
    if (regPassword.length >= 6) score++;
    if (regPassword.length >= 10) score++;
    if (/[a-z]/.test(regPassword) && /[A-Z]/.test(regPassword)) score++;
    if (/\d/.test(regPassword)) score++;
    if (/[^a-zA-Z0-9]/.test(regPassword)) score++;
    setPasswordStrength(Math.min(score, 4));
  }, [regPassword]);

  const strengthConfig = [
    { width: '0%', color: '#ef4444', label: '' },
    { width: '25%', color: '#ef4444', label: 'Débil' },
    { width: '50%', color: '#f59e0b', label: 'Media' },
    { width: '75%', color: '#eab308', label: 'Buena' },
    { width: '100%', color: '#22c55e', label: 'Fuerte' }
  ];

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('csrf_token', csrfToken);
      formData.append('email', loginEmail);
      formData.append('password', loginPassword);

      const response = await fetch('php/login_process.php', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onLoginSuccess(data.user);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Fallo de Enlace',
          text: data.message || 'Credenciales incorrectas.',
          background: 'rgba(10, 10, 12, 0.95)',
          color: '#fff',
          confirmButtonColor: bgData.colorHex,
          confirmButtonText: 'ENTENDIDO',
          customClass: {
            popup: 'vynas-swal-popup',
            title: 'vynas-swal-title'
          }
        });
      }
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Error de Red',
        text: 'No se pudo conectar con el servidor Vynas.',
        background: 'rgba(10, 10, 12, 0.95)',
        color: '#fff',
        confirmButtonColor: bgData.colorHex
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regPassword !== regPasswordConfirm) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Las contraseñas no coinciden.',
        background: 'rgba(10, 10, 12, 0.95)',
        color: '#fff',
        confirmButtonColor: bgData.colorHex
      });
      return;
    }
    
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('csrf_token', csrfToken);
      formData.append('nombre', regNombre);
      formData.append('email', regEmail);
      formData.append('password', regPassword);

      const response = await fetch('php/register_process.php', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok && data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Registro Exitoso',
          text: 'Usuario registrado correctamente en la red Vynas.',
          background: 'rgba(10, 10, 12, 0.95)',
          color: '#fff',
          confirmButtonColor: bgData.colorHex,
          confirmButtonText: 'INICIAR SESIÓN'
        }).then(() => {
          setIsLogin(true);
          setLoginEmail(regEmail);
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Fallo de Enlace',
          text: data.message || 'No se pudo completar el registro.',
          background: 'rgba(10, 10, 12, 0.95)',
          color: '#fff',
          confirmButtonColor: bgData.colorHex
        });
      }
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Error de Red',
        text: 'No se pudo conectar con el servidor Vynas.',
        background: 'rgba(10, 10, 12, 0.95)',
        color: '#fff',
        confirmButtonColor: bgData.colorHex
      });
    } finally {
      setIsLoading(false);
    }
  };

  const dynamicStyles = `
    .login-header h1, .form-input:focus ~ .form-label, .form-input:not(:placeholder-shown) ~ .form-label, .login-submit, .toggle-link:hover, .dato-label { color: ${bgData.colorHex} !important; }
    .login-submit .btn-fill { background: ${bgData.colorHex} !important; }
    .login-submit:hover { box-shadow: 0 0 30px rgba(${bgData.colorRgb}, 0.2) !important; color: #000 !important; }
    .login-submit { border-color: rgba(${bgData.colorRgb}, 0.4) !important; }
    .form-input:focus { border-bottom-color: ${bgData.colorHex} !important; box-shadow: 0 10px 15px -3px rgba(${bgData.colorRgb}, 0.1) !important; }
    .login-panel { border-right-color: rgba(${bgData.colorRgb}, 0.2) !important; }
    #dato-estelar-texto { 
      background-image: linear-gradient(to right, #ffffff, ${bgData.colorHex}, #ffffff, ${bgData.colorHex}) !important; 
      -webkit-background-clip: text !important;
      background-clip: text !important;
      color: transparent !important;
      display: inline-block !important;
    }
    .dato-footer .dato-line { background: rgba(${bgData.colorRgb}, 0.5) !important; }
    .info-label { color: ${bgData.colorHex} !important; }
    .info-panel { border-color: rgba(${bgData.colorRgb}, 0.2) !important; }
  `;

  return (
    <div className="login-body" style={{ minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>
      <style>{dynamicStyles}</style>

      {/* Dynamic star dust animation canvas */}
      <canvas id="stardust-canvas" ref={canvasRef} aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none' }}></canvas>

      {/* Background image (preserves Ken Burns animation from CSS) */}
      <img
        src={bgData.url}
        alt="Fondo Astronómico"
        className="login-video-bg"
      />

      <div className={`login-overlay ${!isLogin ? 'nebula-mode' : ''}`} style={{ position: 'fixed', inset: 0, zIndex: 10, pointerEvents: 'none' }} />

      <main className="login-main" style={{ position: 'relative', zIndex: 20 }}>
        {/* Login/Register Panel (layout managed strictly by style.css class) */}
        <section className="animate-entrance login-panel">
          <header className="login-header">
            <h1 className="font-serif" style={{ cursor: 'pointer' }} onClick={() => onNavigate('landing')}>Vynas</h1>
            <h2 id="form-subtitle">{isLogin ? "Autenticación de Usuario" : "Crear Nueva Cuenta"}</h2>
          </header>

          <div id="forms-container" className="relative">
            {isLogin ? (
              /* LOGIN FORM */
              <form onSubmit={handleLoginSubmit} className="space-y-10" id="login-form">
                <input type="hidden" name="csrf_token" value={csrfToken} />

                <div className="form-group">
                  <input
                    type="email"
                    required
                    placeholder=" "
                    id="login-email"
                    className="form-input"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                  />
                  <label htmlFor="login-email" className="form-label">Correo Institucional</label>
                  <svg className="form-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                </div>

                <div className="form-group">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    placeholder=" "
                    id="login-password"
                    className="form-input"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                  <label htmlFor="login-password" className="form-label">Contraseña</label>
                  <svg className="form-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    aria-label="Mostrar contraseña"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      {showLoginPassword ? (
                        <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>
                      ) : (
                        <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                      )}
                    </svg>
                  </button>
                </div>

                <div className="remember-row">
                  <label className="remember-label">
                    <input type="checkbox" className="remember-checkbox" />
                    Recuérdame
                  </label>
                  <a
                    href="#"
                    className="forgot-link"
                    onClick={(e) => {
                      e.preventDefault();
                      Swal.fire({
                        title: 'Recuperar Contraseña',
                        text: 'Contacta a soporte en contacto@ispep.cl',
                        icon: 'info',
                        background: 'rgba(10,10,12,0.95)',
                        color: '#fff',
                        confirmButtonColor: bgData.colorHex,
                        confirmButtonText: 'ENTENDIDO'
                      });
                    }}
                  >
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>

                <button type="submit" className={`login-submit ${isLoading ? 'is-loading' : ''}`} disabled={isLoading}>
                  <span className="btn-text">Autenticar</span>
                  <div className="btn-fill"></div>
                  <div className="btn-spinner"><div className="btn-spinner-ring"></div></div>
                </button>

                <div className="text-center mt-3 pt-2">
                  <button type="button" onClick={() => setIsLogin(false)} className="toggle-link">
                    ¿No tienes cuenta? Crear una aquí
                  </button>
                </div>
              </form>
            ) : (
              /* REGISTER FORM */
              <form onSubmit={handleRegisterSubmit} className="space-y-10" id="register-form">
                <input type="hidden" name="csrf_token" value={csrfToken} />

                <div className="form-group">
                  <input
                    type="text"
                    required
                    placeholder=" "
                    id="reg-nombre"
                    className="form-input"
                    value={regNombre}
                    onChange={(e) => setRegNombre(e.target.value)}
                  />
                  <label htmlFor="reg-nombre" className="form-label">Nombre Completo</label>
                  <svg className="form-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>

                <div className="form-group">
                  <input
                    type="email"
                    required
                    placeholder=" "
                    id="reg-email"
                    className="form-input"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                  />
                  <label htmlFor="reg-email" className="form-label">Correo Electrónico</label>
                  <svg className="form-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                </div>

                <div className="form-group">
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    placeholder=" "
                    id="reg-password"
                    className="form-input"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    minLength={6}
                  />
                  <label htmlFor="reg-password" className="form-label">Contraseña</label>
                  <svg className="form-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      {showRegPassword ? (
                        <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>
                      ) : (
                        <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                      )}
                    </svg>
                  </button>
                </div>

                {/* Strength Bar */}
                {regPassword.length > 0 && (
                  <div className="strength-container" style={{ display: 'block', marginBottom: '1.5rem' }}>
                    <div className="strength-bar">
                      <div className="strength-fill" style={{ width: strengthConfig[passwordStrength].width, backgroundColor: strengthConfig[passwordStrength].color, boxShadow: `0 0 8px ${strengthConfig[passwordStrength].color}` }}></div>
                    </div>
                    <div className="strength-text" style={{ color: strengthConfig[passwordStrength].color }}>{strengthConfig[passwordStrength].label}</div>
                  </div>
                )}

                <div className="form-group">
                  <input
                    type={showRegPasswordConfirm ? 'text' : 'password'}
                    required
                    placeholder=" "
                    id="reg-password-confirm"
                    className="form-input"
                    value={regPasswordConfirm}
                    onChange={(e) => setRegPasswordConfirm(e.target.value)}
                    minLength={6}
                  />
                  <label htmlFor="reg-password-confirm" className="form-label">Confirmar Contraseña</label>
                  <svg className="form-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowRegPasswordConfirm(!showRegPasswordConfirm)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      {showRegPasswordConfirm ? (
                        <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>
                      ) : (
                        <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                      )}
                    </svg>
                  </button>
                </div>

                <button type="submit" className={`login-submit ${isLoading ? 'is-loading' : ''}`} disabled={isLoading}>
                  <span className="btn-text">Registrar Usuario</span>
                  <div className="btn-fill"></div>
                  <div className="btn-spinner"><div className="btn-spinner-ring"></div></div>
                </button>

                <div className="text-center mt-4 pt-2">
                  <button type="button" onClick={() => setIsLogin(true)} className="toggle-link">
                    ¿Ya tienes cuenta? Iniciar Sesión
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="social-divider" role="separator">
            <div className="line"></div>
            <span>O continuar con</span>
            <div className="line"></div>
          </div>

          {/* Google Auth Container */}
          <div id="google-auth-btn-container" className="google-auth-container" aria-label="Iniciar sesión con Google"></div>

          {/* GitHub Auth */}
          <a href="php/github_redirect.php" className="github-btn" style={{ textDecoration: 'none', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', fill: '#fff', marginRight: '10px' }}>
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
            <span>GitHub Account</span>
          </a>

          <footer className="login-footer">
            <p>Vynas ♱ zoroikami 2026</p>
          </footer>
        </section>

        {/* Fact Section */}
        <section className="dato-section animate-entrance">
          <div>
            <h3 className="dato-label">Dato Estelar</h3>
            <p id="dato-estelar-texto" className="dato-text">
              {spaceFacts[factIndex]}
            </p>
            <div className="dato-footer">
              <span>Laurel</span>
              <div className="dato-line"></div>
            </div>
          </div>
        </section>

        {/* What am I seeing panel */}
        <aside id="info-panel" className={`info-panel ${infoCollapsed ? 'collapsed' : ''} visible`}>
          <button className="info-panel-toggle" onClick={() => setInfoCollapsed(!infoCollapsed)}>▾</button>
          <div className="info-label">¿Qué estoy viendo?</div>
          <h4 className="info-title">{bgData.title}</h4>
          <p className="info-desc">{bgData.desc}</p>
          <div className="info-source">Fuente: <strong>{bgData.source}</strong></div>
        </aside>
      </main>
    </div>
  );
};
