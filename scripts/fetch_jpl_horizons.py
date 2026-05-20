"""
╔═══════════════════════════════════════════════════════════════╗
║  Vynas Data Pipeline — JPL Horizons Ephemeris Fetcher         ║
║  Descarga vectores de estado planetarios en tiempo real        ║
╚═══════════════════════════════════════════════════════════════╝

Fuente: NASA JPL Horizons System
  https://ssd.jpl.nasa.gov/horizons/

Genera:
  - data/jpl_ephemeris.json → Posiciones y velocidades actuales de todos
    los cuerpos mayores del sistema solar (época J2000, eclíptica)

Los vectores de estado incluyen:
  - Posición (X, Y, Z) en km
  - Velocidad (Vx, Vy, Vz) en km/s
  - Distancia al Sol (r) y a la Tierra (delta)

Requisitos:
  pip install requests
"""

import json
import logging
from datetime import datetime, timedelta

import requests

from config import DATA_DIR, LOGS_DIR

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s — %(message)s",
    handlers=[
        logging.FileHandler(LOGS_DIR / "fetch_jpl.log", encoding="utf-8"),
        logging.StreamHandler()
    ]
)
log = logging.getLogger("fetch_jpl")

# ══ JPL Horizons API Endpoint ══
HORIZONS_API = "https://ssd.jpl.nasa.gov/api/horizons.api"

# ══ Cuerpos del sistema solar (NAIF IDs) ══
SOLAR_SYSTEM_BODIES = {
    "mercurio": {"id": "199", "name": "Mercury", "key": "mercurio"},
    "venus":    {"id": "299", "name": "Venus",   "key": "venus"},
    "tierra":   {"id": "399", "name": "Earth",   "key": "tierra"},
    "luna":     {"id": "301", "name": "Moon",     "key": "luna"},
    "marte":    {"id": "499", "name": "Mars",     "key": "marte"},
    "fobos":    {"id": "401", "name": "Phobos",   "key": "fobos"},
    "deimos":   {"id": "402", "name": "Deimos",   "key": "deimos"},
    "jupiter":  {"id": "599", "name": "Jupiter",  "key": "jupiter"},
    "io":       {"id": "501", "name": "Io",       "key": "io"},
    "europa":   {"id": "502", "name": "Europa",   "key": "europa"},
    "ganymede": {"id": "503", "name": "Ganymede", "key": "ganymede"},
    "callisto": {"id": "504", "name": "Callisto", "key": "callisto"},
    "saturno":  {"id": "699", "name": "Saturn",   "key": "saturno"},
    "titan":    {"id": "606", "name": "Titan",    "key": "titan"},
    "urano":    {"id": "799", "name": "Uranus",   "key": "urano"},
    "neptuno":  {"id": "899", "name": "Neptune",  "key": "neptuno"},
}

# Constantes
AU_KM = 149_597_870.7


def query_horizons_vectors(body_id, body_name, epoch=None):
    """
    Consulta JPL Horizons para obtener vectores de estado de un cuerpo.
    
    Args:
        body_id: NAIF ID del cuerpo (ej. "399" para Tierra)
        body_name: Nombre legible
        epoch: datetime para la consulta (default: ahora)
    
    Returns:
        dict con posición (X,Y,Z km), velocidad (Vx,Vy,Vz km/s),
        distancias, y elementos orbitales
    """
    if epoch is None:
        epoch = datetime.utcnow()

    # Horizons necesita formato 'YYYY-MMM-DD HH:MM'
    start_time = epoch.strftime("%Y-%b-%d %H:%M")
    stop_time = (epoch + timedelta(minutes=1)).strftime("%Y-%b-%d %H:%M")

    params = {
        "format": "json",
        "COMMAND": f"'{body_id}'",
        "OBJ_DATA": "YES",
        "MAKE_EPHEM": "YES",
        "EPHEM_TYPE": "VECTORS",
        "CENTER": "'500@10'",       # Centro: Sol (heliocéntrico)
        "REF_PLANE": "ECLIPTIC",     # Plano eclíptico J2000
        "REF_SYSTEM": "ICRF",
        "VEC_TABLE": "2",            # Posición + Velocidad
        "VEC_LABELS": "YES",
        "OUT_UNITS": "KM-S",        # km y km/s
        "START_TIME": f"'{start_time}'",
        "STOP_TIME": f"'{stop_time}'",
        "STEP_SIZE": "'1'",
        "CSV_FORMAT": "YES"
    }

    try:
        response = requests.get(HORIZONS_API, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()

        result_text = data.get("result", "")

        # Parsear los vectores de la respuesta
        vectors = parse_horizons_vectors(result_text, body_name)

        if vectors:
            log.info(f"  ✓ {body_name}: X={vectors['position_km'][0]:.1f} km")
        else:
            log.warning(f"  ✗ {body_name}: No se pudieron parsear vectores")

        return vectors

    except Exception as e:
        log.error(f"  ✗ {body_name}: Error de consulta — {e}")
        return None


def parse_horizons_vectors(text, body_name):
    """
    Parsea la respuesta de texto de Horizons para extraer vectores.
    Busca entre $$SOE y $$EOE markers.
    """
    try:
        # Encontrar el bloque de datos
        soe_idx = text.find("$$SOE")
        eoe_idx = text.find("$$EOE")

        if soe_idx == -1 or eoe_idx == -1:
            return None

        data_block = text[soe_idx + 5:eoe_idx].strip()

        # El formato CSV con VEC_TABLE=2:
        # JDTDB, Calendar Date, X, Y, Z, VX, VY, VZ, LT, RG, RR
        lines = [l.strip() for l in data_block.split('\n') if l.strip()]

        if not lines:
            return None

        # Tomar la primera (y única) fila de datos
        # Los valores están separados por comas
        values = []
        for line in lines:
            parts = line.split(',')
            for p in parts:
                p = p.strip()
                if p and not any(c.isalpha() for c in p.replace('.', '').replace('-', '').replace('+', '').replace('E', '')):
                    try:
                        values.append(float(p))
                    except ValueError:
                        pass

        # Necesitamos al menos: JDTDB, X, Y, Z, VX, VY, VZ
        if len(values) < 7:
            # Intentar parseo alternativo (non-CSV format)
            return parse_horizons_vectors_alt(text, body_name)

        # JDTDB es el primer valor, luego X,Y,Z,VX,VY,VZ
        jd = values[0]
        x, y, z = values[1], values[2], values[3]
        vx, vy, vz = values[4], values[5], values[6]

        # Calcular distancia al Sol
        r_km = (x**2 + y**2 + z**2) ** 0.5
        r_au = r_km / AU_KM

        # Velocidad orbital
        v_km_s = (vx**2 + vy**2 + vz**2) ** 0.5

        return {
            "position_km": [round(x, 3), round(y, 3), round(z, 3)],
            "velocity_km_s": [round(vx, 6), round(vy, 6), round(vz, 6)],
            "distance_sun_km": round(r_km, 3),
            "distance_sun_au": round(r_au, 6),
            "orbital_velocity_km_s": round(v_km_s, 4),
            "julian_date": jd,
            "reference_frame": "ICRF/Ecliptic J2000",
            "center": "Sun (heliocentric)"
        }

    except Exception as e:
        log.warning(f"  Parse error for {body_name}: {e}")
        return None


def parse_horizons_vectors_alt(text, body_name):
    """
    Parser alternativo para formato non-CSV de Horizons.
    Busca líneas con X= Y= Z= VX= VY= VZ=
    """
    import re

    result = {}
    
    # Patrones para vectores
    patterns = {
        'X': r'X\s*=\s*([-+]?\d+\.?\d*[Ee]?[-+]?\d*)',
        'Y': r'Y\s*=\s*([-+]?\d+\.?\d*[Ee]?[-+]?\d*)',
        'Z': r'Z\s*=\s*([-+]?\d+\.?\d*[Ee]?[-+]?\d*)',
        'VX': r'VX\s*=\s*([-+]?\d+\.?\d*[Ee]?[-+]?\d*)',
        'VY': r'VY\s*=\s*([-+]?\d+\.?\d*[Ee]?[-+]?\d*)',
        'VZ': r'VZ\s*=\s*([-+]?\d+\.?\d*[Ee]?[-+]?\d*)',
    }

    soe_idx = text.find("$$SOE")
    eoe_idx = text.find("$$EOE")
    if soe_idx == -1 or eoe_idx == -1:
        return None

    data_block = text[soe_idx:eoe_idx]

    for key, pattern in patterns.items():
        match = re.search(pattern, data_block)
        if match:
            result[key] = float(match.group(1))

    if len(result) < 6:
        return None

    x, y, z = result['X'], result['Y'], result['Z']
    vx, vy, vz = result['VX'], result['VY'], result['VZ']

    r_km = (x**2 + y**2 + z**2) ** 0.5
    v_km_s = (vx**2 + vy**2 + vz**2) ** 0.5

    return {
        "position_km": [round(x, 3), round(y, 3), round(z, 3)],
        "velocity_km_s": [round(vx, 6), round(vy, 6), round(vz, 6)],
        "distance_sun_km": round(r_km, 3),
        "distance_sun_au": round(r_km / AU_KM, 6),
        "orbital_velocity_km_s": round(v_km_s, 4),
        "reference_frame": "ICRF/Ecliptic J2000",
        "center": "Sun (heliocentric)"
    }


def km_to_threejs_units(position_km, scale_factor=None):
    """
    Convierte posición en km a unidades Three.js del sistema solar.
    
    El factor de escala se calcula para que Tierra esté a orbRadius ~55 units
    (consistente con astronomy.json):
      1 AU = 149,597,870.7 km → 55 units
      scale = 55 / 149,597,870.7 ≈ 3.676e-7
    """
    if scale_factor is None:
        scale_factor = 55.0 / AU_KM  # Normalizar a orbRadius de la Tierra

    return [round(p * scale_factor, 6) for p in position_km]


def fetch_all_ephemeris():
    """
    Descarga vectores de estado de todos los cuerpos mayores.
    Genera el archivo jpl_ephemeris.json.
    """
    log.info("══ Iniciando consulta JPL Horizons ══")

    epoch = datetime.utcnow()
    results = {}
    scale_factor = 55.0 / AU_KM

    for key, body in SOLAR_SYSTEM_BODIES.items():
        vectors = query_horizons_vectors(body["id"], body["name"], epoch)

        if vectors:
            # Añadir posición convertida a unidades Three.js
            vectors["position_threejs"] = km_to_threejs_units(
                vectors["position_km"], scale_factor
            )
            results[key] = {
                "name": body["name"],
                "naif_id": body["id"],
                "astronomy_json_key": body["key"],
                **vectors
            }

    # Escribir resultado
    output = {
        "_metadata": {
            "generated": epoch.isoformat() + "Z",
            "epoch": epoch.strftime("%Y-%b-%d %H:%M UTC"),
            "source": "NASA JPL Horizons System",
            "source_url": "https://ssd.jpl.nasa.gov/horizons/",
            "reference_frame": "ICRF/Ecliptic J2000",
            "center": "Sun (heliocentric)",
            "units": {
                "position": "km",
                "velocity": "km/s",
                "distance": "km and AU",
                "threejs_scale": f"1 AU = 55 Three.js units (factor: {scale_factor:.10e})"
            },
            "script": "fetch_jpl_horizons.py",
            "bodies_queried": len(SOLAR_SYSTEM_BODIES),
            "bodies_resolved": len(results)
        },
        "ephemeris": results
    }

    output_path = DATA_DIR / "jpl_ephemeris.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    log.info(f"══ JPL Horizons: {len(results)}/{len(SOLAR_SYSTEM_BODIES)} cuerpos resueltos → {output_path} ══")
    return True


if __name__ == "__main__":
    fetch_all_ephemeris()
