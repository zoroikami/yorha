/**
 * Vynas - Módulo de Integración con Agencias Espaciales
 */

export class VynasAPI {
    // NOAA Space Weather: Índice Kp Planetario (Tormentas Geomagnéticas)
    static async fetchKpIndex() {
        try {
            // URL pública oficial de NOAA
            const response = await fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json');
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            return data;
        } catch (e) {
            console.error('[VynasAPI] Error fetching Kp Index', e);
            return null;
        }
    }

    // SDO (Solar Dynamics Observatory) Imágenes del sol en tiempo real
    static getSDOImage(angstrom = 193) {
        // La NASA actualiza constantemente estas URLs estáticas
        const cacheBuster = new Date().getTime();
        return `https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_0${angstrom}.jpg?cb=${cacheBuster}`;
    }

    // NASA EPIC (DSCOVR) - Imágenes de la Tierra (Segura vía Proxy)
    static async fetchEpicImages() {
        try {
            const response = await fetch('php/nasa_proxy.php?endpoint=epic');
            if (!response.ok) throw new Error('EPIC Network response was not ok');
            return await response.json();
        } catch(e) {
            console.error('[VynasAPI] Error fetching EPIC via Proxy', e);
            return [];
        }
    }
}
