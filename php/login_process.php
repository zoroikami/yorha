<?php
/**
 * Vynas — Proceso de Login (API JSON)
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
    $email = trim($_POST['email'] ?? $input['email'] ?? '');
    $password_plain = $_POST['password'] ?? $input['password'] ?? '';

    if (empty($email) || empty($password_plain)) {
        http_response_code(400);
        echo json_encode(["error" => "invalid_credentials", "message" => "Las credenciales son incompletas."]);
        exit();
    }

    // Buscar el usuario por email (Prepared Statement)
    $stmt = $pdo->prepare("SELECT * FROM usuarios WHERE email = :email LIMIT 1");
    $stmt->execute(['email' => $email]);
    $user = $stmt->fetch();

    if ($user) {
        // Verificamos si la cuenta fue creada exclusivamente con Google/GitHub
        if ($user['password'] === 'GOOGLE_AUTH' || $user['password'] === 'GITHUB_AUTH') {
            http_response_code(400);
            echo json_encode(["error" => "use_social", "message" => "Esta cuenta utiliza inicio de sesión social (Google/GitHub)."]);
            exit();
        }

        // Verificamos el hash
        if (password_verify($password_plain, $user['password'])) {
            // Login correcto
            session_regenerate_id(true);

            $_SESSION['investigador_nombre'] = $user['nombre'];
            $_SESSION['investigador_email'] = $user['email'];
            $_SESSION['investigador_foto'] = $user['foto'];
            $_SESSION['investigador_banner'] = $user['banner'] ?? 'img/default_banner.jpg';
            $_SESSION['last_activity'] = time();

            echo json_encode([
                "success" => true,
                "user" => [
                    "nombre" => $user['nombre'],
                    "email" => $user['email'],
                    "foto" => $user['foto'],
                    "banner" => $user['banner'] ?? 'img/default_banner.jpg'
                ]
            ]);
            exit();
        }
    }

    // Credenciales incorrectas
    http_response_code(401);
    echo json_encode(["error" => "invalid_credentials", "message" => "Credenciales incorrectas."]);
    exit();
} else {
    http_response_code(405);
    echo json_encode(["error" => "method_not_allowed"]);
    exit();
}
?>
