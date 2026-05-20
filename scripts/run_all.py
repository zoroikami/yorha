"""
╔═══════════════════════════════════════════════════════════════╗
║  YorHa Data Pipeline — Orquestador Principal                   ║
║  Ejecuta todos los scripts del pipeline en secuencia           ║
╚═══════════════════════════════════════════════════════════════╝

Uso:
  python run_all.py              → Ejecuta todo una vez
  python run_all.py --schedule   → Ejecuta en loop programado
  python run_all.py --quick      → Solo ETL + clima (sin imágenes)
  python run_all.py --weather    → Solo clima espacial
"""

import sys
import time
import logging
from datetime import datetime

from config import LOGS_DIR

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s — %(message)s",
    handlers=[
        logging.FileHandler(LOGS_DIR / "pipeline.log", encoding="utf-8"),
        logging.StreamHandler()
    ]
)
log = logging.getLogger("pipeline")


BANNER = """
+===============================================================+
|                                                               |
|   __   __ ___  ____  _   _    _                               |
|   \ \ / // _ \|  _ \| | | |  / \                              |
|    \ V /| | | | |_) | |_| | / _ \                             |
|     | | | |_| |  _ <|  _  |/ ___ \                            |
|     |_|  \___/|_| \_\_| |_/_/   \_\                           |
|                                                               |
|   Data Pipeline v1.0.0 - Estacion Terrestre La Serena         |
|                                                               |
+===============================================================+
"""


def run_pipeline(skip_images=False, weather_only=False):
    """Ejecuta el pipeline completo."""
    print(BANNER)
    start = time.time()
    log.info("═══════════════════════════════════════")
    log.info(f"Pipeline iniciado: {datetime.utcnow().isoformat()}Z")
    log.info("═══════════════════════════════════════")

    results = {}

    # ── 1. ETL Astronomía ──
    if not weather_only:
        try:
            log.info("\n▶ [1/3] ETL de datos astronómicos...")
            from update_astronomy_data import enrich_astronomy_json
            results["astronomy"] = enrich_astronomy_json()
        except Exception as e:
            log.error(f"  ✗ Error en ETL: {e}")
            results["astronomy"] = False

    # ── 2. Pre-cómputo de órbitas ──
    if not weather_only:
        try:
            log.info("\n▶ [2/3] Pre-cómputo de órbitas...")
            from precompute_orbits import precompute_all
            results["orbits"] = precompute_all()
        except Exception as e:
            log.error(f"  ✗ Error en órbitas: {e}")
            results["orbits"] = False

    # ── 3. Clima espacial ──
    try:
        step = "[3/3]" if not weather_only else "[1/1]"
        log.info(f"\n▶ {step} Monitor de clima espacial...")
        from space_weather_monitor import monitor
        results["weather"] = monitor()
    except Exception as e:
        log.error(f"  ✗ Error en clima: {e}")
        results["weather"] = False

    # ── 4. Procesamiento de imágenes (si no se omite) ──
    if not skip_images and not weather_only:
        try:
            log.info("\n▶ [BONUS] Procesamiento de imágenes satelitales...")
            from process_images import process_all
            results["images"] = process_all()
        except Exception as e:
            log.error(f"  ✗ Error en imágenes: {e}")
            results["images"] = False

    # ── Resumen ──
    elapsed = time.time() - start
    log.info("\n═══════════════════════════════════════")
    log.info("RESUMEN DEL PIPELINE:")
    for task, success in results.items():
        status = "✓ OK" if success else "✗ FALLO"
        log.info(f"  {status} — {task}")
    log.info(f"Tiempo total: {elapsed:.1f}s")
    log.info("═══════════════════════════════════════\n")

    return all(results.values())


def run_scheduled():
    """Ejecuta el pipeline en intervalos programados."""
    try:
        import schedule
    except ImportError:
        log.error("'schedule' no instalado. Ejecuta: pip install schedule")
        sys.exit(1)

    log.info("Modo programado activado:")
    log.info("  • ETL + Órbitas: cada 24h a las 06:00")
    log.info("  • Clima espacial: cada 5 minutos")
    log.info("  • Imágenes: cada 6 horas")
    log.info("Presiona Ctrl+C para detener.\n")

    # Clima espacial cada 5 min
    def weather_task():
        try:
            from space_weather_monitor import monitor
            monitor()
        except Exception as e:
            log.error(f"Weather task error: {e}")

    # ETL completo diario
    def daily_task():
        run_pipeline(skip_images=True)

    # Imágenes cada 6h
    def images_task():
        try:
            from process_images import process_all
            process_all()
        except Exception as e:
            log.error(f"Images task error: {e}")

    schedule.every(5).minutes.do(weather_task)
    schedule.every().day.at("06:00").do(daily_task)
    schedule.every(6).hours.do(images_task)

    # Ejecutar inmediatamente la primera vez
    run_pipeline()

    while True:
        schedule.run_pending()
        time.sleep(30)


if __name__ == "__main__":
    args = sys.argv[1:]

    if "--schedule" in args:
        run_scheduled()
    elif "--quick" in args:
        run_pipeline(skip_images=True)
    elif "--weather" in args:
        run_pipeline(weather_only=True)
    else:
        run_pipeline()
