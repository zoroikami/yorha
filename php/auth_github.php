<?php
/**
 * Vynas — Autenticación GitHub OAuth (PDO + Prepared Statements)
 * Migrado de mysqli a PDO. Credenciales movidas a config.php.
 */
session_start();
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

if (isset($_GET['code'])) {
    // Validar state para prevenir CSRF
    $state = $_GET['state'] ?? '';
    $expected_state = $_SESSION['oauth_github_state'] ?? '';
    unset($_SESSION['oauth_github_state']); // Consumir el token (one-time use)

    if (empty($state) || !hash_equals($expected_state, $state)) {
        header("Location: ../?error=csrf_failed");
        exit();
    }

    $code = $_GET['code'];

    // 1. Intercambio de código por Token
    $ch = curl_init("https://github.com/login/oauth/access_token");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, !VYNAS_DEBUG); // true en producción, false solo en localhost/dev
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
        'client_id' => GITHUB_CLIENT_ID,
        'client_secret' => GITHUB_CLIENT_SECRET,
        'code' => $code
    ]));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Accept: application/json']);

    $data = json_decode(curl_exec($ch), true);
    curl_close($ch);

    if (isset($data['access_token'])) {
        $access_token = $data['access_token'];

        // 2. Obtener datos del usuario
        $ch = curl_init("https://api.github.com/user");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, !VYNAS_DEBUG);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Authorization: token $access_token",
            "User-Agent: Vynas-App/2.1.0"
        ]);

        $user_data = json_decode(curl_exec($ch), true);
        curl_close($ch);

        if (isset($user_data['login'])) {
            $nombre = $user_data['name'] ?? $user_data['login'];
            $email = $user_data['email'] ?? ($user_data['login'] . "@github.com");
            $foto = $user_data['avatar_url'] ?? 'img/logodefault.png';

            // 3. Verificar si el usuario ya existe (Prepared Statement)
            $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE email = :email LIMIT 1");
            $stmt->execute(['email' => $email]);

            if (!$stmt->fetch()) {
                // Insertar (Prepared Statement)
                $stmt = $pdo->prepare(
                    "INSERT INTO usuarios (nombre, email, password, email_verificado, foto, banner) 
                     VALUES (:nombre, :email, 'GITHUB_AUTH', 1, :foto, 'img/default_banner.jpg')"
                );
                $stmt->execute([
                    'nombre' => $nombre,
                    'email' => $email,
                    'foto' => $foto
                ]);
                $_SESSION['investigador_banner'] = 'img/default_banner.jpg';
            } else {
                $stmt_get = $pdo->prepare("SELECT banner FROM usuarios WHERE email = :email");
                $stmt_get->execute(['email' => $email]);
                $existingUser = $stmt_get->fetch();
                $_SESSION['investigador_banner'] = $existingUser['banner'] ?? 'img/default_banner.jpg';
                
                // Ya existe: Actualizar foto
                $stmt = $pdo->prepare("UPDATE usuarios SET foto = :foto WHERE email = :email");
                $stmt->execute(['foto' => $foto, 'email' => $email]);
            }

            // Iniciar sesión
            session_regenerate_id(true);
            $_SESSION['investigador_nombre'] = $nombre;
            $_SESSION['investigador_email'] = $email;
            $_SESSION['investigador_foto'] = $foto;
            $_SESSION['last_activity'] = time();

            header("Location: ../?success=login");
            exit();
        }
    }

    // Cualquier fallo redirige al login
    header("Location: ../?error=invalid_credentials");
    exit();
} else {
    header("Location: ../?error=invalid_credentials");
    exit();
}
?>
