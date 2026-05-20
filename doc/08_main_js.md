# `main.js` — Metadata del Proyecto (Legacy)

> **Ruta:** `/js/main.js`  
> **Tipo:** JavaScript (script clásico)  
> **Tamaño:** ~1.2 KB (32 líneas)  
> **Estado:** Legacy (no referenciado por ninguna página activa)

---

## Propósito

Almacena las **metadatos estáticos** del proyecto Vynas y proporciona funciones utilitarias básicas. Este archivo fue parte de la iteración inicial del proyecto y actualmente **no es cargado por ninguna página** (ni `index.html`, ni `login.html`, ni `dashboard.php`).

---

## Contenido

### Objeto de Metadata

```javascript
const projectInfo = {
    nombre: "Vynas",
    sigla: "Sistema de Contribución Científica",
    version: "v1.0.3",
    semestre: "3er Semestre",
    institucion: "INACAP",
    campus: "La Serena",
    autor: "Keoni"
};
```

> **Nota:** La versión aquí es `v1.0.3`, pero el dashboard actual muestra `v2.0.5` — indicando que este archivo quedó desactualizado.

### Inicialización DOM

```javascript
document.addEventListener('DOMContentLoaded', () => {
    const versionElement = document.getElementById('version-text');
    if (versionElement) {
        versionElement.innerText = 
            `${projectInfo.version} | ${projectInfo.sigla} | ${projectInfo.campus}`;
    }

    console.log(`%c ${projectInfo.nombre} %c Cargado con éxito por ${projectInfo.autor}`,
        "color: white; background: #00bcd4; ...", "color: #00bcd4;");
});
```

- Busca un elemento `#version-text` (que ya no existe en el HTML actual)
- Imprime un mensaje estilizado en la consola del navegador

### Función de Saludo

```javascript
function saludar() {
    alert("Bienvenido al sistema de investigación Vynas");
}
```

Función utilitaria simple, nunca invocada.

---

## Estado Actual

| Aspecto | Detalle |
|---------|---------|
| ¿Cargado por alguna página? | ❌ No |
| ¿Tiene dependencias? | ❌ No |
| ¿Es referenciado por otros scripts? | ❌ No |
| Recomendación | Puede eliminarse o actualizarse como módulo de configuración |

---

## Notas

- El archivo usa retornos de carro Windows (CRLF) a diferencia de otros archivos del proyecto
- Contiene un comentario "exportar funciones para el Día 2" que indica que fue creado durante las primeras sesiones de desarrollo
- La función `saludar()` fue probablemente un placeholder de prueba del entorno WAMP

