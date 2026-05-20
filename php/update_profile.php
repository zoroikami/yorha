<?php
/**
 * Vynas — Actualizar Perfil con Avatar y Banner (PDO)
 */
session_start();
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

if (!isset($_SESSION['investigador_email'])) {
    header("Location: ../login.html?error=acceso_denegado");
    exit();
}

if ($_SERVER["REQUEST_METHOD"] === "POST") {

    $email = $_SESSION['investigador_email'];
    $nombre = trim($_POST['nombre'] ?? '');
    $biografia = trim($_POST['biografia'] ?? '');
    $password_plain = $_POST['password'] ?? '';

    if (empty($nombre)) {
        header("Location: ../dashboard.php");
        exit();
    }

    // Preparar update dinámico
    $update_fields = ["nombre = :nombre"];
    $params = ['nombre' => $nombre, 'email' => $email];

    if (isset($_POST['biografia'])) {
        $update_fields[] = "biografia = :biografia";
        $params['biografia'] = $biografia;
    }

    if (!empty($password_plain)) {
        $update_fields[] = "password = :password";
        $params['password'] = password_hash($password_plain, PASSWORD_DEFAULT);
    }

    // Funciones Helper para Subidas Seguras
    function handleUpload($file, $dest_folder) {
        if ($file['error'] !== UPLOAD_ERR_OK) return null;
        
        $allowed_mimes = ['image/jpeg', 'image/png', 'image/webp'];
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        if (!in_array($mime, $allowed_mimes)) return null;

        $ext = '.jpg';
        if ($mime === 'image/png') $ext = '.png';
        if ($mime === 'image/webp') $ext = '.webp';

        // Evitar caché creando un nombre único por timestamp
        $filename = md5(uniqid(rand(), true)) . $ext;
        $dest_path = __DIR__ . '/../data/uploads/' . $dest_folder . '/' . $filename;
        $rel_path = 'data/uploads/' . $dest_folder . '/' . $filename;

        if (move_uploaded_file($file['tmp_name'], $dest_path)) {
            return $rel_path;
        }
        return null;
    }

    // Procesar Avatar
    if (isset($_FILES['avatar']) && $_FILES['avatar']['error'] === UPLOAD_ERR_OK) {
        $avatar_path = handleUpload($_FILES['avatar'], 'avatars');
        if ($avatar_path) {
            $update_fields[] = "foto = :foto";
            $params['foto'] = $avatar_path;
            $_SESSION['investigador_foto'] = $avatar_path;
        }
    }

    // Procesar Banner
    if (isset($_FILES['banner']) && $_FILES['banner']['error'] === UPLOAD_ERR_OK) {
        $banner_path = handleUpload($_FILES['banner'], 'banners');
        if ($banner_path) {
            $update_fields[] = "banner = :banner";
            $params['banner'] = $banner_path;
            $_SESSION['investigador_banner'] = $banner_path;
        }
    }

    // Ejecutar Query
    $set_clause = implode(", ", $update_fields);
    $stmt = $pdo->prepare("UPDATE usuarios SET $set_clause WHERE email = :email");
    $stmt->execute($params);

    // Actualizar sesión base
    $_SESSION['investigador_nombre'] = $nombre;

    header("Location: ../profile.php?success=profile");
    exit();
}
?>

