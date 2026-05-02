const projectInfo = {
    nombre: "ISPEP",
    sigla: "Sistema de Contribución Científica",
    version: "v1.0.3",
    semestre: "3er Semestre",
    institucion: "INACAP",
    campus: "La Serena",
    autor: "Keoni"
};

// Función para inicializar los datos en la pantalla
// Esto se ejecuta cuando el navegador termina de cargar el HTML
document.addEventListener('DOMContentLoaded', () => {

    // 1. Buscamos el elemento de la versión (el que tiene el animate-pulse)
    const versionElement = document.getElementById('version-text');

    if (versionElement) {
        // Cambiamos el texto de "Cargando..." por los datos reales
        versionElement.innerText = `${projectInfo.version} | ${projectInfo.sigla} | ${projectInfo.campus}`;
    }

    // Mensaje de consola para verificar que WAMP leyó bien el archivo
    console.log(`%c ${projectInfo.nombre} %c Cargado con éxito por ${projectInfo.autor}`,
        "color: white; background: #00bcd4; font-weight: bold; padding: 2px 5px; border-radius: 3px;",
        "color: #00bcd4;");
});

// También podemos exportar funciones para el Día 2 (Transiciones)
function saludar() {
    alert("Bienvenido al sistema de investigación ISPEP");
}