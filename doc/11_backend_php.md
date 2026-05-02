# Backend PHP — Sistema de Autenticación

> **Ruta:** `/php/`  
> **Archivos:** `db.php`, `login_process.php`, `register_process.php`, `auth_google.php`, `auth_github.php`, `logout.php`, `auth.php`

---

## Propósito

El directorio `/php/` contiene toda la lógica del servidor para:
1. Conexión a base de datos
2. Login y registro tradicional
3. Autenticación OAuth (Google y GitHub)
4. Destrucción segura de sesiones

---

## Diagrama de Flujo

```
                    ┌─────────────────┐
                    │   login.html    │
                    └──────┬──────────┘
            ┌──────────────┼──────────────────┐
            ▼              ▼                  ▼
    ┌───────────┐  ┌──────────────┐   ┌──────────────┐
    │login_form │  │ Google GSI   │   │ GitHub Link  │
    │  (POST)   │  │  (callback)  │   │  (?code=)    │
    └─────┬─────┘  └──────┬───────┘   └──────┬───────┘
          ▼               ▼                   ▼
  login_process.php  auth_google.php    auth_github.php
          │               │                   │
          ▼               ▼                   ▼
       db.php          mysqli             mysqli
       (PDO)          (legacy)           (legacy)
          │               │                   │
          └───────────────┴───────────────────┘
                          │
                    $_SESSION creada
                          │
                     dashboard.php
                          │
                     logout.php
                          │
                    Sesión destruida
```

---

## `db.php` — Conexión PDO

**Tamaño:** 706 bytes (23 líneas)

Establece la conexión a MySQL usando **PDO** con configuración segura:

```php
$host = 'localhost';
$db   = 'ispep_db';
$user = 'root';
$pass = '';            // WAMP por defecto
$charset = 'utf8mb4';

$pdo = new PDO($dsn, $user, $pass, [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,  // Prepared statements nativos
]);
```

| Configuración | Efecto |
|---------------|--------|
| `ERRMODE_EXCEPTION` | Lanza excepciones PHP en errores SQL |
| `FETCH_ASSOC` | Los resultados son arrays asociativos |
| `EMULATE_PREPARES = false` | Usa prepared statements nativos de MySQL |
| `utf8mb4` | Soporta emojis y caracteres especiales |

**Usado por:** `login_process.php`, `register_process.php`  
**No usado por:** `auth_google.php`, `auth_github.php` (usan mysqli directamente)

---

## `login_process.php` — Login Tradicional

**Tamaño:** 1.4 KB (45 líneas)

### Flujo

1. Valida que sea petición POST
2. Incluye `db.php` (conexión PDO)
3. Busca usuario por email con **prepared statement**:
   ```php
   $stmt = $pdo->prepare("SELECT * FROM usuarios WHERE email = :email");
   ```
4. Si la contraseña almacenada es `GOOGLE_AUTH` o `GITHUB_AUTH`:
   - Redirige con `?error=use_social`
5. Verifica contraseña con `password_verify()` (bcrypt):
   - ✅ Éxito → Crea sesión y redirige a `dashboard.php`
   - ❌ Fallo → Redirige con `?error=invalid_credentials`
6. Si el usuario no existe → `?error=invalid_credentials`

### Variables de Sesión Creadas

| Variable | Valor |
|----------|-------|
| `$_SESSION['investigador_nombre']` | Nombre del usuario |
| `$_SESSION['investigador_email']` | Email del usuario |
| `$_SESSION['investigador_foto']` | URL/ruta de la foto |

---

## `register_process.php` — Registro de Cuenta

**Tamaño:** 1.7 KB (46 líneas)

### Flujo

1. Valida que sea petición POST
2. Incluye `db.php` (conexión PDO)
3. Verifica si el email ya existe:
   ```php
   $check_stmt = $pdo->prepare("SELECT id FROM usuarios WHERE email = :email");
   ```
   - Si existe → Redirige con `?error=email_exists`
4. Hashea la contraseña:
   ```php
   $password_hash = password_hash($password_plain, PASSWORD_DEFAULT);
   ```
5. Inserta nuevo usuario con foto por defecto:
   ```php
   INSERT INTO usuarios (nombre, email, password, email_verificado, foto)
   VALUES (:nombre, :email, :password, 0, 'img/logodefault.png')
   ```
6. Crea sesión y redirige a `dashboard.php` (auto-login después del registro)

### Seguridad

| Aspecto | Implementación |
|---------|----------------|
| Hash de contraseña | `PASSWORD_DEFAULT` (bcrypt) |
| Prevención de duplicados | Check previo por email |
| SQL Injection | Prepared statements (PDO) |
| Email verificado | Default `0` para registro tradicional |

---

## `auth_google.php` — OAuth Google

**Tamaño:** 1.8 KB (46 líneas)

### Flujo

1. Recibe el **id_token** (JWT) vía GET: `$_GET['token']`
2. Valida el token contra la API de Google:
   ```php
   $url = "https://oauth2.googleapis.com/tokeninfo?id_token=" . $id_token;
   $response = file_get_contents($url);
   ```
3. Extrae: email, nombre, foto del perfil
4. Usa **mysqli** (legacy) para la operación de base de datos:
   - Si el usuario no existe → INSERT con password `'GOOGLE_AUTH'`
   - Si ya existe → UPDATE de la foto (por si cambió en Google)
5. Crea sesión y redirige a `dashboard.php`

### ⚠️ Observaciones de Seguridad

| Problema | Detalle |
|----------|---------|
| Token via GET | El JWT viaja en la URL (visible en logs) |
| No usa PDO | Usa `mysqli_real_escape_string` en lugar de prepared statements |
| `file_get_contents` | No valida certificado SSL |
| Sin validación de `aud` | No verifica que el token sea para este client_id |

---

## `auth_github.php` — OAuth GitHub

**Tamaño:** 3.4 KB (83 líneas)

### Flujo OAuth (Authorization Code Flow)

```
1. Usuario click en "GitHub Account" en login.html
   → Redirige a github.com/login/oauth/authorize?client_id=...

2. GitHub redirige de vuelta con ?code=XXXXX
   → auth_github.php recibe el código

3. Intercambio code → access_token:
   POST https://github.com/login/oauth/access_token
   Body: { client_id, client_secret, code }

4. Con el access_token, obtiene datos del usuario:
   GET https://api.github.com/user
   Header: Authorization: token {access_token}

5. Guarda/actualiza en BD y crea sesión
```

### Credenciales

| Parámetro | Valor |
|-----------|-------|
| Client ID | `Ov23lih8qMJVovBZZYbC` |
| Client Secret | `b47dd65fbd168...` (hardcodeado) |

### Manejo de Datos

- **Nombre:** `user_data['name']` con fallback a `user_data['login']`
- **Email:** `user_data['email']` con fallback a `login@github.com`
- **Foto:** `user_data['avatar_url']`
- **Password:** Se guarda como `'GITHUB_AUTH'` (marcador, no es contraseña real)

### ⚠️ Observaciones de Seguridad

| Problema | Detalle |
|----------|---------|
| Client Secret hardcodeado | Debería estar en variable de entorno |
| `CURLOPT_SSL_VERIFYPEER = false` | Deshabilita verificación SSL |
| No usa PDO | Usa `mysqli_real_escape_string` |
| Errores expuestos | `print_r($data)` en caso de falla |
| `display_errors = 1` | Activo en producción |

---

## `logout.php` — Cierre de Sesión

**Tamaño:** 456 bytes (20 líneas)

### Flujo

1. `session_start()` — Abre la sesión actual
2. `session_unset()` — Limpia todas las variables de sesión
3. `session_destroy()` — Destruye la sesión en el servidor
4. **Borra la cookie de sesión** del navegador:
   ```php
   setcookie(session_name(), '', time() - 42000, ...);
   ```
5. Redirige a `login.html`

Este proceso sigue la recomendación **NIST** de destrucción completa de sesión (datos del servidor + cookie del cliente).

---

## `auth.php` — Middleware de Autenticación (Vacío)

**Tamaño:** 0 bytes (1 línea vacía)

Archivo **reservado** pero sin implementación. Probablemente planificado como middleware de validación de sesión reutilizable (actualmente, esa lógica está directamente en `dashboard.php`).

---

## Tabla de Base de Datos

Basándose en las queries de los archivos PHP, la tabla `usuarios` tiene esta estructura:

```sql
CREATE TABLE usuarios (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    nombre          VARCHAR(255),
    email           VARCHAR(255) UNIQUE,
    password        VARCHAR(255),     -- bcrypt hash o 'GOOGLE_AUTH'/'GITHUB_AUTH'
    email_verificado TINYINT DEFAULT 0,
    foto            VARCHAR(500)      -- URL de avatar o ruta local
);
```

---

## Resumen Comparativo

| Archivo | Driver DB | Seguridad SQL | Hash Password | Resultado |
|---------|-----------|---------------|---------------|-----------|
| `login_process.php` | PDO | Prepared statements ✅ | bcrypt verify ✅ | Seguro |
| `register_process.php` | PDO | Prepared statements ✅ | bcrypt hash ✅ | Seguro |
| `auth_google.php` | mysqli | Escape string ⚠️ | N/A | Parcial |
| `auth_github.php` | mysqli | Escape string ⚠️ | N/A | Parcial |
| `logout.php` | N/A | N/A | N/A | Seguro (NIST) |
