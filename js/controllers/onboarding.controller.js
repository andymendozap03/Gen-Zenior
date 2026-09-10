import { $ } from "../utils/dom.js";
import { speak, stopSpeech } from "../services/speech.service.js";

/**
 * INTRODUCCIÓN DE BIENVENIDA
 *
 * Responde a lo que salió en la evaluación con usuarios:
 *
 *  - Una participante intentó abrir WhatsApp de verdad en lugar del módulo:
 *    hay que decir antes de empezar que esto es una práctica.
 *  - La guía visual funciona, pero dependía de que alguien la explicara.
 *  - Los trofeos no se entendían.
 *  - Nico no era reconocible la primera vez.
 *
 * Se muestra una sola vez (queda guardado en el teléfono) y se puede repetir
 * desde Ajustes.
 */

const CLAVE_VISTA = "gz_intro_vista";
const TOTAL_PASOS = 4;

// Lo que Nico dice en cada paso. Es el mismo mensaje que se lee en pantalla,
// en frases cortas para que se entienda bien escuchándolo.
const NARRACION = {
    1: "Hola, soy Nico. Esto es una práctica. Aquí vas a usar copias de WhatsApp, Facebook, YouTube y tus contactos. No son las aplicaciones de verdad: nada de lo que hagas aquí se envía, ni lo ve nadie. Puedes tocar todo sin miedo a equivocarte.",
    2: "Yo te voy a acompañar. Te diré en voz alta qué hacer en cada paso, y te lo señalaré en la pantalla con una mano y un aro de color. Si no me escuchaste, toca el botón verde donde dice NICO y lo repito.",
    3: "Cada práctica que termines te da un trofeo. Sirven para que veas todo lo que ya aprendiste. No es una competencia y no se pierden nunca: puedes repetir las prácticas las veces que quieras.",
    4: "En Ajustes puedes cambiar cosas a tu gusto: qué tan rápido hablo, el tamaño de las letras, y el modo oscuro o de alto contraste. Ahí también puedes volver a ver esta explicación, o reiniciar tu progreso si te equivocas."
};

let pasoActual = 1;
let alTerminar = null;
let listenersListos = false;

function mostrarPaso(numero, conVoz = true) {
    pasoActual = numero;

    document.querySelectorAll(".intro-paso").forEach(seccion => {
        seccion.classList.toggle("activo", Number(seccion.dataset.paso) === numero);
    });

    document.querySelectorAll(".intro-punto").forEach((punto, i) => {
        punto.classList.toggle("activo", i === numero - 1);
    });

    const btnAtras = $("#btnIntroAtras");
    const btnSiguiente = $("#btnIntroSiguiente");

    if (btnAtras) btnAtras.style.visibility = numero === 1 ? "hidden" : "visible";
    if (btnSiguiente) {
        btnSiguiente.textContent = numero === TOTAL_PASOS ? "¡Empezar!" : "Siguiente";
    }

    if (conVoz) speak(NARRACION[numero]);
}

function cerrarIntro() {
    stopSpeech();

    try {
        localStorage.setItem(CLAVE_VISTA, "1");
    } catch (e) {
        // Si el navegador no deja guardar, la introducción se volverá a ver:
        // es molesto, pero no rompe nada
    }

    const pantalla = $("#pantallaIntro");
    if (pantalla) {
        pantalla.classList.add("oculta");
        setTimeout(() => { pantalla.style.display = "none"; }, 350);
    }

    if (typeof alTerminar === "function") {
        const accion = alTerminar;
        alTerminar = null;
        accion();
    }
}

function prepararListeners() {
    if (listenersListos) return;
    listenersListos = true;

    // Desde Ajustes se puede volver a ver la explicación cuando se quiera
    const btnRepetir = $("#btnVerIntro");
    if (btnRepetir) {
        btnRepetir.addEventListener("click", () => mostrarIntro(null));
    }

    const btnSiguiente = $("#btnIntroSiguiente");
    if (btnSiguiente) {
        btnSiguiente.addEventListener("click", () => {
            if (pasoActual < TOTAL_PASOS) {
                mostrarPaso(pasoActual + 1);
            } else {
                cerrarIntro();
            }
        });
    }

    const btnAtras = $("#btnIntroAtras");
    if (btnAtras) {
        btnAtras.addEventListener("click", () => {
            if (pasoActual > 1) mostrarPaso(pasoActual - 1);
        });
    }
}

/**
 * Deja enlazados los botones antes de que la introducción llegue a mostrarse,
 * para que el acceso desde Ajustes funcione desde el primer momento.
 */
export function prepararIntro() {
    prepararListeners();
}

/**
 * ¿Es la primera vez que esta persona abre la aplicación?
 */
export function introPendiente() {
    try {
        return localStorage.getItem(CLAVE_VISTA) !== "1";
    } catch (e) {
        return true;
    }
}

/**
 * Muestra la introducción.
 * @param {Function} finalizar Qué hacer cuando la persona termine de verla.
 */
export function mostrarIntro(finalizar) {
    alTerminar = finalizar;
    prepararListeners();

    const pantalla = $("#pantallaIntro");
    if (!pantalla) {
        // Sin la introducción en el HTML, se sigue adelante sin bloquear a nadie
        if (typeof finalizar === "function") finalizar();
        return;
    }

    pantalla.style.display = "flex";
    pantalla.classList.remove("oculta");

    // El primer paso se narra desde el toque del usuario en "Comenzar", que es
    // lo que autoriza la voz en el navegador para el resto de la sesión.
    mostrarPaso(1, true);
}
