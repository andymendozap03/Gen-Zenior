import { $ } from "../utils/dom.js";
import { datosModulos } from "../data/modules.data.js";
import { speak, stopSpeech } from "../services/speech.service.js";

let idModuloActual = null;

export function abrirPantallaNiveles(idModulo) {
    const modulo = datosModulos[idModulo];

    if (!modulo) {
        console.error("No existe el módulo:", idModulo);
        return;
    }

    idModuloActual = idModulo;

    $("#tituloModulo").textContent = modulo.nombre;
    $("#encabezadoModulo").style.background = modulo.color;
    $("#pantallaNiveles").style.background = modulo.fondo;

    dibujarNiveles(modulo.niveles);

    cambiarPantalla("pantallaNiveles");
}

export function inicializarNiveles() {
    $("#btnVolverMenu").addEventListener("click", () => {
        stopSpeech();
        cambiarPantalla("pantallaMenu");
    });

    $("#btnNicoModulo").addEventListener("click", (evento) => {
        evento.stopPropagation();
        mostrarAyudaNicoModulo();
    });

    document.addEventListener("click", cerrarMensajeNicoModulo);
}

function dibujarNiveles(niveles) {
    const lista = $("#listaNiveles");
    lista.innerHTML = "";

    niveles.forEach((nivel, indice) => {
        const elementoNivel = document.createElement("div");
        elementoNivel.className = "nivel";

        if (indice === 0) {
            elementoNivel.classList.add("completado");
        }

        const imagenNivel = nivel.imagen
            ? `<img 
                    src="${nivel.imagen}" 
                    alt="${nivel.titulo}" 
                    class="imagen-nivel"
                    onerror="this.style.display='none'; this.nextElementSibling.style.display='grid';"
               >`
            : "";

        elementoNivel.innerHTML = `
            <button 
                class="circulo-nivel" 
                data-level-id="${nivel.id}" 
                aria-label="Abrir nivel ${indice + 1}: ${nivel.titulo}"
            >
                ${imagenNivel}
                <span class="numero-nivel">${indice + 1}</span>
            </button>

            <div class="texto-nivel">
                <strong>${indice + 1}: ${nivel.titulo}</strong>
                <small>${nivel.descripcion}</small>
            </div>

            <span class="linea"></span>
        `;

        const botonNivel = elementoNivel.querySelector(".circulo-nivel");

        botonNivel.addEventListener("click", () => {
            abrirNivel(nivel.id);
        });

        lista.appendChild(elementoNivel);
    });
}

function abrirNivel(idNivel) {
    console.log("Nivel seleccionado:", idNivel);

    const nivel = datosModulos[idModuloActual].niveles.find(item => item.id === idNivel);

    if (!nivel) {
        console.error("No existe el nivel:", idNivel);
        return;
    }

    alert(`Abriste el nivel: ${nivel.titulo}`);

    // Más adelante aquí se abrirá el simulador correspondiente.
    // Por ejemplo:
    // abrirWhatsapp(idNivel);
}

function mostrarAyudaNicoModulo() {
    console.log("Botón Nico del módulo presionado");

    const burbuja = $("#mensajeNicoModulo");
    const modulo = datosModulos[idModuloActual];

    if (!burbuja) {
        console.error("No se encontró #mensajeNicoModulo");
        return;
    }

    if (!modulo) {
        console.error("No hay módulo actual seleccionado:", idModuloActual);
        return;
    }

    const mensaje = modulo.mensajeVoz || "Selecciona un nivel tocando uno de los círculos para empezar a practicar.";

    if (burbuja.classList.contains("mostrar")) {
        stopSpeech();
        burbuja.classList.remove("mostrar");
        return;
    }

    burbuja.textContent = mensaje;
    burbuja.classList.add("mostrar");

    speak(mensaje);
}


function cerrarMensajeNicoModulo(evento) {
    const burbuja = $("#mensajeNicoModulo");
    const boton = $("#btnNicoModulo");

    if (!burbuja.classList.contains("mostrar")) {
        return;
    }

    if (!burbuja.contains(evento.target) && !boton.contains(evento.target)) {
        burbuja.classList.remove("mostrar");
    }
}

function cambiarPantalla(idPantalla) {
    const pantallas = document.querySelectorAll(".pantalla");

    pantallas.forEach(pantalla => {
        pantalla.classList.remove("activa");
    });

    $(`#${idPantalla}`).classList.add("activa");
}