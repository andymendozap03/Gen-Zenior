/**
 * Servicio para gestionar la guía visual y el resaltado interactivo de botones/elementos
 * mientras Nico da instrucciones.
 */

let activeHighlightTimeout = null;

/* ----------------------------------------------------------------------
   PUNTERO DE NICO

   La prueba con usuarios mostró dos problemas del aro de color: en algunos
   módulos se confunde con el color de la propia aplicación, y sobre botones
   pequeños (el de enviar, por ejemplo) parece parte del icono en lugar de una
   indicación. La mano resuelve las dos cosas: es inconfundiblemente una señal
   externa y no depende del color del fondo.
   ---------------------------------------------------------------------- */
let punteroEl = null;
let objetivoPuntero = null;
let animacionPuntero = null;

function obtenerPuntero() {
    if (punteroEl && document.body.contains(punteroEl)) return punteroEl;

    punteroEl = document.createElement("div");
    punteroEl.id = "nicoPuntero";
    punteroEl.className = "nico-puntero";
    punteroEl.setAttribute("aria-hidden", "true");
    // Dos manos en vez de girar una: al rotar 180° el emoji queda del revés y
    // se lee como una mano rara en lugar de un dedo señalando
    punteroEl.innerHTML =
        `<span class="nico-puntero-mano nico-mano-arriba">👆</span>` +
        `<span class="nico-puntero-mano nico-mano-abajo">👇</span>`;
    document.body.appendChild(punteroEl);

    return punteroEl;
}

function colocarPuntero() {
    if (!objetivoPuntero || !punteroEl) return;

    // Si el objetivo desapareció del documento, se retira el puntero
    if (!document.body.contains(objetivoPuntero)) {
        ocultarPuntero();
        return;
    }

    const r = objetivoPuntero.getBoundingClientRect();

    // Objetivo sin tamaño o fuera de la pantalla: no se dibuja nada
    const visible = r.width > 0 && r.height > 0 &&
        r.bottom > 0 && r.top < window.innerHeight &&
        r.right > 0 && r.left < window.innerWidth;

    if (!visible) {
        punteroEl.classList.remove("visible");
        return;
    }

    const TAM = 46;
    const SEP = 6;

    // Cuando lo resaltado es un bloque grande (por ejemplo toda la caja de
    // "¿Qué estás pensando?"), poner la mano debajo del todo la aleja de lo que
    // en realidad hay que tocar y parece que señala la publicación siguiente.
    // En ese caso se ancla justo bajo la primera franja del bloque.
    const ALTO_BLOQUE = 110;
    const FRANJA = 74;
    const referenciaAbajo = r.height > ALTO_BLOQUE ? r.top + FRANJA : r.bottom;

    // Se coloca debajo del objetivo, que es de donde viene el dedo al tocar.
    // Si no hay sitio abajo, se pone encima.
    let arriba = referenciaAbajo + SEP;
    let apuntandoHaciaArriba = true;

    if (arriba + TAM > window.innerHeight - 4) {
        arriba = r.top - TAM - SEP;
        apuntandoHaciaArriba = false;
    }

    // Y si tampoco cabe encima, se pone al lado derecho
    let izquierda = r.left + r.width / 2 - TAM / 2;
    if (arriba < 4) {
        arriba = r.top + r.height / 2 - TAM / 2;
        izquierda = r.right + SEP;
        apuntandoHaciaArriba = true;
    }

    izquierda = Math.max(4, Math.min(izquierda, window.innerWidth - TAM - 4));

    punteroEl.style.top = Math.round(arriba) + "px";
    punteroEl.style.left = Math.round(izquierda) + "px";
    punteroEl.classList.toggle("hacia-abajo", !apuntandoHaciaArriba);
    punteroEl.classList.add("visible");
}

// El puntero se recoloca cuando la pantalla se mueve o cambia de tamaño.
// Se usan eventos y un repaso cada cierto tiempo en vez de recalcular en cada
// fotograma: en teléfonos antiguos, que es donde se va a usar la aplicación,
// un bucle por fotograma gasta batería sin ninguna ganancia visible.
const REPASO_PUNTERO = 250;

function seguirObjetivo() {
    colocarPuntero();
}

function mostrarPuntero(el) {
    objetivoPuntero = el;
    obtenerPuntero();
    colocarPuntero();

    if (animacionPuntero === null) {
        window.addEventListener("scroll", seguirObjetivo, true);
        window.addEventListener("resize", seguirObjetivo);
        animacionPuntero = setInterval(seguirObjetivo, REPASO_PUNTERO);
    }
}

function ocultarPuntero() {
    objetivoPuntero = null;

    if (animacionPuntero !== null) {
        clearInterval(animacionPuntero);
        window.removeEventListener("scroll", seguirObjetivo, true);
        window.removeEventListener("resize", seguirObjetivo);
        animacionPuntero = null;
    }

    if (punteroEl) punteroEl.classList.remove("visible");
}



/**
 * Elimina el resaltado de todos los elementos que lo tengan activo actualmente.
 */
export function limpiarResaltados() {
    if (activeHighlightTimeout) {
        clearTimeout(activeHighlightTimeout);
        activeHighlightTimeout = null;
    }
    ocultarPuntero();

    const elementos = document.querySelectorAll(".nico-highlight-target");
    elementos.forEach(el => {
        el.classList.remove("nico-highlight-target", "amber", "amarillo", "verde", "azul");
    });
}

/**
 * Resalta uno o varios elementos con una animación interactiva pulsante y luminosa.
 * @param {string|HTMLElement|NodeList|Array} objetivo - Selector CSS o elemento(s) DOM a resaltar.
 * @param {Object} [opciones={}] - Opciones de configuración.
 * @param {boolean} [opciones.limpiarAnteriores=true] - Si se deben limpiar resaltados previos.
 * @param {boolean} [opciones.scroll=false] - Si se debe centrar el elemento en pantalla.
 * @param {string} [opciones.variant="default"] - 'default' (usa ajuste de usuario), 'amber', 'amarillo', 'verde', 'azul'.
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

    // Determinar la variante de color: si es default, usar la configurada por el usuario
    const activeColor = (variant === "default") ? (window.nicoHighlightColor || "azul") : variant;

    elementos.forEach(el => {
        if (!el) return;
        el.classList.add("nico-highlight-target");
        if (activeColor) {
            el.classList.add(activeColor);
        }
    });

    // La mano señala el primer objetivo: es la señal que los usuarios
    // reconocen sin explicación, a diferencia del aro de color
    mostrarPuntero(elementos[0]);

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
                el.classList.remove("nico-highlight-target", "amber", "amarillo", "verde", "azul");
            });
            ocultarPuntero();
        }, duracion);
    }
}
