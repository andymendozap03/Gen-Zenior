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

    $("#listaNiveles").style.setProperty("--module-color", modulo.color);

    dibujarNiveles(modulo.niveles);

    cambiarPantalla("pantallaNiveles");

    // Dibujar las líneas de conexión cuando la pantalla esté activa y el layout listo
    setTimeout(dibujarLineaConexion, 100);
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

        // Estado del nivel (Simulado por ahora: nivel 1 completado, nivel 2 activo/jugable, los demás bloqueados)
        let estado = "locked";
        if (indice === 0) {
            estado = "completed";
        } else if (indice === 1) {
            estado = "active";
        }

        elementoNivel.classList.add(estado);

        const svgIcono = obtenerIconoNivel(nivel.id, estado);

        // Eliminadas las descripciones (<small>) a petición del usuario
        elementoNivel.innerHTML = `
            <button 
                class="circulo-nivel ${estado}" 
                data-level-id="${nivel.id}" 
                aria-label="Abrir nivel ${indice + 1}: ${nivel.titulo}"
                ${estado === "locked" ? "disabled" : ""}
            >
                ${svgIcono}
            </button>

            <div class="texto-nivel">
                <strong>${indice + 1}: ${nivel.titulo}</strong>
            </div>
        `;

        const botonNivel = elementoNivel.querySelector(".circulo-nivel");
        if (estado !== "locked") {
            botonNivel.addEventListener("click", () => {
                abrirNivel(nivel.id);
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

function obtenerIconoNivel(idNivel, estado) {
    if (estado === "completed") {
        return `
            <svg viewBox="0 0 24 24" class="icono-nivel-svg completado" stroke="#4c7a3b" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        `;
    }

    let svgInner = "";

    switch (idNivel) {
        // Módulo WhatsApp
        case "enviar-mensaje":
            svgInner = `<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>`;
            break;
        case "grabar-audio":
            svgInner = `<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                        <path d="M19 10v1a7 7 0 0 1-14 0v-1"></path>
                        <line x1="12" y1="19" x2="12" y2="23"></line>
                        <line x1="8" y1="23" x2="16" y2="23"></line>`;
            break;
        case "hacer-llamada":
        case "llamar-contacto":
            svgInner = `<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>`;
            break;
        case "llamada-grupal":
            svgInner = `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>`;
            break;
        case "enviar-foto":
            svgInner = `<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>`;
            break;

        // Módulo Facebook
        case "publicar-estado":
            svgInner = `<path d="M12 20h9"></path>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>`;
            break;
        case "reaccionar-foto":
            svgInner = `<path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>`;
            break;
        case "comentar-publicacion":
            svgInner = `<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>`;
            break;
        case "agregar-amigo":
        case "guardar-contacto":
            svgInner = `<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <line x1="20" y1="8" x2="20" y2="14"></line>
                        <line x1="17" y1="11" x2="23" y2="11"></line>`;
            break;
        case "ver-reels":
            svgInner = `<rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                        <line x1="7" y1="2" x2="7" y2="22"></line>
                        <line x1="17" y1="2" x2="17" y2="22"></line>
                        <line x1="2" y1="12" x2="22" y2="12"></line>
                        <line x1="2" y1="7" x2="7" y2="7"></line>
                        <line x1="2" y1="17" x2="7" y2="17"></line>
                        <line x1="17" y1="17" x2="22" y2="17"></line>
                        <line x1="17" y1="7" x2="22" y2="7"></line>`;
            break;

        // Módulo YouTube
        case "buscar-video":
        case "buscar-contacto":
            svgInner = `<circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>`;
            break;
        case "reproducir-video":
            svgInner = `<polygon points="5 3 19 12 5 21 5 3"></polygon>`;
            break;
        case "subir-volumen":
            svgInner = `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>`;
            break;
        case "suscribirse":
            svgInner = `<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>`;
            break;
        case "pausar-video":
            svgInner = `<rect x="6" y="4" width="4" height="16"></rect>
                        <rect x="14" y="4" width="4" height="16"></rect>`;
            break;

        // Módulo Contactos
        case "editar-contacto":
            svgInner = `<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>`;
            break;
        case "eliminar-contacto":
            svgInner = `<polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>`;
            break;

        default:
            svgInner = `<circle cx="12" cy="12" r="10"></circle>`;
    }

    if (estado === "locked") {
        // Línea diagonal sobre el icono (bloqueado)
        svgInner += `<line x1="3" y1="3" x2="21" y2="21" stroke="#847970" stroke-width="3" stroke-linecap="round"></line>`;
    }

    return `
        <svg viewBox="0 0 24 24" class="icono-nivel-svg ${estado}" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
            ${svgInner}
        </svg>
    `;
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

    if (!burbuja || !burbuja.classList.contains("mostrar")) {
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