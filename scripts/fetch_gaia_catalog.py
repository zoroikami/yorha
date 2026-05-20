"""
╔═══════════════════════════════════════════════════════════════╗
║  Vynas Data Pipeline — Gaia DR3 Star Catalog Fetcher          ║
║  Descarga las 100k estrellas más brillantes de ESA Gaia DR3   ║
║  y genera un buffer binario para Three.js                     ║
╚═══════════════════════════════════════════════════════════════╝

Fuente: ESA Gaia Archive (https://gea.esac.esa.int/archive/)
Datos: Gaia Data Release 3 (2022)

Genera:
  - data/gaia_stars.bin   → Buffer binario (posX, posY, posZ, r, g, b, size) × N
  - data/gaia_catalog.json → Metadata + estadísticas

Requisitos:
  pip install requests astropy
  (astropy es opcional — se usa para coordenadas si está disponible)
"""

import json
import struct
import math
import logging
import time
from datetime import datetime
from pathlib import Path

import requests

from config import DATA_DIR, LOGS_DIR

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s — %(message)s",
    handlers=[
        logging.FileHandler(LOGS_DIR / "fetch_gaia.log", encoding="utf-8"),
        logging.StreamHandler()
    ]
)
log = logging.getLogger("fetch_gaia")

# ══ Configuración ══
GAIA_TAP_URL = "https://gea.esac.esa.int/tap-server/tap/sync"
MAX_STARS = 100000
# Escala de parsecs a unidades Three.js (1 pc ≈ 1 unidad)
# Con logarithmicDepthBuffer y far=500000, esto da buen rango
PARSEC_TO_UNITS = 1.0

# ══ Conversión BP-RP → Color (temperatura → sRGB) ══
# Tabla de referencia de temperaturas estelares por BP-RP
# Basada en: Pecaut & Mamajek 2013, ApJS

def bp_rp_to_temperature(bp_rp):
    """
    Convierte índice de color Gaia BP-RP a temperatura efectiva (K).
    Aproximación polinomial calibrada con Pecaut & Mamajek 2013.
    """
    if bp_rp is None or bp_rp < -0.5:
        return 30000  # Estrellas O muy calientes
    if bp_rp > 5.0:
        return 2400   # Enanas rojas tardías

    # Polinomio de ajuste (válido para -0.5 < BP-RP < 5.0)
    # T_eff ≈ 4600 * (1/((0.92 * BP_RP) + 1.7) + 1/((0.92 * BP_RP) + 0.62))
    # Ballesteros 2012, EPL 97
    x = bp_rp
    t = 4600 * (1.0 / (0.92 * x + 1.7) + 1.0 / (0.92 * x + 0.62))
    return max(2400, min(40000, t))


def temperature_to_rgb(temp_k):
    """
    Convierte temperatura en Kelvin a color RGB normalizado [0-1].
    Implementa la fórmula de cuerpo negro de Tanner Helland (2012),
    mejorada con coeficientes de Mitchell Charity.
    """
    temp = temp_k / 100.0

    # Rojo
    if temp <= 66:
        r = 1.0
    else:
        r = 1.2929 * ((temp - 60) ** -0.1332)
        r = max(0.0, min(1.0, r))

    # Verde
    if temp <= 66:
        g = 0.3900 * math.log(max(1, temp)) - 0.6318
        g = max(0.0, min(1.0, g))
    else:
        g = 1.1298 * ((temp - 60) ** -0.0755)
        g = max(0.0, min(1.0, g))

    # Azul
    if temp >= 66:
        b = 1.0
    elif temp <= 19:
        b = 0.0
    else:
        b = 0.5432 * math.log(max(1, temp - 10)) - 1.1962
        b = max(0.0, min(1.0, b))

    return (r, g, b)


def magnitude_to_size(phot_g_mean_mag):
    """
    Convierte magnitud G de Gaia a tamaño de punto para Three.js.
    Estrellas más brillantes (mag baja) → puntos más grandes.
    Rango: ~0.3 (mag 15) a ~4.0 (mag -1)
    """
    if phot_g_mean_mag is None:
        return 0.5
    # Mapeo logarítmico invertido
    # mag 0 → size 3.0, mag 6 → size 1.5, mag 12 → size 0.4
    size = 3.5 * (10 ** (-0.12 * (phot_g_mean_mag - 1)))
    return max(0.2, min(5.0, size))


def parallax_to_cartesian(ra_deg, dec_deg, parallax_mas):
    """
    Convierte coordenadas ecuatoriales + paralaje a cartesianas 3D.
    
    Args:
        ra_deg: Ascensión recta (grados)
        dec_deg: Declinación (grados)
        parallax_mas: Paralaje (milisegundos de arco)
    
    Returns:
        (x, y, z) en parsecs
    """
    if parallax_mas <= 0.01:
        parallax_mas = 0.01  # Evitar división por ~0

    distance_pc = 1000.0 / parallax_mas  # parsecs

    ra_rad = math.radians(ra_deg)
    dec_rad = math.radians(dec_deg)

    x = distance_pc * math.cos(dec_rad) * math.cos(ra_rad)
    y = distance_pc * math.sin(dec_rad)
    z = distance_pc * math.cos(dec_rad) * math.sin(ra_rad)

    return (x, y, z)


def query_gaia_tap(max_stars=MAX_STARS):
    """
    Consulta el archivo Gaia DR3 via TAP/ADQL.
    Descarga: ra, dec, parallax, phot_g_mean_mag, bp_rp
    Ordenado por brillo (magnitud ascendente).
    """
    log.info(f"Consultando Gaia DR3 TAP — {max_stars} estrellas más brillantes...")

    # ADQL: lenguaje de consulta astronómico
    adql_query = f"""
    SELECT TOP {max_stars}
        source_id,
        ra,
        dec,
        parallax,
        parallax_error,
        phot_g_mean_mag,
        bp_rp,
        radial_velocity
    FROM gaiadr3.gaia_source
    WHERE parallax > 0.5
      AND parallax_over_error > 5
      AND phot_g_mean_mag IS NOT NULL
      AND bp_rp IS NOT NULL
      AND visibility_periods_used > 8
    ORDER BY phot_g_mean_mag ASC
    """

    params = {
        "REQUEST": "doQuery",
        "LANG": "ADQL",
        "FORMAT": "json",
        "QUERY": adql_query.strip()
    }

    try:
        response = requests.get(
            GAIA_TAP_URL,
            params=params,
            timeout=300,  # 5 minutos — la query puede ser lenta
            headers={"User-Agent": "Vynas/2.0 (Astronomical Simulator)"}
        )
        response.raise_for_status()
        data = response.json()
        
        # El formato TAP JSON tiene metadata + data
        columns = data.get("metadata", [])
        rows = data.get("data", [])
        
        col_names = [c.get("name", "") for c in columns]
        log.info(f"  Recibidas {len(rows)} estrellas. Columnas: {col_names}")
        
        return col_names, rows

    except requests.exceptions.Timeout:
        log.error("Timeout de 5 minutos alcanzado. La query es muy pesada para el servidor.")
        log.info("Intentando con subset más pequeño...")
        return query_gaia_tap(max_stars // 2)

    except Exception as e:
        log.error(f"Error consultando Gaia TAP: {e}")
        return None, None


def process_stars(col_names, rows):
    """
    Procesa las filas crudas de Gaia y genera:
    - positions: Float32Array-compatible (x, y, z per star)
    - colors: Float32Array-compatible (r, g, b per star)
    - sizes: Float32Array-compatible (size per star)
    - catalog: lista de objetos con metadata
    """
    log.info("Procesando estrellas...")

    idx = {name: i for i, name in enumerate(col_names)}

    stars_data = []
    stats = {
        "total_raw": len(rows),
        "processed": 0,
        "rejected_parallax": 0,
        "rejected_position": 0,
        "temp_range": [100000, 0],
        "mag_range": [100, -100],
        "distance_range": [1e10, 0],
        "spectral_counts": {"O": 0, "B": 0, "A": 0, "F": 0, "G": 0, "K": 0, "M": 0}
    }

    for row in rows:
        try:
            ra = float(row[idx["ra"]])
            dec = float(row[idx["dec"]])
            parallax = float(row[idx["parallax"]])
            mag = float(row[idx["phot_g_mean_mag"]])
            bp_rp = float(row[idx["bp_rp"]]) if row[idx.get("bp_rp", -1)] is not None else 0.65

            # Filtro de calidad de paralaje
            if parallax <= 0.1:
                stats["rejected_parallax"] += 1
                continue

            # Coordenadas cartesianas
            x, y, z = parallax_to_cartesian(ra, dec, parallax)
            distance_pc = 1000.0 / parallax

            # Filtrar estrellas demasiado lejanas para el rango visual
            if distance_pc > 2000:
                stats["rejected_position"] += 1
                continue

            # Escalar posiciones al espacio Three.js
            # Las estrellas del catálogo estarán a una escala mucho mayor
            # que el sistema solar (orbRadius ~300 units)
            sx = x * PARSEC_TO_UNITS
            sy = y * PARSEC_TO_UNITS
            sz = z * PARSEC_TO_UNITS

            # Color desde BP-RP
            temp = bp_rp_to_temperature(bp_rp)
            r, g, b = temperature_to_rgb(temp)

            # Tamaño desde magnitud
            size = magnitude_to_size(mag)

            stars_data.append({
                "x": sx, "y": sy, "z": sz,
                "r": r, "g": g, "b": b,
                "size": size,
                "mag": mag,
                "temp": temp,
                "dist_pc": round(distance_pc, 2)
            })

            stats["processed"] += 1
            stats["temp_range"][0] = min(stats["temp_range"][0], temp)
            stats["temp_range"][1] = max(stats["temp_range"][1], temp)
            stats["mag_range"][0] = min(stats["mag_range"][0], mag)
            stats["mag_range"][1] = max(stats["mag_range"][1], mag)
            stats["distance_range"][0] = min(stats["distance_range"][0], distance_pc)
            stats["distance_range"][1] = max(stats["distance_range"][1], distance_pc)

            # Clasificación espectral aproximada
            if temp > 30000: stats["spectral_counts"]["O"] += 1
            elif temp > 10000: stats["spectral_counts"]["B"] += 1
            elif temp > 7500: stats["spectral_counts"]["A"] += 1
            elif temp > 6000: stats["spectral_counts"]["F"] += 1
            elif temp > 5200: stats["spectral_counts"]["G"] += 1
            elif temp > 3700: stats["spectral_counts"]["K"] += 1
            else: stats["spectral_counts"]["M"] += 1

        except (ValueError, TypeError, IndexError) as e:
            continue

    log.info(f"  Procesadas: {stats['processed']} / {stats['total_raw']}")
    log.info(f"  Rango de temperatura: {stats['temp_range'][0]:.0f}K — {stats['temp_range'][1]:.0f}K")
    log.info(f"  Rango de magnitud: {stats['mag_range'][0]:.2f} — {stats['mag_range'][1]:.2f}")
    log.info(f"  Distribución espectral: {stats['spectral_counts']}")

    return stars_data, stats


def write_binary_buffer(stars_data, output_path):
    """
    Escribe un buffer binario compacto para carga directa en Three.js.
    
    Formato: Header (8 bytes) + N × 7 floats (28 bytes cada estrella)
    Header: [magic: 4 bytes 'GAIA'] [count: uint32]
    Per star: [x: f32] [y: f32] [z: f32] [r: f32] [g: f32] [b: f32] [size: f32]
    
    Total: 8 + N * 28 bytes
    Para 100k estrellas: ~2.7 MB (vs ~15 MB en JSON)
    """
    log.info(f"Escribiendo buffer binario: {output_path}")

    with open(output_path, "wb") as f:
        # Header
        f.write(b'GAIA')
        f.write(struct.pack('<I', len(stars_data)))

        # Star data
        for s in stars_data:
            f.write(struct.pack('<fffffff',
                s["x"], s["y"], s["z"],
                s["r"], s["g"], s["b"],
                s["size"]
            ))

    size_mb = output_path.stat().st_size / (1024 * 1024)
    log.info(f"  Buffer escrito: {size_mb:.2f} MB ({len(stars_data)} estrellas)")


def write_catalog_json(stars_data, stats, output_path):
    """
    Escribe metadata y estadísticas del catálogo.
    NO incluye todas las posiciones (eso va en el .bin).
    Incluye las 100 estrellas más brillantes como referencia.
    """
    # Top 100 estrellas más brillantes para el HUD
    top_stars = sorted(stars_data, key=lambda s: s["mag"])[:100]
    notable_stars = []
    for s in top_stars:
        notable_stars.append({
            "mag": round(s["mag"], 2),
            "temp_k": round(s["temp"]),
            "dist_pc": s["dist_pc"],
            "color_rgb": [round(s["r"], 3), round(s["g"], 3), round(s["b"], 3)]
        })

    catalog = {
        "_metadata": {
            "generated": datetime.utcnow().isoformat() + "Z",
            "source": "ESA Gaia DR3 (Data Release 3, 2022)",
            "source_url": "https://gea.esac.esa.int/archive/",
            "query": "TOP 100000 ORDER BY phot_g_mean_mag ASC, parallax > 0.5, parallax_over_error > 5",
            "script": "fetch_gaia_catalog.py",
            "license": "CC BY-SA 3.0 IGO (ESA/Gaia/DPAC)"
        },
        "statistics": {
            "total_stars": stats["processed"],
            "temperature_range_k": stats["temp_range"],
            "magnitude_range": stats["mag_range"],
            "distance_range_pc": stats["distance_range"],
            "spectral_distribution": stats["spectral_counts"],
            "binary_file": "gaia_stars.bin",
            "binary_format": "Header(4B magic + 4B uint32 count) + N × 7 × float32 (x,y,z,r,g,b,size)",
            "bytes_per_star": 28
        },
        "scale": {
            "parsec_to_units": PARSEC_TO_UNITS,
            "coordinate_system": "ICRS cartesian (converted from RA/Dec/parallax)",
            "note": "Las posiciones están centradas en el Sol (0,0,0)"
        },
        "notable_stars": notable_stars
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)

    log.info(f"  Catálogo JSON escrito: {output_path}")


def fetch_gaia():
    """Pipeline principal de descarga y procesamiento Gaia DR3."""
    log.info("══ Iniciando pipeline Gaia DR3 ══")

    col_names, rows = query_gaia_tap(MAX_STARS)

    if not rows:
        log.error("No se obtuvieron datos de Gaia. Abortando.")
        return False

    stars_data, stats = process_stars(col_names, rows)

    if len(stars_data) == 0:
        log.error("Ninguna estrella pasó los filtros de calidad.")
        return False

    # Escribir archivos
    bin_path = DATA_DIR / "gaia_stars.bin"
    json_path = DATA_DIR / "gaia_catalog.json"

    write_binary_buffer(stars_data, bin_path)
    write_catalog_json(stars_data, stats, json_path)

    log.info(f"══ Pipeline Gaia DR3 completado: {stats['processed']} estrellas ══")
    return True


if __name__ == "__main__":
    fetch_gaia()
