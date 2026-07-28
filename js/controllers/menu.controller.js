import { $ } from "../utils/dom.js";
import { abrirPantallaNiveles } from "./levels.controller.js";
import { datosModulos } from "../data/modules.data.js";
import { speak, stopSpeech } from "../services/speech.service.js";
import { inicializarProgreso } from "../services/progress.service.js";

let moduloActual = null;

export function inicializarMenu() {
    inicializarProgreso();
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
        // Ocultar todas las pantallas y activar la de Ajustes
        document.querySelectorAll(".pantalla").forEach(p => p.classList.remove("activa"));
        const pantallaAjustes = $("#pantallaAjustes");
        if (pantallaAjustes) {
            pantallaAjustes.classList.add("activa");
            const menuBody = $("#ajustesMenuBody");
            const creditosSec = $("#creditosSeccion");
            const title = $("#ajustesTitle");
            if (menuBody) menuBody.style.display = "flex";
            if (creditosSec) creditosSec.style.display = "none";
            if (title) title.textContent = "Ajustes";
        }
    });

    // Volver al menú principal o a Ajustes desde Créditos usando solo el botón de arriba
    const btnVolverMenuAjustes = $("#btnVolverMenuAjustes");
    if (btnVolverMenuAjustes) {
        btnVolverMenuAjustes.onclick = () => {
            const creditosSec = $("#creditosSeccion");
            const menuBody = $("#ajustesMenuBody");
            const title = $("#ajustesTitle");
            
            if (creditosSec && creditosSec.style.display !== "none") {
                // Si estamos viendo créditos, volver a la pantalla de Ajustes
                if (menuBody) menuBody.style.display = "flex";
                creditosSec.style.display = "none";
                if (title) title.textContent = "Ajustes";
            } else {
                // Si estamos en Ajustes, volver al menú principal
                document.querySelectorAll(".pantalla").forEach(p => p.classList.remove("activa"));
                const pantallaMenu = $("#pantallaMenu");
                if (pantallaMenu) pantallaMenu.classList.add("activa");
            }
        };
    }

    // Ver creadores / créditos
    const btnVerCreditos = $("#btnVerCreditos");
    if (btnVerCreditos) {
        btnVerCreditos.onclick = () => {
            const menuBody = $("#ajustesMenuBody");
            const creditosSec = $("#creditosSeccion");
            const title = $("#ajustesTitle");
            if (menuBody) menuBody.style.display = "none";
            if (creditosSec) creditosSec.style.display = "flex";
            if (title) title.textContent = "Créditos";
        };
    }


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