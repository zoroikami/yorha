<?php
/**
 * YorHa — Proceso de Registro (PDO + Prepared Statements)
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

    $nombre = trim($_POST['nombre'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $password_plain = $_POST['password'] ?? '';

    // Validaciones básicas
    if (empty($nombre) || empty($email) || empty($password_plain)) {
        header("Location: ../login.html?error=invalid_credentials");
        exit();
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        header("Location: ../login.html?error=invalid_credentials");
        exit();
    }

    if (strlen($password_plain) < 6) {
        header("Location: ../login.html?error=invalid_credentials");
        exit();
    }

    // Verificar si el correo ya está registrado (Prepared Statement)
    $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE email = :email LIMIT 1");
    $stmt->execute(['email' => $email]);

    if ($stmt->fetch()) {
        header("Location: ../login.html?error=email_exists");
        exit();
    }

    // Encriptar la contraseña de forma segura
    $password_hash = password_hash($password_plain, PASSWORD_DEFAULT);
    $foto_default = 'img/logodefault.png';

    // Insertar en la base de datos (Prepared Statement)
    $stmt = $pdo->prepare(
        "INSERT INTO usuarios (nombre, email, password, email_verificado, foto) 
         VALUES (:nombre, :email, :password, 0, :foto)"
    );
    $stmt->execute([
        'nombre' => $nombre,
        'email' => $email,
        'password' => $password_hash,
        'foto' => $foto_default
    ]);

    // Guardar sesión y entrar directamente
    session_regenerate_id(true);
    $_SESSION['investigador_nombre'] = $nombre;
    $_SESSION['investigador_email'] = $email;
    $_SESSION['investigador_foto'] = $foto_default;
    $_SESSION['investigador_banner'] = 'img/default_banner.jpg';
    $_SESSION['last_activity'] = time();

    header("Location: ../dashboard.php");
    exit();
}
?>
