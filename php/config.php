<?php
/**
 * Vynas — Configuración Central Segura
 * Todas las credenciales sensibles centralizadas aquí.
 * En producción, mover estos valores a variables de entorno.
 */

// Función ligera para cargar .env en PHP sin librerías externas
function load_env(string $path): void {
    if (!file_exists($path)) {
        return;
    }
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line) || strpos($line, '#') === 0) {
            continue;
        }
        if (strpos($line, '=') !== false) {
            list($key, $val) = explode('=', $line, 2);
            $key = trim($key);
            $val = trim($val);
            // Remover comillas si existen
            $val = preg_replace('/^[\'"]|[\'"]$/', '', $val);
            
            if (!array_key_exists($key, $_SERVER) && !array_key_exists($key, $_ENV)) {
                putenv("{$key}={$val}");
                $_ENV[$key] = $val;
                $_SERVER[$key] = $val;
            }
        }
    }
}

// Cargar variables de entorno
load_env(__DIR__ . '/../.env');

// ══ Entorno ══
// Cambiar a false en producción
define('VYNAS_DEBUG', filter_var(getenv('VYNAS_DEBUG') ?: true, FILTER_VALIDATE_BOOLEAN));

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
define('GITHUB_CLIENT_ID', getenv('GITHUB_CLIENT_ID') ?: 'Ov23lih8qMJVovBZZYbC');
define('GITHUB_CLIENT_SECRET', getenv('GITHUB_CLIENT_SECRET') ?: '');
define('GOOGLE_CLIENT_ID', getenv('GOOGLE_CLIENT_ID') ?: '');

// ══ APIs Científicas ══
define('NASA_API_KEY', getenv('NASA_API_KEY') ?: 'DEMO_KEY');

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
