import { $ } from "../../utils/dom.js";
import { completarNivel } from "../../services/progress.service.js";
import { speak, speakPrioritario, stopSpeech } from "../../services/speech.service.js";
import { resaltarElemento, limpiarResaltados } from "../../services/guide-highlight.service.js";

/* ======================================================================
   SIMULADOR DE YOUTUBE
   Niveles:
     1. buscar-video          -> Buscar un video
     2. reproducir-pausar     -> Reproducir, pausar y subir volumen
     3. reaccionar-suscribir  -> Me gusta, suscribirse y campana
     4. comentar-video        -> Abrir comentarios, escribir y enviar
     5. guardar-video         -> Guardar y encontrarlo en "Ver más tarde"
   ====================================================================== */

let simuladorInicializado = false;
let nivelActual = null;
let subPaso = 1;
let ultimaInstruccionHablada = "";

// Ritmo de la guía: pausa tras la voz antes de pasar de paso, y espera
// equivalente cuando Nico no llegó a hablar.
const PAUSA_TRAS_VOZ = 900;
const ESPERA_SIN_VOZ = 2200;

// Estado del reproductor simulado
let videoActual = null;
let reproduciendo = false;
let progresoSegundos = 0;
let progresoInterval = null;

// true cuando el archivo de video cargó bien; si es false el reproductor
// funciona en modo animación (fondo de color con emoji)
let usandoVideoReal = false;

// Estado de interacción del video abierto
let yaLiked = false;
let yaSubscrito = false;
let campanaActiva = false;

// Estado persistente dentro del nivel
let videosGuardados = [];
let comentarios = [];

// Timers
let respuestaCanalTimeout = null;
let toastTimeout = null;

// App elegida en la hoja de compartir (WhatsApp, Mensajes...)
let appCompartir = "WhatsApp";

// ---------------------------------------------------------------------
// DATOS (100% locales, sin internet)
// ---------------------------------------------------------------------
const VIDEOS_DATA = [
    {
        id: 1,
        titulo: "Sopa de pollo casera como la hacía la abuela",
        canal: "Cocina de Rosa",
        avatarLetter: "R",
        avatarBg: "#ff7043",
        vistas: "1.2 M de vistas",
        tiempo: "hace 2 años",
        duracionSeg: 25,
        archivo: "./assets/video/sopa.mp4",
        miniatura: "./assets/img/youtube/sopa.jpg",
        likes: 48000,
        suscriptores: "820 mil suscriptores",
        emoji: "🍲",
        gradiente: "linear-gradient(135deg, #ff9a44, #d84315)",
        etiquetas: ["receta", "recetas", "sopa", "pollo", "cocina", "comida", "caldo"]
    },
    {
        id: 2,
        titulo: "Boleros y música del recuerdo",
        canal: "Música del Recuerdo",
        avatarLetter: "M",
        avatarBg: "#7e57c2",
        vistas: "5.4 M de vistas",
        tiempo: "hace 3 años",
        duracionSeg: 25,
        archivo: "./assets/video/musica.mp4",
        miniatura: "./assets/img/youtube/musica.jpg",
        likes: 132000,
        suscriptores: "2.1 M de suscriptores",
        emoji: "🎵",
        gradiente: "linear-gradient(135deg, #9575cd, #4527a0)",
        etiquetas: ["musica", "música", "boleros", "canciones", "recuerdo", "70"]
    },
    {
        id: 3,
        titulo: "Ejercicios suaves para hacer sentado en casa",
        canal: "Vida Activa 60+",
        avatarLetter: "V",
        avatarBg: "#43a047",
        vistas: "890 mil vistas",
        tiempo: "hace 8 meses",
        duracionSeg: 25,
        archivo: "./assets/video/ejercicio.mp4",
        miniatura: "./assets/img/youtube/ejercicio.jpg",
        likes: 27000,
        suscriptores: "410 mil suscriptores",
        emoji: "🧘",
        gradiente: "linear-gradient(135deg, #66bb6a, #1b5e20)",
        etiquetas: ["ejercicio", "ejercicios", "salud", "gimnasia", "casa", "caminar"]
    },
    {
        id: 4,
        titulo: "Cómo cuidar tus plantas en casa | Consejos fáciles",
        canal: "Jardín en Casa",
        avatarLetter: "J",
        avatarBg: "#8d6e63",
        vistas: "640 mil vistas",
        tiempo: "hace 1 año",
        duracionSeg: 25,
        archivo: "./assets/video/plantas.mp4",
        miniatura: "./assets/img/youtube/plantas.jpg",
        likes: 19000,
        suscriptores: "230 mil suscriptores",
        emoji: "🌱",
        gradiente: "linear-gradient(135deg, #9ccc65, #33691e)",
        etiquetas: ["plantas", "jardin", "jardín", "flores", "sembrar", "maceta"]
    },
    {
        id: 5,
        titulo: "Los paisajes más bonitos del Ecuador desde el aire",
        canal: "Ecuador Natural",
        avatarLetter: "E",
        avatarBg: "#039be5",
        vistas: "2.3 M de vistas",
        tiempo: "hace 5 meses",
        duracionSeg: 25,
        archivo: "./assets/video/paisajes.mp4",
        miniatura: "./assets/img/youtube/paisajes.jpg",
        likes: 76000,
        suscriptores: "1.3 M de suscriptores",
        emoji: "🏔️",
        gradiente: "linear-gradient(135deg, #4fc3f7, #01579b)",
        etiquetas: ["ecuador", "paisajes", "viajes", "naturaleza", "montaña", "documental"]
    },
    {
        id: 6,
        titulo: "Pan casero fácil, sin amasadora y con pocos ingredientes",
        canal: "Cocina de Rosa",
        avatarLetter: "R",
        avatarBg: "#ff7043",
        vistas: "3.1 M de vistas",
        tiempo: "hace 1 año",
        duracionSeg: 25,
        archivo: "./assets/video/pan.mp4",
        miniatura: "./assets/img/youtube/pan.jpg",
        likes: 91000,
        suscriptores: "820 mil suscriptores",
        emoji: "🍞",
        gradiente: "linear-gradient(135deg, #ffca28, #ef6c00)",
        etiquetas: ["receta", "recetas", "pan", "cocina", "comida", "horno"]
    }
];

// Cada video tiene sus propios comentarios: antes eran los mismos en todos,
// y se notaba que estaban puestos a mano.
const COMENTARIOS_POR_VIDEO = {
    1: [
        { id: 1, autor: "Carmen Villacís", avatarLetter: "C", avatarBg: "#ec407a", texto: "Gracias por explicar tan despacio. La hice ayer y me quedó igualita a la de mi mamá.", tiempo: "hace 2 semanas", likes: 342, corazonCanal: true },
        { id: 2, autor: "Jorge Andrade", avatarLetter: "J", avatarBg: "#26a69a", texto: "¿El pollo se pone entero o en presas? Perdón, apenas estoy aprendiendo a cocinar.", tiempo: "hace 1 mes", likes: 118, corazonCanal: false },
        { id: 3, autor: "Marta Cedeño", avatarLetter: "M", avatarBg: "#5c6bc0", texto: "El secreto está en el apio, mi abuela hacía lo mismo 🥰", tiempo: "hace 3 meses", likes: 54, corazonCanal: false }
    ],
    2: [
        { id: 1, autor: "Ernesto Campos", avatarLetter: "E", avatarBg: "#7e57c2", texto: "Esta canción la bailé con mi esposa en el 78. Qué recuerdos.", tiempo: "hace 1 semana", likes: 521, corazonCanal: true },
        { id: 2, autor: "Gloria Castro", avatarLetter: "G", avatarBg: "#ef6c00", texto: "La pongo todas las tardes mientras tiendo la ropa 🎶", tiempo: "hace 2 meses", likes: 203, corazonCanal: false },
        { id: 3, autor: "Luis Chávez", avatarLetter: "L", avatarBg: "#00897b", texto: "¿Alguien sabe cómo se llama la segunda canción? Es preciosa.", tiempo: "hace 3 meses", likes: 47, corazonCanal: false }
    ],
    3: [
        { id: 1, autor: "Dolores Pérez", avatarLetter: "D", avatarBg: "#8bc34a", texto: "Las hago sentada porque me duelen las rodillas y me funcionan igual. Gracias.", tiempo: "hace 5 días", likes: 289, corazonCanal: true },
        { id: 2, autor: "Ramón Flores", avatarLetter: "R", avatarBg: "#039be5", texto: "Mi doctor me mandó justo estos. Muy bien explicados.", tiempo: "hace 3 semanas", likes: 96, corazonCanal: false },
        { id: 3, autor: "Patricia Mora", avatarLetter: "P", avatarBg: "#d81b60", texto: "Empecé hace un mes y ya subo las escaleras sin cansarme tanto 💪", tiempo: "hace 1 mes", likes: 134, corazonCanal: false }
    ],
    4: [
        { id: 1, autor: "Elena Vargas", avatarLetter: "E", avatarBg: "#43a047", texto: "¿Cada cuánto se riegan? Se me secan siempre las mías 😔", tiempo: "hace 4 días", likes: 178, corazonCanal: true },
        { id: 2, autor: "Tomás Herrera", avatarLetter: "T", avatarBg: "#795548", texto: "El truco del dedo en la tierra me cambió la vida, gracias.", tiempo: "hace 2 semanas", likes: 92, corazonCanal: false },
        { id: 3, autor: "Rosario Delgado", avatarLetter: "R", avatarBg: "#8e24aa", texto: "Mi balcón está precioso desde que sigo este canal 🌷", tiempo: "hace 1 mes", likes: 61, corazonCanal: false }
    ],
    5: [
        { id: 1, autor: "Miguel Ponce", avatarLetter: "M", avatarBg: "#00838f", texto: "Qué hermoso está el Ecuador. Yo soy de Quevedo y no conocía ese lugar.", tiempo: "hace 6 días", likes: 412, corazonCanal: true },
        { id: 2, autor: "Ana Belén Rodríguez", avatarLetter: "A", avatarBg: "#3949ab", texto: "Se lo mandé a mi hijo que vive afuera y se puso a llorar 🇪🇨", tiempo: "hace 3 semanas", likes: 267, corazonCanal: false },
        { id: 3, autor: "Pedro Sánchez", avatarLetter: "P", avatarBg: "#f4511e", texto: "¿En qué mes es mejor ir? Estoy planeando el viaje con mis nietos.", tiempo: "hace 1 mes", likes: 58, corazonCanal: false }
    ],
    6: [
        { id: 1, autor: "Josefina Bravo", avatarLetter: "J", avatarBg: "#ec407a", texto: "Sin amasadora de verdad funciona. Salió esponjadito 🍞", tiempo: "hace 1 semana", likes: 356, corazonCanal: true },
        { id: 2, autor: "Juan Carlos Macías", avatarLetter: "J", avatarBg: "#00acc1", texto: "¿Se puede dejar la masa toda la noche en la refrigeradora?", tiempo: "hace 2 semanas", likes: 121, corazonCanal: false },
        { id: 3, autor: "Carmen Villacís", avatarLetter: "C", avatarBg: "#ec407a", texto: "Ya van tres veces que lo hago. Mis nietos me lo piden 😄", tiempo: "hace 1 mes", likes: 88, corazonCanal: false }
    ]
};

const SUGERENCIAS_BUSQUEDA = ["recetas de sopa", "música del recuerdo", "ejercicios en casa"];

// Personas a las que se le puede enviar un video en el nivel de compartir
const CONTACTOS_COMPARTIR = [
    { id: "juan", nombre: "Juan (Nieto)", inicial: "J", color: "#3f51b5" },
    { id: "familia", nombre: "Familia Mendoza", inicial: "F", color: "#e91e63" },
    { id: "rosa", nombre: "Rosa (Vecina)", inicial: "R", color: "#009688" }
];

// ---------------------------------------------------------------------
// UTILIDADES
// ---------------------------------------------------------------------
function formatearTiempo(segundos) {
    const m = Math.floor(segundos / 60);
    const s = Math.floor(segundos % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
}

function formatearNumero(n) {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)} M`;
    if (n >= 1000) return `${Math.round(n / 1000)} K`;
    return `${n}`;
}

function limpiarEmojis(texto) {
    return texto.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "").trim();
}

function enVista(idVista) {
    const v = $(`#${idVista}`);
    return !!(v && v.classList.contains("activa"));
}

function textoComentario() {
    const i = $("#ytCommentInput");
    return i ? i.value.trim() : "";
}

function textoBusqueda() {
    const i = $("#ytSearchInput");
    return i ? i.value.trim() : "";
}

// ---------------------------------------------------------------------
// PLANTILLA HTML
// ---------------------------------------------------------------------
function asegurarTemplateHTML() {
    const contenedor = $("#pantallaYoutubeSimulador");
    if (!contenedor || contenedor.children.length > 0) return;

    contenedor.innerHTML = `
        <!-- Barra de instrucciones (NICO Guía) -->
        <div id="ytInstructionsBar" class="yt-instructions-bar">
            <button type="button" id="ytNicoBtn" class="yt-instructions-nico" aria-label="Repetir instrucción de Nico">
                <img src="./assets/img/icons/voz.svg" alt="" class="yt-instructions-icono-nico">
                <small>NICO</small>
            </button>
            <div id="ytInstructionsText" class="yt-instructions-text">Cargando objetivo...</div>
        </div>

        <!-- ======= VISTA INICIO ======= -->
        <div id="ytViewFeed" class="yt-view activa">
            <header class="yt-header">
                <div class="yt-header-left">
                    <button id="ytSalirBtn" class="yt-back-btn" aria-label="Volver al menú de niveles">
                        <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                    </button>
                    <div class="yt-logo-container" id="ytLogoHome">
                        <div class="yt-logo-play"></div>
                        <span class="yt-logo-text">YouTube</span>
                    </div>
                </div>
                <div class="yt-header-right">
                    <button class="yt-header-icon" id="ytBuscarBtn" aria-label="Buscar">
                        <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                    </button>
                </div>
            </header>

            <div class="yt-categories-container">
                <button class="yt-pill active">Todos</button>
                <button class="yt-pill">Cocina</button>
                <button class="yt-pill">Música</button>
                <button class="yt-pill">Salud</button>
                <button class="yt-pill">Naturaleza</button>
            </div>

            <div id="ytFeedList" class="yt-feed"></div>
        </div>

        <!-- ======= VISTA BUSCAR ======= -->
        <div id="ytViewBuscar" class="yt-view">
            <header class="yt-search-header">
                <button id="ytSearchVolverBtn" class="yt-back-btn" aria-label="Volver al inicio">
                    <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                </button>
                <input type="text" id="ytSearchInput" class="yt-search-input" placeholder="Buscar en YouTube" autocomplete="off">
                <button id="ytSearchGoBtn" class="yt-search-go-btn" aria-label="Buscar">
                    <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                </button>
            </header>

            <div id="ytSearchChips" class="yt-search-chips">
                <p class="yt-search-chips-title">Sugerencias para ti</p>
                ${SUGERENCIAS_BUSQUEDA.map(s => `
                    <button class="yt-search-chip" data-sugerencia="${s}">
                        <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                        <span>${s}</span>
                    </button>
                `).join("")}
            </div>

            <div id="ytSearchResults" class="yt-feed"></div>
        </div>

        <!-- ======= VISTA REPRODUCTOR ======= -->
        <div id="ytViewPlayer" class="yt-view yt-player-view">
            <div class="yt-player-screen" id="ytPlayerScreen">
                <span class="yt-player-emoji" id="ytPlayerEmoji">🎬</span>

                <!-- Rueda de carga mientras el video se prepara -->
                <div class="yt-cargando" id="ytCargando">
                    <div class="yt-cargando-rueda"></div>
                    <span class="yt-cargando-texto">Cargando video...</span>
                </div>

                <video id="ytPlayerVideo" class="yt-player-video" playsinline loop preload="metadata"></video>

                <button class="yt-big-play-btn" id="ytBigPlayBtn" aria-label="Reproducir video">
                    <svg id="ytBigPlayIcon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                </button>

                <div class="yt-player-bar">
                    <button class="yt-ctrl-btn" id="ytPlayPauseBtn" aria-label="Reproducir o pausar">
                        <svg id="ytPlayPauseIcon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </button>
                    <span class="yt-time-label" id="ytTimeLabel">0:00 / 0:00</span>
                    <div class="yt-progress-track"><div class="yt-progress-fill" id="ytProgressFill"></div></div>
                </div>
            </div>

            <div class="yt-player-info-section">
                <button id="ytPlayerVolverBtn" class="yt-action-pill yt-volver-pill">
                    <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                    <span>Volver al inicio</span>
                </button>

                <h1 class="yt-player-title" id="ytPlayerTitleText">—</h1>
                <p class="yt-player-metadata" id="ytPlayerMetaText">—</p>

                <div class="yt-channel-row">
                    <div class="yt-channel-left">
                        <div class="yt-channel-avatar" id="ytPlayerChannelAvatar">—</div>
                        <div>
                            <div class="yt-comment-author" id="ytPlayerChannelName">—</div>
                            <div class="yt-channel-subs-count" id="ytPlayerChannelSubs">—</div>
                        </div>
                    </div>
                    <div class="yt-channel-actions">
                        <button class="yt-subscribe-btn" id="ytSubscribeBtn">Suscribirse</button>
                        <button class="yt-bell-btn" id="ytBellBtn" aria-label="Activar notificaciones" style="display:none;">
                            <svg id="ytBellIcon" viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
                        </button>
                    </div>
                </div>

                <div class="yt-actions-row">
                    <button class="yt-action-pill" id="ytLikeBtn" aria-label="Me gusta">
                        <svg viewBox="0 0 24 24" id="ytLikeIcon"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>
                        <span id="ytLikeLabel">—</span>
                    </button>

                    <button class="yt-action-pill" id="ytDislikeBtn" aria-label="No me gusta">
                        <svg viewBox="0 0 24 24"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/></svg>
                    </button>

                    <button class="yt-action-pill" id="ytShareBtn" aria-label="Compartir">
                        <svg viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92z"/></svg>
                        <span>Compartir</span>
                    </button>

                    <button class="yt-action-pill" id="ytSaveBtn" aria-label="Guardar video">
                        <svg viewBox="0 0 24 24" id="ytSaveIcon"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
                        <span id="ytSaveLabel">Guardar</span>
                    </button>
                </div>

                <div class="yt-comments-preview-box" id="ytCommentsPreviewBox">
                    <div class="yt-comments-preview-header">
                        <div>
                            <span class="yt-comments-preview-title">Comentarios</span>
                            <span class="yt-comments-preview-count" id="ytCommentsCount">0</span>
                        </div>
                        <span class="yt-comments-preview-arrow">∧</span>
                    </div>
                    <div class="yt-comments-preview-body">
                        <div class="yt-comments-preview-avatar" id="ytCommentsPreviewAvatar">C</div>
                        <div class="yt-comments-preview-text" id="ytCommentsPreviewText">—</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ======= VISTA "TÚ" (BIBLIOTECA) ======= -->
        <div id="ytViewBiblioteca" class="yt-view">
            <header class="yt-header">
                <div class="yt-header-left">
                    <div class="yt-lib-user">
                        <div class="yt-lib-avatar">A</div>
                        <div>
                            <div class="yt-lib-name">Mi cuenta</div>
                            <div class="yt-lib-mail">Ver tu canal</div>
                        </div>
                    </div>
                </div>
            </header>

            <div class="yt-lib-body">
                <button class="yt-lib-option" id="ytLibVerMasTarde">
                    <svg viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.2 14.2L11 13V7h1.5v5.2l4.5 2.7-.8 1.3z"/></svg>
                    <div class="yt-lib-option-text">
                        <strong>Ver más tarde</strong>
                        <small id="ytLibVerMasTardeCount">0 videos guardados</small>
                    </div>
                    <span class="yt-lib-arrow">›</span>
                </button>

                <button class="yt-lib-option" id="ytLibHistorial">
                    <svg viewBox="0 0 24 24"><path d="M13 3a9 9 0 0 0-9 9H1l3.9 3.9.1.2L9 12H6a7 7 0 1 1 7 7c-1.9 0-3.6-.8-4.8-2l-1.4 1.4A9 9 0 1 0 13 3zm-1 5v5l4.3 2.5.7-1.2-3.5-2.1V8H12z"/></svg>
                    <div class="yt-lib-option-text">
                        <strong>Historial</strong>
                        <small>Videos que ya viste</small>
                    </div>
                    <span class="yt-lib-arrow">›</span>
                </button>

                <div id="ytLibSavedSection" class="yt-lib-saved-section" style="display:none;">
                    <h3 class="yt-lib-saved-title">Ver más tarde</h3>
                    <div id="ytLibSavedList" class="yt-feed"></div>
                </div>
            </div>
        </div>

        <!-- ======= CAJÓN DE COMENTARIOS ======= -->
        <div id="ytCommentsDrawer" class="yt-comments-drawer">
            <div class="yt-drawer-header">
                <span class="yt-drawer-title">Comentarios</span>
                <button class="yt-drawer-close-btn" id="ytDrawerCloseBtn" aria-label="Cerrar comentarios">✕</button>
            </div>

            <div class="yt-comments-warning-banner">
                Recuerda escribir comentarios respetuosos.
            </div>

            <div class="yt-comments-list" id="ytCommentsList"></div>

            <div class="yt-comment-input-bar">
                <div class="yt-comment-input-avatar">A</div>
                <input type="text" class="yt-comment-input-field" id="ytCommentInput" placeholder="Añade un comentario..." autocomplete="off">
                <button class="yt-comment-send-btn" id="ytCommentSendBtn" aria-label="Enviar comentario">
                    <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                </button>
            </div>
        </div>

        <!-- ======= MENÚ DE UN COMENTARIO PROPIO ======= -->
        <div id="ytCommentMenu" class="yt-comment-menu">
            <div class="yt-comment-menu-panel">
                <button class="yt-comment-menu-opcion" id="ytCommentMenuEliminar">
                    <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                    <span>Eliminar</span>
                </button>
                <button class="yt-comment-menu-opcion" id="ytCommentMenuCancelar">
                    <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    <span>Cancelar</span>
                </button>
            </div>
        </div>

        <!-- ======= HOJA DE COMPARTIR ======= -->
        <div id="ytShareSheet" class="yt-share-sheet">
            <div class="yt-share-panel">
                <div class="yt-share-header">
                    <span class="yt-share-title" id="ytShareTitulo">Compartir</span>
                    <button class="yt-drawer-close-btn" id="ytShareCloseBtn" aria-label="Cerrar">✕</button>
                </div>

                <div id="ytShareApps" class="yt-share-apps">
                    <button class="yt-share-app" id="ytShareAppWhatsapp">
                        <span class="yt-share-app-icono" style="background:#25d366;">💬</span>
                        <span>WhatsApp</span>
                    </button>
                    <button class="yt-share-app" id="ytShareAppMensajes">
                        <span class="yt-share-app-icono" style="background:#1e88e5;">✉️</span>
                        <span>Mensajes</span>
                    </button>
                    <button class="yt-share-app" id="ytShareAppCopiar">
                        <span class="yt-share-app-icono" style="background:#616161;">🔗</span>
                        <span>Copiar enlace</span>
                    </button>
                </div>

                <div id="ytShareContactos" class="yt-share-contactos" style="display:none;"></div>
            </div>
        </div>

        <!-- ======= NAV INFERIOR ======= -->
        <nav class="yt-bottom-nav">
            <button class="yt-nav-tab active" id="ytNavPrincipal" data-view="ytViewFeed">
                <svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
                <span>Principal</span>
            </button>
            <button class="yt-nav-tab" id="ytNavShorts">
                <svg viewBox="0 0 24 24"><path d="M17.97 10.97l-3.78-1.89 3.78-1.89c1.09-.54 1.84-1.63 1.84-2.91 0-1.87-1.52-3.39-3.39-3.39-.77 0-1.48.26-2.07.69L5.34 6.84c-1.09.54-1.84 1.63-1.84 2.91 0 1.87 1.52 3.39 3.39 3.39.77 0 1.48-.26 2.07-.69l3.78 1.89-3.78 1.89c-1.09.54-1.84 1.63-1.84 2.91 0 1.87 1.52 3.39 3.39 3.39.77 0 1.48-.26 2.07-.69l9.01-5.26c1.09-.54 1.84-1.63 1.84-2.91 0-1.87-1.52-3.39-3.39-3.39-.77 0-1.48.26-2.07.69z"/></svg>
                <span>Shorts</span>
            </button>
            <button class="yt-nav-tab" id="ytNavSuscripciones">
                <svg viewBox="0 0 24 24"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/></svg>
                <span>Suscripciones</span>
            </button>
            <button class="yt-nav-tab" id="ytNavTu" data-view="ytViewBiblioteca">
                <div class="yt-nav-avatar">A</div>
                <span>Tú</span>
            </button>
        </nav>

        <!-- ======= AVISO FLOTANTE ======= -->
        <div id="ytToast" class="yt-toast"></div>

        <!-- ======= AVISO: EL VOLUMEN SE SUBE CON EL TELÉFONO ======= -->
        <div id="ytVolumenCard" class="yt-volumen-card">
            <div class="yt-volumen-panel">
                <h3 class="yt-volumen-titulo">Sube el volumen con tu teléfono</h3>

                <div class="yt-volumen-dibujos">
                    <figure class="yt-volumen-figura">
                        <svg viewBox="0 0 130 210" aria-hidden="true">
                            <defs>
                                <linearGradient id="ytPantalla" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stop-color="#4a4a6a"/>
                                    <stop offset="100%" stop-color="#22223b"/>
                                </linearGradient>
                            </defs>
                            <rect x="25" y="6" width="80" height="198" rx="16" fill="#2b2b35"/>
                            <rect x="29" y="10" width="72" height="190" rx="13" fill="url(#ytPantalla)"/>
                            <rect x="52" y="14" width="26" height="5" rx="2.5" fill="#15151c"/>
                            <rect x="47" y="192" width="36" height="4" rx="2" fill="#ffffff" opacity="0.5"/>
                            <rect x="105" y="52" width="8" height="30" rx="4" fill="#ff0000"/>
                            <rect x="105" y="88" width="8" height="30" rx="4" fill="#8a8a99"/>
                            <text x="117" y="72" font-size="16" font-weight="bold" fill="#ff0000">+</text>
                            <text x="117" y="108" font-size="16" font-weight="bold" fill="#5f5f6d">−</text>
                        </svg>
                        <figcaption>Casi siempre, a la derecha</figcaption>
                    </figure>

                    <figure class="yt-volumen-figura">
                        <svg viewBox="0 0 130 210" aria-hidden="true">
                            <rect x="25" y="6" width="80" height="198" rx="16" fill="#2b2b35"/>
                            <rect x="29" y="10" width="72" height="190" rx="13" fill="url(#ytPantalla)"/>
                            <rect x="52" y="14" width="26" height="5" rx="2.5" fill="#15151c"/>
                            <rect x="47" y="192" width="36" height="4" rx="2" fill="#ffffff" opacity="0.5"/>
                            <rect x="17" y="52" width="8" height="30" rx="4" fill="#ff0000"/>
                            <rect x="17" y="88" width="8" height="30" rx="4" fill="#8a8a99"/>
                            <text x="4" y="72" font-size="16" font-weight="bold" fill="#ff0000">+</text>
                            <text x="4" y="108" font-size="16" font-weight="bold" fill="#5f5f6d">−</text>
                        </svg>
                        <figcaption>En algunos, a la izquierda</figcaption>
                    </figure>
                </div>

                <p class="yt-volumen-texto">
                    Los botones del volumen están en el <strong>borde del teléfono</strong>, no en la pantalla.
                    Suelen ir en el <strong>lado derecho</strong>, cerca de la parte de arriba; en algunos
                    teléfonos están en el <strong>lado izquierdo</strong>.
                </p>
                <p class="yt-volumen-texto">
                    Son dos botones alargados: el <strong>de arriba sube</strong> el volumen y el
                    <strong>de abajo lo baja</strong>. Pruébalos ahora mientras suena el video.
                </p>

                <button id="ytVolumenListo" class="yt-volumen-btn">Ya lo escucho más fuerte</button>
            </div>
        </div>

        <!-- ======= MODAL DE ÉXITO ======= -->
        <div id="ytModalExito" class="yt-modal-exito">
            <div class="yt-success-container">
                <img src="./assets/img/icons/trofeo.svg" alt="Trofeo" class="yt-success-trophy">
                <h2>¡Nivel Completado!</h2>
                <p id="ytSuccessMessage">¡Has realizado la acción con éxito!</p>
                <button id="ytSuccessBtnContinuar" class="yt-success-btn-continuar">Continuar</button>
            </div>
        </div>

        <!-- ======= MODAL DE CONFIRMACIÓN AL SALIR DEL NIVEL ======= -->
        <div id="ytModalConfirmarSalida" class="modal-confirmar-reinicio">
            <div class="modal-confirmar-card">
                <img src="./assets/img/icons/advertencia.svg" alt="" style="width: 48px; height: 48px; margin-bottom: 8px;">
                <h2>¿Seguro que quieres salir?</h2>
                <p>Si sales ahora, perderás el progreso de este nivel y tendrás que empezar de nuevo.</p>
                <div class="modal-confirmar-acciones">
                    <button id="ytBtnCancelarSalida" class="btn-modal-cancelar">Cancelar</button>
                    <button id="ytBtnConfirmarSalida" class="btn-modal-peligro">Sí, salir</button>
                </div>
            </div>
        </div>
    `;
}

// ---------------------------------------------------------------------
// GUION DE PASOS POR NIVEL
// Cada paso: { texto, objetivo, requierePlayer }
// "objetivo" es el selector del elemento que Nico resalta en pantalla.
// ---------------------------------------------------------------------
const PASOS = {
    "buscar-video": {
        1: {
            texto: "Toca la lupa que está arriba a la derecha, al lado del nombre de YouTube, para buscar un video.",
            objetivo: "#ytBuscarBtn"
        },
        2: {
            texto: "Escribe lo que quieres ver en el cuadro blanco de arriba, o toca una de las tres sugerencias que aparecen debajo.",
            objetivo: "#ytSearchInput, .yt-search-chip"
        },
        3: {
            texto: "Muy bien. Ahora toca el botón azul redondo de la lupa, a la derecha del cuadro, para buscar.",
            objetivo: "#ytSearchGoBtn"
        },
        4: {
            texto: "Estos son los resultados. Toca el primer video de la lista, el de más arriba, para verlo.",
            objetivo: "#ytSearchResults .yt-video-card:first-child"
        },
        5: {
            texto: "Toca el botón redondo grande que está en el centro del video para empezar a verlo.",
            objetivo: "#ytBigPlayBtn",
            requierePlayer: true
        },
        6: {
            texto: "El video ya está andando. Toca otra vez ese mismo botón del centro para pausarlo.",
            objetivo: "#ytBigPlayBtn",
            requierePlayer: true
        },
        7: {
            texto: "El video está detenido. Toca de nuevo el botón del centro para seguir viéndolo.",
            objetivo: "#ytBigPlayBtn",
            requierePlayer: true
        },
        8: {
            texto: "El volumen no se sube desde la pantalla: se sube con los botones del borde de tu teléfono. Mira el dibujo y pruébalos ahora.",
            objetivo: "#ytVolumenListo",
            requierePlayer: true
        },
        9: {
            texto: "¡Eso es! Esos botones suben y bajan el volumen de todo lo que suena en el teléfono, no solo de este video.",
            objetivo: null,
            requierePlayer: true
        }
    },

    "reaccionar-suscribir": {
        1: {
            texto: "Toca el primer video de la lista, el de más arriba, para abrirlo.",
            objetivo: "#ytFeedList .yt-video-card:first-child"
        },
        2: {
            texto: "¿Te gustó el video? Toca el pulgar hacia arriba que está debajo del video, junto al número de me gusta.",
            objetivo: "#ytLikeBtn",
            requierePlayer: true
        },
        3: {
            texto: "Ahora toca el botón negro que dice Suscribirse, a la derecha del nombre del canal.",
            objetivo: "#ytSubscribeBtn",
            requierePlayer: true
        },
        4: {
            texto: "Toca la campanita que apareció al lado, para que te avisen cuando suban un video nuevo.",
            objetivo: "#ytBellBtn",
            requierePlayer: true
        }
    },

    "comentar-video": {
        1: {
            texto: "Toca el primer video de la lista para abrirlo.",
            objetivo: "#ytFeedList .yt-video-card:first-child"
        },
        2: {
            texto: "Baja un poco y toca la caja gris que dice Comentarios, debajo de los botones.",
            objetivo: "#ytCommentsPreviewBox",
            requierePlayer: true
        },
        3: {
            texto: "Aquí están los comentarios de otras personas. Dale Me gusta al primero con el pulgar hacia arriba.",
            objetivo: "#ytCommentsList .yt-comment-item:first-child .yt-comment-like-btn",
            requierePlayer: true
        },
        4: {
            texto: "Si un comentario no te gusta, puedes tocar el pulgar hacia abajo. Pruébalo en ese mismo comentario.",
            objetivo: "#ytCommentsList .yt-comment-item:first-child .yt-comment-dislike-btn",
            requierePlayer: true
        },
        5: {
            texto: "Toca el cuadro de la parte de abajo que dice Añade un comentario y escribe lo que quieras decir.",
            objetivo: "#ytCommentInput",
            requierePlayer: true
        },
        6: {
            texto: "Ya lo escribiste. Toca la flecha azul de la derecha, al lado del cuadro, para enviarlo.",
            objetivo: "#ytCommentSendBtn",
            requierePlayer: true
        },
        7: {
            texto: "Espera un momento, el canal está leyendo tu comentario.",
            objetivo: null,
            requierePlayer: true
        },
        8: {
            texto: "¿Te arrepentiste de lo que escribiste? Toca los tres puntitos de tu comentario.",
            objetivo: ".yt-comment-item-mio .yt-comment-menu-btn",
            requierePlayer: true
        },
        9: {
            texto: "Toca Eliminar para borrar tu comentario.",
            objetivo: "#ytCommentMenuEliminar",
            requierePlayer: true
        }
    },

    "compartir-video": {
        1: {
            texto: "Toca el primer video de la lista para abrirlo.",
            objetivo: "#ytFeedList .yt-video-card:first-child"
        },
        2: {
            texto: "¿Le quieres mandar este video a alguien? Toca el botón Compartir.",
            objetivo: "#ytShareBtn",
            requierePlayer: true
        },
        3: {
            texto: "Elige por dónde se lo vas a mandar. Toca WhatsApp.",
            objetivo: "#ytShareAppWhatsapp",
            requierePlayer: true
        },
        4: {
            texto: "Ahora toca a la persona a la que se lo quieres enviar.",
            objetivo: "#ytShareContactos .yt-share-contacto:first-child",
            requierePlayer: true
        }
    },

    "guardar-video": {
        1: {
            texto: "Toca el primer video de la lista para abrirlo.",
            objetivo: "#ytFeedList .yt-video-card:first-child"
        },
        2: {
            texto: "Toca el botón Guardar, el del marcador, que está debajo del video a la derecha.",
            objetivo: "#ytSaveBtn",
            requierePlayer: true
        },
        3: {
            texto: "Guardado. Ahora toca Volver al inicio, el botón gris que está justo debajo del video.",
            objetivo: "#ytPlayerVolverBtn",
            requierePlayer: true
        },
        4: {
            texto: "Abajo del todo, en la barra de la aplicación, toca la última pestaña: la que dice Tú.",
            objetivo: "#ytNavTu"
        },
        5: {
            texto: "Toca 'Ver más tarde', la primera opción de la lista, para encontrar el video que guardaste.",
            objetivo: "#ytLibVerMasTarde"
        },
        6: {
            texto: "¡Ahí está tu video guardado! Tócalo para abrirlo y verlo cuando quieras.",
            objetivo: "#ytLibSavedList .yt-video-card:first-child"
        },
        7: {
            texto: "Y ya está andando. Así puedes guardar los videos que te gusten y verlos con calma más tarde.",
            objetivo: null,
            requierePlayer: true
        }
    }
};

// ---------------------------------------------------------------------
// BARRA DE INSTRUCCIONES + GUÍA VISUAL
// ---------------------------------------------------------------------
/**
 * @param {boolean} autoSpeak  Si Nico debe leer la instrucción.
 * @param {Function|null} alTerminarVoz  Acción que se ejecuta al terminar la
 *        frase. Los avances automáticos la usan para no cortarle la voz.
 */
function actualizarBarraInstrucciones(autoSpeak = true, alTerminarVoz = null) {
    const textEl = $("#ytInstructionsText");
    if (!textEl) return;

    const pasos = PASOS[nivelActual];
    const paso = pasos ? pasos[subPaso] : null;

    let texto;
    let objetivo;

    if (!paso) {
        texto = "Practica libremente en el simulador de YouTube.";
        objetivo = null;
    } else if (paso.requierePlayer && !enVista("ytViewPlayer")) {
        // El usuario salió del video antes de terminar el paso: lo guiamos de vuelta
        // al sitio donde estaba ese video (resultados de búsqueda o pantalla de inicio).
        const resultados = $("#ytSearchResults");
        const hayResultados = enVista("ytViewBuscar") && resultados && resultados.children.length > 0;

        texto = "Vuelve a abrir el video: toca el primero de la lista.";
        objetivo = hayResultados
            ? "#ytSearchResults .yt-video-card:first-child"
            : "#ytFeedList .yt-video-card:first-child";
    } else {
        texto = paso.texto;
        objetivo = paso.objetivo;
    }

    textEl.textContent = texto;

    if (autoSpeak && texto !== ultimaInstruccionHablada) {
        ultimaInstruccionHablada = texto;

        // Se guarda el valor antes de vaciar la variable: si no, el callback
        // capturaría la variable ya puesta a null y fallaría al dispararse.
        const accionFinal = alTerminarVoz;
        alTerminarVoz = null;

        speak(limpiarEmojis(texto), accionFinal
            ? () => setTimeout(accionFinal, PAUSA_TRAS_VOZ)
            : undefined);
    }

    if (objetivo) {
        resaltarElemento(objetivo);
    } else {
        limpiarResaltados();
    }

    // No llegó a hablar: se espera igualmente para dar tiempo a leer
    if (alTerminarVoz) setTimeout(alTerminarVoz, ESPERA_SIN_VOZ);
}

/**
 * Avanza al sub-paso indicado y actualiza la guía de Nico.
 */
function irAPaso(numeroPaso, alTerminarVoz = null) {
    subPaso = numeroPaso;
    actualizarBarraInstrucciones(true, alTerminarVoz);
}

/**
 * Comprueba si estamos en un nivel y sub-paso concretos.
 */
function esPaso(nivel, numeroPaso) {
    return nivelActual === nivel && subPaso === numeroPaso;
}

// ---------------------------------------------------------------------
// RENDERIZADO
// ---------------------------------------------------------------------
function tarjetaVideoHTML(video) {
    return `
        <div class="yt-video-card" data-video-id="${video.id}">
            <div class="yt-video-thumbnail-container" style="background:${video.gradiente};">
                <span class="yt-video-thumb-emoji">${video.emoji}</span>
                ${video.miniatura
                    ? `<img src="${video.miniatura}" class="yt-video-thumb-img" alt="" onerror="this.style.display='none'">`
                    : ""}
                <span class="yt-video-duration">${formatearTiempo(video.duracionSeg)}</span>
            </div>
            <div class="yt-video-details">
                <div class="yt-channel-avatar" style="background:${video.avatarBg};">${video.avatarLetter}</div>
                <div class="yt-video-info">
                    <h3 class="yt-video-title">${video.titulo}</h3>
                    <p class="yt-video-meta">${video.canal} · ${video.vistas} · ${video.tiempo}</p>
                </div>
            </div>
        </div>
    `;
}

function renderizarFeed() {
    const feed = $("#ytFeedList");
    if (feed) feed.innerHTML = VIDEOS_DATA.map(tarjetaVideoHTML).join("");
}

function buscarVideos(termino) {
    const t = termino.toLowerCase().trim();
    if (!t) return VIDEOS_DATA;

    const palabras = t.split(/\s+/).filter(p => p.length > 2);
    const encontrados = VIDEOS_DATA.filter(v => {
        const texto = `${v.titulo} ${v.canal} ${v.etiquetas.join(" ")}`.toLowerCase();
        return palabras.some(p => texto.includes(p));
    });

    // Nunca dejamos la pantalla vacía: el objetivo del nivel es aprender a buscar
    return encontrados.length > 0 ? encontrados : VIDEOS_DATA;
}

function renderizarResultados(termino) {
    const cont = $("#ytSearchResults");
    if (!cont) return;
    cont.innerHTML = buscarVideos(termino).map(tarjetaVideoHTML).join("");
}

function renderizarComentarios() {
    const list = $("#ytCommentsList");
    if (!list) return;

    list.innerHTML = comentarios.map(c => {
        const corazon = c.corazonCanal ? `<span class="yt-comment-heart">❤️</span>` : "";
        const claseMio = c.esMio ? " yt-comment-item-mio" : "";

        // Los tres puntitos solo aparecen en tus propios comentarios,
        // porque solo los tuyos puedes borrar.
        const menu = c.esMio
            ? `<button class="yt-comment-menu-btn" data-id="${c.id}" aria-label="Opciones de tu comentario">
                   <svg viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
               </button>`
            : "";

        return `
            <div class="yt-comment-item${claseMio}" data-id="${c.id}">
                <div class="yt-comment-avatar" style="background:${c.avatarBg};">${c.avatarLetter}</div>
                <div class="yt-comment-content">
                    <div class="yt-comment-header">
                        <span class="yt-comment-author">${c.autor}</span>
                        <span class="yt-comment-time">${c.tiempo}</span>
                    </div>
                    <p class="yt-comment-text">${c.texto}</p>
                    <div class="yt-comment-actions">
                        <button class="yt-comment-action-btn yt-comment-like-btn${c.liked ? " activo" : ""}" data-id="${c.id}" aria-label="Me gusta este comentario">
                            <svg viewBox="0 0 24 24"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>
                            <span>${c.likes}</span>
                        </button>
                        <button class="yt-comment-action-btn yt-comment-dislike-btn${c.disliked ? " activo" : ""}" data-id="${c.id}" aria-label="No me gusta este comentario">
                            <svg viewBox="0 0 24 24"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/></svg>
                        </button>
                        ${corazon}
                    </div>
                </div>
                ${menu}
            </div>
        `;
    }).join("");

    const count = $("#ytCommentsCount");
    if (count) count.textContent = comentarios.length;

    const previewText = $("#ytCommentsPreviewText");
    const previewAvatar = $("#ytCommentsPreviewAvatar");
    if (previewText && comentarios[0]) previewText.textContent = comentarios[0].texto;
    if (previewAvatar && comentarios[0]) {
        previewAvatar.textContent = comentarios[0].avatarLetter;
        previewAvatar.style.background = comentarios[0].avatarBg;
    }
}

function renderizarBiblioteca() {
    const contador = $("#ytLibVerMasTardeCount");
    if (contador) {
        const n = videosGuardados.length;
        contador.textContent = n === 1 ? "1 video guardado" : `${n} videos guardados`;
    }

    const lista = $("#ytLibSavedList");
    if (lista) {
        const guardados = VIDEOS_DATA.filter(v => videosGuardados.includes(v.id));
        lista.innerHTML = guardados.length > 0
            ? guardados.map(tarjetaVideoHTML).join("")
            : `<p class="yt-lib-vacio">Todavía no has guardado ningún video.</p>`;
    }
}

// ---------------------------------------------------------------------
// NAVEGACIÓN ENTRE VISTAS
// ---------------------------------------------------------------------
function cambiarVista(viewId) {
    document.querySelectorAll("#pantallaYoutubeSimulador .yt-view").forEach(v => v.classList.remove("activa"));
    const view = $(`#${viewId}`);
    if (view) view.classList.add("activa");
}

function marcarTab(idTab) {
    document.querySelectorAll("#pantallaYoutubeSimulador .yt-nav-tab").forEach(t => t.classList.remove("active"));
    const tab = $(`#${idTab}`);
    if (tab) tab.classList.add("active");
}

function mostrarToast(texto) {
    const toast = $("#ytToast");
    if (!toast) return;

    toast.textContent = texto;
    toast.classList.add("visible");

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove("visible"), 2600);
}

// ---------------------------------------------------------------------
// REPRODUCTOR SIMULADO
// ---------------------------------------------------------------------
function abrirVideo(videoId) {
    const video = VIDEOS_DATA.find(v => v.id === videoId);
    if (!video) return;

    videoActual = video;
    yaLiked = false;
    yaSubscrito = false;
    campanaActiva = false;

    detenerReproduccion();
    progresoSegundos = 0;

    $("#ytPlayerEmoji").textContent = video.emoji;
    $("#ytPlayerScreen").style.background = video.gradiente;

    // Cargar el archivo de video. Mientras no termine de cargar (o si no
    // existe) se ve el fondo de color con el emoji.
    desactivarVideoReal();
    const elVideo = $("#ytPlayerVideo");
    if (elVideo) {
        elVideo.pause();

        // La portada evita el rectángulo negro: un <video> no pinta ningún
        // fotograma hasta que se reproduce.
        if (video.miniatura) {
            elVideo.poster = video.miniatura;
        } else {
            elVideo.removeAttribute("poster");
        }

        if (video.archivo) {
            mostrarCargando(true);
            elVideo.src = video.archivo;
            elVideo.volume = 1;      // el volumen lo manda el teléfono
            elVideo.muted = false;
            elVideo.load();

            // Mostramos el elemento desde ya: la portada hace de imagen
            // mientras el video no se reproduce. Solo se oculta si da error.
            const pantalla = $("#ytPlayerScreen");
            if (pantalla) pantalla.classList.add("con-video");
        } else {
            elVideo.removeAttribute("src");
            elVideo.load();
        }
    }
    $("#ytPlayerTitleText").textContent = video.titulo;
    $("#ytPlayerMetaText").textContent = `${video.vistas} · ${video.tiempo}`;
    $("#ytPlayerChannelName").textContent = video.canal;
    $("#ytPlayerChannelSubs").textContent = video.suscriptores;

    const avatar = $("#ytPlayerChannelAvatar");
    avatar.textContent = video.avatarLetter;
    avatar.style.background = video.avatarBg;

    // Me gusta
    const likeIcon = $("#ytLikeIcon");
    const likeLabel = $("#ytLikeLabel");
    if (likeIcon) likeIcon.style.fill = "#0f0f0f";
    if (likeLabel) likeLabel.textContent = formatearNumero(video.likes);
    $("#ytLikeBtn").classList.remove("activo");

    // Suscripción
    const subBtn = $("#ytSubscribeBtn");
    subBtn.textContent = "Suscribirse";
    subBtn.classList.remove("subscribed");
    const bell = $("#ytBellBtn");
    bell.style.display = "none";
    bell.classList.remove("activa");

    // Guardar
    actualizarBotonGuardar();

    // Los comentarios de este video en concreto
    comentarios = JSON.parse(JSON.stringify(COMENTARIOS_POR_VIDEO[video.id] || []));

    actualizarProgresoUI();
    ajustarVolumenVideo();
    renderizarComentarios();

    cambiarVista("ytViewPlayer");
    marcarTab("ytNavPrincipal");
}

function actualizarBotonGuardar() {
    const guardado = videoActual && videosGuardados.includes(videoActual.id);
    const btn = $("#ytSaveBtn");
    const label = $("#ytSaveLabel");
    const icon = $("#ytSaveIcon");
    if (!btn) return;

    btn.classList.toggle("activo", !!guardado);
    if (label) label.textContent = guardado ? "Guardado" : "Guardar";
    if (icon) icon.style.fill = guardado ? "#065fd4" : "#0f0f0f";
}

/**
 * Duración a mostrar: la real del archivo si se cargó, o la del catálogo
 * cuando estamos en modo animación (sin archivo de video).
 */
function duracionActual() {
    const el = $("#ytPlayerVideo");
    if (usandoVideoReal && el && isFinite(el.duration) && el.duration > 0) {
        return el.duration;
    }
    return videoActual ? videoActual.duracionSeg : 0;
}

/**
 * Deja de usar el archivo de video y vuelve al fondo de color con emoji.
 * Se llama si el archivo falta o si el navegador bloquea la reproducción.
 */
function desactivarVideoReal() {
    usandoVideoReal = false;
    const pantalla = $("#ytPlayerScreen");
    if (pantalla) pantalla.classList.remove("con-video");
}

function actualizarProgresoUI() {
    if (!videoActual) return;

    const fill = $("#ytProgressFill");
    const label = $("#ytTimeLabel");
    const total = duracionActual();
    const porcentaje = total > 0 ? Math.min(100, (progresoSegundos / total) * 100) : 0;

    if (fill) fill.style.width = `${porcentaje}%`;
    if (label) label.textContent = `${formatearTiempo(progresoSegundos)} / ${formatearTiempo(total)}`;
}

function actualizarIconosReproduccion() {
    const rutaPlay = "M8 5v14l11-7z";
    const rutaPausa = "M6 19h4V5H6v14zm8-14v14h4V5h-4z";
    const ruta = reproduciendo ? rutaPausa : rutaPlay;

    const bigIcon = $("#ytBigPlayIcon");
    const smallIcon = $("#ytPlayPauseIcon");
    if (bigIcon) bigIcon.innerHTML = `<path d="${ruta}"/>`;
    if (smallIcon) smallIcon.innerHTML = `<path d="${ruta}"/>`;

    const bigBtn = $("#ytBigPlayBtn");
    if (bigBtn) {
        bigBtn.setAttribute("aria-label", reproduciendo ? "Pausar video" : "Reproducir video");
    }

    const pantalla = $("#ytPlayerScreen");
    if (pantalla) pantalla.classList.toggle("reproduciendo", reproduciendo);
}

function iniciarReproduccion() {
    if (!videoActual || reproduciendo) return;

    reproduciendo = true;
    actualizarIconosReproduccion();

    const el = $("#ytPlayerVideo");

    // Intentamos reproducir siempre que haya archivo, sin esperar a que
    // termine de cargar: si el usuario toca play enseguida, el video debe
    // arrancar igual.
    if (el && videoActual.archivo && !el.error) {
        const promesa = el.play();

        if (promesa && typeof promesa.then === "function") {
            promesa
                .then(() => {
                    usandoVideoReal = true;
                })
                .catch(() => {
                    // El navegador no dejó reproducir el archivo: seguimos con
                    // la animación para que el nivel se pueda terminar igual.
                    desactivarVideoReal();
                    if (reproduciendo) arrancarTemporizadorSimulado();
                });
        } else {
            usandoVideoReal = true;
        }
        return;
    }

    arrancarTemporizadorSimulado();
}

/**
 * Avance de la barra cuando no hay archivo de video que reproducir.
 */
function arrancarTemporizadorSimulado() {
    if (progresoInterval) return;

    progresoInterval = setInterval(() => {
        // Si el usuario salió del simulador (por ejemplo con el botón atrás del
        // navegador), detenemos el avance para no dejar el timer corriendo.
        const sim = $("#pantallaYoutubeSimulador");
        if (!sim || !sim.classList.contains("activa")) {
            detenerReproduccion();
            return;
        }

        progresoSegundos += 1;
        if (progresoSegundos >= duracionActual()) {
            progresoSegundos = 0;
        }
        actualizarProgresoUI();
    }, 400);
}

function detenerReproduccion() {
    reproduciendo = false;

    const el = $("#ytPlayerVideo");
    if (el && !el.paused) el.pause();

    if (progresoInterval) {
        clearInterval(progresoInterval);
        progresoInterval = null;
    }
    actualizarIconosReproduccion();
}

function alternarReproduccion() {
    if (reproduciendo) {
        detenerReproduccion();
        if (esPaso("buscar-video", 6)) {
            irAPaso(7); // acaba de pausar
        }
    } else {
        iniciarReproduccion();
        if (esPaso("buscar-video", 5)) {
            irAPaso(6); // primera reproducción
        } else if (esPaso("buscar-video", 7)) {
            irAPaso(8); // reanudó tras la pausa
            mostrarTarjetaVolumen(true);
        }
    }
}

/**
 * El volumen real lo maneja el teléfono con sus botones físicos, así que el
 * video se deja al máximo: lo que el usuario suba o baje con el teléfono es
 * lo que se oye. Antes había unos botones en pantalla que no existen en la
 * aplicación real de YouTube y enseñaban algo que no es cierto.
 */
function ajustarVolumenVideo() {
    const el = $("#ytPlayerVideo");
    if (el) {
        el.volume = 1;
        el.muted = false;
    }
}

/**
 * Rueda de carga sobre el reproductor. Antes se quedaba el emoji del catálogo,
 * que parecía parte del video en vez de un aviso de que estaba cargando.
 */
function mostrarCargando(visible) {
    const el = $("#ytCargando");
    if (el) el.classList.toggle("activa", !!visible);
}

function mostrarTarjetaVolumen(visible) {
    const card = $("#ytVolumenCard");
    if (!card) return;
    card.classList.toggle("activa", !!visible);
}

// ---------------------------------------------------------------------
// COMENTARIOS
// ---------------------------------------------------------------------
function abrirComentarios() {
    renderizarComentarios();
    const drawer = $("#ytCommentsDrawer");
    if (drawer) drawer.classList.add("activa");

    if (nivelActual === "comentar-video" && subPaso <= 3) {
        // Si ya había escrito su comentario y solo cerró el cajón, lo llevamos
        // directo al paso de borrarlo en vez de hacerle repetir todo.
        irAPaso(comentarios.some(c => c.esMio) ? 8 : 3);
    }
}

function cerrarComentarios() {
    const drawer = $("#ytCommentsDrawer");
    if (drawer) drawer.classList.remove("activa");
    cerrarMenuComentario();

    // Si estaba a mitad del nivel y cerró el cajón, lo devolvemos al paso de abrirlo
    if (nivelActual === "comentar-video" && subPaso >= 3 && subPaso <= 9) {
        irAPaso(2);
    }
}

/**
 * Marca o desmarca "me gusta" / "no me gusta" en un comentario ajeno.
 * Igual que en YouTube, las dos reacciones no pueden estar activas a la vez.
 */
function reaccionarComentario(idComentario, tipo) {
    const comentario = comentarios.find(c => String(c.id) === String(idComentario));
    if (!comentario) return;

    if (tipo === "like") {
        if (comentario.liked) {
            comentario.liked = false;
            comentario.likes = Math.max(0, comentario.likes - 1);
        } else {
            comentario.liked = true;
            comentario.likes += 1;
            if (comentario.disliked) comentario.disliked = false;
        }
    } else {
        if (comentario.disliked) {
            comentario.disliked = false;
        } else {
            comentario.disliked = true;
            if (comentario.liked) {
                comentario.liked = false;
                comentario.likes = Math.max(0, comentario.likes - 1);
            }
        }
    }

    renderizarComentarios();

    if (tipo === "like" && comentario.liked && esPaso("comentar-video", 3)) {
        irAPaso(4);
    } else if (tipo === "dislike" && comentario.disliked && esPaso("comentar-video", 4)) {
        irAPaso(5);
    } else {
        // Volvemos a pintar el resaltado, que se perdió al re-renderizar la lista
        actualizarBarraInstrucciones(false);
    }
}

function abrirMenuComentario(idComentario) {
    const menu = $("#ytCommentMenu");
    if (!menu) return;

    menu.dataset.comentarioId = idComentario;
    menu.classList.add("activa");

    if (esPaso("comentar-video", 8)) {
        irAPaso(9);
    }
}

function cerrarMenuComentario() {
    const menu = $("#ytCommentMenu");
    if (menu) menu.classList.remove("activa");
}

function eliminarComentario() {
    const menu = $("#ytCommentMenu");
    if (!menu) return;

    const id = menu.dataset.comentarioId;
    comentarios = comentarios.filter(c => String(c.id) !== String(id));

    cerrarMenuComentario();
    renderizarComentarios();
    mostrarToast("Comentario eliminado");

    if (esPaso("comentar-video", 9)) {
        completarNivelActual("¡Completo! Reaccionaste a un comentario, escribiste el tuyo y aprendiste a borrarlo.");
    } else {
        actualizarBarraInstrucciones(false);
    }
}

// ---------------------------------------------------------------------
// COMPARTIR UN VIDEO
// ---------------------------------------------------------------------
function abrirHojaCompartir() {
    const hoja = $("#ytShareSheet");
    if (!hoja) return;

    // Siempre empieza por elegir la aplicación
    const apps = $("#ytShareApps");
    const contactos = $("#ytShareContactos");
    const titulo = $("#ytShareTitulo");
    if (apps) apps.style.display = "flex";
    if (contactos) contactos.style.display = "none";
    if (titulo) titulo.textContent = "Compartir";

    hoja.classList.add("activa");

    if (esPaso("compartir-video", 2)) {
        irAPaso(3);
    }
}

function cerrarHojaCompartir() {
    const hoja = $("#ytShareSheet");
    if (hoja) hoja.classList.remove("activa");

    // Si abandonó a mitad, lo devolvemos al paso de abrir la hoja
    if (nivelActual === "compartir-video" && (subPaso === 3 || subPaso === 4)) {
        irAPaso(2);
    }
}

function mostrarContactosCompartir(nombreApp) {
    const apps = $("#ytShareApps");
    const contactos = $("#ytShareContactos");
    const titulo = $("#ytShareTitulo");

    appCompartir = nombreApp;

    if (apps) apps.style.display = "none";
    if (titulo) titulo.textContent = `Enviar por ${nombreApp} a...`;

    if (contactos) {
        contactos.innerHTML = CONTACTOS_COMPARTIR.map(c => `
            <button class="yt-share-contacto" data-contacto="${c.id}">
                <span class="yt-share-contacto-avatar" style="background:${c.color};">${c.inicial}</span>
                <span class="yt-share-contacto-nombre">${c.nombre}</span>
                <span class="yt-share-contacto-enviar">Enviar</span>
            </button>
        `).join("");
        contactos.style.display = "block";
    }

    if (esPaso("compartir-video", 3)) {
        irAPaso(4);
    }
}

function enviarACompartir(idContacto) {
    const contacto = CONTACTOS_COMPARTIR.find(c => c.id === idContacto);
    const nombre = contacto ? contacto.nombre : "tu contacto";

    // Cerramos sin pasar por cerrarHojaCompartir(): aquí el envío sí se completó
    const hoja = $("#ytShareSheet");
    if (hoja) hoja.classList.remove("activa");

    mostrarToast(`Video enviado a ${nombre}`);

    if (esPaso("compartir-video", 4)) {
        completarNivelActual(`¡Muy bien! Le enviaste el video a ${nombre} por ${appCompartir}.`);
    }
}

function cerrarComentariosSilencioso() {
    const drawer = $("#ytCommentsDrawer");
    if (drawer) drawer.classList.remove("activa");
}

function enviarComentario() {
    const input = $("#ytCommentInput");
    if (!input) return;

    const texto = input.value.trim();
    if (!texto) return;

    comentarios.unshift({
        id: Date.now(),
        autor: "Tú",
        avatarLetter: "A",
        avatarBg: "#673ab7",
        texto: texto,
        tiempo: "Ahora",
        likes: 0,
        liked: false,
        disliked: false,
        corazonCanal: false,
        esMio: true
    });

    input.value = "";
    renderizarComentarios();

    if (esPaso("comentar-video", 5) || esPaso("comentar-video", 6)) {
        // El canal reacciona cuando Nico termina de decir que espere
        irAPaso(7, () => {
            if (nivelActual !== "comentar-video" || subPaso !== 7) return;

            const mio = comentarios.find(c => c.esMio);
            if (mio) {
                mio.corazonCanal = true;
                mio.likes = 3;
                renderizarComentarios();
            }
            mostrarToast("Al canal le gustó tu comentario ❤️");
            irAPaso(8);
        });
    }
}

// ---------------------------------------------------------------------
// BÚSQUEDA
// ---------------------------------------------------------------------
function ejecutarBusqueda() {
    const termino = textoBusqueda();
    if (termino.length < 3) {
        mostrarToast("Escribe al menos una palabra para buscar.");
        return;
    }

    const chips = $("#ytSearchChips");
    if (chips) chips.style.display = "none";
    renderizarResultados(termino);

    if (esPaso("buscar-video", 3)) {
        irAPaso(4);
    }
}

// ---------------------------------------------------------------------
// LISTENERS
// ---------------------------------------------------------------------
function inicializarListeners() {
    // Nico repite la instrucción
    const nicoBtn = $("#ytNicoBtn");
    if (nicoBtn) {
        nicoBtn.onclick = (e) => {
            e.stopPropagation();
            const textEl = $("#ytInstructionsText");
            if (textEl) speak(limpiarEmojis(textEl.textContent));
        };
    }

    // Salir del simulador
    // Salir del simulador: pide confirmación antes de perder el progreso del nivel
    const btnSalir = $("#ytSalirBtn");
    const modalConfirmarSalida = $("#ytModalConfirmarSalida");
    if (btnSalir) {
        btnSalir.onclick = () => {
            if (modalConfirmarSalida) {
                modalConfirmarSalida.classList.add("activa");
            } else {
                salirDelSimulador();
            }
        };
    }

    const btnCancelarSalida = $("#ytBtnCancelarSalida");
    if (btnCancelarSalida) {
        btnCancelarSalida.onclick = () => modalConfirmarSalida?.classList.remove("activa");
    }

    const btnConfirmarSalida = $("#ytBtnConfirmarSalida");
    if (btnConfirmarSalida) btnConfirmarSalida.onclick = salirDelSimulador;

    // Logo -> inicio
    const logoHome = $("#ytLogoHome");
    if (logoHome) {
        logoHome.onclick = () => {
            detenerReproduccion();
            cambiarVista("ytViewFeed");
            marcarTab("ytNavPrincipal");
            actualizarBarraInstrucciones(false);
        };
    }

    // ---- BUSCADOR ----
    const buscarBtn = $("#ytBuscarBtn");
    if (buscarBtn) {
        buscarBtn.onclick = () => {
            cambiarVista("ytViewBuscar");

            const input = $("#ytSearchInput");
            const chips = $("#ytSearchChips");
            const results = $("#ytSearchResults");
            if (input) input.value = "";
            if (chips) chips.style.display = "block";
            if (results) results.innerHTML = "";

            if (esPaso("buscar-video", 1)) {
                irAPaso(2);
            } else {
                actualizarBarraInstrucciones(false);
            }
        };
    }

    const searchVolverBtn = $("#ytSearchVolverBtn");
    if (searchVolverBtn) {
        searchVolverBtn.onclick = () => {
            cambiarVista("ytViewFeed");

            // Solo reiniciamos si todavía estaba buscando; si ya encontró el
            // video no le hacemos repetir la búsqueda.
            if (nivelActual === "buscar-video" && subPaso <= 4) {
                irAPaso(1);
            } else {
                actualizarBarraInstrucciones(false);
            }
        };
    }

    const searchInput = $("#ytSearchInput");
    if (searchInput) {
        searchInput.oninput = () => {
            if (esPaso("buscar-video", 2) && textoBusqueda().length >= 3) {
                irAPaso(3);
            } else if (esPaso("buscar-video", 3) && textoBusqueda().length < 3) {
                irAPaso(2);
            }
        };
        searchInput.onkeypress = (e) => {
            if (e.key === "Enter") ejecutarBusqueda();
        };
    }

    const searchGoBtn = $("#ytSearchGoBtn");
    if (searchGoBtn) searchGoBtn.onclick = ejecutarBusqueda;

    const chipsCont = $("#ytSearchChips");
    if (chipsCont) {
        chipsCont.addEventListener("click", (e) => {
            const chip = e.target.closest(".yt-search-chip");
            if (!chip) return;

            const input = $("#ytSearchInput");
            if (input) input.value = chip.dataset.sugerencia;

            if (esPaso("buscar-video", 2)) irAPaso(3);
        });
    }

    // ---- LISTAS DE VIDEOS (inicio, resultados y guardados) ----
    ["#ytFeedList", "#ytSearchResults", "#ytLibSavedList"].forEach(selector => {
        const cont = $(selector);
        if (!cont) return;

        cont.addEventListener("click", (e) => {
            const card = e.target.closest(".yt-video-card");
            if (!card) return;

            const desdeResultados = selector === "#ytSearchResults";

            // Mientras se practica la búsqueda no dejamos abrir un video desde el
            // inicio: el objetivo es aprender a buscarlo, no toparse con él.
            if (nivelActual === "buscar-video" && selector === "#ytFeedList" && subPaso <= 3) {
                mostrarToast("Primero vamos a practicar la búsqueda.");
                actualizarBarraInstrucciones(true);
                return;
            }

            abrirVideo(parseInt(card.dataset.videoId, 10));

            // Encontró el video buscando: ahora toca aprender a controlarlo
            if (desdeResultados && esPaso("buscar-video", 4)) {
                irAPaso(5);
                return;
            }

            // Final del nivel de guardar: abre el video que había guardado y
            // se le deja verlo un momento antes de dar el nivel por terminado
            if (selector === "#ytLibSavedList" && esPaso("guardar-video", 6)) {
                iniciarReproduccion();
                irAPaso(7, () => {
                    if (!esPaso("guardar-video", 7)) return;
                    completarNivelActual("¡Lo lograste! Guardaste un video, lo volviste a encontrar en Ver más tarde y lo abriste para verlo.");
                });
                return;
            }

            // En el resto de niveles, abrir el video es el paso 1
            if (subPaso === 1 && PASOS[nivelActual] && PASOS[nivelActual][2]) {
                irAPaso(2);
            } else {
                actualizarBarraInstrucciones(false);
            }
        });
    });

    // ---- REPRODUCTOR ----
    const bigPlay = $("#ytBigPlayBtn");
    if (bigPlay) bigPlay.onclick = alternarReproduccion;

    const playPause = $("#ytPlayPauseBtn");
    if (playPause) playPause.onclick = alternarReproduccion;

    // Eventos del elemento <video>. Solo sincronizan lo que se ve: el avance
    // de los pasos del nivel lo maneja el clic del usuario, no el video.
    const elVideo = $("#ytPlayerVideo");
    if (elVideo) {
        elVideo.addEventListener("canplay", () => mostrarCargando(false));
        elVideo.addEventListener("playing", () => mostrarCargando(false));
        elVideo.addEventListener("waiting", () => mostrarCargando(true));

        elVideo.addEventListener("loadedmetadata", () => {
            mostrarCargando(false);
            usandoVideoReal = true;
            const pantalla = $("#ytPlayerScreen");
            if (pantalla) pantalla.classList.add("con-video");

            progresoSegundos = elVideo.currentTime || 0;
            actualizarProgresoUI();
        });

        elVideo.addEventListener("timeupdate", () => {
            if (!usandoVideoReal) return;
            progresoSegundos = elVideo.currentTime;
            actualizarProgresoUI();
        });

        // Falta el archivo o está dañado: seguimos con el fondo de color
        elVideo.addEventListener("error", () => {
            mostrarCargando(false);
            desactivarVideoReal();
            console.warn("No se pudo cargar el video del simulador de YouTube.");
        });

        // Si algo pausa el video por fuera, mantenemos los iconos al día
        elVideo.addEventListener("pause", () => {
            if (reproduciendo && usandoVideoReal) {
                reproduciendo = false;
                actualizarIconosReproduccion();
            }
        });
    }

    // "Ya lo escucho más fuerte": el usuario confirma que encontró los botones
    const volumenListo = $("#ytVolumenListo");
    if (volumenListo) {
        volumenListo.onclick = () => {
            mostrarTarjetaVolumen(false);
    mostrarCargando(false);
            if (!esPaso("buscar-video", 8)) return;

            irAPaso(9, () => {
                if (!esPaso("buscar-video", 9)) return;
                completarNivelActual("¡Muy bien! Buscaste un video, lo pusiste, lo pausaste y aprendiste a subirle el volumen con tu teléfono.");
            });
        };
    }

    const volverBtn = $("#ytPlayerVolverBtn");
    if (volverBtn) {
        volverBtn.onclick = () => {
            detenerReproduccion();
            cerrarComentariosSilencioso();
            cambiarVista("ytViewFeed");
            marcarTab("ytNavPrincipal");

            if (esPaso("guardar-video", 3)) {
                irAPaso(4);
            } else if (nivelActual === "reaccionar-suscribir" && subPaso > 1) {
                // Al reabrir un video se pierden el Me gusta y la suscripción,
                // así que este nivel sí tiene que empezar de nuevo.
                irAPaso(1);
            } else {
                // En el resto de niveles se conserva el avance: la guía le dirá
                // que vuelva a abrir el video donde lo dejó.
                actualizarBarraInstrucciones(true);
            }
        };
    }

    // Me gusta
    const likeBtn = $("#ytLikeBtn");
    if (likeBtn) {
        likeBtn.onclick = () => {
            if (!videoActual) return;

            yaLiked = !yaLiked;
            const icon = $("#ytLikeIcon");
            const label = $("#ytLikeLabel");
            if (icon) icon.style.fill = yaLiked ? "#065fd4" : "#0f0f0f";
            if (label) label.textContent = formatearNumero(videoActual.likes + (yaLiked ? 1 : 0));
            likeBtn.classList.toggle("activo", yaLiked);

            if (yaLiked && esPaso("reaccionar-suscribir", 2)) irAPaso(3);
        };
    }

    // No me gusta y compartir existen en YouTube, pero no forman parte de los niveles
    const dislikeBtn = $("#ytDislikeBtn");
    if (dislikeBtn) {
        dislikeBtn.onclick = () => mostrarToast("Eso sirve para marcar que el video no te gustó.");
    }

    const shareBtn = $("#ytShareBtn");
    if (shareBtn) shareBtn.onclick = abrirHojaCompartir;

    // Suscribirse
    const subBtn = $("#ytSubscribeBtn");
    if (subBtn) {
        subBtn.onclick = () => {
            yaSubscrito = !yaSubscrito;
            const bell = $("#ytBellBtn");

            if (yaSubscrito) {
                subBtn.textContent = "Suscrito";
                subBtn.classList.add("subscribed");
                if (bell) bell.style.display = "inline-flex";
                if (esPaso("reaccionar-suscribir", 3)) irAPaso(4);
            } else {
                subBtn.textContent = "Suscribirse";
                subBtn.classList.remove("subscribed");
                campanaActiva = false;
                if (bell) {
                    bell.style.display = "none";
                    bell.classList.remove("activa");
                }
                if (esPaso("reaccionar-suscribir", 4)) irAPaso(3);
            }
        };
    }

    // Campana de notificaciones
    const bellBtn = $("#ytBellBtn");
    if (bellBtn) {
        bellBtn.onclick = () => {
            campanaActiva = !campanaActiva;
            bellBtn.classList.toggle("activa", campanaActiva);

            if (campanaActiva && esPaso("reaccionar-suscribir", 4)) {
                completarNivelActual("¡Muy bien! Le diste Me gusta al video y ahora sigues el canal.");
            }
        };
    }

    // Guardar video
    const saveBtn = $("#ytSaveBtn");
    if (saveBtn) {
        saveBtn.onclick = () => {
            if (!videoActual) return;

            const yaEstaba = videosGuardados.includes(videoActual.id);
            if (yaEstaba) {
                videosGuardados = videosGuardados.filter(id => id !== videoActual.id);
                mostrarToast("Quitado de Ver más tarde");
            } else {
                videosGuardados.push(videoActual.id);
                mostrarToast("Guardado en Ver más tarde");
            }

            actualizarBotonGuardar();
            renderizarBiblioteca();

            // Guardar más videos no rompe el nivel: solo avanza el primero
            if (!yaEstaba && esPaso("guardar-video", 2)) {
                irAPaso(3);
            } else {
                actualizarBarraInstrucciones(false);
            }
        };
    }

    // ---- COMENTARIOS ----
    const previewBox = $("#ytCommentsPreviewBox");
    if (previewBox) previewBox.onclick = abrirComentarios;

    const closeDrawerBtn = $("#ytDrawerCloseBtn");
    if (closeDrawerBtn) closeDrawerBtn.onclick = cerrarComentarios;

    const sendBtn = $("#ytCommentSendBtn");
    if (sendBtn) sendBtn.onclick = enviarComentario;

    // Me gusta, no me gusta y tres puntitos dentro de la lista de comentarios
    const listaComentarios = $("#ytCommentsList");
    if (listaComentarios) {
        listaComentarios.addEventListener("click", (e) => {
            const like = e.target.closest(".yt-comment-like-btn");
            if (like) {
                reaccionarComentario(like.dataset.id, "like");
                return;
            }

            const dislike = e.target.closest(".yt-comment-dislike-btn");
            if (dislike) {
                reaccionarComentario(dislike.dataset.id, "dislike");
                return;
            }

            const menuBtn = e.target.closest(".yt-comment-menu-btn");
            if (menuBtn) {
                abrirMenuComentario(menuBtn.dataset.id);
            }
        });
    }

    const menuEliminar = $("#ytCommentMenuEliminar");
    if (menuEliminar) menuEliminar.onclick = eliminarComentario;

    const menuCancelar = $("#ytCommentMenuCancelar");
    if (menuCancelar) {
        menuCancelar.onclick = () => {
            cerrarMenuComentario();
            if (esPaso("comentar-video", 9)) {
                irAPaso(8);
            } else {
                actualizarBarraInstrucciones(false);
            }
        };
    }

    // ---- COMPARTIR ----
    const shareClose = $("#ytShareCloseBtn");
    if (shareClose) shareClose.onclick = cerrarHojaCompartir;

    const shareWhatsapp = $("#ytShareAppWhatsapp");
    if (shareWhatsapp) shareWhatsapp.onclick = () => mostrarContactosCompartir("WhatsApp");

    const shareMensajes = $("#ytShareAppMensajes");
    if (shareMensajes) shareMensajes.onclick = () => mostrarContactosCompartir("Mensajes");

    const shareCopiar = $("#ytShareAppCopiar");
    if (shareCopiar) {
        shareCopiar.onclick = () => {
            mostrarToast("Enlace copiado. Ya lo puedes pegar donde quieras.");
        };
    }

    const shareContactos = $("#ytShareContactos");
    if (shareContactos) {
        shareContactos.addEventListener("click", (e) => {
            const contacto = e.target.closest(".yt-share-contacto");
            if (contacto) enviarACompartir(contacto.dataset.contacto);
        });
    }

    const input = $("#ytCommentInput");
    if (input) {
        input.oninput = () => {
            if (esPaso("comentar-video", 5) && textoComentario().length >= 3) {
                irAPaso(6);
            } else if (esPaso("comentar-video", 6) && textoComentario().length < 3) {
                irAPaso(5);
            }
        };
        input.onkeypress = (e) => {
            if (e.key === "Enter") enviarComentario();
        };
    }

    // ---- BIBLIOTECA ("Tú") ----
    const libVerMasTarde = $("#ytLibVerMasTarde");
    if (libVerMasTarde) {
        libVerMasTarde.onclick = () => {
            renderizarBiblioteca();
            const seccion = $("#ytLibSavedSection");
            if (seccion) seccion.style.display = "block";

            // Vale desde cualquier paso: si ya guardó algo, se le lleva al final
            if (nivelActual === "guardar-video" && videosGuardados.length > 0 && subPaso < 6) {
                irAPaso(6);
            } else {
                actualizarBarraInstrucciones(false);
            }
        };
    }

    const libHistorial = $("#ytLibHistorial");
    if (libHistorial) {
        libHistorial.onclick = () => mostrarToast("Aquí aparecen los videos que ya viste.");
    }

    // ---- NAVEGACIÓN INFERIOR ----
    document.querySelectorAll("#pantallaYoutubeSimulador .yt-nav-tab").forEach(tab => {
        tab.addEventListener("click", () => {
            const viewId = tab.dataset.view;

            if (!viewId) {
                mostrarToast("Esa parte no está en esta práctica. Sigue lo que dice Nico.");
                return;
            }

            detenerReproduccion();
            cerrarComentariosSilencioso();
            marcarTab(tab.id);
            cambiarVista(viewId);

            if (viewId === "ytViewBiblioteca") {
                const seccion = $("#ytLibSavedSection");
                if (seccion) seccion.style.display = "none";
                renderizarBiblioteca();

                if (esPaso("guardar-video", 4)) {
                    irAPaso(5);
                    return;
                }
            }

            actualizarBarraInstrucciones(false);
        });
    });

    // Modal de éxito
    const btnContinuar = $("#ytSuccessBtnContinuar");
    if (btnContinuar) btnContinuar.onclick = salirDelSimulador;
}

// ---------------------------------------------------------------------
// FIN DE NIVEL Y SALIDA
// ---------------------------------------------------------------------
function completarNivelActual(mensajeExito) {
    detenerReproduccion();
    limpiarResaltados();
    cerrarComentariosSilencioso();
    cerrarMenuComentario();

    const hojaCompartir = $("#ytShareSheet");
    if (hojaCompartir) hojaCompartir.classList.remove("activa");

    completarNivel("YouTube", nivelActual);

    const msgEl = $("#ytSuccessMessage");
    if (msgEl) msgEl.textContent = mensajeExito;

    const modal = $("#ytModalExito");
    if (modal) modal.classList.add("activa");

    // Prioritario: corta cualquier frase pendiente para que la felicitación
    // se escuche completa y no la pise la instrucción anterior
    // Sin prefijo fijo: cada mensaje ya empieza con su propia felicitación
    speakPrioritario(`${limpiarEmojis(mensajeExito)} Presiona el botón rojo de continuar para regresar a la lista de niveles.`);
}

function limpiarTodo() {
    detenerReproduccion();

    if (respuestaCanalTimeout) {
        clearTimeout(respuestaCanalTimeout);
        respuestaCanalTimeout = null;
    }
    if (toastTimeout) {
        clearTimeout(toastTimeout);
        toastTimeout = null;
    }

    const toast = $("#ytToast");
    if (toast) toast.classList.remove("visible");

    cerrarComentariosSilencioso();
    cerrarMenuComentario();

    const hoja = $("#ytShareSheet");
    if (hoja) hoja.classList.remove("activa");

    limpiarResaltados();
}

function salirDelSimulador() {
    limpiarTodo();
    stopSpeech();

    const modal = $("#ytModalExito");
    if (modal) modal.classList.remove("activa");

    const modalSalida = $("#ytModalConfirmarSalida");
    if (modalSalida) modalSalida.classList.remove("activa");

    const simulador = $("#pantallaYoutubeSimulador");
    if (simulador) simulador.classList.remove("activa");

    location.hash = "/modulo/YouTube";
}

// ---------------------------------------------------------------------
// PUNTO DE ENTRADA
// ---------------------------------------------------------------------
export function iniciarSimulador(idNivel) {
    nivelActual = idNivel;
    subPaso = 1;
    ultimaInstruccionHablada = "";

    asegurarTemplateHTML();
    limpiarTodo();

    // Estado limpio en cada intento del nivel
    videoActual = null;
    progresoSegundos = 0;
    yaLiked = false;
    yaSubscrito = false;
    campanaActiva = false;
    videosGuardados = [];
    appCompartir = "WhatsApp";
    comentarios = [];

    renderizarFeed();
    renderizarBiblioteca();
    mostrarTarjetaVolumen(false);

    const modal = $("#ytModalExito");
    if (modal) modal.classList.remove("activa");

    const seccionGuardados = $("#ytLibSavedSection");
    if (seccionGuardados) seccionGuardados.style.display = "none";

    const inputComentario = $("#ytCommentInput");
    if (inputComentario) inputComentario.value = "";

    // Mostrar la pantalla del simulador
    document.querySelectorAll(".pantalla").forEach(p => p.classList.remove("activa"));
    const sim = $("#pantallaYoutubeSimulador");
    if (sim) sim.classList.add("activa");

    cambiarVista("ytViewFeed");
    marcarTab("ytNavPrincipal");

    if (!simuladorInicializado) {
        inicializarListeners();
        simuladorInicializado = true;
    }

    actualizarBarraInstrucciones(true);

    console.log(`Simulador de YouTube iniciado para el nivel: ${idNivel}`);
}
