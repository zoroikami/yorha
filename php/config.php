<?php
/**
 * Vynas — Configuración Central Segura
 * Todas las credenciales sensibles centralizadas aquí.
 * En producción, mover estos valores a variables de entorno.
 */

// ══ Entorno ══
// Cambiar a false en producción
define('VYNAS_DEBUG', true);

if (VYNAS_DEBUG) {
    error_reporting(E_ALL);
    ini_set('display_errors', 0); // Nunca mostrar errores al usuario
    ini_set('log_errors', 1);
    ini_set('error_log', __DIR__ . '/../logs/php_errors.log');
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
    ini_set('log_errors', 1);
}

// ══ OAuth Credentials ══
// En producción: getenv('GITHUB_CLIENT_ID') ?? 'fallback'
define('GITHUB_CLIENT_ID', 'Ov23lih8qMJVovBZZYbC');
define('GITHUB_CLIENT_SECRET', 'b47dd65fbd1685cccda84240c690833e4886260f');
define('GOOGLE_CLIENT_ID', '977516655506-vr13tt7l77ghiie2kbff4cqjo7645vb1.apps.googleusercontent.com');

// ══ CSRF Token Management ══
function csrf_token(): string {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function csrf_field(): string {
    return '<input type="hidden" name="csrf_token" value="' . htmlspecialchars(csrf_token()) . '">';
}

function csrf_verify(): bool {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    $token = $_POST['csrf_token'] ?? '';
    if (empty($token) || !hash_equals($_SESSION['csrf_token'] ?? '', $token)) {
        return false;
    }
    // Regenerar token después de validar (one-time use)
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    return true;
}
?>
