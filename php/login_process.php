<?php
/**
 * Vynas — Proceso de Login (PDO + Prepared Statements)
 * Migrado de mysqli a PDO para prevenir SQL injection.
 */
session_start();
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

if ($_SERVER["REQUEST_METHOD"] === "POST") {

    // Verificar CSRF
    if (!csrf_verify()) {
        header("Location: ../login.html?error=csrf_failed");
        exit();
    }

    $email = trim($_POST['email'] ?? '');
    $password_plain = $_POST['password'] ?? '';

    if (empty($email) || empty($password_plain)) {
        header("Location: ../login.html?error=invalid_credentials");
        exit();
    }

    // Buscar el usuario por email (Prepared Statement)
    $stmt = $pdo->prepare("SELECT * FROM usuarios WHERE email = :email LIMIT 1");
    $stmt->execute(['email' => $email]);
    $user = $stmt->fetch();

    if ($user) {
        // Verificamos si la cuenta fue creada exclusivamente con Google/GitHub
        if ($user['password'] === 'GOOGLE_AUTH' || $user['password'] === 'GITHUB_AUTH') {
            header("Location: ../login.html?error=use_social");
            exit();
        }

        // Verificamos el hash
        if (password_verify($password_plain, $user['password'])) {
            // Login correcto — regenerar session ID para prevenir session fixation
            session_regenerate_id(true);

            $_SESSION['investigador_nombre'] = $user['nombre'];
            $_SESSION['investigador_email'] = $user['email'];
            $_SESSION['investigador_foto'] = $user['foto'];
            $_SESSION['investigador_banner'] = $user['banner'] ?? 'img/default_banner.jpg';
            $_SESSION['last_activity'] = time();

            header("Location: ../dashboard.php");
            exit();
        }
    }

    // Credenciales incorrectas (respuesta genérica para no revelar si el email existe)
    header("Location: ../login.html?error=invalid_credentials");
    exit();
}
?>

