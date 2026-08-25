import { cargar, guardar } from "./storage.service.js";
import { CONFIG_DEFECTO } from "../data/settings.data.js";
import { LISTA_TROFEOS } from "../data/trophies.data.js";
import { datosModulos } from "../data/modules.data.js";

// Estructuras locales en memoria
let progresoActual = null;
let configuracionActual = null;
let trofeosDesbloqueados = null;

const PROGRESO_DEFECTO = {
    WhatsApp: [],
    Facebook: [],
    YouTube: [],
    Contactos: []
};

/**
 * Inicializa el progreso, cargando desde localStorage o creando la estructura por defecto.
 */
export function inicializarProgreso() {
    progresoActual = cargar("gz_progress", { ...PROGRESO_DEFECTO });
    configuracionActual = cargar("gz_settings", { ...CONFIG_DEFECTO });
    trofeosDesbloqueados = cargar("gz_trophies", {});

    // Guardar para asegurar que las estructuras existan en localStorage
    guardar("gz_progress", progresoActual);
    guardar("gz_settings", configuracionActual);
    guardar("gz_trophies", trofeosDesbloqueados);

    console.log("Servicio de progreso inicializado.");
}

/**
 * Obtiene el progreso de niveles actual.
 */
export function obtenerProgreso() {
    if (!progresoActual) inicializarProgreso();
    return progresoActual;
}

/**
 * Obtiene la configuración de accesibilidad actual.
 */
export function obtenerConfiguracion() {
    if (!configuracionActual) inicializarProgreso();
    return configuracionActual;
}

/**
 * Guarda una nueva configuración de accesibilidad.
 */
export function guardarConfiguracion(nuevaConfig) {
    configuracionActual = { ...obtenerConfiguracion(), ...nuevaConfig };
    guardar("gz_settings", configuracionActual);
    return configuracionActual;
}

/**
 * Obtiene los trofeos desbloqueados.
 */
export function obtenerTrofeosDesbloqueados() {
    if (!trofeosDesbloqueados) inicializarProgreso();
    return trofeosDesbloqueados;
}

/**
 * Evalúa el estado de un nivel específico en un módulo.
 * @returns {"completed" | "active" | "locked"}
 */
export function obtenerEstadoNivel(idModulo, idNivel) {
    const progreso = obtenerProgreso();
    const completados = progreso[idModulo] || [];

    // Si ya está en la lista de completados
    if (completados.includes(idNivel)) {
        return "completed";
    }

    // Buscar en los niveles definidos cuál es el primero pendiente
    const modulo = datosModulos[idModulo];
    if (!modulo || !modulo.niveles) {
        return "locked";
    }

    const indicePrimerPendiente = modulo.niveles.findIndex(
        (nivel) => !completados.includes(nivel.id)
    );

    const indiceNivelActual = modulo.niveles.findIndex(
        (nivel) => nivel.id === idNivel
    );

    // Si es el primer nivel pendiente, está activo
    if (indiceNivelActual === indicePrimerPendiente) {
        return "active";
    }

    // En cualquier otro caso, está bloqueado
    return "locked";
}

/**
 * Marca un nivel como completado, guarda en local storage y evalúa trofeos.
 */
export function completarNivel(idModulo, idNivel) {
    const progreso = obtenerProgreso();
    if (!progreso[idModulo]) {
        progreso[idModulo] = [];
    }

    if (progreso[idModulo].includes(idNivel)) {
        return false; // Ya estaba completado
    }

    progreso[idModulo].push(idNivel);
    guardar("gz_progress", progreso);
    console.log(`Nivel completado: ${idNivel} en módulo ${idModulo}`);

    // Evaluar obtención de trofeos
    evaluarTrofeos();

    return true;
}

/**
 * Desbloquea un trofeo si no ha sido desbloqueado previamente.
 */
function desbloquearTrofeo(idTrofeo) {
    if (!trofeosDesbloqueados) trofeosDesbloqueados = obtenerTrofeosDesbloqueados();

    if (trofeosDesbloqueados[idTrofeo]) {
        return; // Ya desbloqueado
    }

    const trofeoInfo = LISTA_TROFEOS.find((t) => t.id === idTrofeo);
    const titulo = trofeoInfo ? trofeoInfo.titulo : idTrofeo;

    trofeosDesbloqueados[idTrofeo] = new Date().toISOString();
    guardar("gz_trophies", trofeosDesbloqueados);

    console.log(`¡TROFEO DESBLOQUEADO!: ${titulo}`);

    // Notificación propia (nada de alert() del navegador): una tarjeta que
    // entra deslizándose con el trofeo, se queda unos segundos y se retira sola.
    setTimeout(() => mostrarToastTrofeo(trofeoInfo, titulo), 900);
}

/**
 * Tarjeta flotante de "logro desbloqueado". Se crea una sola vez y se
 * reutiliza para cada trofeo nuevo, apilando el aviso si llegara a
 * desbloquearse más de uno seguido (p. ej. "Primer paso" junto con un
 * "Maestro de...").
 */
let colaToastsTrofeo = Promise.resolve();

function mostrarToastTrofeo(trofeoInfo, titulo) {
    colaToastsTrofeo = colaToastsTrofeo.then(() => new Promise(resolve => {
        let toast = document.getElementById("trofeoToast");
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "trofeoToast";
            toast.className = "trofeo-toast";
            toast.innerHTML = `
                <img class="trofeo-toast-icono" src="./assets/img/icons/trofeo.svg" alt="">
                <div class="trofeo-toast-texto">
                    <span class="trofeo-toast-titulo">¡Trofeo desbloqueado!</span>
                    <span class="trofeo-toast-nombre"></span>
                </div>
            `;
            document.body.appendChild(toast);
        }

        const nombreEl = toast.querySelector(".trofeo-toast-nombre");
        if (nombreEl) nombreEl.textContent = titulo;
        if (trofeoInfo?.color) toast.style.setProperty("--trofeo-toast-color", trofeoInfo.color);

        toast.classList.add("mostrar");

        setTimeout(() => {
            toast.classList.remove("mostrar");
            setTimeout(resolve, 400); // deja terminar la animación de salida antes del siguiente
        }, 3600);
    }));
}

/**
 * Analiza el estado actual del juego para otorgar trofeos correspondientes.
 */
function evaluarTrofeos() {
    const progreso = obtenerProgreso();

    // 1. Trofeo "Primer paso": Al menos 1 nivel completado en cualquier módulo
    const totalCompletados = Object.values(progreso).reduce(
        (acc, arr) => acc + arr.length,
        0
    );

    if (totalCompletados >= 1) {
        desbloquearTrofeo("primer-paso");
    }

    // 2. Trofeos de maestría por módulo
    const modulos = ["WhatsApp", "Facebook", "YouTube", "Contactos"];
    let modulosCompletadosCount = 0;

    modulos.forEach((modKey) => {
        const nivelesModulo = datosModulos[modKey]?.niveles || [];
        const completadosModulo = progreso[modKey] || [];

        if (nivelesModulo.length > 0 && completadosModulo.length === nivelesModulo.length) {
            modulosCompletadosCount++;

            // Mapeo de trofeo por módulo
            const trofeoId = `maestro-${modKey.toLowerCase()}`;
            desbloquearTrofeo(trofeoId);
        }
    });

    // 3. Trofeo "Gran Zénior": Todos los módulos completados por completo
    if (modulosCompletadosCount === modulos.length) {
        desbloquearTrofeo("gran-zenior");
    }
}

/**
 * Reinicia completamente el progreso de los niveles y trofeos.
 */
export function limpiarProgresoTotal() {
    progresoActual = { ...PROGRESO_DEFECTO };
    trofeosDesbloqueados = {};

    guardar("gz_progress", progresoActual);
    guardar("gz_trophies", trofeosDesbloqueados);

    // Limpiar estados de chats simulados
    try {
        const keys = Object.keys(localStorage);
        keys.forEach(k => {
            if (k.startsWith("gz_whatsapp_chats_") || k.startsWith("gz_contactos_")) {
                localStorage.removeItem(k);
            }
        });
    } catch (e) {
        console.warn("Error al limpiar chats guardados:", e);
    }
}

