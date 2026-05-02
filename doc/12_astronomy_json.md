# `astronomy.json` — Dataset Astronómico

> **Ruta:** `/data/astronomy.json`  
> **Tipo:** JSON  
> **Tamaño:** ~18.8 KB (181 líneas)

---

## Propósito

Es la **fuente de datos única** de toda la aplicación. Contiene la información científica, parámetros orbitales, configuraciones visuales y evolución cronológica de cada cuerpo celeste renderizado en el dashboard 3D.

---

## Estructura Raíz

```json
{
    "PLANETS_DATA": { ... },         // 8 planetas del sistema solar
    "CONSTELLATIONS_DATA": { ... }   // 4 constelaciones interactivas
}
```

---

## PLANETS_DATA — Esquema de un Planeta

Cada planeta usa la siguiente estructura (ejemplo: Tierra):

```json
{
    "id": "tierra",
    "name": "Tierra",
    "sector": "Sector 003/Sol",
    
    // ═══ INFORMACIÓN CIENTÍFICA ═══
    "desc": "Único mundo conocido que alberga vida...",
    "rotation": "23,93 h",
    "orbit": "365,26 d",
    "age": "~4.600 M años",
    "distance": "~150 M km",
    "diameter": "12.742 km",
    "atmosphere": "Nitrógeno (78%) y oxígeno (21%)...",
    "unique": "La presencia masiva de agua líquida...",
    
    // ═══ ALERTAS ═══
    "alert": true,
    "alertText": "Alerta Ambiental Terrestre",
    
    // ═══ EVOLUCIÓN CRONOLÓGICA (ERAS) ═══
    "eras": [
        {
            "name": "Cámbrico",
            "duration": "541 - 485 Ma",
            "desc": "Explosión biológica severa.",
            "ext": "Texto extendido para el modal..."
        },
        // ... más eras
    ],
    
    // ═══ TEMA VISUAL ═══
    "theme": "#22c55e",              // Color primario (CSS var)
    "themeSec": "#0ea5e9",           // Color secundario
    "themeRGB": "34, 197, 94",       // Para rgba()
    
    // ═══ TEXTURAS ═══
    "texture": "img/tierra.jpg",
    "nightTexture": "img/8k_earth_nightmap.jpg",   // Solo Tierra
    "cloudTexture": "img/8k_earth_clouds.jpg",     // Solo Tierra
    "ringTexture": "img/8k_saturn_ring_alpha.png",  // Solo Saturno
    
    // ═══ PARÁMETROS ORBITALES ═══
    "radius": 4.5,          // Radio visual del planeta (unidades 3D)
    "orbRadius": 65,        // Semi-eje mayor de la órbita
    "orbSpeed": 0.0020,     // Velocidad orbital (rad/frame)
    "orbAngle": 0,          // Ángulo inicial en la órbita
    "e": 0.016,             // Excentricidad orbital (real)
    "tilt": 23.5,           // Inclinación axial (grados reales)
    "rotSpeed": 0.0008,     // Velocidad de rotación axial
    "hasClouds": true       // Flag para capa de nubes
}
```

### Planetas Incluidos

| ID | Nombre | Radio | Órbita | Excentricidad | Tilt | Eras | Alerta |
|----|--------|-------|--------|------------|------|------|--------|
| `mercurio` | Mercurio | 2.0 | 30 | 0.205 | 0.03° | 5 | ❌ |
| `venus` | Venus | 4.2 | 48 | 0.006 | 177.3° | 4 | ✅ |
| `tierra` | Tierra | 4.5 | 65 | 0.016 | 23.5° | 12 | ✅ |
| `marte` | Marte | 2.5 | 85 | 0.093 | 25.2° | 4 | ✅ |
| `jupiter` | Júpiter | 11.0 | 125 | 0.048 | 3.1° | 2 | ✅ |
| `saturno` | Saturno | 9.5 | 170 | 0.054 | 26.7° | 2 | ❌ |
| `urano` | Urano | 6.0 | 215 | 0.047 | 97.8° | 2 | ❌ |
| `neptuno` | Neptuno | 5.8 | 250 | 0.008 | 28.3° | 2 | ✅ |

### Efectos Especiales por Planeta

| Planeta | Textura Nocturna | Nubes | Anillos | Rotación Retrógrada |
|---------|-----------------|-------|---------|---------------------|
| Tierra | ✅ | ✅ | ❌ | ❌ |
| Saturno | ❌ | ❌ | ✅ | ❌ |
| Venus | ❌ | ❌ | ❌ | ✅ (rotSpeed < 0) |
| Urano | ❌ | ❌ | ❌ | ✅ (rotSpeed < 0) |

---

## CONSTELLATIONS_DATA — Esquema de una Constelación

```json
{
    "id": "orion",
    "name": "Constelación de Orión",
    "sector": "Ecuador Celeste",
    
    // Mismos campos de info que planetas pero adaptados:
    "rotation": "-",                  // No aplica
    "orbit": "-",                     // No aplica
    "age": "~12 M años",
    "distance": "~1.344 Años Luz",
    "diameter": "Nebulosa Orion: 24 AL",
    "atmosphere": "Vastedad Interestelar Molecular",
    "unique": "Contiene Rigel y Betelgeuse...",
    
    "eras": [],                       // Sin cronología
    "isConstellation": true,          // Flag diferenciador
    
    // ═══ COORDENADAS POLARES (posición en el cielo 3D) ═══
    "coord": {
        "radius": 1000,              // Distancia desde el centro
        "angleX": 0.5,               // Elevación (radianes)
        "angleY": 1.2                // Azimut (radianes)
    }
}
```

### Constelaciones Incluidas

| ID | Nombre | Sector | Distancia | Alerta |
|----|--------|--------|-----------|--------|
| `orion` | Orión | Ecuador Celeste | 1.344 AL | ❌ |
| `osa_mayor` | Osa Mayor | Hemisferio Norte | 80 AL | ❌ |
| `casiopea` | Casiopea | Vía Láctea Norte | 54 AL | ✅ Supernova |
| `cisne` | Cygnus | Plano Galáctico | 1.500 AL | ✅ Agujero Negro |

---

## Cómo Usa `dashboard.js` Estos Datos

### Construcción Visual

| Campo JSON | Uso en Three.js |
|------------|-----------------|
| `texture` | `TextureLoader.load()` → `MeshStandardMaterial.map` |
| `nightTexture` | `emissiveMap` (brillo en lado oscuro) |
| `cloudTexture` | Esfera independiente con `AdditiveBlending` |
| `ringTexture` | `RingGeometry` con UV remapeado |
| `radius` | `SphereGeometry(radius, 64, 64)` |
| `orbRadius` | Semi-eje mayor de `EllipseCurve` |
| `e` | Excentricidad para semi-eje menor + desplazamiento focal |
| `tilt` | `rotation.z` del grupo local |
| `rotSpeed` | Incremento por frame en `rotation.y` |
| `orbSpeed` | Velocidad angular base (modulada por Kepler) |

### Tematización de UI

| Campo JSON | Variable CSS Modificada |
|------------|-------------------------|
| `theme` | `--theme-color` |
| `themeSec` | `--theme-color-secondary` |
| `themeRGB` | `--theme-color-rgb` |

### Campos adaptados para Constelaciones

El campo `isConstellation: true` hace que `dashboard.js` adapte los labels:

| Etiqueta Planeta | Etiqueta Constelación |
|------------------|----------------------|
| Rotación (Día) | Forma Principal |
| Traslación (Año) | Cuerpo Regente |
| Distancia al Sol | Distancia Estelar |
| Diámetro | Extensión Visual |
| Comp. Atmosférica | Medio Interestelar |
| Características Únicas | Estrellas Principales |

---

## Datos Científicos Registrados (Eras)

La Tierra tiene la cronología más extensa con **12 eras geológicas**, cubriendo desde el Cámbrico (541 Ma) hasta el Cuaternario (presente). Cada era incluye:

- `name`: Nombre del período
- `duration`: Rango temporal en millones de años
- `desc`: Descripción breve (visible en timeline)
- `ext`: Descripción extendida (visible en modal)

Los otros planetas tienen entre 2 y 5 eras basadas en su geología conocida.

---

## Notas

- El archivo se carga con un **cache-buster** (`?t=Date.now()`) desde `api.js`
- Los valores de `orbRadius` no son proporcionales a las distancias reales sino ajustados para que la visualización quepa en el viewport
- Los `rotSpeed` negativos (Venus, Urano) producen rotación retrógrada real
- Los `orbAngle` empiezan en 0 para todos (posición inicial en la elipse)
