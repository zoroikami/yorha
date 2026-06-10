<?php
/**
 * Vynas — Proceso de Registro (API JSON)
 * Retorna respuestas en formato JSON para el frontend React.
 */
session_start();
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

if ($_SERVER["REQUEST_METHOD"] === "POST") {

    // Verificar CSRF
    if (!csrf_verify()) {
        http_response_code(400);
        echo json_encode(["error" => "csrf_failed", "message" => "Validación de token de seguridad fallida."]);
        exit();
    }

    // Permitir tanto POST tradicional como JSON
    $input = json_decode(file_get_contents('php://input'), true);
    $nombre = trim($_POST['nombre'] ?? $input['nombre'] ?? '');
    $email = trim($_POST['email'] ?? $input['email'] ?? '');
    $password_plain = $_POST['password'] ?? $input['password'] ?? '';

    // Validaciones básicas
    if (empty($nombre) || empty($email) || empty($password_plain)) {
        http_response_code(400);
        echo json_encode(["error" => "invalid_credentials", "message" => "Completa todos los campos obligatorios."]);
        exit();
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(["error" => "invalid_email", "message" => "Formato de correo electrónico no válido."]);
        exit();
    }

    if (strlen($password_plain) < 6) {
        http_response_code(400);
        echo json_encode(["error" => "password_too_short", "message" => "La contraseña debe tener al menos 6 caracteres."]);
        exit();
    }

    // Verificar si el correo ya está registrado (Prepared Statement)
    $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE email = :email LIMIT 1");
    $stmt->execute(['email' => $email]);

    if ($stmt->fetch()) {
        http_response_code(400);
        echo json_encode(["error" => "email_exists", "message" => "El correo electrónico ya se encuentra registrado."]);
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

    echo json_encode([
        "success" => true,
        "user" => [
            "nombre" => $nombre,
            "email" => $email,
            "foto" => $foto_default,
            "banner" => 'img/default_banner.jpg'
        ]
    ]);
    exit();
} else {
    http_response_code(405);
    echo json_encode(["error" => "method_not_allowed"]);
    exit();
}
?>
