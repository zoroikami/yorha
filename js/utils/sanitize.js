/**
 * ╔═══════════════════════════════════════════════════╗
 * ║  Vynas — Utilidades de sanitización DOM           ║
 * ║  Previene XSS al escapar contenido antes de       ║
 * ║  inyección vía innerHTML/template literals.        ║
 * ╚═══════════════════════════════════════════════════╝
 */

/**
 * Escapa caracteres HTML peligrosos en un string.
 * Uso: escapeHTML(userInput) antes de inyectar en innerHTML.
 * @param {*} str — Cualquier valor (se convierte a String internamente)
 * @returns {string} String seguro para inyección HTML
 */
export function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>'"]/g, tag => {
        switch (tag) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case "'": return '&#39;';
            case '"': return '&quot;';
            default: return tag;
        }
    });
}

/**
 * Escapa un valor para uso seguro en atributos de URL (src, href).
 * Previene inyección de protocolos javascript: y data:.
 * @param {string} url
 * @returns {string} URL segura o string vacío si es peligrosa
 */
export function sanitizeURL(url) {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim().toLowerCase();
    if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:')) {
        return '';
    }
    return escapeHTML(url);
}
