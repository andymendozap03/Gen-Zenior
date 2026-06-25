import { $ } from "../utils/dom.js";
import { modulesData } from "../data/modules.data.js";
import { speak, stopSpeech } from "../services/speech.service.js";

let currentModule = null;

export function initMenu() {
    const btnNicoMenu = $("#btnNicoMenu");
    const menuPrincipal = $("#menuPrincipal");
    const btnTrofeos = $("#btnTrofeos");
    const btnAjustes = $("#btnAjustes");

    btnNicoMenu.addEventListener("click", showNicoWelcome);

    menuPrincipal.addEventListener("click", (event) => {
        const button = event.target.closest(".boton-menu");

        if (!button) {
            return;
        }

        const moduleId = button.dataset.module;
        openModule(moduleId);
    });

    btnTrofeos.addEventListener("click", () => {
        alert("Aquí se mostrará la pantalla de trofeos.");
    });

    btnAjustes.addEventListener("click", () => {
        alert("Aquí se mostrará la pantalla de ajustes.");
    });

    document.addEventListener("click", closeNicoMessage);
}

function openModule(moduleId) {
    const module = modulesData[moduleId];

    if (!module) {
        console.error("El módulo no existe:", moduleId);
        return;
    }

    currentModule = moduleId;

    alert(`Abriste el módulo de ${module.name}`);
}

function showNicoWelcome(event) {
    event.stopPropagation();

    const bubble = $("#mensajeNico");

    if (bubble.classList.contains("mostrar")) {
        stopSpeech();
        bubble.classList.remove("mostrar");
        return;
    }

    const message = "Hola, soy Nico, tu asistente de voz. Bienvenido a Gen-Zénior. Selecciona un módulo para empezar a aprender paso a paso. Puedes escoger WhatsApp, Facebook, YouTube o Contactos.";

    bubble.textContent = message;
    bubble.classList.add("mostrar");

    speak(message);
}

function closeNicoMessage(event) {
    const bubble = $("#mensajeNico");
    const btnNicoMenu = $("#btnNicoMenu");

    if (!bubble.classList.contains("mostrar")) {
        return;
    }

    if (
        !bubble.contains(event.target) &&
        !btnNicoMenu.contains(event.target)
    ) {
        bubble.classList.remove("mostrar");
    }
}