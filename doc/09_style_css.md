# `style.css` — Estilos Globales (Landing + Login)

> **Ruta:** `/css/style.css`  
> **Tipo:** CSS  
> **Tamaño:** ~3.2 KB (126 líneas)  
> **Páginas:** `index.html`, `login.html`

---

## Propósito

Define los **estilos base globales** compartidos entre la landing page y la página de login. Incluye el reset CSS, sistema tipográfico, animaciones de entrada, efectos glassmorphism y el estilo del rotador de datos estelares.

---

## Estructura

### 1. Reset Global
```css
* { margin: 0; padding: 0; box-sizing: border-box; }
```

### 2. Contenedor Hero (`.hero-image-container`)
Forma de arco con bordes redondeados solo en la parte superior (200px radios). Borde dorado sutil. **Actualmente no utilizado** por ninguna página activa.

### 3. Animación de Entrada (`.animate-entrance`)
```css
.animate-entrance {
    animation: revealLogin 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes revealLogin {
    from { opacity: 0; transform: translateY(30px) scale(0.95); filter: blur(10px); }
    to   { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
}
```
Usada en `login.html` para la entrada cinemática del panel de autenticación y el dato estelar.

### 4. Input Focus Glow
```css
input:focus {
    box-shadow: 0 10px 15px -3px rgba(197, 163, 88, 0.1);
}
```
Brillo dorado sutil al enfocar campos de formulario.

### 5. Tipografía

| Clase | Fuente | Uso |
|-------|--------|-----|
| `.font-elite-italic` | Playfair Display (italic, 500) | Textos elegantes |
| `.font-serif` | Cinzel | Títulos principales |
| body | Montserrat | Texto general |

Importa Google Fonts directamente via `@import`.

### 6. Layout Base
```css
body {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
}
main { flex-grow: 1; }
```
Asegura que el footer siempre quede al fondo.

### 7. Glassmorphism (`.glass-card`)
```css
.glass-card {
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(197, 163, 88, 0.1);
}
.glass-card:hover {
    border-color: rgba(197, 163, 88, 0.4);
    box-shadow: 0 0 20px rgba(197, 163, 88, 0.1);
}
```
**Actualmente no utilizado** directamente, pero define el patrón visual del proyecto.

### 8. Dato Estelar (`#dato-estelar-texto`)
```css
#dato-estelar-texto {
    background-image: linear-gradient(to right, #ffffff, #c5a358, #ffffff, #c5a358);
    background-size: 200% auto;
    background-clip: text;
    color: transparent;
    animation: breathe-and-shine 6s ease-in-out infinite;
    transition: opacity 0.8s ease, filter 0.8s ease;
}
```
Efecto combinado:
- **Gradiente de texto:** Blanco ↔ Dorado animado horizontalmente
- **Respiración:** El texto escala 1 → 1.02 → 1 cíclicamente
- **Drop shadow:** Intensificación del glow dorado
- **Transición:** Para el cambio suave cuando `login.js` rota los datos

### 9. Definición duplicada de `.font-elite-italic`
Aparece dos veces (líneas 30–37 y 122–126). La segunda versión agrega `!important` a todos los valores.

---

## Paleta de Color Global

| Token | Valor | Uso |
|-------|-------|-----|
| Dorado primario | `#c5a358` / `rgb(197, 163, 88)` | Acentos, bordes, textos |
| Dorado claro | `#fcd34d` | Gradientes secundarios |
| Negro puro | `#000000` / `#050505` | Fondos |
| Gris medio | `#555`, `#888` | Texto secundario |

---

## Notas

- El archivo usa `@import` dentro del CSS (línea 27), lo cual puede causar un flash de contenido sin estilos (FOUC) ya que bloquea el renderizado
- Hay una duplicación de `.font-elite-italic` que podría limpiarse
- `.hero-image-container` y `.glass-card` son clases definidas pero no utilizadas en el HTML actual
