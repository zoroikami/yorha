# `login.js` — Lógica de Autenticación Frontend

> **Ruta:** `/js/login.js`  
> **Tipo:** JavaScript (script clásico, no módulo)  
> **Tamaño:** ~4.2 KB (105 líneas)  
> **Página:** `login.html`

---

## Propósito

Centraliza toda la lógica del lado cliente para la página de autenticación:
1. Inicialización del botón de Google OAuth
2. Rotación animada de datos estelares
3. Toggle entre formularios de login y registro
4. Manejo de mensajes de error vía parámetros URL

---

## Funcionalidades Detalladas

### 1. Inicialización de Google OAuth (`window.onload`)

```javascript
window.onload = function () {
    if (typeof google !== 'undefined') {
        google.accounts.id.initialize({
            client_id: "977516655506-...",
            callback: handleCredentialResponse
        });
        google.accounts.id.renderButton(container, {
            theme: "filled_black",
            size: "large",
            width: 450
        });
    }
}
```

- Espera a que la página cargue completamente
- Verifica que la librería de Google Identity Services esté disponible
- Configura con el **Client ID** del proyecto
- Renderiza un botón oficial de Google con tema oscuro

**Callback de éxito (`handleCredentialResponse`):**
```javascript
function handleCredentialResponse(response) {
    window.location.href = "php/auth_google.php?token=" + response.credential;
}
```
Redirige al backend PHP enviando el **JWT token** como parámetro GET.

---

### 2. Rotación de Datos Estelares

Array de 5 datos curiosos:
- Lluvia de diamantes en Saturno
- Anillos como restos de luna Chrysalis  
- Cometa 3I/ATLAS
- Brillo nocturno terrestre desde 2014
- Rover Perseverance en Marte

**Mecánica de rotación (cada 8 segundos):**

```
Frame 0s:    opacity 1, translateY(0)     ← Texto visible
Frame 0-1s:  opacity 0, translateY(15px)  ← Desvanecimiento
Frame 1s:    Cambio de texto               ← Swap
             Hack de repintado             ← Preserva gradiente CSS
Frame 1s+:   opacity 1, translateY(0)     ← Reaparición
```

**Hack de repintado:** Forzar `display: none` seguido de `offsetHeight` y `display: block` es necesario porque el gradiente animado CSS (`breathe-and-shine` de `style.css`) pierde su estado al cambiar el contenido de texto del elemento.

---

### 3. Toggle de Formularios (`toggleForms()`)

```javascript
function toggleForms() {
    // Si login visible → mostrar registro
    // Si registro visible → mostrar login
    // Actualizar subtítulo
}
```

| Estado | Formulario Visible | Subtítulo |
|--------|-------------------|-----------|
| Login | `#login-form` | "Autenticación de Usuario" |
| Registro | `#register-form` | "Crear Nueva Cuenta" |

La función se expone globalmente (`window.toggleForms = toggleForms`) para que los `onclick` del HTML la invoquen.

---

### 4. Manejo de Errores de URL (`DOMContentLoaded`)

Al cargar la página, el script lee los parámetros de la URL:

```javascript
const urlParams = new URLSearchParams(window.location.search);
const error = urlParams.get('error');
```

Y genera dinámicamente un banner de error rojo:

| Código | Origen | Mensaje |
|--------|--------|---------|
| `email_exists` | `register_process.php` | "El correo ya está registrado. Intenta iniciar sesión." |
| `invalid_credentials` | `login_process.php` | "Credenciales incorrectas o usuario no encontrado." |
| `use_social` | `login_process.php` | "Iniciaste sesión antes con Google o GitHub." |
| `acceso_denegado` | `dashboard.php` | "Debes iniciar sesión para ver tus datos." |
| `sesion_expirada` | `dashboard.php` | "Tu sesión expiró por inactividad." |
| (cualquier otro) | — | "Ocurrió un error en la autenticación." |

El banner se inserta como primer hijo de `#forms-container` con estilos TailwindCSS inline (fondo rojo translúcido, borde rojo, texto rojo).

---

## Dependencias

| Recurso | Propósito |
|---------|-----------|
| Google GSI (`accounts.google.com/gsi/client`) | API de identity |
| DOM elements: `#dato-estelar-texto`, `#login-form`, `#register-form`, `#form-subtitle`, `#forms-container`, `#google-auth-btn-container` | Elementos manipulados |

---

## Notas Técnicas

- No es un módulo ES6 (carga con `<script src>` normal)
- El intervalo de rotación de datos estelares nunca se limpia (`setInterval` sin `clearInterval`)
- El Client ID de Google está hardcodeado en el script
- Las credenciales de Google se envían vía GET (visible en URL) — aceptable para JWT en localhost pero no recomendable en producción HTTPS
