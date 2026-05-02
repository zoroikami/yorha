# `dashboard.css` — Estilos del Panel de Control 3D

> **Ruta:** `/css/dashboard.css`  
> **Tipo:** CSS  
> **Tamaño:** ~17.7 KB (788 líneas)  
> **Página:** `dashboard.php`

---

## Propósito

Hoja de estilos **completa y autocontenida** del dashboard. Define desde el layout base hasta los efectos cinematográficos (CRT, vignette, bloom de datos), las animaciones del HUD y los estilos de todos los componentes interactivos sin dependencia de TailwindCSS.

---

## Custom Properties (Variables CSS)

```css
:root {
    --theme-color: #c5a358;           /* Dorado primario */
    --theme-color-secondary: #fcd34d; /* Dorado claro */
    --theme-color-rgb: 197, 163, 88;  /* Para uso en rgba() */
}
```

Estas variables se **actualizan dinámicamente** desde JavaScript cuando el usuario hace clic en un planeta:
```javascript
document.documentElement.style.setProperty('--theme-color', pData.theme);
```

Cada planeta tiene su propio esquema de color (verde para Tierra, rojo para Marte, etc.), y toda la interfaz se re-tematiza instantáneamente.

---

## Organización por Secciones

### 1. Base y Canvas (líneas 1–46)
- Reset universal (`*`, `*::before`, `*::after`)
- Body: negro, overflow hidden, 100vh × 100vw
- `#three-canvas`: posición fixed, z-index 0, fullscreen
- `#ui-layer`: fixed, z-index 10, **pointer-events: none** (transparente a clics)
- `.clickable`: restaura `pointer-events: auto` para elementos interactivos

### 2. Navbar (líneas 53–150)
- Layout: flex, space-between, altura automática
- Fondo: negro 25% con backdrop-blur 8px
- Borde inferior: dorado translúcido
- **Marca "YORHA":** Texto con gradiente dorado (`background-clip: text`)
- **Info de usuario:** Estilo italic dorado (Playfair Display), badge azul oscuro
- **Foto de perfil:** 38×38px, circular, borde dorado con glow
- **Botón logout:** Fondo rojo oscuro, hover más intenso
- **Estado hidden:** `translateY(-100%)` + opacity 0 (se oculta al entrar en detalle)

### 3. Área Central (líneas 152–219)
- `#intro-title`: Texto "Bienvenido" con animación de pulso en el subtítulo
- `.interaction-btn`: Botón maestro de Cinzel, borde dorado, backdrop-blur, glow al hover

### 4. Planet Hub — Panel Izquierdo (líneas 221–423)
```css
#planet-hub {
    position: absolute; width: 100vw; height: 100vh;
    opacity: 0; pointer-events: none;
}
#planet-hub.active {
    opacity: 1; pointer-events: auto;
}
```
- `.hub-left`: 550px máximo, entra deslizándose desde la izquierda
  - Fondo: gradiente diagonal dorado al 15%, backdrop-blur
  - `.hub-left.hidden-for-era`: se sale -150% cuando se abre un modal de era
- `.hub-header h3`: Título del planeta con gradiente dorado, Cinzel, uppercase
- `.data-row`: Flex space-between, borde inferior sutil
  - `.num`: color blanco, `.ok`: verde, `.gold`: dorado
- `.data-scroll-area`: Scroll con scrollbar personalizada (4px, dorada)
- `#btn-return`: Botón full-width con efecto de relleno dorado total al hover

### 5. Evolución Cronológica — Timeline (líneas 475–515)
```css
.eras-timeline {
    border-left: 1px solid rgba(var(--theme-color-rgb), 0.3);
    padding-left: 1rem;
}
.era-item::before {
    /* Punto luminoso sobre la línea del timeline */
    width: 8px; height: 8px;
    background: var(--theme-color);
    box-shadow: 0 0 8px var(--theme-color);
}
```
- Timeline vertical con línea lateral dorada
- Cada era tiene un punto luminoso indicador
- Hover: fondo dorado translúcido + desplazamiento lateral

### 6. Panel Derecho — Cronología (líneas 517–582)
```css
.hub-right {
    transform: translateX(calc(100% - 30px)); /* Solo la pestaña visible */
}
.hub-right:hover {
    transform: translateX(0);                  /* Se despliega completo */
}
```
- Panel oculto que se revela al pasar el mouse sobre la pestaña lateral
- Tab con texto vertical ("CRONOLOGÍA") en writing-mode vertical-rl
- Contenido se anima con opacity + translateX

### 7. Modal de Eras (líneas 584–668)
- Slide-in desde la izquierda (`translateX(-100%)` → `0`)
- Misma estética que el hub-left
- Botón de cierre: circular con borde dorado, rota 90° al hover
- Texto de descripción: justificado, color gris claro
- Badge de duración: fondo dorado translúcido

### 8. HUD Cinemático (líneas 687–706)
```css
#cinematic-overlay {
    /* Vignette */
    box-shadow: inset 0 0 150px rgba(0,0,0,0.9);
    
    /* CRT Scanlines */
    background: 
        linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.25) 50%),
        linear-gradient(90deg, rgba(255,0,0,0.06), rgba(0,255,0,0.02), rgba(0,0,255,0.06));
    background-size: 100% 4px, 6px 100%;
    opacity: 0.6;
}
```
Doble efecto:
1. **Scanlines horizontales:** Bandas de 4px alternando transparente/oscuro
2. **Aberración cromática:** Bandas verticales de 6px con colores RGB puros
3. **Vignette:** Sombra interior masiva que oscurece los bordes

### 9. Animaciones HUD — Stagger (líneas 708–723)
```css
.hub-data-row {
    opacity: 0; transform: translateY(15px);
}
.hub-data-row.animate-in {
    animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
```
Los datos del HUD aparecen secuencialmente (escalonados via `animation-delay` inline):
- Delay 0.1s, 0.2s, 0.3s, 0.4s... para cada grupo de datos
- Efecto de "cascada" de información apareciendo

### 10. Preloader YorHa (líneas 725–788)
- `z-index: 1000` — por encima de absolutamente todo
- Transición de salida: opacity + visibility
- Título: Cinzel, dorado, con pulso
- Barra de progreso: 2px de alto, relleno dorado con glow
- Estado: texto gris uppercase con tracking

### 11. Footer y Controles de Tiempo (líneas 426–473)
- Footer translúcido (opacity 0.55) con backdrop-blur
- Botones de tiempo: fondo oscuro, bordes dorados translúcidos
- Estado activo: glow dorado + color blanco

---

## Animaciones Definidas

| Nombre | Duración | Efecto | Uso |
|--------|----------|--------|-----|
| `pulse` | 2s (infinite) | Opacity 1 ↔ 0.3 / Text-shadow glow | Subtítulo intro, título preloader |
| `fadeInUp` | 0.5s | Opacity 0→1 + translateY 15→0 | Datos del HUD planetario |

---

## Técnicas CSS Notables

| Técnica | Aplicación |
|---------|------------|
| `backdrop-filter: blur()` | Paneles glassmorphism (navbar, hub, modal) |
| `background-clip: text` | Texto con gradiente dorado |
| `pointer-events: none/auto` | Layer UI transparente con islas clicables |
| `writing-mode: vertical-rl` | Tab lateral del panel cronología |
| `CSS Custom Properties` | Tematización dinámica por planeta |
| `transform transitions` | Slide-in/out de paneles |
| `inset box-shadow` | Efecto vignette |
| `background layering` | CRT scanlines (2 gradientes superpuestos) |

---

## Notas

- El archivo usa la función CSS `rgba(var(--theme-color-rgb), alpha)` extensivamente — esto funciona porque la variable almacena "197, 163, 88" sin `rgb()`, permitiendo interpolación directa
- No hay media queries — el dashboard no es responsive (diseñado para desktop)
- Hay dos definiciones de `@keyframes pulse` (líneas 184 y 784) con comportamientos distintos; la segunda sobreescribe a la primera
