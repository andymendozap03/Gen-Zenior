import { $ } from "../utils/dom.js";
import { datosModulos } from "../data/modules.data.js";
import { speak, stopSpeech } from "../services/speech.service.js";
import { obtenerEstadoNivel, completarNivel } from "../services/progress.service.js";
import { iniciarSimulador as iniciarSimuladorWhatsapp } from "../modules/whatsapp/whatsapp.simulator.js";
import { iniciarSimulador as iniciarSimuladorFacebook } from "../modules/facebook/facebook.simulator.js";
import { iniciarSimulador as iniciarSimuladorContactos } from "../modules/contacts/contacts.simulator.js";
import { iniciarSimulador as iniciarSimuladorYoutube } from "../modules/youtube/youtube.simulator.js";

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

    $("#listaNiveles").style.setProperty("--module-color", modulo.color);

    dibujarNiveles(modulo.niveles);

    cambiarPantalla("pantallaNiveles");

    // Dibujar las líneas de conexión cuando la pantalla esté activa y el layout listo
    setTimeout(dibujarLineaConexion, 100);
}

export function inicializarNiveles() {
    $("#btnVolverMenu").addEventListener("click", () => {
        location.hash = "/";
    });

    $("#btnNicoModulo").addEventListener("click", (evento) => {
        evento.stopPropagation();
        mostrarAyudaNicoModulo();
    });

    document.addEventListener("click", cerrarMensajeNicoModulo);

    // Observador para redibujar las líneas automáticamente con cambios de tamaño, zoom u orientación
    const observador = new ResizeObserver(() => {
        const pantallaNiveles = $("#pantallaNiveles");
        if (idModuloActual && pantallaNiveles && pantallaNiveles.classList.contains("activa")) {
            dibujarLineaConexion();
        }
    });
    observador.observe($("#listaNiveles"));
}

function dibujarNiveles(niveles) {
    const lista = $("#listaNiveles");
    lista.innerHTML = "";

    niveles.forEach((nivel, indice) => {
        const elementoNivel = document.createElement("div");
        elementoNivel.className = `nivel nivel-${indice + 1}`;

        // Estado del nivel leído del servicio de progreso
        const estado = obtenerEstadoNivel(idModuloActual, nivel.id);

        elementoNivel.classList.add(estado);

        const contenidoInterno = nivel.imagen
            ? `<img src="${nivel.imagen}" class="imagen-nivel ${estado}" alt="">`
            : `<span class="numero-nivel">${indice + 1}</span>`;

        // Eliminadas las descripciones (<small>) a petición del usuario
        elementoNivel.innerHTML = `
            <button 
                class="circulo-nivel ${estado}" 
                data-level-id="${nivel.id}" 
                aria-label="Abrir nivel ${indice + 1}: ${nivel.titulo}"
                ${estado === "locked" ? "disabled" : ""}
            >
                ${contenidoInterno}
            </button>

            <div class="texto-nivel">
                <strong>${indice + 1}: ${nivel.titulo}</strong>
            </div>
        `;

        const botonNivel = elementoNivel.querySelector(".circulo-nivel");
        if (estado !== "locked") {
            botonNivel.addEventListener("click", () => {
                location.hash = "/modulo/" + idModuloActual + "/nivel/" + nivel.id;
            });
        }

        lista.appendChild(elementoNivel);
    });
}

function dibujarLineaConexion() {
    const lista = $("#listaNiveles");
    const circulos = lista.querySelectorAll(".circulo-nivel");
    if (circulos.length < 2) return;

    // Eliminar SVG anterior si existe
    let svg = lista.querySelector(".linea-conexion-svg");
    if (svg) {
        svg.remove();
    }

    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "linea-conexion-svg");
    svg.style.position = "absolute";
    svg.style.top = "0";
    svg.style.left = "0";
    svg.style.width = "100%";
    svg.style.height = `${lista.scrollHeight || (circulos.length * 160)}px`;
    svg.style.pointerEvents = "none";
    svg.style.zIndex = "1";

    // Definición de la flecha con el color correcto (#6b4a3a) y sin recortes
    svg.innerHTML = `
        <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="0" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse" overflow="visible">
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#6b4a3a" />
            </marker>
        </defs>
    `;

    const containerRect = lista.getBoundingClientRect();
    const puntos = [];

    // Medición exacta y dinámica de las posiciones reales de los círculos en el DOM
    circulos.forEach((circulo) => {
        const rect = circulo.getBoundingClientRect();
        const x = rect.left - containerRect.left + rect.width / 2 + lista.scrollLeft;
        const y = rect.top - containerRect.top + rect.height / 2 + lista.scrollTop;
        puntos.push({ x, y, r: rect.width / 2 });
    });

    // Crear las curvas por segmentos para poder colocar una flecha al final de cada tramo
    for (let i = 0; i < puntos.length - 1; i++) {
        const p1 = puntos[i];
        const p2 = puntos[i + 1];

        // Conectar el borde inferior del círculo i con el borde superior del círculo i+1 (con offset de 8px para la flecha de longitud 8px)
        const xA = p1.x;
        const yA = p1.y + p1.r;
        const xB = p2.x;
        const yB = p2.y - (p2.r + 20); // offset de 8px para que la flecha completa toque el círculo
        const H = yB - yA;

        // Puntos de control para lograr una trayectoria de ola con caída profunda y cresta muy alta (sube mucho en la cresta)
        const ctrl1x = xA;
        const ctrl1y = yA + H * 2.5;
        const ctrl2x = xB;
        const ctrl2y = yA - H * 1.5;

        const segmento = document.createElementNS("http://www.w3.org/2000/svg", "path");
        segmento.setAttribute("fill", "none");
        segmento.setAttribute("stroke", "#6b4a3a");
        segmento.setAttribute("stroke-width", "4");
        segmento.setAttribute("stroke-linecap", "round");
        segmento.setAttribute("marker-end", "url(#arrow)");
        segmento.setAttribute("d", `M ${xA} ${yA} C ${ctrl1x} ${ctrl1y}, ${ctrl2x} ${ctrl2y}, ${xB} ${yB}`);

        svg.appendChild(segmento);
    }

    // Dibujar el bucle o colita final del último círculo para simular continuidad
    if (puntos.length > 0) {
        const pLast = puntos[puntos.length - 1];
        const xA = pLast.x;
        const yA = pLast.y + pLast.r;

        const loop = document.createElementNS("http://www.w3.org/2000/svg", "path");
        loop.setAttribute("fill", "none");
        loop.setAttribute("stroke", "#6b4a3a");
        loop.setAttribute("stroke-width", "4");
        loop.setAttribute("stroke-linecap", "round");

        // Curvamos hacia afuera dependiendo de la posicion del ultimo circulo (si es impar, está a la izquierda, curvamos a la derecha)
        const direction = (puntos.length - 1) % 2 === 0 ? 1 : -1;
        loop.setAttribute("d", `M ${xA} ${yA} C ${xA} ${yA + 40}, ${xA + direction * 50} ${yA + 45}, ${xA + direction * 30} ${yA + 60}`);

        svg.appendChild(loop);
    }

    // Insertar el SVG como primer hijo para asegurar que se dibuje por detrás de los textos e ítems
    lista.insertBefore(svg, lista.firstChild);
}



export function abrirNivel(idNivel) {
    console.log("Nivel seleccionado:", idNivel);

    const nivel = datosModulos[idModuloActual].niveles.find(item => item.id === idNivel);

    if (!nivel) {
        console.error("No existe el nivel:", idNivel);
        return;
    }

    if (idModuloActual === "WhatsApp") {
        iniciarSimuladorWhatsapp(idNivel);
    } else if (idModuloActual === "Facebook") {
        iniciarSimuladorFacebook(idNivel);
    } else if (idModuloActual === "Contactos") {
        iniciarSimuladorContactos(idNivel);
    } else if (idModuloActual === "YouTube") {
        iniciarSimuladorYoutube(idNivel);
    } else {
        alert(`Simulando nivel: ${nivel.titulo}.\n\n¡Completaste este nivel con éxito!`);
        completarNivel(idModuloActual, idNivel);
        location.hash = "/modulo/" + idModuloActual;
    }
}

let _nicoClickEnBoton = false;

function mostrarAyudaNicoModulo() {
    const burbuja = $("#mensajeNicoModulo");

    if (!burbuja) {
        console.error("No se encontró #mensajeNicoModulo");
        return;
    }

    // Señalizar al document listener que este click fue en el botón
    _nicoClickEnBoton = true;

    if (burbuja.classList.contains("mostrar")) {
        stopSpeech();
        burbuja.classList.remove("mostrar");
        return;
    }

    const modulo = datosModulos[idModuloActual];
    const mensaje = modulo
        ? (modulo.mensajeVoz || "Selecciona un nivel tocando uno de los círculos para empezar a practicar.")
        : "Selecciona un nivel tocando uno de los círculos para empezar a practicar.";

    burbuja.textContent = mensaje;
    burbuja.classList.add("mostrar");

    speak(mensaje);
}

function cerrarMensajeNicoModulo(evento) {
    // Si el clic fue en el botón Nico, no cerrar (lo maneja mostrarAyudaNicoModulo)
    if (_nicoClickEnBoton) {
        _nicoClickEnBoton = false;
        return;
    }

    const burbuja = $("#mensajeNicoModulo");

    if (!burbuja || !burbuja.classList.contains("mostrar")) {
        return;
    }

    if (!burbuja.contains(evento.target)) {
        burbuja.classList.remove("mostrar");
        stopSpeech();
    }
}

function cambiarPantalla(idPantalla) {
    const pantallas = document.querySelectorAll(".pantalla");

    pantallas.forEach(pantalla => {
        pantalla.classList.remove("activa");
    });

    $(`#${idPantalla}`).classList.add("activa");
}