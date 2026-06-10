<?php
/**
 * Vynas — Session Verification Endpoint
 * Returns user session status and profile data as JSON.
 */
require_once __DIR__ . '/config.php';
session_start();

header('Content-Type: application/json');

if (isset($_SESSION['investigador_nombre'])) {
    $user_img = (isset($_SESSION['investigador_foto']) && !empty($_SESSION['investigador_foto']))
        ? $_SESSION['investigador_foto']
        : 'img/logodefault.png';

    // Verify session timeout
    $timeout = 900; // 15 minutes
    if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity'] > $timeout)) {
        session_unset();
        session_destroy();
        echo json_encode([
            "authenticated" => false,
            "error" => "session_expired"
        ]);
        exit();
    }
    
    $_SESSION['last_activity'] = time();

    echo json_encode([
        "authenticated" => true,
        "user" => [
            "nombre" => $_SESSION['investigador_nombre'],
            "email" => $_SESSION['investigador_email'] ?? '',
            "foto" => $user_img,
            "banner" => $_SESSION['investigador_banner'] ?? 'img/default_banner.jpg'
        ]
    ]);
} else {
    echo json_encode([
        "authenticated" => false
    ]);
}
?>
