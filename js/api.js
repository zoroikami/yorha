export async function getAstronomyData() {
    const paths = ['data/astronomy.json', './data/astronomy.json'];

    async function fetchWithTimeout(resource, options = {}) {
        const { timeout = 8000 } = options;
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        const response = await fetch(resource, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    }

    for (const path of paths) {
        try {
            const response = await fetchWithTimeout(path + '?t=' + Date.now());
            if (response.ok) return await response.json();
        } catch (e) {
            // Continúa intentando con otras rutas si hay error o timeout
        }
    }

    console.error('Vynas Data Error: No se pudo localizar la topología estelar.');
    return { PLANETS_DATA: {}, CONSTELLATIONS_DATA: {} };
}

export async function fetchPrecomputedOrbits() {
    try {
        const res = await fetch('data/precomputed_orbits.json?t=' + Date.now());
        if (res.ok) return await res.json();
    } catch (e) { console.warn('Vynas: No precomputed orbits found', e); }
    return null;
}

export async function fetchSpaceWeather() {
    try {
        const res = await fetch('data/space_weather_live.json?t=' + Date.now());
        if (res.ok) return await res.json();
    } catch (e) { console.warn('Vynas: No space weather data found', e); }
    return null;
}

export async function fetchProcessedImages(type) {
    try {
        const res = await fetch(`data/processed/${type}_latest.json?t=` + Date.now());
        if (res.ok) return await res.json();
    } catch (e) { console.warn(`Vynas: No processed images found for ${type}`, e); }
    return null;
}

/**
 * Carga el catálogo Gaia como ArrayBuffer (formato binario).
 * El parsing se hace en gaia-stars.js.
 */
export async function fetchGaiaCatalogMeta() {
    try {
        const res = await fetch('data/gaia_catalog.json?t=' + Date.now());
        if (res.ok) return await res.json();
    } catch (e) { console.warn('Vynas: No Gaia catalog metadata found', e); }
    return null;
}

/**
 * Carga las efemérides JPL Horizons (posiciones reales en tiempo real).
 */
export async function fetchJPLEphemeris() {
    try {
        const res = await fetch('data/jpl_ephemeris.json?t=' + Date.now());
        if (res.ok) return await res.json();
    } catch (e) { console.warn('Vynas: No JPL ephemeris found', e); }
    return null;
}

