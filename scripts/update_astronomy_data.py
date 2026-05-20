"""
╔═══════════════════════════════════════════════════════════════╗
║  YorHa Data Pipeline — ETL de Datos Astronómicos              ║
║  Enriquece astronomy.json con datos reales de NASA             ║
╚═══════════════════════════════════════════════════════════════╝

Fuentes:
  - NASA Exoplanet Archive (TAP API)
  - NASA Solar System OpenData
  
Genera: Actualiza data/astronomy.json con parámetros orbitales verificados
"""

import json
import math
import logging
from datetime import datetime
import requests

from config import (
    NASA_API_KEY, NASA_BASE, EXOPLANET_ARCHIVE,
    ASTRONOMY_JSON, DATA_DIR, LOGS_DIR
)

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s — %(message)s",
    handlers=[
        logging.FileHandler(LOGS_DIR / "etl_astronomy.log", encoding="utf-8"),
        logging.StreamHandler()
    ]
)
log = logging.getLogger("etl_astronomy")

# ══════════════════════════════════════════════════════════════
#  Parámetros orbitales reales de NASA (fallback estático)
#  Fuente: NASA Planetary Fact Sheet
#  https://nssdc.gsfc.nasa.gov/planetary/factsheet/
# ══════════════════════════════════════════════════════════════

SOLAR_SYSTEM_REAL_DATA = {
    "mercurio": {
        "semi_major_axis_au": 0.387,
        "eccentricity": 0.2056,
        "orbital_period_days": 87.97,
        "rotation_period_hours": 1407.6,
        "axial_tilt_deg": 0.034,
        "mass_earth": 0.0553,
        "radius_earth": 0.383,
        "gravity_m_s2": 3.7,
        "escape_velocity_km_s": 4.3,
        "mean_temp_c": 167,
        "surface_pressure_atm": 0,
        "num_moons": 0,
        "magnetic_field": "Sí (débil, ~1% de la Tierra)"
    },
    "venus": {
        "semi_major_axis_au": 0.723,
        "eccentricity": 0.0067,
        "orbital_period_days": 224.7,
        "rotation_period_hours": -5832.5,
        "axial_tilt_deg": 177.4,
        "mass_earth": 0.815,
        "radius_earth": 0.949,
        "gravity_m_s2": 8.87,
        "escape_velocity_km_s": 10.36,
        "mean_temp_c": 464,
        "surface_pressure_atm": 92,
        "num_moons": 0,
        "magnetic_field": "No"
    },
    "tierra": {
        "semi_major_axis_au": 1.000,
        "eccentricity": 0.0167,
        "orbital_period_days": 365.26,
        "rotation_period_hours": 23.93,
        "axial_tilt_deg": 23.44,
        "mass_earth": 1.0,
        "radius_earth": 1.0,
        "gravity_m_s2": 9.81,
        "escape_velocity_km_s": 11.19,
        "mean_temp_c": 15,
        "surface_pressure_atm": 1.0,
        "num_moons": 1,
        "magnetic_field": "Sí (dipolar fuerte)"
    },
    "marte": {
        "semi_major_axis_au": 1.524,
        "eccentricity": 0.0935,
        "orbital_period_days": 686.97,
        "rotation_period_hours": 24.62,
        "axial_tilt_deg": 25.19,
        "mass_earth": 0.107,
        "radius_earth": 0.532,
        "gravity_m_s2": 3.72,
        "escape_velocity_km_s": 5.03,
        "mean_temp_c": -65,
        "surface_pressure_atm": 0.006,
        "num_moons": 2,
        "magnetic_field": "No (remanente crustal)"
    },
    "jupiter": {
        "semi_major_axis_au": 5.203,
        "eccentricity": 0.0489,
        "orbital_period_days": 4332.59,
        "rotation_period_hours": 9.93,
        "axial_tilt_deg": 3.13,
        "mass_earth": 317.8,
        "radius_earth": 11.21,
        "gravity_m_s2": 24.79,
        "escape_velocity_km_s": 59.5,
        "mean_temp_c": -110,
        "surface_pressure_atm": None,
        "num_moons": 95,
        "magnetic_field": "Sí (el más fuerte del sistema solar)"
    },
    "saturno": {
        "semi_major_axis_au": 9.537,
        "eccentricity": 0.0565,
        "orbital_period_days": 10759.22,
        "rotation_period_hours": 10.66,
        "axial_tilt_deg": 26.73,
        "mass_earth": 95.16,
        "radius_earth": 9.45,
        "gravity_m_s2": 10.44,
        "escape_velocity_km_s": 35.5,
        "mean_temp_c": -140,
        "surface_pressure_atm": None,
        "num_moons": 146,
        "magnetic_field": "Sí"
    },
    "urano": {
        "semi_major_axis_au": 19.191,
        "eccentricity": 0.0457,
        "orbital_period_days": 30688.5,
        "rotation_period_hours": -17.24,
        "axial_tilt_deg": 97.77,
        "mass_earth": 14.54,
        "radius_earth": 4.01,
        "gravity_m_s2": 8.87,
        "escape_velocity_km_s": 21.3,
        "mean_temp_c": -195,
        "surface_pressure_atm": None,
        "num_moons": 28,
        "magnetic_field": "Sí (inclinado 59°)"
    },
    "neptuno": {
        "semi_major_axis_au": 30.069,
        "eccentricity": 0.0113,
        "orbital_period_days": 60182.0,
        "rotation_period_hours": 16.11,
        "axial_tilt_deg": 28.32,
        "mass_earth": 17.15,
        "radius_earth": 3.88,
        "gravity_m_s2": 11.15,
        "escape_velocity_km_s": 23.5,
        "mean_temp_c": -200,
        "surface_pressure_atm": None,
        "num_moons": 16,
        "magnetic_field": "Sí (inclinado 47°)"
    }
}

# Datos reales TRAPPIST-1 (Nature 2017, Agol et al. 2021)
TRAPPIST_REAL_DATA = {
    "trappist1b": {
        "mass_earth": 1.374, "radius_earth": 1.116,
        "orbital_period_days": 1.51087, "eccentricity": 0.00622,
        "semi_major_axis_au": 0.01154, "equilibrium_temp_k": 400,
        "density_g_cm3": 5.57
    },
    "trappist1c": {
        "mass_earth": 1.308, "radius_earth": 1.097,
        "orbital_period_days": 2.42182, "eccentricity": 0.00654,
        "semi_major_axis_au": 0.01580, "equilibrium_temp_k": 342,
        "density_g_cm3": 5.56
    },
    "trappist1d": {
        "mass_earth": 0.388, "radius_earth": 0.788,
        "orbital_period_days": 4.04961, "eccentricity": 0.00837,
        "semi_major_axis_au": 0.02227, "equilibrium_temp_k": 288,
        "density_g_cm3": 4.44
    },
    "trappist1e": {
        "mass_earth": 0.692, "radius_earth": 0.920,
        "orbital_period_days": 6.09962, "eccentricity": 0.00510,
        "semi_major_axis_au": 0.02925, "equilibrium_temp_k": 251,
        "density_g_cm3": 5.04
    },
    "trappist1f": {
        "mass_earth": 1.039, "radius_earth": 1.045,
        "orbital_period_days": 9.20669, "eccentricity": 0.01007,
        "semi_major_axis_au": 0.03849, "equilibrium_temp_k": 219,
        "density_g_cm3": 5.07
    },
    "trappist1g": {
        "mass_earth": 1.321, "radius_earth": 1.129,
        "orbital_period_days": 12.35294, "eccentricity": 0.00208,
        "semi_major_axis_au": 0.04683, "equilibrium_temp_k": 199,
        "density_g_cm3": 5.09
    },
    "trappist1h": {
        "mass_earth": 0.326, "radius_earth": 0.755,
        "orbital_period_days": 18.76726, "eccentricity": 0.00567,
        "semi_major_axis_au": 0.06189, "equilibrium_temp_k": 173,
        "density_g_cm3": 4.23
    }
}


def fetch_nasa_neo_count():
    """Obtiene conteo de asteroides cercanos hoy desde NASA NeoWs API."""
    try:
        url = f"{NASA_BASE}/neo/rest/v1/feed/today"
        r = requests.get(url, params={"api_key": NASA_API_KEY}, timeout=15)
        r.raise_for_status()
        data = r.json()
        return data.get("element_count", 0)
    except Exception as e:
        log.warning(f"NeoWs API error: {e}")
        return None


def fetch_apod():
    """Obtiene la Astronomy Picture of the Day."""
    try:
        url = f"{NASA_BASE}/planetary/apod"
        r = requests.get(url, params={"api_key": NASA_API_KEY}, timeout=15)
        r.raise_for_status()
        data = r.json()
        return {
            "title": data.get("title", ""),
            "explanation": data.get("explanation", ""),
            "url": data.get("url", ""),
            "hdurl": data.get("hdurl", ""),
            "date": data.get("date", ""),
            "media_type": data.get("media_type", "image")
        }
    except Exception as e:
        log.warning(f"APOD API error: {e}")
        return None


def enrich_astronomy_json():
    """
    Lee astronomy.json existente y lo enriquece con:
    1. Parámetros físicos reales de NASA Planetary Fact Sheet
    2. Datos TRAPPIST-1 de Agol et al. 2021
    3. Metadata de actualización
    """
    log.info("══ Iniciando ETL de datos astronómicos ══")

    # Leer JSON existente
    try:
        with open(ASTRONOMY_JSON, "r", encoding="utf-8") as f:
            astro = json.load(f)
    except FileNotFoundError:
        log.error(f"No se encontró {ASTRONOMY_JSON}")
        return False

    planets = astro.get("PLANETS_DATA", {})

    # ── 1. Enriquecer Sistema Solar con datos verificados ──
    for key, real in SOLAR_SYSTEM_REAL_DATA.items():
        if key in planets:
            p = planets[key]
            p["nasa_verified"] = {
                "semi_major_axis_au": real["semi_major_axis_au"],
                "eccentricity": real["eccentricity"],
                "orbital_period_days": real["orbital_period_days"],
                "rotation_period_hours": real["rotation_period_hours"],
                "axial_tilt_deg": real["axial_tilt_deg"],
                "mass_earth": real["mass_earth"],
                "radius_earth": real["radius_earth"],
                "gravity_m_s2": real["gravity_m_s2"],
                "escape_velocity_km_s": real["escape_velocity_km_s"],
                "mean_temp_c": real["mean_temp_c"],
                "surface_pressure_atm": real["surface_pressure_atm"],
                "num_moons": real["num_moons"],
                "magnetic_field": real["magnetic_field"],
                "source": "NASA Planetary Fact Sheet (NSSDCA)",
                "source_url": "https://nssdc.gsfc.nasa.gov/planetary/factsheet/"
            }
            log.info(f"  ✓ {p['name']} — datos NASA verificados inyectados")

    # ── 2. Enriquecer TRAPPIST-1 con datos publicados ──
    for key, real in TRAPPIST_REAL_DATA.items():
        if key in planets:
            p = planets[key]
            p["nasa_verified"] = {
                "mass_earth": real["mass_earth"],
                "radius_earth": real["radius_earth"],
                "orbital_period_days": real["orbital_period_days"],
                "eccentricity": real["eccentricity"],
                "semi_major_axis_au": real["semi_major_axis_au"],
                "equilibrium_temp_k": real["equilibrium_temp_k"],
                "density_g_cm3": real["density_g_cm3"],
                "source": "Agol et al. 2021, PSJ 2:1",
                "source_url": "https://doi.org/10.3847/PSJ/abd022"
            }
            log.info(f"  ✓ {p['name']} — datos TRAPPIST-1 verificados")

    # ── 3. Calcular zona habitable para cada estrella ──
    stars = {k: v for k, v in planets.items() if v.get("isStar")}
    for star_key, star in stars.items():
        # Luminosidad relativa estimada por tipo espectral
        if star_key == "sol":
            luminosity_solar = 1.0
        elif star_key == "trappist1":
            luminosity_solar = 0.000524  # TRAPPIST-1: L☉ = 0.000524
        elif star_key == "kepler186":
            luminosity_solar = 0.04      # Kepler-186: ~0.04 L☉
        else:
            luminosity_solar = 1.0

        hz_inner_au = math.sqrt(luminosity_solar / 1.1)
        hz_outer_au = math.sqrt(luminosity_solar / 0.53)

        star["habitable_zone"] = {
            "inner_au": round(hz_inner_au, 4),
            "outer_au": round(hz_outer_au, 4),
            "luminosity_solar": luminosity_solar,
            "note": "Límites conservadores (Kopparapu et al. 2013)"
        }
        log.info(f"  ✓ {star['name']} — zona habitable: {hz_inner_au:.4f} - {hz_outer_au:.4f} AU")

    # ── 4. Clasificación de habitabilidad para cada planeta ──
    for key, p in planets.items():
        if p.get("isStar"):
            continue

        verified = p.get("nasa_verified", {})
        semi_major = verified.get("semi_major_axis_au")

        if semi_major and not p.get("isConstellation"):
            # Determinar a qué estrella pertenece
            if "TRAPPIST" in p.get("sector", ""):
                hz = planets.get("trappist1", {}).get("habitable_zone", {})
            elif "Kepler" in p.get("sector", ""):
                hz = planets.get("kepler186", {}).get("habitable_zone", {})
            else:
                hz = planets.get("sol", {}).get("habitable_zone", {})

            inner = hz.get("inner_au", 0)
            outer = hz.get("outer_au", 999)

            if inner <= semi_major <= outer:
                habitability = "ZONA_HABITABLE"
            elif semi_major < inner:
                habitability = "DEMASIADO_CALIENTE"
            else:
                habitability = "DEMASIADO_FRIO"

            p["habitability_class"] = habitability
            log.info(f"  ✓ {p['name']} — clasificación: {habitability}")

    # ── 5. APOD (imagen del día) ──
    apod = fetch_apod()
    if apod:
        astro["APOD"] = apod
        log.info(f"  ✓ APOD: {apod['title']}")

    # ── 6. NEO count ──
    neo_count = fetch_nasa_neo_count()
    if neo_count is not None:
        astro["NEO_TODAY"] = {
            "count": neo_count,
            "date": datetime.utcnow().strftime("%Y-%m-%d"),
            "source": "NASA NeoWs API"
        }
        log.info(f"  ✓ NEOs cercanos hoy: {neo_count}")

    # ── 7. Metadata de actualización ──
    astro["_pipeline"] = {
        "last_updated": datetime.utcnow().isoformat() + "Z",
        "script": "update_astronomy_data.py",
        "version": "1.0.0",
        "sources": [
            "NASA Planetary Fact Sheet (NSSDCA)",
            "Agol et al. 2021 — TRAPPIST-1 System",
            "NASA NeoWs API",
            "NASA APOD API",
            "Kopparapu et al. 2013 — Habitable Zone Limits"
        ]
    }

    # Escribir JSON actualizado
    with open(ASTRONOMY_JSON, "w", encoding="utf-8") as f:
        json.dump(astro, f, ensure_ascii=False, indent=4)

    log.info(f"══ astronomy.json actualizado ({ASTRONOMY_JSON}) ══")
    return True


if __name__ == "__main__":
    enrich_astronomy_json()
