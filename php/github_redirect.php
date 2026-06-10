<?php
/**
 * Vynas — GitHub OAuth Redirect con protección CSRF
 * Genera un `state` aleatorio, lo guarda en sesión, y redirige a GitHub.
 * Esto previene ataques CSRF en el flujo OAuth.
 */
session_start();
require_once __DIR__ . '/config.php';

// Generar token anti-CSRF para el flujo OAuth
$state = bin2hex(random_bytes(16));
$_SESSION['oauth_github_state'] = $state;

$params = http_build_query([
    'client_id' => GITHUB_CLIENT_ID,
    'scope'     => 'user',
    'state'     => $state
]);

header("Location: https://github.com/login/oauth/authorize?{$params}");
exit();
?>
