/**
 * Servicio para gestionar la guía visual y el resaltado interactivo de botones/elementos
 * mientras Nico da instrucciones.
 */

let activeHighlightTimeout = null;

/**
 * Elimina el resaltado de todos los elementos que lo tengan activo actualmente.
 */
export function limpiarResaltados() {
    if (activeHighlightTimeout) {
        clearTimeout(activeHighlightTimeout);
        activeHighlightTimeout = null;
    }
    const elementos = document.querySelectorAll(".nico-highlight-target");
    elementos.forEach(el => {
        el.classList.remove("nico-highlight-target", "amber");
    });
}

/**
 * Resalta uno o varios elementos con una animación interactiva pulsante y luminosa.
 * @param {string|HTMLElement|NodeList|Array} objetivo - Selector CSS o elemento(s) DOM a resaltar.
 * @param {Object} [opciones={}] - Opciones de configuración.
 * @param {boolean} [opciones.limpiarAnteriores=true] - Si se deben limpiar resaltados previos.
 * @param {boolean} [opciones.scroll=false] - Si se debe centrar el elemento en pantalla.
 * @param {string} [opciones.variant="default"] - 'default' (azul/cian) o 'amber' (dorado/ámbar).
 * @param {number|null} [opciones.duracion=null] - Duración en milisegundos para auto-remover el efecto.
 */
export function resaltarElemento(objetivo, opciones = {}) {
    const {
        limpiarAnteriores = true,
        scroll = false,
        variant = "default",
        duracion = null
    } = opciones;

    if (limpiarAnteriores) {
        limpiarResaltados();
    }

    if (!objetivo) return;

    let elementos = [];

    if (typeof objetivo === "string") {
        elementos = Array.from(document.querySelectorAll(objetivo));
    } else if (objetivo instanceof HTMLElement) {
        elementos = [objetivo];
    } else if (objetivo instanceof NodeList || Array.isArray(objetivo)) {
        elementos = Array.from(objetivo);
    }

    if (elementos.length === 0) return;

    elementos.forEach(el => {
        if (!el) return;
        el.classList.add("nico-highlight-target");
        if (variant === "amber") {
            el.classList.add("amber");
        }
    });

    if (scroll && elementos[0]) {
        try {
            elementos[0].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
        } catch (e) {
            // Fallback silencioso
        }
    }

    if (duracion && typeof duracion === "number") {
        activeHighlightTimeout = setTimeout(() => {
            elementos.forEach(el => {
                el.classList.remove("nico-highlight-target", "amber");
            });
        }, duracion);
    }
}
