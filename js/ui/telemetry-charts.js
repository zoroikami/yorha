import { VynasAPI } from '../services/nasa-api.js';
import { escapeHTML } from '../utils/sanitize.js';

export class TelemetryUI {
    static async init() {
        console.log('[TelemetryUI] Inicializando sistemas de telemetría...');
        await this.initKpGauge();
        this.initSDO();
        
        // Refresco de imágenes SDO cada 10 minutos (600000 ms)
        setInterval(() => {
            this.initSDO();
        }, 600000);
    }

    static async initKpGauge() {
        const data = await VynasAPI.fetchKpIndex();
        const container = document.getElementById('kp-gauge');
        const label = document.getElementById('kp-label');
        if (!container || !label) return;

        if (!data || data.length < 2) {
            label.textContent = 'Error de conexión con NOAA';
            return;
        }

        // Data es un arreglo donde index 0 son las cabeceras ["time_tag", "kp", ...]
        const latest = data[data.length - 1];
        const kpVal = parseFloat(latest[1]);
        
        container.innerHTML = `<canvas id="kp-chart-canvas"></canvas>`;
        const ctx = document.getElementById('kp-chart-canvas').getContext('2d');
        
        if (typeof Chart === 'undefined') {
            console.warn('[TelemetryUI] Chart.js no cargado.');
            return;
        }

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Kp', 'Restante'],
                datasets: [{
                    data: [kpVal, 9 - kpVal],
                    backgroundColor: [this.getKpColor(kpVal), 'rgba(255, 255, 255, 0.1)'],
                    borderWidth: 0
                }]
            },
            options: {
                rotation: -90,
                circumference: 180,
                cutout: '80%',
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            }
        });
        
        label.innerHTML = `Kp: <strong>${escapeHTML(kpVal)}</strong> - ${escapeHTML(this.getKpStatus(kpVal))}`;
    }

    static initSDO() {
        const img193 = document.getElementById('sdo-193');
        const img304 = document.getElementById('sdo-304');
        
        if(img193) {
            img193.style.opacity = '0';
            img193.src = VynasAPI.getSDOImage(193);
            img193.onload = () => img193.style.opacity = '1';
        }
        if(img304) {
            img304.style.opacity = '0';
            img304.src = VynasAPI.getSDOImage(304);
            img304.onload = () => img304.style.opacity = '1';
        }
    }

    static getKpColor(kp) {
        if(kp < 4) return '#4caf50'; // Verde (Calma)
        if(kp < 6) return '#ffeb3b'; // Amarillo (Inestable)
        return '#f44336'; // Rojo (Tormenta)
    }

    static getKpStatus(kp) {
        if(kp < 4) return 'Condiciones normales';
        if(kp < 6) return 'Tormenta menor (G1-G2)';
        return 'Tormenta severa';
    }

    // Exponemos el sistema de anomalías
    static triggerAnomaly(message = "Anomalía Espacial Detectada") {
        if (typeof window.playBeep === 'function') window.playBeep(400, 'sawtooth', 0.1, 0.5);
        
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: '¡ALERTA CRÍTICA!',
                text: message,
                icon: 'error',
                background: 'rgba(30, 10, 10, 0.95)',
                color: '#ff4444',
                confirmButtonColor: '#ff4444',
                confirmButtonText: 'INICIAR PROTOCOLOS DE DEFENSA',
                customClass: {
                    popup: 'vynas-swal-popup',
                    title: 'vynas-swal-title',
                    confirmButton: 'swal2-confirm'
                }
            });
        }
    }
}

// Interfaz global para pruebas
window.VynasEvents = {
    triggerFlare: () => TelemetryUI.triggerAnomaly("¡Erupción Solar de clase X detectada dirigiéndose a la Tierra!")
};
