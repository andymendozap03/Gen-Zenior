import { inicializarMenu } from "./controllers/menu.controller.js";
import { inicializarNiveles } from "./controllers/levels.controller.js";
import { inicializarRouter } from "./services/router.service.js";
import { precargarRecursos, precargarEnSegundoPlano } from "./services/preload.service.js";
import { speak } from "./services/speech.service.js";

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
    const pantallaCarga = document.getElementById("pantallaCarga");
    const barra = document.getElementById("cargaProgreso");
    const texto = document.getElementById("cargaTexto");
    const cajaBarra = document.getElementById("cargaBarra");
    const btnComenzar = document.getElementById("btnComenzar");

    inicializarMenu();
    inicializarNiveles();

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

    const entrar = () => {
        // Dentro del toque, y sin nada asíncrono por delante: aquí es donde el
        // navegador autoriza la voz para el resto de la sesión.
        speak("Hola, soy Nico. Voy a acompañarte en cada paso. Toca un módulo para empezar.");

        inicializarRouter();
        precargarEnSegundoPlano();

        if (pantallaCarga) {
            pantallaCarga.classList.add("oculta");
            setTimeout(() => pantallaCarga.remove(), 400);
        }
    };

    if (btnComenzar) {
        btnComenzar.addEventListener("click", entrar, { once: true });
    } else {
        entrar();
    }
});
