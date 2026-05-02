<?php
// Configuración de la base de datos
// Detectar automáticamente si estamos en WAMP (localhost) o en Producción (InfinityFree)
if ($_SERVER['SERVER_NAME'] === 'localhost' || $_SERVER['SERVER_NAME'] === '127.0.0.1') {
    // Credenciales WAMP Local
    $host = 'localhost';
    $db = 'ispep_db';
    $user = 'root';
    $pass = ''; 
} else {
    // Credenciales de Producción (InfinityFree / Tu Hosting)
    // ¡REEMPLAZA ESTOS VALORES con los de tu hosting!
    $host = 'sqlXXX.infinityfree.com'; // Ej: sql123.infinityfree.com
    $db = 'if0_12345678_ispep_db';     // Nombre de DB en el hosting
    $user = 'if0_12345678';            // Tu usuario de MySQL en el hosting
    $pass = 'TuContrasenaSecreta';     // Tu contraseña de la base de datos
}

$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    // Si quieres probar si funciona, puedes descomentar la siguiente línea:
    // echo "Conexión exitosa al sistema ISPEP";
} catch (\PDOException $e) {
    throw new \PDOException($e->getMessage(), (int) $e->getCode());
}
?>