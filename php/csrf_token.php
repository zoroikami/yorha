<?php
/**
 * YorHa — CSRF Token Endpoint
 * Devuelve un token CSRF en formato JSON para formularios HTML estáticos.
 */
session_start();
require_once __DIR__ . '/config.php';

header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');

echo json_encode(['token' => csrf_token()]);
?>
