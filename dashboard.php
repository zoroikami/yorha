<?php
session_start();

if (!isset($_SESSION['investigador_nombre'])) {
    header("Location: login.html?error=acceso_denegado");
    exit();
}

$timeout = 900;
if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity'] > $timeout)) {
    session_unset();
    session_destroy();
    header("Location: login.html?error=sesion_expirada");
    exit();
}
$_SESSION['last_activity'] = time();

$user_img = (isset($_SESSION['investigador_foto']) && !empty($_SESSION['investigador_foto']))
    ? $_SESSION['investigador_foto']
    : 'img/logodefault.png';
?>
<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>YorHa — Panel de Control Científico</title>
    <meta name="description"
        content="YorHa - Estación Terrestre La Serena. Panel de control científico de monitoreo satelital y simulación astronómica en tiempo real.">
    <meta name="robots" content="noindex, nofollow">
    <link rel="canonical" href="https://ispep.cl/dashboard.php">
    <link rel="icon" type="image/png" href="img/logo.png">

    <!-- Open Graph -->
    <meta property="og:type" content="website">
    <meta property="og:title" content="YorHa — Panel de Control Científico">
    <meta property="og:description"
        content="Simulación astronómica en tiempo real desde la Estación Terrestre La Serena.">
    <meta property="og:image" content="https://ispep.cl/img/logo.png">

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link
        href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Inter:wght@200;300;400;500;600&family=Bodoni+Moda:ital,wght@0,400;0,700;1,400;1,700&display=swap"
        rel="stylesheet">

    <!-- Styles -->
    <link rel="stylesheet" href="css/dashboard.css">

    <!-- PWA -->
    <link rel="manifest" href="manifest.json">
    <meta name="theme-color" content="#c5a358">

    <!-- Three.js + OrbitControls + GSAP -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/controls/OrbitControls.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/loaders/GLTFLoader.js"></script>
    <!-- Post-Processing Modules -->
    <script src="https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/postprocessing/EffectComposer.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/postprocessing/RenderPass.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/postprocessing/ShaderPass.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/shaders/CopyShader.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/shaders/LuminosityHighPassShader.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/postprocessing/UnrealBloomPass.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
</head>

<body>

    <!-- ══ PANTALLA DE CARGA (PRELOADER) ══ -->
    <div id="yorha-preloader">
        <div class="preloader-content">
            <h2 class="preloader-title">INICIALIZANDO YORHA_OS...</h2>
            <div class="progress-bar-container">
                <div class="progress-bar-fill" id="preloader-bar"></div>
            </div>
            <p class="preloader-status" id="preloader-status">Sincronizando Red Neuronal...</p>
        </div>
    </div>

    <!-- ══ EFECTOS VISUALES ══ -->
    <div id="cinematic-overlay"></div>

    <!-- ══ CANVAS THREE.JS (fondo) ══ -->
    <canvas id="three-canvas"></canvas>

    <!-- ══ WARP EFFECT CANVAS ══ -->
    <canvas id="warp-canvas" style="position:fixed;inset:0;z-index:100;pointer-events:none;display:none;"></canvas>

    <!-- ══ CAPA UI ══ -->
    <div id="ui-layer">

        <!-- Flechas de Navegación del Sistema -->
        <div id="system-nav-arrows" class="sys-nav-arrows">
            <button id="sys-prev" class="clickable sys-nav-btn sys-nav-prev" aria-label="Sistema anterior">
                <span class="sys-nav-chevron">‹</span>
            </button>
            <button id="sys-next" class="clickable sys-nav-btn sys-nav-next" aria-label="Sistema siguiente">
                <span class="sys-nav-chevron">›</span>
            </button>
        </div>

        <!-- Navbar -->
        <nav id="navbar">
            <div class="brand">
                <h1>YORHA</h1>
                <span>Estación Terrestre La Serena</span>
            </div>

            <div style="flex:1; display:flex; justify-content:center; align-items:center; gap: 15px;">
                <div id="system-indicator"
                    style="font-family: 'Cinzel', serif; font-weight: 700; font-size: 1rem; color: var(--theme-color); letter-spacing: 0.2em; text-transform: uppercase; text-shadow: 0 0 10px rgba(197,163,88,0.5);">
                    SISTEMA SOLAR</div>
                <button id="btn-autopilot" class="clickable nav-action-btn danger">WAR ROOM</button>
                <button id="btn-physics" class="clickable nav-action-btn gold">FUNDAMENTOS</button>
            </div>

            <a href="profile.php" class="user-area clickable" style="text-decoration: none;">
                <div class="user-info">
                    <p>Bienvenido</p>
                    <p><?php echo htmlspecialchars($_SESSION['investigador_nombre']); ?></p>
                </div>
                <img src="<?php echo htmlspecialchars($user_img); ?>"
                    onerror="this.onerror=null; this.src='img/logodefault.png';" alt="Foto investigador">
            </a>
        </nav>

        <!-- Panel de Fundamentos de Física -->
        <div id="physics-panel" class="physics-panel clickable">
            <div class="physics-panel-header">
                <h3>FUNDAMENTOS DEL COSMOS</h3>
                <button id="btn-close-physics" class="physics-close clickable">×</button>
            </div>
            <div class="physics-scroll-area">
                <div class="physics-intro">
                    <p>La física no es solo fórmulas; es el lenguaje en el que está escrito el universo. Estas leyes fundamentales nos permiten simular y comprender la vasta complejidad de los sistemas estelares.</p>
                </div>
                <div class="physics-grid">
                    <div class="physics-card">
                        <h4>Masa y Gravedad</h4>
                        <p>La fuerza fundamental que rige el universo. La gravedad determina las órbitas planetarias, la formación de galaxias y la curvatura del espacio-tiempo. En este simulador, las órbitas se calculan en base a la influencia gravitacional de la estrella central.</p>
                    </div>
                    <div class="physics-card">
                        <h4>Termodinámica y Zona Habitable</h4>
                        <p>La posición de un planeta respecto a su estrella dicta su temperatura. La "Zona Habitable" (o zona Ricitos de Oro) es la región donde las condiciones térmicas permiten la existencia de agua líquida en la superficie, esencial para la vida.</p>
                    </div>
                    <div class="physics-card">
                        <h4>Luz y Espectroscopía</h4>
                        <p>Toda la información que recibimos del espacio profundo proviene de la luz. Analizando el espectro electromagnético, podemos determinar la composición química de atmósferas exoplanetarias a años luz de distancia.</p>
                    </div>
                    <div class="physics-card">
                        <h4>Tiempo Espacial (Relatividad)</h4>
                        <p>El universo opera en escalas de tiempo inimaginables. Desde los miles de millones de años de la vida de una estrella hasta los días que tarda un exoplaneta en completar su órbita. La simulación acelera estos procesos relativos para su observación.</p>
                    </div>
                    <div class="physics-card">
                        <h4>Mecánica Orbital (Leyes de Kepler)</h4>
                        <p>Los planetas no orbitan en círculos perfectos, sino en elipses. La velocidad de un planeta cambia dependiendo de su distancia a la estrella. Cerca del perihelio se mueven más rápido, y en el afelio más lento.</p>
                    </div>
                    <div class="physics-card">
                        <h4>Dinámica Planetaria</h4>
                        <p>La interacción entre los diferentes cuerpos celestes, como resonancias orbitales o la influencia de gigantes gaseosos, moldea la arquitectura de un sistema planetario, brindándole estabilidad o desencadenando eventos caóticos.</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Centro -->
        <div id="center-area">

            <!-- Panel de Información Científica (Modo Ambiente) -->
            <div id="intro-title" style="display: flex; flex-direction: column; align-items: center; gap: 1rem;">
                <h2>¿Qué vamos a ver hoy? </h2>
                <p>[ Modo Ambiente Activo ]</p>

                <!-- Contenedor de Papers + Facts -->
                <div id="ambient-info" class="ambient-info">
                    <!-- Paper rotativo -->
                    <div class="ambient-paper"></div>
                    <!-- Dato curioso rotativo -->
                    <div class="ambient-fact"></div>
                </div>

            </div>

            <!-- Botones de Interacción -->
            <button id="btn-toggle-interaction" class="clickable interaction-btn-main">INTERACTUAR</button>
            <button id="btn-return-hub" class="clickable interaction-btn-main" style="display: none;">VOLVER AL HUB</button>


            <!-- Hub del Planeta (Oculto hasta activarse) -->
            <div id="planet-hub">
                <!-- PANEL IZQUIERDO (Información) -->
                <div class="hub-left">
                    <div class="hub-left-content">
                        <header class="hub-header">
                            <p class="label">Destino Fijado</p>
                            <h3 id="hub-name">Tierra</h3>
                            <span class="badge" id="hub-sector">Sector 001</span>
                        </header>

                        <div class="data-scroll-area">
                            <div class="info-group hub-data-row" style="animation-delay: 0.1s">
                                <h4>Forma y Estructura</h4>
                                <p id="hub-desc">No es una esfera perfecta, sino un geoide achatado en los polos. Se
                                    estructura en corteza (donde hay vida), manto (rocas semisólidas) y núcleo (metales,
                                    responsable del campo magnético).</p>
                            </div>

                            <div class="data-rows hub-data-row" style="animation-delay: 0.2s">
                                <div class="data-row">
                                    <span>Rotación (Día)</span>
                                    <span class="num" id="hub-rotation">23,93 h</span>
                                </div>
                                <div class="data-row">
                                    <span>Traslación (Año)</span>
                                    <span class="num" id="hub-orbit">365,26 d</span>
                                </div>
                                <div class="data-row">
                                    <span>Edad</span>
                                    <span class="num" id="hub-age">~4.600 M años</span>
                                </div>
                                <div class="data-row">
                                    <span>Distancia al Sol</span>
                                    <span class="num" id="hub-distance">~150 M km</span>
                                </div>
                                <div class="data-row">
                                    <span>Diámetro</span>
                                    <span class="num" id="hub-diameter">~12.742 km</span>
                                </div>
                            </div>

                            <div class="info-group hub-data-row" style="animation-delay: 0.3s">
                                <h4>Composición Atmosférica</h4>
                                <p id="hub-atmosphere">Compuesta principalmente por nitrógeno y oxígeno, esencial para
                                    la vida.</p>
                            </div>

                            <div class="info-group hub-data-row" style="animation-delay: 0.4s">
                                <h4>Características Únicas</h4>
                                <p id="hub-unique">Es el único planeta con agua líquida superficial y placas tectónicas
                                    activas. Satélite natural: La Luna, que estabiliza el eje de rotación de la Tierra.
                                </p>
                            </div>

                            <div class="info-group" id="hub-alert-group">
                                <h4>Situación Ambiental <span class="alert-badge" id="hub-alert-badge">Alerta</span>
                                </h4>
                                <p id="hub-alert">El calentamiento global está aumentando la temperatura promedio, con
                                    el agua cubriendo la mayor parte del planeta.</p>
                            </div>
                        </div>

                        <button id="btn-return" class="clickable">Volver a Órbita</button>
                    </div>
                </div>

                <!-- PANEL DERECHO (Cronología) -->
                <div class="hub-right">
                    <div class="hub-right-tab">
                        <span>CRONOLOGÍA</span>
                    </div>
                    <div class="hub-right-content">
                        <header class="hub-header">
                            <p class="label">Registro Histórico</p>
                            <h3 style="font-size: 1.6rem">Evolución</h3>
                        </header>
                        <div class="data-scroll-area" style="max-height: 55vh; padding-right: 0.5rem">
                            <div id="hub-eras-container" class="eras-timeline"></div>
                            <div class="info-group hub-data-row" style="animation-delay: 0.5s">
                                <h4>Fuente Científica Certificada</h4>
                                <a id="hub-source-link" href="#" target="_blank"
                                    style="color: var(--theme-color); font-size: 0.7rem; text-decoration: none; border-bottom: 1px dashed var(--theme-color); padding-bottom: 2px;">
                                    <span id="hub-source-name">NASA / ESA Archive</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            <!-- Modal Informativo de Eras (Aparece de frente) -->
            <div id="era-info-modal" class="era-modal">
                <div class="era-modal-header">
                    <h3 id="era-modal-title">Título de la Era</h3>
                    <button class="era-modal-close clickable" onclick="closeEraModal()">×</button>
                </div>
                <div class="era-modal-body">
                    <p id="era-modal-desc">Descripción extendida de la era.</p>
                    <span id="era-modal-duration" class="era-modal-duration">-- Millones de Años</span>
                </div>
            </div>



        </div><!-- /center-area -->

        <!-- Footer -->
        <footer id="footer">
            <div>
                <p class="gold">v2.1.0</p>
                <p>ZOROIKAMI | © 2026</p>
            </div>

            <!-- CONTROLES DE TIEMPO ELIMINADOS -->

            <div style="text-align:right">
                <p class="gold">Chile</p>
                <p>Monitoreo Satelital en Tiempo Real</p>
            </div>
        </footer>

    </div><!-- /ui-layer -->


    <!-- ══ NASA LIVE FEED ══ -->
    <div id="nasa-feed-panel" class="nasa-feed-panel" style="display:none;"></div>

    <!-- Lógica de la escena -->
    <script type="module" src="js/dashboard.js"></script>

    <!-- Service Worker -->
    <script>
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/ispep/sw.js').catch(() => { });
        }

        // ══ SweetAlert2 Logic ══
        function confirmLogout() {
            if (typeof window.playBeep === 'function') window.playBeep(800, 'triangle', 0.05, 0.03);
            Swal.fire({
                title: '¿Desconectar Enlace Neuronal?',
                text: "Saldrás de la red YoRHa y la simulación se detendrá.",
                icon: 'warning',
                showCancelButton: true,
                background: 'rgba(10, 10, 12, 0.95)',
                color: '#fff',
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#333',
                confirmButtonText: 'DESCONECTAR',
                cancelButtonText: 'CANCELAR',
                customClass: {
                    popup: 'yorha-swal-popup',
                    title: 'yorha-swal-title',
                    confirmButton: 'swal2-confirm',
                    cancelButton: 'swal2-confirm'
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = 'php/logout.php';
                }
            })
        }

        // Check for success param
        window.addEventListener('DOMContentLoaded', () => {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('success') === 'profile') {
                Swal.fire({
                    icon: 'success',
                    title: 'Perfil Actualizado',
                    text: 'Los datos del investigador han sido sincronizados exitosamente.',
                    background: 'rgba(10, 10, 12, 0.95)',
                    color: '#fff',
                    confirmButtonColor: '#c5a358',
                    confirmButtonText: 'CONTINUAR',
                    customClass: {
                        popup: 'yorha-swal-popup',
                        title: 'yorha-swal-title',
                        confirmButton: 'swal2-confirm'
                    }
                });
                // Remove param from URL without reloading
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        });
    </script>

</body>

</html>