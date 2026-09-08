import { inicializarMenu } from "./controllers/menu.controller.js";
import { inicializarNiveles } from "./controllers/levels.controller.js";
import { inicializarAjustes } from "./controllers/settings.controller.js";
import { inicializarTrofeos } from "./controllers/trophies.controller.js";
import { inicializarRouter } from "./services/router.service.js";
import { cargarAjustes, aplicarAjustesGlobales } from "./services/settings.service.js";
import { precargarRecursos, precargarEnSegundoPlano } from "./services/preload.service.js";
import { speak } from "./services/speech.service.js";
import { introPendiente, mostrarIntro, prepararIntro } from "./controllers/onboarding.controller.js";

/**
 * Arranque de la aplicación.
 *
 * Primero se preparan iconos, fichas de video y voces. Después se pide un
 * toque al usuario con el botón "Comenzar", y ese toque es el que autoriza la
 * voz de Nico para toda la sesión: los navegadores (Safari en iOS sobre todo)
 * solo la dejan arrancar desde un toque real, y dentro de la aplicación los
 * niveles se abren por un cambio de dirección, que ya no cuenta como toque.
 * Por eso la primera frase se quedaba muda y la segunda sí sonaba.
 */
document.addEventListener("DOMContentLoaded", async () => {
    // 1. Cargar y aplicar ajustes de accesibilidad de inmediato
    cargarAjustes();
    aplicarAjustesGlobales();

    const pantallaCarga = document.getElementById("pantallaCarga");
    const barra = document.getElementById("cargaProgreso");
    const texto = document.getElementById("cargaTexto");
    const cajaBarra = document.getElementById("cargaBarra");
    const btnComenzar = document.getElementById("btnComenzar");

    inicializarMenu();
    inicializarNiveles();
    inicializarAjustes();
    inicializarTrofeos();
    prepararIntro();   // deja listo el botón de Ajustes para repetir la explicación

    try {
        await precargarRecursos(porcentaje => {
            if (barra) barra.style.width = porcentaje + "%";
        });
    } catch (e) {
        // Si algo falla se entra igualmente: la aplicación funciona sin ello
        console.warn("Precarga incompleta:", e);
    }

    // Todo listo: se pide el toque
    if (texto) texto.textContent = "¡Todo listo!";
    if (cajaBarra) cajaBarra.style.display = "none";
    if (btnComenzar) btnComenzar.style.display = "inline-flex";

    const momentoListo = Date.now();
    let yaEntro = false;

    const entrar = () => {
        // En Android, la pantalla de carga nativa (splash screen) de Capacitor
        // puede dejar pasar el toque con el que el usuario abrió la app justo
        // cuando se oculta, y ese toque cae sobre este botón sin que la persona
        // lo haya presionado realmente. Un toque genuino tarda más que esto en
        // llegar, así que se ignora cualquier clic demasiado inmediato.
        if (Date.now() - momentoListo < 400 || yaEntro) return;
        yaEntro = true;

        inicializarRouter();
        precargarEnSegundoPlano();

        if (pantallaCarga) {
            pantallaCarga.classList.add("oculta");
            setTimeout(() => pantallaCarga.remove(), 400);
        }

        // La primera vez se explica de qué va la aplicación antes de soltar a
        // la persona en el menú. La evaluación con usuarios mostró que sin esa
        // explicación se confunde la práctica con la aplicación real.
        // Además, la voz del primer paso sale de este toque, que es lo que
        // autoriza al navegador a hablar durante el resto de la sesión.
        if (introPendiente()) {
            mostrarIntro(() => saludarEnElMenu());
        } else {
            saludarEnElMenu();
        }
    };

    const saludarEnElMenu = () => {
        speak("Ya puedes empezar. Toca la aplicación que quieras practicar.");
    };

    if (btnComenzar) {
        btnComenzar.addEventListener("click", entrar);
    } else {
        entrar();
    }
});
