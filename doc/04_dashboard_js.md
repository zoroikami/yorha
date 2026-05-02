# `dashboard.js` — Motor 3D y Lógica Central

> **Ruta:** `/js/dashboard.js`  
> **Tipo:** JavaScript (módulo ES6)  
> **Tamaño:** ~37.8 KB (800 líneas)  
> **Importa:** `api.js`

---

## Propósito

Es el **corazón de la aplicación**. Contiene toda la lógica de renderizado 3D, construcción del sistema solar, animación kepleriana, interacción del usuario, control de cámara y gestión del HUD. Se ejecuta como una IIFE asíncrona (`(async function () { ... })()`).

---

## Arquitectura Interna

El archivo se organiza en **8 secciones numeradas**, cada una responsable de un subsistema:

```
┌─────────────────────────────────────────────────────────────┐
│ Sección 0: PRELOADER                                        │
│   Barra de progreso + estados de carga                      │
├─────────────────────────────────────────────────────────────┤
│ Sección 1: CARGA DE DATOS (API)                             │
│   fetch astronomy.json → PLANETS_DATA, CONSTELLATIONS_DATA  │
├─────────────────────────────────────────────────────────────┤
│ Sección 2: RENDERER & ESCENA                                │
│   WebGL, cámara, post-procesado bloom, controles            │
├─────────────────────────────────────────────────────────────┤
│ Sección 3: SOL Y LUZ PRINCIPAL                              │
│   Sol emisivo, halo, PointLight central                     │
├─────────────────────────────────────────────────────────────┤
│ Sección 4: ESTRELLAS Y CONSTELACIONES                       │
│   Starfield, constelaciones procedurales, entidades míticas │
├─────────────────────────────────────────────────────────────┤
│ Sección 5: CONSTRUCCIÓN DEL SISTEMA PLANETARIO              │
│   8 planetas + cinturón de asteroides + anillos             │
├─────────────────────────────────────────────────────────────┤
│ Sección 6: RAYCASTER Y UI                                   │
│   Selección por clic, doble modo (ambiente/interactivo)     │
├─────────────────────────────────────────────────────────────┤
│ Sección 7: TRANSICIONES DE CÁMARA                           │
│   enterDetail(), exitDetail(), modales de eras              │
├─────────────────────────────────────────────────────────────┤
│ Sección 8: BUCLE DE ANIMACIÓN                               │
│   requestAnimationFrame loop + física orbital               │
└─────────────────────────────────────────────────────────────┘
```

---

## Sección 0 — Preloader

El sistema de preloader está conectado al `THREE.DefaultLoadingManager`:

- **0–20%:** Carga del JSON de datos (`api.js`)
- **20–100%:** Carga de texturas 3D (informada por `onProgress`)
- Al completarse (`onLoad`): clase `fade-out` al preloader → desaparece en 800ms

```
Estado visual: "Descargando Topología Estelar..." → 
               "Sintetizando Texturas Espaciales (3/15)..." →
               "Enlace Orbital Establecido."
```

---

## Sección 1 — Carga de Datos

```javascript
const data = await getAstronomyData();
const PLANETS_DATA = data.PLANETS_DATA;          // 8 planetas
const CONSTELLATIONS_DATA = data.CONSTELLATIONS_DATA; // 4 constelaciones
```

Se usa `await` al inicio para asegurar que los datos existan antes de construir la escena.

---

## Sección 2 — Renderer y Escena

### WebGLRenderer
- `antialias: true` — renderizado suave
- `alpha: true` — fondo transparente del canvas
- `pixelRatio` capeado a `Math.min(devicePixelRatio, 2)` — optimización GPU

### Cámara
- `PerspectiveCamera(45°, aspect, 0.1, 2500)`
- Plano lejano en 2500 para evitar Z-fighting sin desperdiciar buffer

### Post-Procesado (Bloom)
```
EffectComposer
├── RenderPass (escena base)
└── UnrealBloomPass
    ├── threshold: 0.5  (solo objetos luminosos)
    ├── strength: 1.6   (resplandor intenso)
    └── radius: 0.8     (dispersión media)
```

### Iluminación Base
| Tipo | Color | Intensidad | Propósito |
|------|-------|------------|-----------|
| AmbientLight | `#0c1426` | 0.2 | Relleno mínimo para lado oscuro |
| HemisphereLight | `#1a233a` / `#000` | 0.4 | Tinte cósmico sutil |
| DirectionalLight | `#dbeafe` | 0.9 | Fill light anclada a cámara |

La DirectionalLight es **hija de la cámara** (siempre ilumina hacia donde mira, eliminando caras completamente negras).

### OrbitControls
- `enableDamping: true` (inercia suave)
- `autoRotate: true, speed: 0.5` (modo ambiente)
- `enabled: false` (desactivados hasta modo interactivo)

---

## Sección 3 — El Sol

| Componente | Geometría | Material |
|------------|-----------|----------|
| Sol | Esfera r=14, 64 segmentos | MeshBasicMaterial (emisivo) |
| Halo | Esfera r=16.1, 64 segmentos | BasicMaterial, AdditiveBlending, opacity 0.15 |
| Luz | PointLight | Intensidad 3, decay 0.1 (casi sin caída) |

El decay bajo (0.1) es una **decisión artística**: garantiza que los planetas lejanos (Neptuno a 250 unidades) sigan bien iluminados y muestren sus texturas 8K.

---

## Sección 4 — Estrellas y Constelaciones

### Campo de Estrellas (Partículas)
- `starsBase`: 8,000 partículas, spread 1500, tamaño 0.4
- `starsTwinkle`: 2,000 partículas, spread 1500, tamaño 0.8 (parpadean)
- **Nota:** Ambos campos están comentados (`scene.add` desactivado) — decisión estética para priorizar las constelaciones

### Constelaciones Procedurales (`makeConstellations()`)
- Toma los primeros 1,500 puntos del starfield base
- Conecta con `LineSegments` los puntos que estén a <100 y >15 unidades de distancia
- Máximo 2 conexiones por punto
- Material: líneas blancas semitransparentes (opacity 0.08)

### Constelaciones Míticas (Interactivas)
Para cada constelación en `CONSTELLATIONS_DATA`:

1. **Colisionador invisible**: Esfera r=150 (para raycaster), `visible: false`
2. **Posicionamiento**: Coordenadas polares (`radius`, `angleX`, `angleY`) a 1000 unidades del centro
3. **Beacon visual**: Octaedro wireframe en el color temático de la constelación (gira sobre sí mismo)
4. El mesh almacena `userData` con toda la información de la constelación

---

## Sección 5 — Sistema Planetario

### Cinturón de Asteroides
- **12,000 instancias** (`InstancedMesh` para rendimiento)
- Geometría: Dodecaedro r=0.25
- Posición: Radio 95–117 (entre Marte y Júpiter)
- Dispersión vertical: ±5 unidades
- Escala aleatoria: 0.5–2.5

### Construcción de Planetas

Para cada planeta en `PLANETS_DATA`, se crean:

```
Scene
└── Pivot (Group @ origin)
    └── PlanetLocalGroup (inclinación axial aplicada)
        ├── Planet Mesh (SphereGeometry + MeshStandardMaterial)
        ├── Atmospheric Glow (si aplica)
        ├── Cloud Layer (si aplica, solo Tierra)
        └── Ring System (si aplica, solo Saturno)
```

**Órbita ellíptica kepleriana:**
```javascript
const a = orbRadius;                           // Semi-eje mayor
const b = orbRadius * √(1 - e²);              // Semi-eje menor
const focusShift = a * e;                      // Desplazamiento focal
const orbitCurve = new EllipseCurve(-focusShift, 0, a, b); // Centrada en el foco
```

**Material planetario (MeshStandardMaterial):**
- `map`: Textura principal (hasta 8K)
- `bumpMap`: Misma textura para relieve (montañas, cráteres)
- `bumpScale`: Proporcional al radio del planeta
- `roughness: 0.85, metalness: 0.05`
- `emissiveMap`: Textura nocturna (solo Tierra)
- `emissive`: Color cálido para luces de ciudades

**Efectos especiales por planeta:**

| Planeta | Efecto |
|---------|--------|
| Venus, Tierra, Marte, Urano, Neptuno | Halo atmosférico (AdditiveBlending, BackSide) |
| Tierra | Capa de nubes independiente (rotación propia) |
| Saturno | Sistema de anillos con UV remapeado |

### Re-mapeo UV de los Anillos de Saturno
El `RingGeometry` de Three.js usa UVs circulares. El código las recalcula linealmente para que la textura alfa del anillo se aplique correctamente desde el borde interno al externo.

---

## Sección 6 — Raycaster y UI

### Sistema de Modos Dual

```
MODO AMBIENTE (defecto)          MODO INTERACTIVO
─────────────────────          ──────────────────
• Camera (0, 350, 900)         • Camera (0, 150, 400)
• orbitControls.enabled=false  • orbitControls.enabled=true
• autoRotate=true              • autoRotate=false
• Clics desactivados           • Clics activan raycaster
```

El botón "INICIAR INTERACCIÓN" alterna entre ambos modos con transiciones GSAP de 2.5s.

### Raycaster
- Se activa solo en modo interactivo
- Intersecta contra `activeMeshes[]` (planetas + sol + constelaciones)
- Si hay hit:
  - Sol → `resetToSun()` (zoom hacia el centro)
  - Planeta/Constelación → `enterDetail()` (transición de cámara + HUD)

---

## Sección 7 — Transiciones de Cámara

### `enterDetail(pData)`

1. **Pausa temporal** — detiene las órbitas para estudiar
2. **Guarda posición de cámara** para restaurar después
3. **Llena el HUD** con los datos del planeta:
   - Nombre, sector, descripción, datos numéricos, eras
   - Adapta labels si es constelación (ej: "Rotación" → "Forma Principal")
   - Si hay alerta, muestra el badge rojo
4. **Genera eras dinámicamente** en `#hub-eras-container`
5. **Aplica tema cromático** personalizado (CSS custom properties)
6. **Animación GSAP** (3.5s):
   - Planetas: Cámara posicionada cinemáticamente usando el ángulo desde el centro
   - Constelaciones: Vuelo al 50% de la distancia
7. **Efecto warp**: FOV oscila 45° → 75° → 45° durante el vuelo

### `exitDetail()`

1. Restaura la posición de cámara guardada
2. Restaura paleta dorada global
3. Oculta el HUD
4. Reactiva controles y tiempo

### Modales de Eras (`openEraModal` / `closeEraModal`)

- Al abrir: Desliza el HUD izquierdo fuera, muestra el modal, re-posiciona cámara al lado opuesto del planeta (cara iluminada por el sol)
- Al cerrar: Restaura la posición cinemática original

---

## Sección 8 — Bucle de Animación

```javascript
function animate() {
    requestAnimationFrame(animate);

    // Sol rota suavemente
    sunMesh.rotation.y += 0.0005 * globalTimeScale;

    // Para cada planeta:
    for (const key in planetaryObjects) {
        // 1. Rotación axial
        pMesh.rotation.y += rotSpeed * globalTimeScale;

        // 2. Nubes independientes (Tierra)
        cloudMesh.rotation.y += rotSpeed * 1.5 * globalTimeScale;

        // 3. Si no está pausado: órbita kepleriana
        if (!isTimePaused && globalTimeScale > 0) {
            // Ley de Kepler (velocidad variable por excentricidad)
            pData.orbAngle -= orbSpeed * globalTimeScale * (1 + e * cos(orbAngle));

            // Posición en la elipse
            x = a * cos(orbAngle) - focusShift;
            z = b * sin(orbAngle);
            targetGrp.position.set(x, 0, z);
        }
    }

    // Cinturón de asteroides gira
    // Constelaciones procedurales rotan
    // Constelaciones míticas orbitan con Matrix4
    // Estrellas titilantes parpadean (sin opacidad)

    // CÁMARA SATELITAL: Si estamos en detalle, la cámara
    // sigue al planeta en movimiento (tracking delta)

    controls.update();
    composer.render(); // Post-procesado (bloom)
}
```

### Control de Velocidad Temporal

| Botón | Scale | Efecto |
|-------|-------|--------|
| `\|\|` | 0 | Todo pausado |
| `▶` | 1 | Tiempo real |
| `⏩ x10` | 10 | Aceleración 10x |
| `🚀 x100` | 100 | Velocidad luz |

La variable `globalTimeScale` multiplica **todas** las velocidades (rotación, órbita, asteroides, estrellas).

### Cámara Satelital

Cuando se está en modo detalle (`inDetail && detailActiveTarget`), la cámara **rastrea automáticamente** el movimiento del planeta. Calcula el delta de posición entre frames y lo aplica tanto a `camera.position` como a `controls.target`.

---

## Variables Globales de Estado

| Variable | Tipo | Propósito |
|----------|------|-----------|
| `globalTimeScale` | float | Multiplicador de velocidad (0, 1, 10, 100) |
| `isInteractiveMode` | bool | Ambiente vs Interactivo |
| `isTimePaused` | bool | Pausa temporal |
| `inDetail` | bool | Si se está viendo un planeta en zoom |
| `savedOrbitCam` | Vector3 | Posición de cámara antes del detalle |
| `savedOrbitTgt` | Vector3 | Target de cámara antes del detalle |
| `detailActiveTarget` | Mesh | Planeta actualmente en detalle |
| `detailPreviousPos` | Vector3 | Posición anterior para tracking delta |
| `planetaryObjects` | Object | Diccionario de todos los planetas |
| `activeMeshes` | Array | Meshes interactuables para raycaster |
| `mythicConstellations` | Array | Constelaciones que orbitan juntas |

---

## Notas de Rendimiento

- **InstancedMesh** para 12,000 asteroides (una sola draw call)
- **devicePixelRatio** capeado a 2
- **makeConstellations** limita conexiones a 2 por punto y muestra solo 1,500
- **Plano lejano** en 2500 (no infinito) para ahorrar buffer Z
- **Bloom** opera solo sobre objetos con luminosidad > 0.5
