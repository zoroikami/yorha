<?php
/**
 * YorHa — Autenticación Google OAuth (PDO + Prepared Statements)
 * Migrado de mysqli a PDO. Token validado server-side.
 */
session_start();
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

$id_token = $_GET['token'] ?? '';

if (empty($id_token)) {
    header("Location: ../login.html?error=invalid_credentials");
    exit();
}

// Validar token con Google
$url = "https://oauth2.googleapis.com/tokeninfo?id_token=" . urlencode($id_token);
$response = @file_get_contents($url);

if ($response === false) {
    header("Location: ../login.html?error=invalid_credentials");
    exit();
}

$user_data = json_decode($response, true);

if (isset($user_data['email'])) {
    $email = $user_data['email'];
    $nombre = $user_data['name'] ?? 'Usuario Google';
    $foto = $user_data['picture'] ?? 'img/logodefault.png';

    // Buscar si ya existe el usuario (Prepared Statement)
    $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE email = :email LIMIT 1");
    $stmt->execute(['email' => $email]);

    if (!$stmt->fetch()) {
        // Nuevo usuario, crear cuenta
        $stmt_insert = $pdo->prepare(
            "INSERT INTO usuarios (nombre, email, password, email_verificado, foto, banner) 
             VALUES (:nombre, :email, 'GOOGLE_AUTH', 1, :foto, 'img/default_banner.jpg')"
        );
        $stmt_insert->execute([
            'nombre' => $nombre,
            'email' => $email,
            'foto' => $foto
        ]);
        $_SESSION['investigador_banner'] = 'img/default_banner.jpg';
    } else {
        // Usuario existente, obtener el banner
        $stmt_get = $pdo->prepare("SELECT banner FROM usuarios WHERE email = :email");
        $stmt_get->execute(['email' => $email]);
        $existingUser = $stmt_get->fetch();
        $_SESSION['investigador_banner'] = $existingUser['banner'] ?? 'img/default_banner.jpg';
        
        // Ya existe: Actualizar foto (Prepared Statement)
        $stmt = $pdo->prepare("UPDATE usuarios SET foto = :foto WHERE email = :email");
        $stmt->execute(['foto' => $foto, 'email' => $email]);
    }

    // Guardar en sesión
    session_regenerate_id(true);
    $_SESSION['investigador_nombre'] = $nombre;
    $_SESSION['investigador_email'] = $email;
    $_SESSION['investigador_foto'] = $foto;
    $_SESSION['last_activity'] = time();

    header("Location: ../dashboard.php");
    exit();
} else {
    header("Location: ../login.html?error=invalid_credentials");
    exit();
}
?>