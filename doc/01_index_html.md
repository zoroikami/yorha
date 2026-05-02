# `index.html` — Landing Page

> **Ruta:** `/index.html`  
> **Tipo:** HTML estático  
> **Tamaño:** ~2.2 KB (58 líneas)  
> **Acceso:** Público (no requiere autenticación)

---

## Propósito

Es el **punto de entrada público** de la plataforma YorHa. Funciona como una landing page cinematográfica que presenta el proyecto al visitante y lo dirige hacia la exploración del dashboard o hacia el sistema de autenticación.

---

## Estructura Visual

```
┌──────────────────────────────────────────────┐
│  VIDEO DE FONDO (tierra.mp4, opacity 60%)    │
│                                              │
│         « Contribución Científica »          │
│              YORHA PROJECT                   │
│                                              │
│     "Plataforma dedicada a la recolección    │
│      de datos científicos..."                │
│                                              │
│    [ EXPLORAR AHORA ]  [ INICIAR SESIÓN ]    │
│                                              │
└──────────────────────────────────────────────┘
```

---

## Componentes Clave

### 1. Video de Fondo (`#saturn-video`)
- Archivo: `img/tierra.mp4`
- Atributos: `autoplay`, `loop`, `muted`, `playsinline`
- Estilizado con `object-cover` y `opacity-60` para crear ambiente cinematográfico
- Fijado a pantalla completa con `fixed inset-0`

### 2. Contenido Central (`<main>`)
- Centrado vertical y horizontalmente con Flexbox (`flex h-screen items-center justify-center`)
- **Subtítulo dorado:** "Contribución Científica" en `#c5a358` (color temático)
- **Título principal:** "YORHA PROJECT" a 8xl con degradado texto blanco/gris
- **Descripción:** Párrafo breve del propósito de la plataforma

### 3. Botones de Acción
| Botón | Destino | Estilo |
|-------|---------|--------|
| EXPLORAR AHORA | `dashboard.php` | Borde dorado, hover relleno dorado |
| Iniciar Sesión | `login.html` | Fondo blanco translúcido, hover blanco sólido |

---

## Dependencias

| Recurso | Tipo | Uso |
|---------|------|-----|
| `css/style.css` | Hoja de estilos | Animaciones de entrada, glassmorphism |
| TailwindCSS (CDN) | Framework CSS | Utilidades de layout y estilos inline |
| Google Fonts | Tipografía | Cinzel (títulos) + Montserrat (body) |
| `js/ola.js` | Script | Referenciado pero **no existe** en el proyecto (posible artefacto de desarrollo) |
| `js/index.js` | Script | Efecto de ida-y-vuelta del video |

---

## Comportamiento JavaScript (`index.js`)

El script `index.js` implementa un efecto de **"ping-pong" en el video de fondo**:

1. Cuando el video llega al final (`currentTime >= duration - 0.2`), invierte la dirección
2. En modo reversa, decrementa `currentTime` manualmente a 30 FPS (`setTimeout` de 33ms)
3. Cuando llega al inicio (`currentTime <= 0.1`), lo reproduce normalmente de nuevo

Esto crea un **loop infinito sin cortes** visibles, ya que el video se reproduce hacia adelante y luego retrocede suavemente.

---

## Notas Técnicas

- La página usa `overflow-hidden` en el body para prevenir scroll
- No tiene `<meta name="viewport">`, lo cual podría causar problemas en móviles
- El enlace a `js/ola.js` produce un 404 (el archivo no existe)
- El botón "EXPLORAR AHORA" enlaza directamente a `dashboard.php`, pero ese archivo requiere sesión activa — si no hay sesión, redirige a `login.html`
