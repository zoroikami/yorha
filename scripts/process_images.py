"""
╔═══════════════════════════════════════════════════════════════╗
║  YorHa Data Pipeline — Procesamiento de Imágenes              ║
║  Descarga y procesa imágenes satelitales NASA EPIC y Mars     ║
╚═══════════════════════════════════════════════════════════════╝

Genera:
  - data/cache/mars/  → Fotos del rover procesadas y comprimidas
  - data/cache/epic/  → Imágenes EPIC de la Tierra procesadas
  - data/processed/mars_latest.json  → Metadata de fotos de Marte
  - data/processed/epic_latest.json  → Metadata de imágenes EPIC

Features:
  - Compresión automática (reduce ~60% sin pérdida visible)
  - Thumbnails para carga rápida en el dashboard
  - Metadata con fechas, cámaras, y coordenadas
"""

import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from io import BytesIO
import requests

try:
    from PIL import Image, ImageEnhance, ImageFilter
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

from config import (
    NASA_API_KEY, NASA_BASE,
    MARS_CACHE_DIR, EPIC_CACHE_DIR, DATA_DIR, LOGS_DIR
)

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s — %(message)s",
    handlers=[
        logging.FileHandler(LOGS_DIR / "process_images.log", encoding="utf-8"),
        logging.StreamHandler()
    ]
)
log = logging.getLogger("process_images")

PROCESSED_DIR = DATA_DIR / "processed"
PROCESSED_DIR.mkdir(exist_ok=True)


def fetch_mars_rover_photos(rover="curiosity", max_photos=12):
    """
    Descarga fotos recientes del rover marciano.
    Usa NASA Image and Video Library API (images-api.nasa.gov)
    ya que la Mars Rover Photos API fue archivada por NASA en 2025.
    """
    log.info(f"  Buscando fotos de {rover}...")

    photos_found = []

    # ── NASA Image and Video Library API ──
    try:
        search_term = f"Mars {rover} rover surface"
        url = "https://images-api.nasa.gov/search"
        params = {
            "q": search_term,
            "media_type": "image",
            "year_start": "2023",
            "page_size": max_photos
        }
        r = requests.get(url, params=params, timeout=30)
        r.raise_for_status()
        data = r.json()

        items = data.get("collection", {}).get("items", [])
        if items:
            log.info(f"  ✓ {len(items)} fotos de {rover} encontradas")
            for item in items[:max_photos]:
                item_data = item.get("data", [{}])[0]
                links = item.get("links", [{}])
                img_url = links[0].get("href", "") if links else ""

                if not img_url:
                    continue

                photo_id = item_data.get("nasa_id", f"{rover}_{len(photos_found)}")
                earth_date = item_data.get("date_created", "")[:10]
                description = item_data.get("description", "")

                # Intentar descargar y procesar
                try:
                    result = process_single_image(
                        img_url,
                        MARS_CACHE_DIR / f"{rover}_{photo_id}.jpg",
                        MARS_CACHE_DIR / f"{rover}_{photo_id}_thumb.jpg",
                        target_size=(800, 600),
                        thumb_size=(200, 150)
                    )

                    photos_found.append({
                        "id": photo_id,
                        "sol": None,
                        "earth_date": earth_date,
                        "camera": {
                            "name": item_data.get("secondary_creator", "NAV/MAST"),
                            "full_name": item_data.get("title", f"{rover.title()} Rover")
                        },
                        "rover": rover,
                        "original_url": img_url,
                        "local_path": str(result["path"]) if result else None,
                        "thumb_path": str(result["thumb"]) if result else None,
                        "processed": result is not None,
                        "file_size_kb": result.get("size_kb", 0) if result else 0
                    })
                except Exception as e:
                    log.warning(f"  Error procesando foto {photo_id}: {e}")
                    photos_found.append({
                        "id": photo_id,
                        "sol": None,
                        "earth_date": earth_date,
                        "camera": item_data.get("title", ""),
                        "rover": rover,
                        "original_url": img_url,
                        "processed": False
                    })

    except Exception as e:
        log.error(f"  Error consultando NASA Image Library: {e}")

    if not photos_found:
        log.warning(f"  ✗ No se encontraron fotos de {rover}")

    return photos_found


def fetch_epic_images(max_images=6):
    """
    Descarga imágenes recientes de la Tierra desde el satélite DSCOVR/EPIC.
    """
    log.info("  Buscando imágenes EPIC...")

    for days_back in range(0, 10):
        date = (datetime.utcnow() - timedelta(days=days_back))
        date_str = date.strftime("%Y-%m-%d")

        try:
            url = f"{NASA_BASE}/EPIC/api/natural/date/{date_str}"
            params = {"api_key": NASA_API_KEY}
            r = requests.get(url, params=params, timeout=20)
            r.raise_for_status()
            data = r.json()

            if data:
                log.info(f"  ✓ {len(data)} imágenes EPIC para {date_str}")
                break

        except Exception as e:
            log.warning(f"  Error buscando EPIC para {date_str}: {e}")
            data = []
            continue

    if not data:
        log.warning("  ✗ No se encontraron imágenes EPIC")
        return []

    # Seleccionar imágenes distribuidas a lo largo del día
    step = max(1, len(data) // max_images)
    selected = data[::step][:max_images]

    processed = []
    for img_data in selected:
        image_name = img_data.get("image", "")
        img_date = img_data.get("date", "")

        # Construir URL de descarga
        try:
            dt = datetime.strptime(img_date, "%Y-%m-%d %H:%M:%S")
            img_url = (
                f"https://epic.gsfc.nasa.gov/archive/natural/"
                f"{dt.year}/{dt.month:02d}/{dt.day:02d}/png/{image_name}.png"
            )

            result = process_single_image(
                img_url,
                EPIC_CACHE_DIR / f"epic_{image_name}.jpg",
                EPIC_CACHE_DIR / f"epic_{image_name}_thumb.jpg",
                target_size=(512, 512),
                thumb_size=(128, 128),
                enhance_contrast=1.15,
                enhance_color=1.1
            )

            coords = img_data.get("centroid_coordinates", {})
            processed.append({
                "name": image_name,
                "date": img_date,
                "caption": img_data.get("caption", ""),
                "centroid": {
                    "lat": coords.get("lat"),
                    "lon": coords.get("lon")
                },
                "sun_position": img_data.get("sun_j2000_position", {}),
                "original_url": img_url,
                "local_path": str(result["path"]) if result else None,
                "thumb_path": str(result["thumb"]) if result else None,
                "processed": result is not None
            })

        except Exception as e:
            log.warning(f"  Error procesando imagen EPIC {image_name}: {e}")

    return processed


def process_single_image(url, output_path, thumb_path,
                         target_size=(800, 600), thumb_size=(200, 150),
                         enhance_contrast=1.0, enhance_color=1.0):
    """
    Descarga, procesa y guarda una imagen con su thumbnail.
    """
    if not HAS_PIL:
        # Sin Pillow, solo descargar sin procesar
        try:
            r = requests.get(url, timeout=30)
            r.raise_for_status()
            with open(output_path, "wb") as f:
                f.write(r.content)
            size_kb = len(r.content) / 1024
            return {"path": output_path, "thumb": None, "size_kb": round(size_kb, 1)}
        except Exception as e:
            log.warning(f"  Download error: {e}")
            return None

    try:
        r = requests.get(url, timeout=30)
        r.raise_for_status()

        img = Image.open(BytesIO(r.content))
        original_size = len(r.content)

        # Convertir a RGB si es necesario
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")

        # Redimensionar manteniendo aspect ratio
        img.thumbnail(target_size, Image.LANCZOS)

        # Mejoras opcionales
        if enhance_contrast != 1.0:
            img = ImageEnhance.Contrast(img).enhance(enhance_contrast)
        if enhance_color != 1.0:
            img = ImageEnhance.Color(img).enhance(enhance_color)

        # Ligero sharpening para compensar la compresión
        img = img.filter(ImageFilter.SHARPEN)

        # Guardar con compresión JPEG optimizada
        img.save(output_path, "JPEG", quality=82, optimize=True)
        processed_size = output_path.stat().st_size

        # Thumbnail
        thumb = img.copy()
        thumb.thumbnail(thumb_size, Image.LANCZOS)
        thumb.save(thumb_path, "JPEG", quality=70, optimize=True)

        compression = (1 - processed_size / original_size) * 100
        log.info(f"    → {output_path.name} ({processed_size // 1024}KB, -{compression:.0f}%)")

        return {
            "path": output_path,
            "thumb": thumb_path,
            "size_kb": round(processed_size / 1024, 1),
            "original_kb": round(original_size / 1024, 1),
            "compression_pct": round(compression, 1)
        }

    except Exception as e:
        log.warning(f"  Image processing error: {e}")
        return None


def process_all():
    """Ejecuta todo el pipeline de procesamiento de imágenes."""
    log.info("══ Iniciando procesamiento de imágenes ══")

    # ── Mars Rover Photos ──
    mars_curiosity = fetch_mars_rover_photos("curiosity", max_photos=8)
    mars_perseverance = fetch_mars_rover_photos("perseverance", max_photos=8)

    mars_output = {
        "_metadata": {
            "generated": datetime.utcnow().isoformat() + "Z",
            "script": "process_images.py"
        },
        "curiosity": {
            "count": len(mars_curiosity),
            "photos": mars_curiosity
        },
        "perseverance": {
            "count": len(mars_perseverance),
            "photos": mars_perseverance
        }
    }

    with open(PROCESSED_DIR / "mars_latest.json", "w", encoding="utf-8") as f:
        json.dump(mars_output, f, ensure_ascii=False, indent=2)
    log.info(f"  ✓ Mars metadata → {PROCESSED_DIR / 'mars_latest.json'}")

    # ── EPIC Earth Images ──
    epic = fetch_epic_images(max_images=6)

    epic_output = {
        "_metadata": {
            "generated": datetime.utcnow().isoformat() + "Z",
            "script": "process_images.py"
        },
        "count": len(epic),
        "images": epic
    }

    with open(PROCESSED_DIR / "epic_latest.json", "w", encoding="utf-8") as f:
        json.dump(epic_output, f, ensure_ascii=False, indent=2)
    log.info(f"  ✓ EPIC metadata → {PROCESSED_DIR / 'epic_latest.json'}")

    log.info("══ Procesamiento de imágenes completado ══")
    return True


if __name__ == "__main__":
    process_all()
