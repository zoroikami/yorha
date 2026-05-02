# `login.html` — Autenticación de Usuario

> **Ruta:** `/login.html`  
> **Tipo:** HTML estático  
> **Tamaño:** ~10.6 KB (169 líneas)  
> **Acceso:** Público

---

## Propósito

Página de **autenticación dual** que permite al usuario ingresar a la plataforma mediante:

1. **Login tradicional** (email + contraseña)
2. **Registro de nueva cuenta** (nombre + email + contraseña)
3. **OAuth con Google** (Google Identity Services)
4. **OAuth con GitHub** (Authorization Code Flow)

---

## Estructura Visual

```
┌────────────────────────────────────────────────────────────────┐
│ VIDEO FONDO (saturn2.mp4, opacity 20%)                         │
│ GRADIENTE overlay (negro diagonal)                             │
│                                                                │
│  ┌─────────────────────┐          ┌──────────────────────────┐ │
│  │                     │          │                          │ │
│  │       YORHA          │          │    « Dato Estelar »      │ │
│  │  Auth de Usuario     │          │                          │ │
│  │                     │          │  "En Saturno llueven     │ │
│  │  [Email          ]  │          │   diamantes y sus        │ │
│  │  [Contraseña     ]  │          │   vientos alcanzan       │ │
│  │                     │          │   los 1.800 km/h."       │ │
│  │  [ AUTENTICAR    ]  │          │                          │ │
│  │                     │          │           ──── Laurel    │ │
│  │  ¿No tienes cuenta? │          │                          │ │
│  │                     │          │                          │ │
│  │  ── O continuar ──  │          │                          │ │
│  │  [  Google  ]       │          │                          │ │
│  │  [  GitHub  ]       │          │                          │ │
│  │                     │          │                          │ │
│  │  YORHA ♱ 2026       │          │                          │ │
│  └─────────────────────┘          └──────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

**Layout:** Dos secciones en `flex`:
- **Izquierda** (max 550px): Panel de autenticación con backdrop blur
- **Derecha** (flex-1): Dato estelar rotativo con animación de texto

---

## Formularios

### Login (`#login-form`)
- **Action:** `php/login_process.php` (POST)
- **Campos:** `email` (email), `password` (password)
- **Botón:** "Autenticar" con efecto de relleno slide-up dorado

### Registro (`#register-form`)
- **Action:** `php/register_process.php` (POST)
- **Campos:** `nombre` (text), `email` (email), `password` (password)
- **Estado inicial:** Oculto (`hidden`)
- **Botón:** "Registrar Usuario"

Ambos formularios se alternan mediante la función `toggleForms()`.

---

## Autenticación Social

### Google OAuth
- Usa **Google Identity Services** (librería `accounts.google.com/gsi/client`)
- Se renderiza un botón oficial de Google dentro de `#google-auth-btn-container`
- Al autenticarse, envía el `id_token` a `php/auth_google.php` via GET

### GitHub OAuth
- Enlace directo al endpoint de autorización de GitHub
- **Client ID:** `Ov23lih8qMJVovBZZYbC`
- **Scope:** `user`
- Callback procesado por `php/auth_github.php`

---

## Dependencias y Scripts

| Recurso | Uso |
|---------|-----|
| `css/style.css` | Animaciones (revealLogin, breathe-and-shine), glassmorphism |
| TailwindCSS (CDN) | Layout y utilidades |
| Google Fonts | Cinzel, Montserrat |
| Google GSI (`gsi/client`) | API de autenticación Google |
| `js/login.js` | Toda la lógica interactiva de la página |

---

## Lógica JavaScript (`login.js`)

### Inicialización Google (`window.onload`)
1. Valida que la librería `google` esté disponible
2. Inicializa con el `client_id` del proyecto
3. Renderiza el botón oficial en el contenedor

### Rotación de Datos Estelares
- Array de 5 datos curiosos astronómicos
- Cada 8 segundos, cambia el texto en `#dato-estelar-texto` con una transición de desvanecimiento (opacity + translateY)
- Incluye un hack de repintado (`display: none` → `offsetHeight` → `display: block`) para preservar el gradiente CSS

### Toggle de Formularios (`toggleForms()`)
- Alterna visibilidad entre `#login-form` y `#register-form`
- Actualiza el subtítulo del formulario según el modo activo

### Manejo de Errores via URL
- Lee `?error=xxx` de la URL al cargar
- Genera un `<div>` de alerta roja con el mensaje correspondiente
- Errores manejados:

| Parámetro | Mensaje |
|-----------|---------|
| `email_exists` | "El correo ya está registrado." |
| `invalid_credentials` | "Credenciales incorrectas." |
| `use_social` | "Usa Google o GitHub para iniciar sesión." |
| `acceso_denegado` | "Debes iniciar sesión." |
| `sesion_expirada` | "Tu sesión expiró por inactividad." |

---

## Diseño Visual

- **Fondo:** Video de Saturno (`saturn2.mp4`) al 20% de opacidad
- **Overlay:** Gradiente diagonal negro para profundidad
- **Panel izquierdo:** Glassmorphism oscuro (`bg-[#0a0a0a]/60`, `backdrop-blur-3xl`)
- **Inputs:** Fondo transparente con solo border-bottom que se anima a dorado en focus
- **Labels flotantes:** Usando la técnica CSS `peer-focus` de Tailwind
- **Botones:** Efecto de relleno dorado de abajo hacia arriba (translate-y full → 0)
