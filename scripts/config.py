"""
╔═══════════════════════════════════════════════════════════════╗
║  YorHa Data Pipeline — Configuración Central                   ║
║  Rutas, API keys, y constantes del pipeline Python             ║
╚═══════════════════════════════════════════════════════════════╝
"""

import os
from pathlib import Path

# ══ Rutas ══
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
DATA_DIR = PROJECT_ROOT / "data"
IMG_DIR = PROJECT_ROOT / "img"
LOGS_DIR = PROJECT_ROOT / "logs"

# Asegurar que los directorios existan
DATA_DIR.mkdir(exist_ok=True)
LOGS_DIR.mkdir(exist_ok=True)
(DATA_DIR / "processed").mkdir(exist_ok=True)
(DATA_DIR / "cache").mkdir(exist_ok=True)

# ══ API Keys ══
# Registra tu key gratuita en https://api.nasa.gov/
NASA_API_KEY = os.environ.get("NASA_API_KEY", "3ol2YCqcIrPdfz8CBltbb9i2m84mfpkaXESaGc6s")

# ══ Endpoints ══
NASA_BASE = "https://api.nasa.gov"
NOAA_BASE = "https://services.swpc.noaa.gov"
EXOPLANET_ARCHIVE = "https://exoplanetarchive.ipac.caltech.edu"
GAIA_TAP_URL = "https://gea.esac.esa.int/tap-server/tap/sync"
JPL_HORIZONS_API = "https://ssd.jpl.nasa.gov/api/horizons.api"
USGS_ASTRO_BASE = "https://astrogeology.usgs.gov"

# ══ Archivos de salida ══
ASTRONOMY_JSON = DATA_DIR / "astronomy.json"
SPACE_WEATHER_JSON = DATA_DIR / "space_weather_live.json"
PRECOMPUTED_ORBITS_JSON = DATA_DIR / "precomputed_orbits.json"
MARS_CACHE_DIR = DATA_DIR / "cache" / "mars"
EPIC_CACHE_DIR = DATA_DIR / "cache" / "epic"
GAIA_STARS_BIN = DATA_DIR / "gaia_stars.bin"
GAIA_CATALOG_JSON = DATA_DIR / "gaia_catalog.json"
JPL_EPHEMERIS_JSON = DATA_DIR / "jpl_ephemeris.json"

MARS_CACHE_DIR.mkdir(parents=True, exist_ok=True)
EPIC_CACHE_DIR.mkdir(parents=True, exist_ok=True)

# ══ Constantes Científicas ══
AU_KM = 149_597_870.7          # 1 AU en kilómetros
SOLAR_LUMINOSITY = 3.828e26    # Watts
STEFAN_BOLTZMANN = 5.670374419e-8
