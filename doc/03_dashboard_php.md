# `dashboard.php` — Panel de Control Científico (Vista)

> **Ruta:** `/dashboard.php`  
> **Tipo:** PHP + HTML  
> **Tamaño:** ~10.4 KB (228 líneas)  
> **Acceso:** Protegido (requiere `$_SESSION['investigador_nombre']`)

---

## Propósito

Es la **vista principal del dashboard** de YorHa. Define la estructura HTML completa del panel de control científico, incluyendo el canvas 3D, el HUD superpuesto, la navegación, el hub de información planetaria y el sistema de control temporal. **Toda la lógica 3D se delega a `dashboard.js`**.

---

## Protección de Acceso (PHP)

```php
// 1. Si no hay sesión activa → redirige a login
if (!isset($_SESSION['investigador_nombre'])) {
    header("Location: login.html?error=acceso_denegado");
    exit();
}

// 2. Timeout de inactividad: 15 minutos (900 segundos)
if (time() - $_SESSION['last_activity'] > 900) {
    // Destruye sesión y redirige
    header("Location: login.html?error=sesion_expirada");
}

// 3. Refresca timestamp de actividad
$_SESSION['last_activity'] = time();

// 4. Foto de perfil con fallback
$user_img = $_SESSION['investigador_foto'] ?: 'img/logo2.jpg';
```

---

## Estructura del DOM

```
<body>
├── #yorha-preloader          → Pantalla de carga animada
├── #cinematic-overlay        → CRT scanlines + vignette
├── #three-canvas             → Canvas WebGL (Three.js)
└── #ui-layer                 → Capa de interfaz (pointer-events: none)
    ├── #navbar               → Barra superior (marca + usuario)
    ├── #center-area          → Zona central
    │   ├── #intro-title      → Mensaje de bienvenida + botón interacción
    │   ├── #planet-hub       → Hub dual de información planetaria
    │   │   ├── .hub-left     → Panel info (datos, eras, botón volver)
    │   │   └── .hub-right    → Panel cronología (timeline lateral)
    │   └── #era-info-modal   → Modal expandido de era individual
    └── #footer               → Pie (versión, controles de tiempo, info)
```

---

## Componentes Detallados

### 1. Preloader (`#yorha-preloader`)
- Pantalla negra fullscreen con z-index 1000
- Muestra: título "INICIALIZANDO YORHA_OS...", barra de progreso, estado
- Se actualiza dinámicamente desde `dashboard.js` según la carga de texturas
- Desaparece con `fade-out` cuando Three.js termina de cargar todo

### 2. Overlay Cinemático (`#cinematic-overlay`)
- Simula un efecto **CRT retro** con scanlines horizontales (4px de alto)
- Aplica un efecto de **vignette** (sombra interior radial oscura)
- z-index 5: encima del canvas, debajo de la UI
- `pointer-events: none` — no interfiere con clics

### 3. Canvas Three.js (`#three-canvas`)
- Posición fixed, z-index 0
- Recibe la escena 3D completa (sol, planetas, estrellas, asteroides)
- Controlado completamente desde `dashboard.js`

### 4. Navbar (`#navbar`)
- **Izquierda:** Logo "YORHA" con gradiente dorado + subtítulo "Estación Terrestre La Serena"
- **Derecha:** Información del usuario logueado:
  - "Investigador Activo"
  - Nombre del usuario (PHP: `$_SESSION['investigador_nombre']`)
  - Foto de perfil (con fallback `onerror`)
  - Botón "Cerrar Sesión" → `php/logout.php`
- Se oculta con animación cuando se entra al modo detalle de un planeta

### 5. Centro — Título Intro (`#intro-title`)
- Título "Bienvenido" en fuente serif italic dorada
- Estado: "[ Modo Ambiente Activo ]" / "[ Sistema Libertado ]"
- **Botón maestro:** "INICIAR INTERACCIÓN" → Activa controles de órbita y zoom al sistema solar

### 6. Planet Hub (`#planet-hub`)
Panel completo de información que aparece al hacer clic en un planeta:

**Panel Izquierdo (`.hub-left`):**
- Nombre del planeta/constelación (`#hub-name`)
- Sector (`#hub-sector`)
- Descripción (`#hub-desc`)
- Datos numéricos: Rotación, Traslación, Edad, Distancia, Diámetro
- Composición Atmosférica (`#hub-atmosphere`)
- Características Únicas (`#hub-unique`)
- Alerta ambiental condicional (`#hub-alert-group`)
- Botón "Volver a Órbita"

**Panel Derecho (`.hub-right`):**
- Tab lateral con texto vertical "CRONOLOGÍA"
- Se despliega al hacer hover
- Contiene `#hub-eras-container` donde los eras se generan dinámicamente

### 7. Modal de Eras (`#era-info-modal`)
- Se abre desde los items de la cronología
- Muestra: título, descripción extendida, duración
- Al abrirse, empuja el panel izquierdo fuera de vista
- Cierre con botón × (rotación 90° al hover)

### 8. Footer (`#footer`)
- **Izquierda:** Versión "v2.0.5" + "ZOROIKAMI | © 2026"
- **Centro:** Controles de velocidad temporal:
  - `||` Pausa
  - `▶` Tiempo Real (×1)
  - `⏩ x10` Aceleración
  - `🚀 x100` Velocidad Warp
- **Derecha:** "Chile" + "Monitoreo Satelital en Tiempo Real"

---

## Librerías Cargadas (CDN)

| Librería | Versión | Propósito |
|----------|---------|-----------|
| Three.js | r134 | Motor de renderizado 3D |
| OrbitControls | r134 | Control de cámara orbital |
| EffectComposer | r134 | Pipeline de post-procesado |
| RenderPass | r134 | Paso de renderizado base |
| ShaderPass | r134 | Paso de shader genérico |
| CopyShader | r134 | Copia final al framebuffer |
| LuminosityHighPassShader | r134 | Filtro de luminosidad |
| UnrealBloomPass | r134 | Efecto de resplandor (bloom) |
| GSAP | 3.12.2 | Animaciones de cámara y UI |

---

## Variables PHP Inyectadas al HTML

| Variable | Uso en HTML |
|----------|-------------|
| `$_SESSION['investigador_nombre']` | Nombre mostrado en navbar |
| `$user_img` | `src` de la foto de perfil |

---

## Notas Técnicas

- El script principal se carga como **módulo ES6**: `<script type="module" src="js/dashboard.js">`
- El preloader está hardcodeado en el HTML inicial para mostrarse inmediatamente antes de que JS cargue
- Los valores de `animation-delay` están inline en el HTML para escalonar las animaciones del HUD
- Class `clickable` marca elementos que deben recibir eventos de mouse (el layer UI tiene `pointer-events: none` por defecto)
