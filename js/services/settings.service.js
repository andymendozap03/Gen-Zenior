/**
 * Servicio para gestionar la configuración y accesibilidad de la aplicación.
 * Centraliza la persistencia en localStorage y la aplicación global de estilos y opciones.
 */

const STORAGE_KEY = "gz_settings_accessibility";

export const DEFAULT_SETTINGS = {
    voiceEnabled: true,
    voiceSpeed: "normal", // 'lenta' (0.8), 'normal' (0.95), 'rapida' (1.15)
    fontSize: "mediano",   // 'pequeno', 'mediano', 'grande'
    darkMode: false,
    highContrast: false,
    highlightColor: "azul" // 'amber', 'amarillo', 'verde', 'azul'
};

let currentSettings = { ...DEFAULT_SETTINGS };

/**
 * Carga los ajustes guardados o devuelve los predeterminados
 */
export function cargarAjustes() {
    try {
        const guardado = localStorage.getItem(STORAGE_KEY);
        if (guardado) {
            currentSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(guardado) };
        } else {
            currentSettings = { ...DEFAULT_SETTINGS };
        }
    } catch (e) {
        console.warn("No se pudieron cargar los ajustes, usando predeterminados:", e);
        currentSettings = { ...DEFAULT_SETTINGS };
    }
    return currentSettings;
}

/**
 * Obtiene los ajustes actuales en memoria
 */
export function obtenerAjustes() {
    return currentSettings;
}

/**
 * Guarda un ajuste específico y lo aplica inmediatamente
 */
export function guardarAjuste(clave, valor) {
    currentSettings[clave] = valor;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentSettings));
    } catch (e) {
        console.warn("No se pudo guardar el ajuste en localStorage:", e);
    }
    aplicarAjustesGlobales();
    return currentSettings;
}

/**
 * Aplica todas las configuraciones en el DOM y en las variables globales
 */
export function aplicarAjustesGlobales() {
    const s = currentSettings;

    // 1. Configuración de voz de Nico
    window.nicoVoiceEnabled = Boolean(s.voiceEnabled);
    window.nicoVoiceSpeed = s.voiceSpeed || "normal";
    window.nicoHighlightColor = s.highlightColor || "azul";

    // 2. Aplicar en documentElement atributos de datos para CSS
    const root = document.documentElement;

    // Tamaño de fuente
    root.setAttribute("data-font-size", s.fontSize || "mediano");

    // Tema (Modo oscuro)
    root.setAttribute("data-theme", s.darkMode ? "dark" : "light");

    // Alto contraste
    root.setAttribute("data-contrast", s.highContrast ? "high" : "normal");

    // Color del resaltado guía
    root.setAttribute("data-highlight", s.highlightColor || "azul");
}
