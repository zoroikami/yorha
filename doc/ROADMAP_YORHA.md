# ROADMAP: Evolución del Sistema YorHa

Este documento registra los pilares fundamentales para la expansión del proyecto hacia una plataforma de inteligencia y visualización de alta fidelidad.

## Próximos Hitos (Fase 3: HUD & Activos)

### 1. Inyección de Modelos de Gran Detalle (HD Assets)
- **Objetivo**: Reemplazar o complementar esferas básicas con modelos `.glb` / `.gltf` de alta complejidad.
- **Implementación**: Integrar `GLTFLoader` en `dashboard.js`.
- **Candidatos**: Estación Espacial Internacional (ISS), satélites de comunicaciones, y naves de patrulla YorHa orbitando planetas clave.

### 2. Paisaje Sonoro Inmersivo (Audio SFX)
- **Objetivo**: Añadir profundidad sensorial al dashboard.
- **Implementación**: Sistema de audio posicional para el espacio y disparadores de sonido para la UI.
- **Efectos sugeridos**:
    - **Ambiente**: "Computer Hum" (Zumbido de servidor) de baja frecuencia.
    - **UI**: Bips metálicos sutiles en los menús, sonidos de "enfoque" al hacer zoom.
    - **Warp**: Efecto de succión sonora al entrar/salir del modo detalle.

### 3. HUD Dinámico de Telemetría
- **Objetivo**: Simular un escaneo de datos en tiempo real.
- **Implementación**: Utilizar pequeños scripts de "fluctuación" de valores en las etiquetas del HUB.
- **Detalle**: Que los valores de rotación o atmósfera muestren decimales cambiando sutilmente, simulando que el sistema está procesando datos en vivo.

---

## Visión a Largo Plazo: Expansión Multi-Dominio

El sistema YorHa ha sido diseñado para trascender la astronomía. El núcleo de visualización 3D y el motor de HUD pueden adaptarse a:
- **Geopolítica y Logística**: Mapas terrestres cinemáticos.
- **Biología Molecular**: Visualización de estructuras de datos celulares.
- **Sistemas de Seguridad**: Monitoreo de redes en una estética de "War Room".

---
*Anotado el 19 de Abril de 2026 para la Red de Inteligencia YorHa.*
