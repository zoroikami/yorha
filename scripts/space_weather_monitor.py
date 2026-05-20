"""
╔═══════════════════════════════════════════════════════════════╗
║  YorHa Data Pipeline — Monitor de Clima Espacial               ║
║  Consulta NOAA en tiempo real y genera alertas                 ║
╚═══════════════════════════════════════════════════════════════╝

Genera: data/space_weather_live.json
  - Índice Kp actual y tendencia
  - Llamaradas solares recientes
  - Alertas geomagnéticas
  - Velocidad del viento solar
  - Predicción de auroras

Fuentes:
  - NOAA Space Weather Prediction Center (SWPC)
  - NASA DONKI (Database Of Notifications, Knowledge, Information)
"""

import json
import logging
from datetime import datetime, timedelta
import requests

from config import (
    NASA_API_KEY, NASA_BASE, NOAA_BASE,
    SPACE_WEATHER_JSON, LOGS_DIR
)

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s — %(message)s",
    handlers=[
        logging.FileHandler(LOGS_DIR / "space_weather.log", encoding="utf-8"),
        logging.StreamHandler()
    ]
)
log = logging.getLogger("space_weather")


def fetch_kp_index():
    """
    Obtiene el índice Kp planetario más reciente.
    Fuente: NOAA SWPC
    """
    try:
        url = f"{NOAA_BASE}/json/planetary_k_index_1m.json"
        r = requests.get(url, timeout=15)
        r.raise_for_status()
        data = r.json()

        if not data:
            return None

        # Últimas 6 horas de datos
        recent = data[-360:] if len(data) > 360 else data  # ~6h a 1min
        latest = data[-1]

        kp_values = [entry.get("kp_index", 0) for entry in recent if entry.get("kp_index") is not None]

        current_kp = latest.get("kp_index", 0)
        avg_kp = sum(kp_values) / len(kp_values) if kp_values else 0
        max_kp = max(kp_values) if kp_values else 0

        # Clasificación de tormenta geomagnética
        storm_level = "QUIET"
        if current_kp >= 9:
            storm_level = "G5_EXTREME"
        elif current_kp >= 8:
            storm_level = "G4_SEVERE"
        elif current_kp >= 7:
            storm_level = "G3_STRONG"
        elif current_kp >= 6:
            storm_level = "G2_MODERATE"
        elif current_kp >= 5:
            storm_level = "G1_MINOR"
        elif current_kp >= 4:
            storm_level = "UNSETTLED"
        elif current_kp >= 3:
            storm_level = "ACTIVE"

        # Tendencia (subiendo/bajando)
        if len(kp_values) >= 60:
            recent_avg = sum(kp_values[-30:]) / 30
            older_avg = sum(kp_values[-60:-30]) / 30
            trend = "RISING" if recent_avg > older_avg + 0.3 else (
                "FALLING" if recent_avg < older_avg - 0.3 else "STABLE"
            )
        else:
            trend = "UNKNOWN"

        return {
            "current": round(current_kp, 2),
            "average_6h": round(avg_kp, 2),
            "max_6h": round(max_kp, 2),
            "storm_level": storm_level,
            "trend": trend,
            "timestamp": latest.get("time_tag", ""),
            "aurora_visible": current_kp >= 5,
            "aurora_latitude": max(90 - (current_kp * 5), 30) if current_kp >= 3 else None
        }

    except Exception as e:
        log.warning(f"Error fetching Kp index: {e}")
        return None


def fetch_solar_flares():
    """
    Obtiene llamaradas solares de los últimos 7 días.
    Fuente: NASA DONKI
    """
    try:
        end = datetime.utcnow()
        start = end - timedelta(days=7)

        url = f"{NASA_BASE}/DONKI/FLR"
        params = {
            "startDate": start.strftime("%Y-%m-%d"),
            "endDate": end.strftime("%Y-%m-%d"),
            "api_key": NASA_API_KEY
        }
        r = requests.get(url, params=params, timeout=15)
        r.raise_for_status()
        data = r.json()

        flares = []
        for flare in data:
            class_type = flare.get("classType", "Unknown")
            
            # Determinar severidad
            if class_type.startswith("X"):
                severity = "CRITICAL"
            elif class_type.startswith("M"):
                severity = "WARNING"
            elif class_type.startswith("C"):
                severity = "MODERATE"
            else:
                severity = "LOW"

            flares.append({
                "class": class_type,
                "severity": severity,
                "begin": flare.get("beginTime", ""),
                "peak": flare.get("peakTime", ""),
                "end": flare.get("endTime", ""),
                "source": flare.get("sourceLocation", ""),
                "linked_events": len(flare.get("linkedEvents", []) or [])
            })

        # Resumen
        x_count = sum(1 for f in flares if f["class"].startswith("X"))
        m_count = sum(1 for f in flares if f["class"].startswith("M"))
        c_count = sum(1 for f in flares if f["class"].startswith("C"))

        return {
            "total": len(flares),
            "x_class": x_count,
            "m_class": m_count,
            "c_class": c_count,
            "flares": flares[-10:],  # Últimas 10
            "period": f"{start.strftime('%Y-%m-%d')} → {end.strftime('%Y-%m-%d')}"
        }

    except Exception as e:
        log.warning(f"Error fetching solar flares: {e}")
        return None


def fetch_solar_wind():
    """
    Obtiene datos de viento solar del satélite DSCOVR.
    Fuente: NOAA SWPC
    """
    try:
        url = f"{NOAA_BASE}/json/rtsw/rtsw_wind_1m.json"
        r = requests.get(url, timeout=15)
        r.raise_for_status()
        data = r.json()

        if not data:
            return None

        latest = data[-1]
        recent = data[-60:] if len(data) > 60 else data  # última hora

        speeds = [d.get("proton_speed") for d in recent if d.get("proton_speed") is not None]
        densities = [d.get("proton_density") for d in recent if d.get("proton_density") is not None]

        return {
            "speed_km_s": latest.get("proton_speed"),
            "density_p_cm3": latest.get("proton_density"),
            "temperature_k": latest.get("proton_temperature"),
            "avg_speed_1h": round(sum(speeds) / len(speeds), 1) if speeds else None,
            "max_speed_1h": round(max(speeds), 1) if speeds else None,
            "avg_density_1h": round(sum(densities) / len(densities), 2) if densities else None,
            "timestamp": latest.get("time_tag", ""),
            "classification": classify_solar_wind(latest.get("proton_speed"))
        }

    except Exception as e:
        log.warning(f"Error fetching solar wind: {e}")
        return None


def classify_solar_wind(speed):
    """Clasifica el tipo de viento solar por velocidad."""
    if speed is None:
        return "UNKNOWN"
    if speed > 800:
        return "CORONAL_MASS_EJECTION"
    elif speed > 600:
        return "HIGH_SPEED_STREAM"
    elif speed > 400:
        return "NORMAL"
    else:
        return "SLOW"


def fetch_cme_events():
    """
    Obtiene eyecciones de masa coronal recientes.
    Fuente: NASA DONKI
    """
    try:
        end = datetime.utcnow()
        start = end - timedelta(days=7)

        url = f"{NASA_BASE}/DONKI/CME"
        params = {
            "startDate": start.strftime("%Y-%m-%d"),
            "endDate": end.strftime("%Y-%m-%d"),
            "api_key": NASA_API_KEY
        }
        r = requests.get(url, params=params, timeout=15)
        r.raise_for_status()
        data = r.json()

        events = []
        earth_directed = 0

        for cme in data:
            is_earth = False
            analyses = cme.get("cmeAnalyses") or []
            for analysis in analyses:
                if analysis and analysis.get("isMostAccurate"):
                    half_angle = analysis.get("halfAngle", 0)
                    if half_angle and half_angle > 45:
                        is_earth = True
                        earth_directed += 1

            events.append({
                "time": cme.get("startTime", ""),
                "source": cme.get("sourceLocation", ""),
                "note": cme.get("note", "")[:100] if cme.get("note") else "",
                "earth_directed": is_earth,
                "instruments": [i.get("displayName", "") for i in (cme.get("instruments") or [])]
            })

        return {
            "total": len(events),
            "earth_directed": earth_directed,
            "events": events[-5:],
            "period": f"{start.strftime('%Y-%m-%d')} → {end.strftime('%Y-%m-%d')}"
        }

    except Exception as e:
        log.warning(f"Error fetching CME events: {e}")
        return None


def generate_alert(kp_data, flare_data, wind_data, cme_data):
    """Genera una alerta consolidada basada en todos los datos."""
    alerts = []
    overall_level = "GREEN"

    # Kp-based alerts
    if kp_data:
        if kp_data["current"] >= 7:
            alerts.append({
                "type": "GEOMAGNETIC_STORM",
                "level": "RED",
                "message": f"Tormenta geomagnética {kp_data['storm_level']} — Kp={kp_data['current']}",
                "impact": "Posibles apagones de comunicaciones y auroras visibles en latitudes medias"
            })
            overall_level = "RED"
        elif kp_data["current"] >= 5:
            alerts.append({
                "type": "GEOMAGNETIC_STORM",
                "level": "YELLOW",
                "message": f"Tormenta geomagnética {kp_data['storm_level']} — Kp={kp_data['current']}",
                "impact": "Auroras posibles en latitudes altas"
            })
            if overall_level == "GREEN":
                overall_level = "YELLOW"

    # Flare-based alerts
    if flare_data and flare_data.get("x_class", 0) > 0:
        alerts.append({
            "type": "SOLAR_FLARE",
            "level": "RED",
            "message": f"{flare_data['x_class']} llamarada(s) clase X en los últimos 7 días",
            "impact": "Radiación electromagnética intensa — posible afectación a GPS y comunicaciones"
        })
        overall_level = "RED"
    elif flare_data and flare_data.get("m_class", 0) > 2:
        alerts.append({
            "type": "SOLAR_FLARE",
            "level": "YELLOW",
            "message": f"{flare_data['m_class']} llamaradas clase M en los últimos 7 días",
            "impact": "Actividad solar elevada"
        })
        if overall_level == "GREEN":
            overall_level = "YELLOW"

    # CME alerts
    if cme_data and cme_data.get("earth_directed", 0) > 0:
        alerts.append({
            "type": "CME",
            "level": "ORANGE",
            "message": f"{cme_data['earth_directed']} CME(s) dirigida(s) a la Tierra",
            "impact": "Posible incremento geomagnético en 24-72 horas"
        })
        if overall_level == "GREEN":
            overall_level = "YELLOW"

    # Solar wind alerts
    if wind_data and wind_data.get("speed_km_s") and wind_data["speed_km_s"] > 700:
        alerts.append({
            "type": "SOLAR_WIND",
            "level": "YELLOW",
            "message": f"Viento solar a {wind_data['speed_km_s']} km/s (elevado)",
            "impact": "Compresión de la magnetosfera terrestre"
        })
        if overall_level == "GREEN":
            overall_level = "YELLOW"

    if not alerts:
        alerts.append({
            "type": "ALL_CLEAR",
            "level": "GREEN",
            "message": "Condiciones espaciales nominales",
            "impact": "Sin impacto previsto"
        })

    return {
        "overall_level": overall_level,
        "alert_count": len(alerts),
        "alerts": alerts
    }


def monitor():
    """Ejecuta el monitor completo de clima espacial."""
    log.info("══ Iniciando monitor de clima espacial ══")

    kp = fetch_kp_index()
    if kp:
        log.info(f"  ✓ Kp actual: {kp['current']} ({kp['storm_level']})")

    flares = fetch_solar_flares()
    if flares:
        log.info(f"  ✓ Llamaradas (7d): {flares['total']} total, {flares['x_class']}X {flares['m_class']}M {flares['c_class']}C")

    wind = fetch_solar_wind()
    if wind:
        log.info(f"  ✓ Viento solar: {wind.get('speed_km_s', '?')} km/s ({wind['classification']})")

    cmes = fetch_cme_events()
    if cmes:
        log.info(f"  ✓ CMEs (7d): {cmes['total']} total, {cmes['earth_directed']} hacia Tierra")

    alert = generate_alert(kp, flares, wind, cmes)
    log.info(f"  ⚡ Nivel general: {alert['overall_level']}")

    output = {
        "_metadata": {
            "generated": datetime.utcnow().isoformat() + "Z",
            "script": "space_weather_monitor.py",
            "sources": [
                "NOAA SWPC (Kp, Solar Wind)",
                "NASA DONKI (Flares, CME)"
            ]
        },
        "kp_index": kp,
        "solar_flares": flares,
        "solar_wind": wind,
        "cme_events": cmes,
        "consolidated_alert": alert
    }

    with open(SPACE_WEATHER_JSON, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    log.info(f"══ Clima espacial guardado → {SPACE_WEATHER_JSON} ══")
    return True


if __name__ == "__main__":
    monitor()
