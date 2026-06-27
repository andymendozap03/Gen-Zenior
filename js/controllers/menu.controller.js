import { $ } from "../utils/dom.js";
import { abrirPantallaNiveles } from "./levels.controller.js";
import { datosModulos } from "../data/modules.data.js";
import { speak, stopSpeech } from "../services/speech.service.js";

let moduloActual = null;

export function inicializarMenu() {
    const btnNicoMenu = $("#btnNicoMenu");
    const menuPrincipal = $("#menuPrincipal");
    const btnTrofeos = $("#btnTrofeos");
    const btnAjustes = $("#btnAjustes");

    btnNicoMenu.addEventListener("click", mostrarBienvenidaNico);

    menuPrincipal.addEventListener("click", (evento) => {
        const boton = evento.target.closest(".boton-menu");

        if (!boton) {
            return;
        }

        const idModulo = boton.dataset.module;
        abrirModulo(idModulo);
    });

    btnTrofeos.addEventListener("click", () => {
        alert("Aquí se mostrará la pantalla de trofeos.");
    });

    btnAjustes.addEventListener("click", () => {
        alert("Aquí se mostrará la pantalla de ajustes.");
    });

    document.addEventListener("click", cerrarMensajeNico);
}

function abrirModulo(idModulo) {
    const modulo = datosModulos[idModulo];

    if (!modulo) {
        console.error("El módulo no existe:", idModulo);
        return;
    }

    moduloActual = idModulo;
    abrirPantallaNiveles(idModulo);
}

function mostrarBienvenidaNico(evento) {
    evento.stopPropagation();

    const burbuja = $("#mensajeNico");

    if (burbuja.classList.contains("mostrar")) {
        stopSpeech();
        burbuja.classList.remove("mostrar");
        return;
    }

    const mensaje = "Hola, soy Nico, tu asistente de voz. Bienvenido a Gen-Zénior. Selecciona un módulo para empezar a aprender paso a paso. Puedes escoger WhatsApp, Facebook, YouTube o Contactos.";

    burbuja.textContent = mensaje;
    burbuja.classList.add("mostrar");

    speak(mensaje);
}

function cerrarMensajeNico(evento) {
    const burbuja = $("#mensajeNico");
    const btnNicoMenu = $("#btnNicoMenu");

    if (!burbuja.classList.contains("mostrar")) {
        return;
    }

    if (
        !burbuja.contains(evento.target) &&
        !btnNicoMenu.contains(evento.target)
    ) {
        burbuja.classList.remove("mostrar");
    }
}