/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  Vynas — Configuración Central                           ║
 * ║  Fuente única de verdad para metadata, motor y autenticación  ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

export const PROJECT = {
    name: "Vynas",
    os: "Vynas",
    fullName: "Vynas · Plataforma de Simulación Astronómica",
    version: "v2.1.0",
    semester: "3er Semestre",
    institution: "INACAP",
    campus: "La Serena",
    author: "Keoni",
    year: 2026,
    motto: "Monitoreo Satelital en Tiempo Real"
};

export const AUTH = {
    googleClientId: "977516655506-vr13tt7l77ghiie2kbff4cqjo7645vb1.apps.googleusercontent.com",
    githubAuthUrl: "php/github_redirect.php"
};

export const ENGINE = {
    pixelRatioMax: 2,
    shadowMapSize: 4096,
    bloomStrength: 1.25,
    bloomThreshold: 0.72,
    bloomRadius: 0.55,
    filmNoise: 0.35,
    filmScanlines: 0.45,
    vignetteOffset: 1.1,
    vignetteDarkness: 1.3,
    camera: {
        fov: 45,
        near: 0.1,
        far: 500000,
        initialPos: [0, 350, 900]
    }
};

export const UI = {
    theme: {
        primary: "#c5a358",
        warRoom: "#ef4444",
        warRoomActive: "#4ade80",
        hologram: "#ffd966",
        scan: "#4ade80"
    },
    timing: {
        warpDuration: 3.5,
        returnDuration: 2.0,
        autopilotCycle: 10000,
        sessionTimeout: 900
    }
};

export const APIS = {
    proxy: 'php/nasa_proxy.php',
    noaaBase: 'https://services.swpc.noaa.gov/json',
    cache: {
        mars: 3600000,     // 1h
        flares: 900000,    // 15 min
        kp: 120000,        // 2 min
        apod: 86400000,    // 24h
        epic: 3600000,     // 1h
        neo: 3600000       // 1h
    }
};

export const STAR_SYSTEMS = {
    Sol: { center: [0, 0, 0] },
    TRAPPIST: { center: [800, 0, -500] },
    Kepler: { center: [-900, 0, 600] }
};

export const DEBUG = {
    logBanner: true,
    logErrors: true
};

if (DEBUG.logBanner) {
    console.log(
        `%c ${PROJECT.os} %c ${PROJECT.name} ${PROJECT.version} loaded · ${PROJECT.campus} `,
        "color:#0a0a0a; background:#ffd966; font-weight:900; padding:3px 8px; border-radius:3px 0 0 3px; letter-spacing:2px;",
        "color:#ffd966; background:#0a0a0a; font-weight:400; padding:3px 8px; border-radius:0 3px 3px 0; letter-spacing:1px;"
    );
}
