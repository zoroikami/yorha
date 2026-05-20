"""
╔═══════════════════════════════════════════════════════════════╗
║  YorHa Data Pipeline — Pre-Cómputo de Órbitas                 ║
║  Genera tablas de posición orbital para consumo de Three.js    ║
╚═══════════════════════════════════════════════════════════════╝

Genera: data/precomputed_orbits.json
  - Posiciones x,z para cada planeta a lo largo de una órbita completa
  - Velocidad orbital en cada punto (Kepler's 2nd law)
  - Puntos de perihelio/afelio marcados
  
Three.js puede usar estas tablas para:
  - Dibujar trails orbitales precisos
  - Mostrar velocidad variable real
  - Marcar perihelio/afelio en el HUD
"""

import json
import math
import logging
from datetime import datetime

from config import ASTRONOMY_JSON, PRECOMPUTED_ORBITS_JSON, LOGS_DIR, AU_KM

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s — %(message)s",
    handlers=[
        logging.FileHandler(LOGS_DIR / "precompute_orbits.log", encoding="utf-8"),
        logging.StreamHandler()
    ]
)
log = logging.getLogger("precompute_orbits")

# Número de puntos por órbita
ORBIT_RESOLUTION = 360


def solve_kepler(M, e, tol=1e-10, max_iter=50):
    """
    Resuelve la ecuación de Kepler M = E - e*sin(E) 
    usando Newton-Raphson.
    
    Args:
        M: Anomalía media (radianes)
        e: Excentricidad orbital
    Returns:
        E: Anomalía excéntrica (radianes)
    """
    E = M if e < 0.8 else math.pi
    for _ in range(max_iter):
        dE = (E - e * math.sin(E) - M) / (1 - e * math.cos(E))
        E -= dE
        if abs(dE) < tol:
            break
    return E


def true_anomaly_from_E(E, e):
    """Calcula la anomalía verdadera desde la anomalía excéntrica."""
    return 2 * math.atan2(
        math.sqrt(1 + e) * math.sin(E / 2),
        math.sqrt(1 - e) * math.cos(E / 2)
    )


def compute_orbital_positions(semi_major, eccentricity, n_points=ORBIT_RESOLUTION):
    """
    Calcula posiciones orbitales a lo largo de una órbita completa.
    
    Returns:
        Lista de {x, z, v_rel, M, E, nu} para cada punto
    """
    positions = []
    b = semi_major * math.sqrt(1 - eccentricity ** 2)  # Semi-eje menor

    for i in range(n_points):
        # Anomalía media uniformemente distribuida
        M = (2 * math.pi * i) / n_points

        # Resolver Kepler → Anomalía excéntrica
        E = solve_kepler(M, eccentricity)

        # Posición en el plano orbital
        x = semi_major * (math.cos(E) - eccentricity)
        z = b * math.sin(E)

        # Anomalía verdadera
        nu = true_anomaly_from_E(E, eccentricity)

        # Distancia al foco (estrella)
        r = semi_major * (1 - eccentricity * math.cos(E))

        # Velocidad relativa (Kepler's 2nd law: v ∝ 1/r para normalización)
        # v_rel = a/r normalizado a [0,1]
        v_rel = semi_major / r if r > 0 else 1.0

        positions.append({
            "x": round(x, 4),
            "z": round(z, 4),
            "r": round(r, 4),
            "v_rel": round(v_rel, 4),
            "deg": round(math.degrees(M), 2)
        })

    return positions


def find_apsides(positions, semi_major, eccentricity):
    """Encuentra perihelio y afelio."""
    perihelion_r = semi_major * (1 - eccentricity)
    aphelion_r = semi_major * (1 + eccentricity)

    perihelion_idx = min(range(len(positions)), key=lambda i: positions[i]["r"])
    aphelion_idx = max(range(len(positions)), key=lambda i: positions[i]["r"])

    return {
        "perihelion": {
            "index": perihelion_idx,
            "distance": round(perihelion_r, 4),
            "x": positions[perihelion_idx]["x"],
            "z": positions[perihelion_idx]["z"]
        },
        "aphelion": {
            "index": aphelion_idx,
            "distance": round(aphelion_r, 4),
            "x": positions[aphelion_idx]["x"],
            "z": positions[aphelion_idx]["z"]
        }
    }


def precompute_all():
    """Pre-computa órbitas para todos los planetas en astronomy.json."""
    log.info("══ Iniciando pre-cómputo de órbitas ══")

    try:
        with open(ASTRONOMY_JSON, "r", encoding="utf-8") as f:
            astro = json.load(f)
    except FileNotFoundError:
        log.error(f"No se encontró {ASTRONOMY_JSON}")
        return False

    planets = astro.get("PLANETS_DATA", {})
    result = {}

    for key, p in planets.items():
        # Saltar estrellas y objetos sin órbita
        if p.get("isStar") or p.get("orbRadius", 0) == 0:
            continue

        orb_radius = p["orbRadius"]
        ecc = p.get("e", 0)

        # Usar datos verificados si existen
        verified = p.get("nasa_verified", {})
        if verified.get("eccentricity") is not None:
            ecc = verified["eccentricity"]

        # Computar posiciones
        positions = compute_orbital_positions(orb_radius, ecc)
        apsides = find_apsides(positions, orb_radius, ecc)

        # Datos orbitales adicionales
        orbital_data = {
            "name": p["name"],
            "semi_major": orb_radius,
            "eccentricity": round(ecc, 6),
            "semi_minor": round(orb_radius * math.sqrt(1 - ecc ** 2), 4),
            "apsides": apsides,
            "n_points": ORBIT_RESOLUTION,
            "positions": positions
        }

        # Agregar período si está verificado
        if verified.get("orbital_period_days"):
            orbital_data["period_days"] = verified["orbital_period_days"]

        # Agregar semi-eje mayor real si está verificado
        if verified.get("semi_major_axis_au"):
            orbital_data["semi_major_au"] = verified["semi_major_axis_au"]
            orbital_data["semi_major_km"] = round(verified["semi_major_axis_au"] * AU_KM, 0)

        result[key] = orbital_data
        log.info(f"  ✓ {p['name']} — {ORBIT_RESOLUTION} puntos, e={ecc:.6f}")

    # Metadata
    output = {
        "_metadata": {
            "generated": datetime.utcnow().isoformat() + "Z",
            "resolution": ORBIT_RESOLUTION,
            "units": "Unidades de Three.js (orbRadius del JSON)",
            "coordinate_system": "Plano XZ (Y=0), foco en origen del sistema",
            "script": "precompute_orbits.py"
        },
        "orbits": result
    }

    with open(PRECOMPUTED_ORBITS_JSON, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    log.info(f"══ {len(result)} órbitas pre-computadas → {PRECOMPUTED_ORBITS_JSON} ══")
    return True


if __name__ == "__main__":
    precompute_all()
