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

    console.error('YorHa Data Error: No se pudo localizar la topología estelar.');
    return { PLANETS_DATA: {}, CONSTELLATIONS_DATA: {} };
}
