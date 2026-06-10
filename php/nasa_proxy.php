<?php
/**
 * Vynas — NASA API Secure Caching Proxy
 * Protege la API Key de la NASA y previene límites de cuotas mediante caché local en data/cache/.
 * Todos los endpoints de NASA deben pasar por aquí — NUNCA exponer la key al frontend.
 */
require_once __DIR__ . '/config.php';
session_start();

// Asegurar autenticación del investigador
if (!isset($_SESSION['investigador_nombre'])) {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(["error" => "No autorizado. Inicie sesión en la estación Vynas."]);
    exit();
}

$endpoint = $_GET['endpoint'] ?? '';
$cache_dir = __DIR__ . '/../data/cache';

// Crear directorio de caché si no existe
if (!is_dir($cache_dir)) {
    mkdir($cache_dir, 0755, true);
}

// ── Mapeo explícito de endpoints (previene SSRF) ──
// Cada entrada: [url, cache_ttl_seconds]
$api_key = NASA_API_KEY;

switch ($endpoint) {
    case 'epic':
        $url = "https://api.nasa.gov/EPIC/api/natural?api_key={$api_key}";
        $cache_time = 3600; // 1 hora
        break;

    case 'epic_images':
        $url = "https://api.nasa.gov/EPIC/api/natural/images?api_key={$api_key}";
        $cache_time = 3600;
        break;

    case 'apod':
        $url = "https://api.nasa.gov/planetary/apod?api_key={$api_key}";
        $cache_time = 86400; // 24 horas
        break;

    case 'neo':
    case 'neo_feed':
        $url = "https://api.nasa.gov/neo/rest/v1/feed/today?detailed=false&api_key={$api_key}";
        $cache_time = 3600;
        break;

    case 'donki_flares':
        $end = date('Y-m-d');
        $start = date('Y-m-d', strtotime('-7 days'));
        $url = "https://api.nasa.gov/DONKI/FLR?startDate={$start}&endDate={$end}&api_key={$api_key}";
        $cache_time = 900; // 15 minutos
        break;

    default:
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(["error" => "Endpoint no válido: " . htmlspecialchars($endpoint)]);
        exit();
}

$cache_file = "{$cache_dir}/nasa_{$endpoint}.json";

// Retornar caché si existe y no ha expirado
if (file_exists($cache_file) && (time() - filemtime($cache_file) < $cache_time)) {
    header('Content-Type: application/json');
    header('X-Vynas-Cache: HIT');
    readfile($cache_file);
    exit();
}

// Si no hay caché o expiró, realizar la llamada cURL
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_USERAGENT, 'VynasOS/2.8.0');
curl_setopt($ch, CURLOPT_TIMEOUT, 15);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_error = curl_error($ch);
curl_close($ch);

header('Content-Type: application/json');

if ($http_code === 200 && !empty($response)) {
    // Guardar en caché local
    file_put_contents($cache_file, $response);
    header('X-Vynas-Cache: MISS');
    echo $response;
} else {
    // Fallback: servir caché expirado si existe
    if (file_exists($cache_file)) {
        header('X-Vynas-Cache: FALLBACK');
        readfile($cache_file);
    } else {
        http_response_code(502);
        echo json_encode([
            "error" => "Error de conexión con la API de la NASA",
            "details" => VYNAS_DEBUG ? $curl_error : null
        ]);
    }
}
?>
