# `api.js` — Módulo de Acceso a Datos

> **Ruta:** `/js/api.js`  
> **Tipo:** JavaScript (módulo ES6)  
> **Tamaño:** 430 bytes (13 líneas)  
> **Exporta:** `getAstronomyData()`

---

## Propósito

Capa de abstracción para la **carga de datos astronómicos**. Aisla la lógica de fetching del motor 3D, permitiendo que en el futuro se pueda cambiar la fuente de datos (API REST, WebSocket, etc.) sin modificar `dashboard.js`.

---

## Código Completo

```javascript
export async function getAstronomyData() {
    try {
        const response = await fetch('data/astronomy.json?t=' + Date.now());
        if (!response.ok) {
            throw new Error('Fallo crítico en la terminal neuronal de datos.');
        }
        return await response.json();
    } catch (error) {
        console.error('Vynas Data Error:', error);
        return { PLANETS_DATA: {}, CONSTELLATIONS_DATA: {} };
    }
}
```

---

## Comportamiento

### Flujo Normal
1. Realiza un `fetch()` al archivo `data/astronomy.json`
2. Agrega un **cache-buster** (`?t=Date.now()`) para evitar datos cacheados
3. Valida la respuesta (`response.ok`)
4. Parsea y retorna el JSON

### Flujo de Error (Fallback Seguro)
Si falla la petición (red, JSON corrupto, 404):
- Loguea el error a consola con prefijo `Vynas Data Error:`
- Retorna un **objeto vacío pero estructuralmente válido**: `{ PLANETS_DATA: {}, CONSTELLATIONS_DATA: {} }`
- Esto permite que `dashboard.js` inicie sin crashear (simplemente no habrá planetas)

---

## Consumidor

```javascript
// En dashboard.js (línea 1 y 34):
import { getAstronomyData } from "./api.js";
const data = await getAstronomyData();
const PLANETS_DATA = data.PLANETS_DATA;
const CONSTELLATIONS_DATA = data.CONSTELLATIONS_DATA;
```

---

## Estructura del JSON Retornado

```json
{
    "PLANETS_DATA": {
        "mercurio": { ... },
        "venus": { ... },
        "tierra": { ... },
        "marte": { ... },
        "jupiter": { ... },
        "saturno": { ... },
        "urano": { ... },
        "neptuno": { ... }
    },
    "CONSTELLATIONS_DATA": {
        "orion": { ... },
        "osa_mayor": { ... },
        "casiopea": { ... },
        "cisne": { ... }
    }
}
```

---

## Notas Técnicas

- Es el **único módulo ES6** de la aplicación (usa `export`)
- El cache-buster previene que el navegador sirva datos desactualizados después de editar `astronomy.json`
- No tiene dependencias externas
- El fallback vacío es una decisión de **resiliencia**: la escena 3D arranca vacía en vez de lanzar un error no capturado

