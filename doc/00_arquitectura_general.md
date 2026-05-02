# YorHa Project — Arquitectura General

> **Versión documentada:** v2.0.5  
> **Autor del proyecto:** Keoni (zoroikami)  
> **Institución:** INACAP — Campus La Serena  
> **Stack:** PHP 8 · MySQL (WAMP) · Three.js r134 · GSAP 3.12 · TailwindCSS (CDN)

---

## ¿Qué es YorHa?

**YorHa** (nombre clave: **ISPEP**) es una plataforma web de visualización astronómica interactiva. Simula un **sistema solar heliocéntrico 3D** con texturas planetarias de alta resolución (hasta 8K), órbitas keplerianas, cinturones de asteroides, constelaciones interactivas y un sistema de autenticación multi-proveedor (credenciales, Google OAuth 2.0, GitHub OAuth).

---

## Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENTE (Navegador)                          │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────────────────┐  │
│  │index.html│  │login.html│  │        dashboard.php             │  │
│  │(Landing) │  │ (Auth)   │  │   (Panel 3D Protegido)           │  │
│  └────┬─────┘  └────┬─────┘  └────────┬─────────────────────────┘  │
│       │              │                 │                            │
│  ┌────┴────┐  ┌──────┴─────┐  ┌───────┴──────────────────────┐    │
│  │index.js │  │ login.js   │  │ dashboard.js (módulo ES6)     │    │
│  │main.js  │  │            │  │   └── api.js (fetch JSON)     │    │
│  └─────────┘  └────────────┘  └───────┬──────────────────────┘    │
│                                       │                            │
│  ┌────────────────────────────────────┴────────────────────────┐  │
│  │                    Librerías Externas (CDN)                  │  │
│  │  Three.js r134 · OrbitControls · EffectComposer · Bloom     │  │
│  │  GSAP 3.12 · TailwindCSS · Google Fonts · Google GSI        │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                        SERVIDOR (WAMP64)                            │
│                                                                     │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────────────────┐ │
│  │ db.php   │  │login_process │  │  register_process.php        │ │
│  │ (PDO)    │  │   .php       │  │  (Bcrypt + PDO)              │ │
│  └────┬─────┘  └──────────────┘  └──────────────────────────────┘ │
│       │                                                            │
│  ┌────┴────────────────────────────────────────────────────────┐  │
│  │  auth_google.php · auth_github.php · logout.php · auth.php  │  │
│  │  (OAuth Callbacks + Gestión de Sesiones PHP)                 │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    MySQL (ispep_db)                           │  │
│  │   Tabla: usuarios (id, nombre, email, password, foto, ...)   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │          data/astronomy.json (Dataset Planetario)            │  │
│  │   PLANETS_DATA (8 planetas) · CONSTELLATIONS_DATA (4)        │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Estructura de Directorios

```
ispep/
├── index.html              → Landing page (punto de entrada público)
├── login.html              → Autenticación (Login / Registro)
├── dashboard.php           → Panel principal protegido (3D + HUD)
│
├── css/
│   ├── style.css           → Estilos globales (landing + login)
│   └── dashboard.css       → Estilos completos del dashboard
│
├── js/
│   ├── main.js             → Metadata del proyecto (legacy)
│   ├── index.js            → Efecto ping-pong de video (landing)
│   ├── login.js            → Lógica de auth, datos estelares, toggle
│   ├── api.js              → Módulo ES6: fetch de astronomy.json
│   └── dashboard.js        → Motor 3D completo (800 líneas)
│
├── php/
│   ├── db.php              → Conexión PDO a MySQL
│   ├── auth.php            → (Vacío — reservado)
│   ├── login_process.php   → Procesador de login tradicional
│   ├── register_process.php→ Procesador de registro + bcrypt
│   ├── auth_google.php     → Callback OAuth 2.0 Google
│   ├── auth_github.php     → Callback OAuth 2.0 GitHub
│   └── logout.php          → Destrucción de sesión segura
│
├── data/
│   └── astronomy.json      → Dataset astronómico (planetas + constelaciones)
│
├── img/                    → Texturas 8K, videos .mp4, logos
└── doc/                    → Esta documentación
```

---

## Flujo de Navegación del Usuario

```
[index.html] ──→ "EXPLORAR AHORA" ──→ [dashboard.php] (requiere sesión)
      │                                        │
      └── "INICIAR SESIÓN" ──→ [login.html]    │
                                   │            │
                    ┌──────────────┼────────────┘
                    ▼              ▼
            Login Tradicional    OAuth Google/GitHub
                    │              │
                    ▼              ▼
           login_process.php   auth_google.php / auth_github.php
                    │              │
                    └──────┬───────┘
                           ▼
                    $_SESSION creada
                           ▼
                    dashboard.php ──→ Scene 3D (Three.js)
                           │
                    logout.php ──→ login.html
```

---

## Principios de Diseño

| Aspecto | Decisión |
|---------|----------|
| **Estética** | Paleta dorada (#c5a358) sobre negro. Tipografía Cinzel + Montserrat + Playfair Display. Efectos de glassmorphism, vignette CRT y bloom. |
| **Rendering** | Three.js con post-procesado UnrealBloomPass. `devicePixelRatio` capeado a 2 para evitar sobrecarga GPU. |
| **Datos** | Desacoplados en `astronomy.json`. Se cargan vía `fetch()` desde `api.js`. |
| **Auth** | Sesiones PHP con timeout de 15 minutos. Contraseñas con `password_hash()` (bcrypt). OAuth social sin contraseña local. |
| **Animación** | Órbitas keplerianas con excentricidad real. Control de velocidad temporal (pausa, ×1, ×10, ×100). Transiciones de cámara con GSAP. |
