

export function cargar(key, valorDefecto) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : valorDefecto;
    } catch (e) {
        console.error(`Error al cargar la clave [${key}] de localStorage:`, e);
        return valorDefecto;
    }
}

export function guardar(key, datos) {
    try {
        localStorage.setItem(key, JSON.stringify(datos));
    } catch (e) {
        console.error(`Error al guardar la clave [${key}] en localStorage:`, e);
    }
}

export function limpiar() {
    try {
        localStorage.removeItem("gz_settings");
        localStorage.removeItem("gz_progress");
        localStorage.removeItem("gz_trophies");
        console.log("Datos de Gen-Zénior eliminados de localStorage.");
    } catch (e) {
        console.error("Error al limpiar datos de Gen-Zénior en localStorage:", e);
    }
}
