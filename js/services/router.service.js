import { $ } from "../utils/dom.js";
import { abrirPantallaNiveles, abrirNivel } from "../controllers/levels.controller.js";
import { renderizarValoresAjustes } from "../controllers/settings.controller.js";
import { renderizarTrofeos } from "../controllers/trophies.controller.js";
import { stopSpeech } from "./speech.service.js";
import { limpiarResaltados } from "./guide-highlight.service.js";

export function inicializarRouter() {
    window.addEventListener("hashchange", () => {
        procesarRuta(location.hash);
    });

    // Procesar la ruta al cargar la página
    procesarRuta(location.hash);
}

function cambiarPantalla(idPantalla) {
    const pantallas = document.querySelectorAll(".pantalla");
    pantallas.forEach(pantalla => {
        pantalla.classList.remove("activa");
    });
    const target = $(`#${idPantalla}`);
    if (target) {
        target.classList.add("activa");
    }
}

function procesarRuta(hash) {
    // Detener cualquier guía de voz activa y limpiar resaltados al cambiar de pantalla
    stopSpeech();
    limpiarResaltados();

    // Limpiar hash de prefijos
    const ruta = hash.replace(/^#\/?/, "");

    // 1. Menú principal (vacío o raíz)
    if (!ruta) {
        cambiarPantalla("pantallaMenu");
        return;
    }

    // 2. Ajustes
    if (ruta === "ajustes") {
        cambiarPantalla("pantallaAjustes");
        renderizarValoresAjustes();
        const menuBody = $("#ajustesMenuBody");
        const creditosSec = $("#creditosSeccion");
        const title = $("#ajustesTitle");
        if (menuBody) menuBody.style.display = "flex";
        if (creditosSec) creditosSec.style.display = "none";
        if (title) title.textContent = "Ajustes y Accesibilidad";
        return;
    }

    // 2.1. Trofeos
    if (ruta === "trofeos") {
        cambiarPantalla("pantallaTrofeos");
        renderizarTrofeos();
        return;
    }

    // 3. Créditos (dentro de ajustes)
    if (ruta === "ajustes/creditos") {
        cambiarPantalla("pantallaAjustes");
        const menuBody = $("#ajustesMenuBody");
        const creditosSec = $("#creditosSeccion");
        const title = $("#ajustesTitle");
        if (menuBody) menuBody.style.display = "none";
        if (creditosSec) creditosSec.style.display = "flex";
        if (title) title.textContent = "Créditos";
        return;
    }

    // 4. Selector de niveles: modulo/:idModulo
    const matchModulo = ruta.match(/^modulo\/([^/]+)$/);
    if (matchModulo) {
        const idModulo = matchModulo[1];
        abrirPantallaNiveles(idModulo);
        return;
    }

    // 5. Simulador del nivel: modulo/:idModulo/nivel/:idNivel
    const matchNivel = ruta.match(/^modulo\/([^/]+)\/nivel\/([^/]+)$/);
    if (matchNivel) {
        const idModulo = matchNivel[1];
        const idNivel = matchNivel[2];

        // Inicializamos primero el estado del módulo en levels.controller
        abrirPantallaNiveles(idModulo);
        // Iniciamos el nivel/simulador correspondiente
        abrirNivel(idNivel);
        return;
    }

    // Fallback por defecto: ir al menú
    location.hash = "";
}
