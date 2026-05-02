window.onload = function () {
    if (typeof google !== 'undefined') {
        google.accounts.id.initialize({
            client_id: "977516655506-vr13tt7l77ghiie2kbff4cqjo7645vb1.apps.googleusercontent.com",
            callback: handleCredentialResponse
        });

        const googleBtnContainer = document.getElementById('google-auth-btn-container');
        if (googleBtnContainer) {
            google.accounts.id.renderButton(
                googleBtnContainer,
                { theme: "filled_black", size: "large", type: "standard", width: 450, text: "continue_with" }
            );
        }
    }
}

function handleCredentialResponse(response) {
    window.location.href = "php/auth_google.php?token=" + response.credential;
}

// --- Lógica de Rotación de Datos Estelares ---
const datosEstelares = [
    "\"En Saturno llueven diamantes y sus vientos alcanzan los 1.800 km/h.\"",
    "\"Los anillos de Saturno podrían ser restos de una luna desaparecida llamada Chrysalis.\"",
    "\"El cometa 3I/ATLAS es casi tan antiguo como nuestra propia galaxia.\"",
    "\"La Tierra se ha vuelto un 16% más brillante de noche desde el año 2014.\"",
    "\"El rover Perseverance ya ha recolectado muestras clave en el cráter Jezero de Marte.\""
];

let indice = 0;

function rotarDatos() {
    const elementoDato = document.getElementById('dato-estelar-texto');
    if (!elementoDato) return;

    // Desvanecer
    elementoDato.style.opacity = "0";
    elementoDato.style.transform = "translateY(15px)";

    setTimeout(() => {
        indice = (indice + 1) % datosEstelares.length;

        // Cambiar texto
        elementoDato.textContent = datosEstelares[indice];

        // Forzar repintado para no perder el degradado
        elementoDato.style.display = 'none';
        elementoDato.offsetHeight;
        elementoDato.style.display = 'block';

        // Aparecer
        elementoDato.style.opacity = "1";
        elementoDato.style.transform = "translateY(0)";
    }, 1000);
}

setInterval(rotarDatos, 8000);

// --- Lógica de Toggle entre Login y Registro ---
function toggleForms() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const formSubtitle = document.getElementById('form-subtitle');

    if (loginForm && registerForm) {
        if (loginForm.classList.contains('hidden')) {
            // Ocultar Registro, Mostrar Login
            registerForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
            if (formSubtitle) formSubtitle.textContent = "Autenticación de Usuario";
        } else {
            // Ocultar Login, Mostrar Registro
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
            if (formSubtitle) formSubtitle.textContent = "Crear Nueva Cuenta";
        }
    }
}

// Global scope initialization for toggleForms link
window.toggleForms = toggleForms;

// --- Manejo de Errores Vía URL ---
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');

    if (error) {
        let mensaje = "";
        if (error === 'email_exists') mensaje = "El correo ya está registrado. Intenta iniciar sesión.";
        else if (error === 'invalid_credentials') mensaje = "Credenciales incorrectas o usuario no encontrado.";
        else if (error === 'use_social') mensaje = "Iniciaste sesión antes con Google o GitHub. Usa ese botón web.";
        else if (error === 'acceso_denegado') mensaje = "Debes iniciar sesión para ver tus datos.";
        else if (error === 'sesion_expirada') mensaje = "Tu sesión expiró por inactividad.";
        else mensaje = "Ocurrió un error en la autenticación.";

        const errDiv = document.createElement('div');
        errDiv.className = 'w-full mb-6 p-4 bg-red-500/10 border border-red-500/50 text-red-500 text-[10px] uppercase font-bold tracking-widest text-center';
        errDiv.innerText = mensaje;
        const container = document.getElementById('forms-container');
        if (container) container.prepend(errDiv);
    }
});
