<?php
session_start();
require_once __DIR__ . '/php/config.php';
require_once __DIR__ . '/php/db.php';

if (!isset($_SESSION['investigador_email'])) {
    header("Location: login.html?error=acceso_denegado");
    exit();
}

// Fetch user data directly from DB to ensure we have the latest biografia and other fields
$stmt = $pdo->prepare("SELECT nombre, foto, banner, biografia FROM usuarios WHERE email = :email LIMIT 1");
$stmt->execute(['email' => $_SESSION['investigador_email']]);
$user_data = $stmt->fetch();

if (!$user_data) {
    // Failsafe if user somehow deleted but session active
    header("Location: login.html?error=invalid_credentials");
    exit();
}

$nombre = $user_data['nombre'] ?? $_SESSION['investigador_nombre'];
$foto = !empty($user_data['foto']) ? $user_data['foto'] : 'img/logodefault.png';
$banner = !empty($user_data['banner']) ? $user_data['banner'] : 'img/default_banner.jpg';
$biografia = $user_data['biografia'] ?? '';
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Perfil del Investigador — YorHa Project</title>
    <meta name="robots" content="noindex, nofollow">
    <link rel="icon" type="image/png" href="img/logo.png">

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Inter:wght@200;300;400;500;600&family=Bodoni+Moda:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet">

    <!-- SweetAlert2 -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

    <!-- Three.js + Post-Processing -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/postprocessing/EffectComposer.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/postprocessing/RenderPass.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/postprocessing/ShaderPass.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/shaders/CopyShader.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/shaders/LuminosityHighPassShader.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.134.0/examples/js/postprocessing/UnrealBloomPass.js"></script>

    <!-- Styles -->
    <link rel="stylesheet" href="css/profile.css">
    
    <script>
        // Check for success param
        window.addEventListener('DOMContentLoaded', () => {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('success') === 'profile') {
                Swal.fire({
                    icon: 'success',
                    title: 'Sincronización Exitosa',
                    text: 'Los datos del investigador han sido actualizados en la red YoRHa.',
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
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        });

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
            });
        }
    </script>
</head>
<body>

    <!-- ══ CANVAS THREE.JS (fondo) ══ -->
    <canvas id="three-canvas"></canvas>

    <!-- Navbar -->
    <nav id="navbar">
        <div class="brand">
            <h1>YORHA</h1>
            <span>Red Neuronal</span>
        </div>
        <div class="nav-actions">
            <a href="dashboard.php" class="btn-return">Volver a la Simulación</a>
        </div>
    </nav>

    <!-- Main Container -->
    <main class="profile-container">
        
        <!-- Header: Banner & Avatar -->
        <header class="profile-header">
            <div class="banner-wrapper clickable" onclick="document.getElementById('banner-upload').click();">
                <img src="<?php echo htmlspecialchars($banner); ?>" id="banner-preview" class="banner-img" alt="Banner del usuario">
                <div class="upload-overlay">
                    <span>📷 Cambiar Banner</span>
                </div>
            </div>

            <div class="avatar-wrapper clickable" onclick="document.getElementById('avatar-upload').click();">
                <img src="<?php echo htmlspecialchars($foto); ?>" id="avatar-preview" class="avatar-img" alt="Avatar del usuario">
                <div class="upload-overlay avatar-overlay">
                    <span>📷</span>
                </div>
            </div>
            
            <div class="profile-title">
                <h2><?php echo htmlspecialchars($nombre); ?></h2>
                <p>Investigador Autorizado</p>
            </div>
        </header>

        <form action="php/update_profile.php" method="POST" enctype="multipart/form-data" id="profile-form">
            <input type="file" name="banner" id="banner-upload" accept="image/png, image/jpeg, image/webp" style="display: none;" onchange="previewImage(this, 'banner-preview')">
            <input type="file" name="avatar" id="avatar-upload" accept="image/png, image/jpeg, image/webp" style="display: none;" onchange="previewImage(this, 'avatar-preview')">

            <div class="profile-grid">
                <!-- Left Column: Settings -->
                <section class="profile-card">
                    <h3 class="card-title">Ajustes de Enlace</h3>
                    
                    <div class="form-group">
                        <label>Nombre del Investigador</label>
                        <input type="text" name="nombre" value="<?php echo htmlspecialchars($nombre); ?>" required autocomplete="name">
                    </div>
                    
                    <div class="form-group">
                        <label>Biografía Estelar</label>
                        <textarea name="biografia" rows="4" placeholder="Cuéntanos sobre tu interés en la astronomía y el espacio..."><?php echo htmlspecialchars($biografia); ?></textarea>
                    </div>

                    <div class="form-group">
                        <label>Nueva Contraseña</label>
                        <input type="password" name="password" placeholder="(Dejar en blanco para mantener actual)" autocomplete="new-password">
                    </div>

                    <div class="profile-actions">
                        <button type="submit" class="interaction-btn save-btn">Sincronizar Datos</button>
                        <button type="button" onclick="confirmLogout()" class="interaction-btn logout-btn">Desconectar</button>
                    </div>
                </section>

                <!-- Right Column: Contributions (Mock) -->
                <section class="profile-card">
                    <h3 class="card-title">Aportaciones a YoRHa</h3>
                    
                    <div class="contributions-empty">
                        <div class="icon-placeholder">✨</div>
                        <h4>Aún no hay descubrimientos</h4>
                        <p>Pronto podrás integrar información estelar y expandir la base de datos de la red YoRHa.</p>
                        <button type="button" class="interaction-btn disabled-btn" disabled>Aportar Datos (Próximamente)</button>
                    </div>
                </section>
            </div>
        </form>

    </main>

    <script>
        function previewImage(input, previewId) {
            if (input.files && input.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById(previewId).src = e.target.result;
                };
                reader.readAsDataURL(input.files[0]);
            }
        }
    </script>

    <!-- Fondo 3D Estático -->
    <script type="module" src="js/profile-bg.js"></script>
</body>
</html>
