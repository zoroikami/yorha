import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';

interface User {
  nombre: string;
  email: string;
  foto: string;
  banner: string;
}

interface DashboardViewProps {
  user: User;
  onLogout: () => void;
}

const cdnScripts = [
  "https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js",
  "https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/controls/OrbitControls.js",
  "https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/loaders/GLTFLoader.js",
  "https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/objects/Lensflare.js",
  "https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/renderers/CSS2DRenderer.js",
  "https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/postprocessing/EffectComposer.js",
  "https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/postprocessing/RenderPass.js",
  "https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/postprocessing/ShaderPass.js",
  "https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/shaders/CopyShader.js",
  "https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/shaders/LuminosityHighPassShader.js",
  "https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/postprocessing/UnrealBloomPass.js",
  "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js",
  "https://cdn.jsdelivr.net/npm/sweetalert2@11",
  "https://cdn.jsdelivr.net/npm/chart.js"
];

export const DashboardView: React.FC<DashboardViewProps> = ({ user, onLogout }) => {
  const [, setScriptsLoaded] = useState(false);

  useEffect(() => {
    // Sequential Script Loader helper
    const loadScripts = async () => {
      for (const src of cdnScripts) {
        await new Promise<void>((resolve, reject) => {
          if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
          }
          const script = document.createElement('script');
          script.src = src;
          script.async = false; // Maintain execution order
          script.onload = () => resolve();
          script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
          document.head.appendChild(script);
        });
      }

      // Load main dashboard orchestrator module
      await new Promise<void>((resolve, reject) => {
        const dashboardScriptSrc = "js/dashboard.js";
        // Always load a fresh instance of dashboard.js for state reset
        const existing = document.querySelector(`script[src="${dashboardScriptSrc}"]`);
        if (existing) {
          existing.remove();
        }
        
        const script = document.createElement('script');
        script.src = dashboardScriptSrc;
        script.type = "module";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load ${dashboardScriptSrc}`));
        document.body.appendChild(script);
      });

      setScriptsLoaded(true);
    };

    loadScripts().catch(err => console.error("Error loading dashboard scripts:", err));

    // Register service worker if available
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/Vynas/sw.js').catch(() => {});
    }

    // Cleanup function when unmounting
    return () => {
      // Remove main dashboard script
      const mainScript = document.querySelector('script[src="js/dashboard.js"]');
      if (mainScript) mainScript.remove();

      // Clean up CSS2D labels container
      const cssLabels = document.querySelectorAll('.vynas-hud-label');
      cssLabels.forEach(el => el.remove());

      // Clean up custom renderer divs appended by CSS2DRenderer
      const css2dDivs = document.querySelectorAll('body > div[style*="position: absolute"]');
      css2dDivs.forEach(div => {
        if (div.querySelector('.vynas-hud-label')) {
          div.remove();
        }
      });

      // Clear intervals or globals set by legacy scripts
      if (window.location.search) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };
  }, []);

  const confirmLogout = () => {
    // Call sound effect if available
    if (typeof (window as any).playBeep === 'function') (window as any).playBeep(800, 'triangle', 0.05, 0.03);
    
    Swal.fire({
      title: '¿Desconectar Enlace Neuronal?',
      text: "Saldrás de la red Vynas y la simulación se detendrá.",
      icon: 'warning',
      showCancelButton: true,
      background: 'rgba(10, 10, 12, 0.95)',
      color: '#fff',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#333',
      confirmButtonText: 'DESCONECTAR',
      cancelButtonText: 'CANCELAR',
      customClass: {
        popup: 'vynas-swal-popup',
        title: 'vynas-swal-title',
        confirmButton: 'swal2-confirm',
        cancelButton: 'swal2-confirm'
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await fetch('php/logout.php?json=1');
          onLogout();
        } catch (err) {
          console.error("Logout API failed, hard redirecting...", err);
          window.location.href = 'php/logout.php';
        }
      }
    });
  };

  return (
    <div style={{ color: '#fff', backgroundColor: '#000', minHeight: '100vh' }}>
      
      {/* ══ PANTALLA DE CARGA (PRELOADER) ══ */}
      <div id="vynas-preloader">
        <div className="preloader-content">
          <h2 className="preloader-title">INICIALIZANDO VYNAS_OS...</h2>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" id="preloader-bar"></div>
          </div>
          <p className="preloader-status" id="preloader-status">Sincronizando Red Neuronal...</p>
        </div>
      </div>

      {/* ══ EFECTOS VISUALES ══ */}
      <div id="cinematic-overlay"></div>

      {/* ══ CANVAS THREE.JS (fondo) ══ */}
      <canvas id="three-canvas"></canvas>

      {/* ══ WARP EFFECT CANVAS ══ */}
      <canvas id="warp-canvas" style={{ position: 'fixed', inset: 0, zIndex: 100, pointerEvents: 'none', display: 'none' }}></canvas>

      {/* ══ NAVBAR FIJO ══ */}
      <nav id="navbar">
        <div className="brand">
          <h1>VYNAS</h1>
          <span>Estación Terrestre La Serena</span>
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px' }}>
          <div id="system-indicator"
            style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: '1rem', color: 'var(--theme-color)', letterSpacing: '0.2em', textTransform: 'uppercase', textShadow: '0 0 10px rgba(197,163,88,0.5)' }}>
            SISTEMA SOLAR</div>
          <button id="btn-autopilot" className="clickable nav-action-btn danger" aria-label="Activar piloto automático - War Room">WAR ROOM</button>
          <button id="btn-physics" className="clickable nav-action-btn gold" aria-label="Ver fundamentos físicos del cosmos">FUNDAMENTOS</button>
        </div>

        <div className="user-area clickable" onClick={confirmLogout} style={{ textDecoration: 'none', cursor: 'pointer' }} aria-label="Cerrar sesión">
          <div className="user-info">
            <p>Conectado como</p>
            <p>{user.nombre}</p>
          </div>
          <img src={user.foto} onError={(e) => { (e.target as HTMLImageElement).src = 'img/logodefault.png'; }} alt="Foto de perfil del investigador" />
        </div>
      </nav>

      {/* ══ CAPA UI (HERO) ══ */}
      <div id="ui-layer">

        {/* Flechas de Navegación del Sistema */}
        <div id="system-nav-arrows" className="sys-nav-arrows">
          <button id="sys-prev" className="clickable sys-nav-btn sys-nav-prev" aria-label="Sistema anterior">
            <span className="sys-nav-chevron">‹</span>
          </button>
          <button id="sys-next" className="clickable sys-nav-btn sys-nav-next" aria-label="Sistema siguiente">
            <span className="sys-nav-chevron">›</span>
          </button>
        </div>

        {/* Panel de Fundamentos de Física */}
        <div id="physics-panel" className="physics-panel clickable">
          <div className="physics-panel-header">
            <h3>FUNDAMENTOS DEL COSMOS</h3>
            <button id="btn-close-physics" className="physics-close clickable" aria-label="Cerrar panel de fundamentos del cosmos">×</button>
          </div>
          <div className="physics-scroll-area">
            <div className="physics-intro">
              <p>La física no es solo fórmulas; es el lenguaje en el que está escrito el universo. Estas leyes
                fundamentales nos permiten simular y comprender la vasta complejidad de los sistemas estelares.
              </p>
            </div>
            <div className="physics-grid">
              <div className="physics-card">
                <h4>Masa y Gravedad</h4>
                <p>La fuerza fundamental que rige el universo. La gravedad determina las órbitas planetarias, la
                  formación de galaxias y la curvatura del espacio-tiempo. En este simulador, las órbitas se
                  calculan en base a la influencia gravitacional de la estrella central.</p>
              </div>
              <div className="physics-card">
                <h4>Termodinámica y Zona Habitable</h4>
                <p>La posición de un planeta respecto a su estrella dicta su temperatura. La "Zona Habitable" (o
                  zona Ricitos de Oro) es la región donde las condiciones térmicas permiten la existencia de
                  agua líquida en la superficie, esencial para la vida.</p>
              </div>
              <div className="physics-card">
                <h4>Luz y Espectroscopía</h4>
                <p>Toda la información que recibimos del espacio profundo proviene de la luz. Analizando el
                  espectro electromagnético, podemos determinar la composición química de atmósferas
                  exoplanetarias a años luz de distancia.</p>
              </div>
              <div className="physics-card">
                <h4>Tiempo Espacial (Relatividad)</h4>
                <p>El universo opera en escalas de tiempo inimaginables. Desde los miles de millones de años de
                  la vida de una estrella hasta los días que tarda un exoplaneta en completar su órbita. La
                  simulación acelera estos procesos relativos para su observación.</p>
              </div>
              <div className="physics-card">
                <h4>Mecánica Orbital (Leyes de Kepler)</h4>
                <p>Los planetas no orbitan en círculos perfectos, sino en elipses. La velocidad de un planeta
                  cambia dependiendo de su distancia a la estrella. Cerca del perihelio se mueven más rápido,
                  y en el afelio más lento.</p>
              </div>
              <div className="physics-card">
                <h4>Dinámica Planetaria</h4>
                <p>La interacción entre los diferentes cuerpos celestes, como resonancias orbitales o la
                  influencia de gigantes gaseosos, moldea la arquitectura de un sistema planetario,
                  brindándole estabilidad o desencadenando eventos caóticos.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Centro */}
        <div id="center-area">

          {/* Panel de Información Científica (Modo Ambiente) */}
          <div id="intro-title" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <h2>¿Qué vamos a ver hoy? </h2>
            <p>[ Modo Ambiente Activo ]</p>
          </div>

          {/* Contenedor de Papers + Facts reubicado (HUD Lateral) */}
          <div id="ambient-info" className="ambient-info"
            style={{ position: 'fixed', bottom: '30px', left: '30px', maxWidth: '400px', textAlign: 'left', background: 'rgba(0,0,0,0.6)', border: '1px solid var(--theme-color)', padding: '1.5rem', backdropFilter: 'blur(8px)', display: 'none' }}>
            <div className="ambient-paper"></div>
            <div className="ambient-fact"></div>
          </div>

          {/* Botones de Interacción */}
          <button id="btn-toggle-interaction" className="clickable interaction-btn" aria-label="Iniciar modo interactivo y exploración 3D libre">INTERACTUAR</button>
          <button id="btn-return-hub" className="clickable interaction-btn" style={{ display: 'none' }} aria-label="Volver al panel principal del Hub">VOLVER AL HUB</button>

          {/* Hub del Planeta (Oculto hasta activarse) */}
          <div id="planet-hub">
            {/* PANEL IZQUIERDO (Información) */}
            <div className="hub-left">
              <div className="hub-left-content">
                <header className="hub-header">
                  <p className="label">Destino Fijado</p>
                  <h3 id="hub-name">Tierra</h3>
                  <span className="badge" id="hub-sector">Sector 001</span>
                </header>

                <div className="data-scroll-area">
                  <div className="info-group hub-data-row" style={{ animationDelay: '0.1s' }}>
                    <h4>Forma y Estructura</h4>
                    <p id="hub-desc">No es una esfera perfecta, sino un geoide achatado en los polos. Se
                      estructura en corteza (donde hay vida), manto (rocas semisólidas) y núcleo (metales,
                      responsable del campo magnético).</p>
                  </div>

                  <div className="data-rows hub-data-row" style={{ animationDelay: '0.2s' }}>
                    <div className="data-row">
                      <span>Rotación (Día)</span>
                      <span className="num" id="hub-rotation">23,93 h</span>
                    </div>
                    <div className="data-row">
                      <span>Traslación (Año)</span>
                      <span className="num" id="hub-orbit">365,26 d</span>
                    </div>
                    <div className="data-row">
                      <span>Edad</span>
                      <span className="num" id="hub-age">~4.600 M años</span>
                    </div>
                    <div className="data-row">
                      <span>Distancia al Sol</span>
                      <span className="num" id="hub-distance">~150 M km</span>
                    </div>
                    <div className="data-row">
                      <span>Diámetro</span>
                      <span className="num" id="hub-diameter">~12.742 km</span>
                    </div>
                  </div>

                  <div className="info-group hub-data-row" style={{ animationDelay: '0.3s' }}>
                    <h4>Composición Atmosférica</h4>
                    <p id="hub-atmosphere">Compuesta principalmente por nitrógeno y oxígeno, esencial para la vida.</p>
                  </div>

                  <div className="info-group hub-data-row" style={{ animationDelay: '0.4s' }}>
                    <h4>Características Únicas</h4>
                    <p id="hub-unique">Es el único planeta con agua líquida superficial y placas tectónicas
                      activas. Satélite natural: La Luna, que estabiliza el eje de rotación de la Tierra.
                    </p>
                  </div>

                  <div className="info-group" id="hub-alert-group">
                    <h4>Situación Ambiental <span className="alert-badge" id="hub-alert-badge">Alerta</span></h4>
                    <p id="hub-alert">El calentamiento global está aumentando la temperatura promedio, con el agua cubriendo la mayor parte del planeta.</p>
                  </div>
                </div>

                <button id="btn-return" className="clickable" aria-label="Volver a la vista de órbita planetaria">Volver a Órbita</button>
              </div>
            </div>

            {/* PANEL DERECHO (Cronología) */}
            <div className="hub-right">
              <div className="hub-right-tab">
                <span>CRONOLOGÍA</span>
              </div>
              <div className="hub-right-content">
                <header className="hub-header">
                  <p className="label">Registro Histórico</p>
                  <h3 style={{ fontSize: '1.6rem' }}>Evolución</h3>
                </header>
                <div className="data-scroll-area" style={{ maxHeight: '55vh', paddingRight: '0.5rem' }}>
                  <div id="hub-eras-container" className="eras-timeline"></div>
                  <div className="info-group hub-data-row" style={{ animationDelay: '0.5s' }}>
                    <h4>Fuente Científica Certificada</h4>
                    <a id="hub-source-link" href="#" target="_blank" rel="noreferrer"
                      style={{ color: 'var(--theme-color)', fontSize: '0.7rem', textDecoration: 'none', borderBottom: '1px dashed var(--theme-color)', paddingBottom: '2px' }}>
                      <span id="hub-source-name">NASA / ESA Archive</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Informativo de Eras (Aparece de frente) */}
          <div id="era-info-modal" className="era-modal">
            <div className="era-modal-header">
              <h3 id="era-modal-title">Título de la Era</h3>
              <button className="era-modal-close clickable" onClick={() => (window as any).closeEraModal()} aria-label="Cerrar ventana de detalles de la era">×</button>
            </div>
            <div className="era-modal-body">
              <p id="era-modal-desc">Descripción extendida de la era.</p>
              <span id="era-modal-duration" className="era-modal-duration">-- Millones de Años</span>
            </div>
          </div>

        </div>{/* /center-area */}

        {/* Footer */}
        <footer id="footer">
          <div>
            <p className="gold">v2.8.0</p>
            <p>ZOROIKAMI | © 2026</p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <p className="gold">Chile</p>
            <p>Monitoreo Satelital en Tiempo Real</p>
          </div>
        </footer>

      </div>{/* /ui-layer */}

      {/* ══ SCROLL INDICATOR ══ */}
      <div id="scroll-indicator" className="scroll-indicator clickable">
        <span>EXPLORAR</span>
        <div className="scroll-chevron">⌄</div>
      </div>

      {/* ══ CONTENIDO SCROLLABLE ══ */}
      <main id="scroll-content">
        <div className="scroll-spacer"></div>

        {/* ═══ SECCIÓN: ESTADO DE LA MISIÓN ═══ */}
        <section id="mission-section" className="dash-section">
          <div className="section-inner">
            <div className="section-header">
              <span className="section-tag">TELEMETRÍA EN VIVO</span>
              <h2 className="section-title">Estado de la Misión</h2>
            </div>
            <div className="metric-grid" id="metric-grid">
              {/* Populated by JS */}
            </div>
          </div>
        </section>

        {/* ═══ SECCIÓN: CATÁLOGO ESTELAR ═══ */}
        <section id="catalog-section" className="dash-section">
          <div className="section-inner">
            <div className="section-header">
              <span className="section-tag">ARCHIVO ESTELAR</span>
              <h2 className="section-title">Catálogo de Cuerpos Celestes</h2>
            </div>
            <div className="system-group">
              <h3 className="system-label">☉ Sistema Solar</h3>
              <div className="planet-grid" id="catalog-solar"></div>
            </div>
            <div className="system-group">
              <h3 className="system-label">✦ Sistema TRAPPIST-1</h3>
              <div className="planet-grid" id="catalog-trappist"></div>
            </div>
            <div className="system-group">
              <h3 className="system-label">★ Sistema Kepler-186</h3>
              <div className="planet-grid" id="catalog-kepler"></div>
            </div>
          </div>
        </section>

        {/* ═══ SECCIÓN: SUPERFICIE MARCIANA ═══ */}
        <section id="mars-section" className="dash-section">
          <div className="section-inner">
            <div className="section-header">
              <span className="section-tag">ROVER FEED</span>
              <h2 className="section-title">Superficie Marciana</h2>
              <div className="mars-controls">
                <button className="mars-rover-btn active" data-rover="curiosity">☿ Curiosity</button>
                <button className="mars-rover-btn" data-rover="perseverance">♂ Perseverance</button>
              </div>
            </div>
            <div id="mars-gallery" className="mars-gallery"></div>
            <p id="mars-status" className="mars-status">Contactando rover...</p>
          </div>
        </section>

        {/* ═══ SECCIÓN: CLIMA ESPACIAL ═══ */}
        <section id="weather-section" className="dash-section">
          <div className="section-inner">
            <div className="section-header">
              <span className="section-tag">MONITOREO SOLAR</span>
              <h2 className="section-title">Clima Espacial</h2>
            </div>
            <div className="weather-grid">
              <div className="weather-card" id="kp-card">
                <h4 className="weather-card-title">Índice Kp Geomagnético</h4>
                <div id="kp-gauge" className="kp-gauge"></div>
                <p id="kp-label" className="kp-label">Cargando datos NOAA...</p>
              </div>
              <div className="weather-card" id="flare-card">
                <h4 className="weather-card-title">☀ Llamaradas Solares (7 días)</h4>
                <div id="flare-timeline" className="flare-timeline"></div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ SECCIÓN: VISTA DESDE EL ESPACIO ═══ */}
        <section id="epic-section" className="dash-section">
          <div className="section-inner">
            <div className="section-header">
              <span className="section-tag">DSCOVR SATELLITE</span>
              <h2 className="section-title">Vista desde el Espacio</h2>
            </div>
            <div id="epic-container" className="epic-container">
              <p style={{ color: '#666', textAlign: 'center', fontSize: '0.7rem', letterSpacing: '0.2em' }}>CONTACTANDO DSCOVR...</p>
            </div>
          </div>
        </section>

        {/* ═══ SECCIÓN: OBSERVATORIO (SDO) ═══ */}
        <section id="observatory-section" className="dash-section">
          <div className="section-inner">
            <div className="section-header">
              <span className="section-tag">TELESCOPIOS EN VIVO</span>
              <h2 className="section-title">Observatorio Solar (SDO)</h2>
            </div>
            <div className="observatory-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginTop: '20px' }}>
              <div className="obs-card" style={{ background: 'rgba(20,20,25,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
                <h4 style={{ color: '#c5a358', marginBottom: '10px', fontFamily: "'Cinzel', serif" }}>AIA 193 Å</h4>
                <img id="sdo-193" src="" alt="SDO AIA 193" style={{ width: '100%', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', transition: 'opacity 0.5s' }} />
                <p style={{ fontSize: '0.8rem', color: '#88', marginTop: '10px' }}>Corona solar y erupciones (Tiempo Real)</p>
              </div>
              <div className="obs-card" style={{ background: 'rgba(20,20,25,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
                <h4 style={{ color: '#c5a358', marginBottom: '10px', fontFamily: "'Cinzel', serif" }}>AIA 304 Å</h4>
                <img id="sdo-304" src="" alt="SDO AIA 304" style={{ width: '100%', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', transition: 'opacity 0.5s' }} />
                <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '10px' }}>Cromosfera y filamentos (Tiempo Real)</p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ FOOTER EXPANDIDO ═══ */}
        <footer id="scroll-footer" className="dash-section scroll-footer">
          <div className="section-inner">
            <div className="footer-grid">
              <div className="footer-col">
                <h4>VYNAS</h4>
                <p>Estación Terrestre La Serena</p>
                <p className="footer-version">v2.8.0 (Vynas Visual update #1)</p>
              </div>
              <div className="footer-col">
                <h4>Fuentes de Datos</h4>
                <p><a href="https://api.nasa.gov" target="_blank" rel="noreferrer">NASA Open APIs</a></p>
                <p><a href="https://services.swpc.noaa.gov" target="_blank" rel="noreferrer">NOAA Space Weather</a></p>
                <p><a href="https://exoplanets.nasa.gov" target="_blank" rel="noreferrer">NASA Exoplanet Archive</a></p>
              </div>
              <div className="footer-col">
                <h4>Hecho desde</h4>
                <p>La Serena, Chile 🇨🇱</p>
                <p>Monitoreo Satelital en Tiempo Real</p>
              </div>
            </div>
            <div className="footer-bottom">
              <p>ZOROIKAMI © 2026 — Todos los datos son proporcionados por agencias espaciales oficiales.</p>
            </div>
          </div>
        </footer>

      </main>

      {/* ══ NASA LIVE FEED ══ */}
      <div id="nasa-feed-panel" className="nasa-feed-panel" style={{ display: 'none' }}></div>

    </div>
  );
};
