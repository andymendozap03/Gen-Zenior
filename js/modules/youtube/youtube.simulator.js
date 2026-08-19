import { $ } from "../../utils/dom.js";
import { speak, stopSpeech } from "../../services/speech.service.js";
import { resaltarElemento, limpiarResaltados } from "../../services/guide-highlight.service.js";

let simuladorInicializado = false;
let nivelActual = null;
let comentariosAbierto = false;
let yaLikedVideo = false;
let yaSubscribed = false;

// ---- DATOS DE VIDEOS ----
const VIDEOS_DATA = [
    {
        id: 1,
        titulo: "Desde Tamales hasta Wagyu | Probando la comida de Costco | La Capital",
        canal: "La Capital",
        avatarLetter: "LC",
        avatarBg: "#ff9800",
        vistas: "20 M de vistas",
        tiempo: "hace 4 años",
        duracion: "28:08",
        likes: "154 K",
        thumbnailImg: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=500&auto=format&fit=crop&q=60",
        videoUrl: "https://youtu.be/qFvDaNl1D3o?si=dPooFO9wTEXBI-q4"
    },
    {
        id: 2,
        titulo: "EN ESTA SELVA DE MEXICO SE FILMÓ LA PELÍCULA DE DEPREDADOR | Motoviajeros",
        canal: "@PabloImhoff",
        avatarLetter: "PI",
        avatarBg: "#4caf50",
        vistas: "1.1 M de vistas",
        tiempo: "hace 2 años",
        duracion: "18:45",
        likes: "41 K",
        thumbnailImg: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=500&auto=format&fit=crop&q=60",
        videoUrl: "https://youtu.be/P-9zDJxatWw?si=S5qjGXIXoZJS0Gt0"
    },
    {
        id: 3,
        titulo: "La Receta Secreta del Auténtico Pastel de Tres Leches | Postres Caseros",
        canal: "Dulce Hogar",
        avatarLetter: "DH",
        avatarBg: "#e91e63",
        vistas: "3.5 M de vistas",
        tiempo: "hace 1 año",
        duracion: "12:15",
        likes: "98 K",
        thumbnailImg: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=60",
        videoUrl: "https://youtu.be/P2HurCz7Dxg?si=gEmfMwfwKZZmlgRO"
    },
    {
        id: 4,
        titulo: "Viajando solo por los glaciares de la Patagonia | Aventura Extrema",
        canal: "Senderos del Mundo",
        avatarLetter: "SM",
        avatarBg: "#00bcd4",
        vistas: "920 K de vistas",
        tiempo: "hace 8 meses",
        duracion: "24:30",
        likes: "37 K",
        thumbnailImg: "https://images.unsplash.com/photo-1528164344705-47542687000d?w=500&auto=format&fit=crop&q=60",
        videoUrl: "https://youtu.be/NFKUR2JchKY?si=bm7BHWCNAsxt4NNI"
    }
];



const COMENTARIOS_DATA = [
    {
        id: 1,
        autor: "@ezequielorrico90",
        avatarLetter: "E",
        avatarBg: "#9c27b0",
        texto: "A quien más le pasa? Sentir que arranca el domingo recién cuando empezamos a mirar tu vídeo Pablito.. sos crack 👏 saludos desde Buenos Aires🇦🇷",
        tiempo: "hace 2 a",
        likes: 572,
        corazonPropietario: true
    },
    {
        id: 2,
        autor: "@Gabrik_Gab",
        avatarLetter: "G",
        avatarBg: "#00bcd4",
        texto: "Hola Pablito!! Después de 9 meses vuelvo a ver tus videos que veía con mi mamá... Yo esperaba que se recuperara de una fractura de cadera pero en todo este tiempo no pudo sobrellevar...",
        tiempo: "hace 1 a",
        likes: 31,
        corazonPropietario: false
    },
    {
        id: 3,
        autor: "@luisa_mendez",
        avatarLetter: "L",
        avatarBg: "#e91e63",
        texto: "¡Qué gran video y qué paisajes tan hermosos! Sigue así motivándonos a viajar.",
        tiempo: "hace 6 meses",
        likes: 12,
        corazonPropietario: true
    }
];

const SHORTS_DATA = [
    {
        id: 1,
        titulo: "Ustedes que piensan de esto?🤔👀 Comentario viral de la semana",
        vistas: "4.2 M de vistas",
        thumbnailImg: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=60"
    },
    {
        id: 2,
        titulo: "El Mejor Almuerzo del Mundo: Carne al Horno sin hacer nada",
        vistas: "850 K de vistas",
        thumbnailImg: "https://images.unsplash.com/photo-1544025162-d76694265947?w=300&auto=format&fit=crop&q=60"
    },
    {
        id: 3,
        titulo: "Mi setup de simulación de conducción extrema Lamborghini 🏎️",
        vistas: "1.5 M de vistas",
        thumbnailImg: "https://images.unsplash.com/photo-1600706432502-75a0e2751982?w=300&auto=format&fit=crop&q=60"
    },
    {
        id: 4,
        titulo: "El fracaso de Luisito Comunica en los negocios gastronómicos",
        vistas: "2.1 M de vistas",
        thumbnailImg: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=300&auto=format&fit=crop&q=60"
    }
];

// ---- PLANTILLA HTML ----
function asegurarTemplateHTML() {
    const contenedor = $("#pantallaYoutubeSimulador");
    if (!contenedor || contenedor.children.length > 0) return;

    contenedor.innerHTML = `
        <!-- Barra de instrucciones (NICO Guía) -->
        <div id="ytInstructionsBar" class="ws-instructions-bar">
            <div class="ws-instructions-nico" style="cursor: pointer;" aria-label="Escuchar instrucción de Nico">
                <img src="./assets/img/icons/voz.svg" alt="Nico" class="ws-instructions-icono-nico">
                <small>NICO</small>
            </div>
            <div id="ytInstructionsText" class="ws-instructions-text">Cargando objetivo...</div>
        </div>

        <!-- ======= VISTA FEED (INICIO) ======= -->
        <div id="ytViewFeed" class="yt-view activa">
            <!-- Header -->
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
                    <button class="yt-header-icon" aria-label="Notificaciones">
                        <svg viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
                        <span class="yt-bell-badge">9+</span>
                    </button>
                    <button class="yt-header-icon" aria-label="Buscar">
                        <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                    </button>
                </div>
            </header>

            <!-- Categorias (pills) -->
            <div class="yt-categories-container">
                <button class="yt-explore-btn" aria-label="Explorar">
                    <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15.93V14h-2v3.93c-3.03-.45-5.48-2.9-5.93-5.93H9v-2H5.07c.45-3.03 2.9-5.48 5.93-5.93V7h2v-3.07c3.03.45 5.48 2.9 5.93 5.93H15v2h3.93c-.45 3.03-2.9 5.48-5.93 5.93z"/></svg>
                </button>
                <button class="yt-pill active">Todos</button>
                <button class="yt-pill">Maletas</button>
                <button class="yt-pill">Videojuegos</button>
                <button class="yt-pill">Parrillas</button>
                <button class="yt-pill">Música</button>
            </div>

            <!-- Feed Principal -->
            <div id="ytFeedList" class="yt-feed"></div>
        </div>

        <!-- ======= VISTA VIDEO PLAYER (PLAYING) ======= -->
        <div id="ytViewPlayer" class="yt-view yt-player-view">
            <!-- Reproductor arriba -->
            <div class="yt-video-player-container">
                <div class="yt-video-player-frame">
                    <video id="ytPlayerVideo" style="width:100%; height:100%; object-fit:cover;" controls autoplay playsinline loop></video>
                </div>
            </div>

            <!-- Seccion detalles del video -->
            <div class="yt-player-info-section">
                <!-- Boton volver -->
                <button id="ytPlayerVolverBtn" class="yt-action-pill" style="margin-bottom:12px; padding: 4px 10px 4px 6px;">
                    <svg viewBox="0 0 24 24" style="width:16px;height:16px;"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                    <span>Volver al inicio</span>
                </button>

                <h1 class="yt-player-title" id="ytPlayerTitleText">—</h1>
                <p class="yt-player-metadata" id="ytPlayerMetaText">—</p>

                <!-- Canal y Suscribir -->
                <div class="yt-channel-row">
                    <div class="yt-channel-left">
                        <div class="yt-channel-avatar" id="ytPlayerChannelAvatar" style="background:#4caf50;">—</div>
                        <div>
                            <div class="yt-comment-author" id="ytPlayerChannelName">—</div>
                            <div class="yt-channel-subs-count">1.4 M de suscriptores</div>
                        </div>
                    </div>
                    <button class="yt-subscribe-btn" id="ytSubscribeBtn">Suscribirse</button>
                </div>

                <!-- Botones de Accion -->
                <div class="yt-actions-row">
                    <div class="yt-action-pill-split">
                        <button id="ytLikeBtn" aria-label="Me gusta">
                            <svg viewBox="0 0 24 24" id="ytLikeIcon"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>
                            <span id="ytLikeLabel">—</span>
                        </button>
                        <span class="divider"></span>
                        <button id="ytDislikeBtn" aria-label="No me gusta">
                            <svg viewBox="0 0 24 24"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/></svg>
                        </button>
                    </div>

                    <button class="yt-action-pill" aria-label="Compartir">
                        <svg viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92z"/></svg>
                        <span>Compartir</span>
                    </button>

                    <button class="yt-action-pill" aria-label="Remix">
                        <svg viewBox="0 0 24 24"><path d="M12 10.9c-.61 0-1.1.49-1.1 1.1s.49 1.1 1.1 1.1 1.1-.49 1.1-1.1-.49-1.1-1.1-1.1zm8.3-2.9c-.61 0-1.1.49-1.1 1.1s.49 1.1 1.1 1.1 1.1-.49 1.1-1.1-.49-1.1-1.1-1.1zm-16.6 0c-.61 0-1.1.49-1.1 1.1s.49 1.1 1.1 1.1 1.1-.49 1.1-1.1-.49-1.1-1.1-1.1zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93V19c0-.55-.45-1-1-1s-1 .45-1 1v.93c-3.95-.49-7-3.85-7.44-7.93H7c.55 0 1-.45 1-1s-.45-1-1-1H3.56c.44-4.08 3.5-7.44 7.44-7.93V5c0 .55.45 1 1 1s1-.45 1-1v-.93c3.95.49 7 3.85 7.44 7.93H17c-.55 0-1 .45-1 1s.45 1 1 1h3.44c-.44 4.08-3.5 7.44-7.44 7.93z"/></svg>
                        <span>Remix</span>
                    </button>
                </div>

                <!-- Caja de Vista Previa de Comentarios -->
                <div class="yt-comments-preview-box" id="ytCommentsPreviewBox">
                    <div class="yt-comments-preview-header">
                        <div>
                            <span class="yt-comments-preview-title">Comentarios</span>
                            <span class="yt-comments-preview-count">1.7 K</span>
                        </div>
                        <span class="yt-comments-preview-arrow">∧</span>
                    </div>
                    <div class="yt-comments-preview-body">
                        <div class="yt-comments-preview-avatar">E</div>
                        <div class="yt-comments-preview-text" id="ytCommentsPreviewText">—</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ======= PANEL INFERIOR DESLIZABLE (COMENTARIOS) ======= -->
        <div id="ytCommentsDrawer" class="yt-comments-drawer">
            <!-- Header -->
            <div class="yt-drawer-header">
                <span class="yt-drawer-title">Comentarios</span>
                <button class="yt-drawer-close-btn" id="ytDrawerCloseBtn">✕</button>
            </div>

            <!-- Filtros principales -->
            <div class="yt-drawer-filters">
                <button class="yt-drawer-filter-pill active">Principales</button>
                <button class="yt-drawer-filter-pill">Temas</button>
                <button class="yt-drawer-filter-pill">Más recientes</button>
            </div>

            <!-- Banner de Lineamientos -->
            <div class="yt-comments-warning-banner">
                Recuerda realizar comentarios respetuosos siguiendo los <a href="#" onclick="return false;">Lineamientos de la Comunidad de YouTube</a>. <a href="#" onclick="return false;">Más información</a>
            </div>

            <!-- Lista de comentarios -->
            <div class="yt-comments-list" id="ytCommentsList"></div>

            <!-- Caja de entrada para comentar -->
            <div class="yt-comment-input-bar">
                <div class="yt-comment-input-avatar">U</div>
                <input type="text" class="yt-comment-input-field" id="ytCommentInput" placeholder="Añade un comentario...">
                <button class="yt-comment-send-btn" id="ytCommentSendBtn" aria-label="Enviar comentario">
                    <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                </button>
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
            <button class="yt-nav-tab" aria-label="Crear">
                <div class="yt-nav-plus">
                    <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                </div>
            </button>
            <button class="yt-nav-tab" id="ytNavSuscripciones">
                <svg viewBox="0 0 24 24"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/></svg>
                <span>Suscripciones</span>
            </button>
            <button class="yt-nav-tab" id="ytNavTu">
                <div style="width: 22px; height: 22px; border-radius: 50%; background: #673ab7; color: white; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700;">A</div>
                <span>Tú</span>
            </button>
        </nav>
    `;
}

// ---- RENDERIZAR FEED DINÁMICO ----
function renderizarFeed() {
    const feed = $("#ytFeedList");
    if (!feed) return;

    let html = "";
    VIDEOS_DATA.forEach((video, index) => {
        html += `
            <div class="yt-video-card" data-video-id="${video.id}" style="${index > 0 ? 'margin-top:16px;' : ''}">
                <div class="yt-video-thumbnail-container">
                    <img src="${video.thumbnailImg}" class="yt-video-thumbnail" alt="video thumbnail">
                    <span class="yt-video-duration">${video.duracion}</span>
                </div>
                <div class="yt-video-details">
                    <div class="yt-channel-avatar" style="background:${video.avatarBg};">
                        ${video.avatarLetter}
                    </div>
                    <div class="yt-video-info">
                        <h3 class="yt-video-title">${video.titulo}</h3>
                        <p class="yt-video-meta">${video.canal} · ${video.vistas} · ${video.tiempo}</p>
                    </div>
                    <button class="yt-video-more-btn">
                        <svg viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                    </button>
                </div>
            </div>
        `;

        // Insertar ad después de la primera
        if (index === 0) {
            html += `
                <div class="yt-ad-card" style="margin-top:16px;">
                    <div class="yt-ad-banner" style="background: linear-gradient(135deg, #6200ee, #3700b3);">
                        <div style="text-align: center; padding: 20px;">
                            <div style="font-size: 26px; font-weight: 800; margin-bottom: 8px;">Envía dinero al exterior</div>
                            <div style="font-size: 13px; font-weight: 500; opacity: 0.9;">Envía dólares o euros desde la app sin complicaciones</div>
                        </div>
                    </div>
                    <div class="yt-ad-details">
                        <div class="yt-channel-avatar" style="background:#6200ee;">T</div>
                        <div class="yt-ad-info">
                            <h4 class="yt-ad-title">Takenos</h4>
                            <p class="yt-ad-desc">Recibe y maneja tu dinero desde tu celular cuando lo necesites.</p>
                            <div class="yt-ad-badge-row">
                                <span class="yt-ad-badge">Patrocinado</span>
                            </div>
                        </div>
                        <button class="yt-video-more-btn">
                            <svg viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                        </button>
                    </div>
                    <div class="yt-ad-action-row">
                        <button class="yt-ad-btn">Abrir aplicación</button>
                    </div>
                </div>
            `;
        }

        // Insertar Shorts después de la segunda
        if (index === 1) {
            html += `
                <div class="yt-shorts-grid-section" style="margin-top:16px;">
                    <div class="yt-shorts-header">
                        <div class="yt-shorts-title-row">
                            <svg viewBox="0 0 24 24"><path d="M17.97 10.97l-3.78-1.89 3.78-1.89c1.09-.54 1.84-1.63 1.84-2.91 0-1.87-1.52-3.39-3.39-3.39-.77 0-1.48.26-2.07.69L5.34 6.84c-1.09.54-1.84 1.63-1.84 2.91 0 1.87 1.52 3.39 3.39 3.39.77 0 1.48-.26 2.07-.69l3.78 1.89-3.78 1.89c-1.09.54-1.84 1.63-1.84 2.91 0 1.87 1.52 3.39 3.39 3.39.77 0 1.48-.26 2.07-.69l9.01-5.26c1.09-.54 1.84-1.63 1.84-2.91 0-1.87-1.52-3.39-3.39-3.39-.77 0-1.48.26-2.07.69z"/></svg>
                            <span>Shorts</span>
                        </div>
                        <button class="yt-video-more-btn">
                            <svg viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                        </button>
                    </div>
                    <div class="yt-shorts-grid">
                        ${SHORTS_DATA.map(s => `
                            <div class="yt-short-card" data-short-id="${s.id}">
                                <img src="${s.thumbnailImg}" class="yt-short-thumbnail" alt="Short thumbnail">
                                <div class="yt-short-overlay">
                                    <div class="yt-short-card-title">${s.titulo}</div>
                                    <div class="yt-short-card-views">${s.vistas}</div>
                                </div>
                                <button class="yt-short-options-btn">
                                    <svg viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                                </button>
                            </div>
                        `).join("")}
                    </div>
                </div>
            `;
        }
    });

    feed.innerHTML = html;
}

// ---- RENDERIZAR COMENTARIOS EN EL CAJÓN ----
function renderizarComentarios() {
    const list = $("#ytCommentsList");
    if (!list) return;

    list.innerHTML = COMENTARIOS_DATA.map(c => {
        const heartHtml = c.corazonPropietario
            ? `<div class="yt-comment-heart-badge">
                 <img src="${VIDEOS_DATA[1].thumbnailImg}" alt="propietario">
                 <span class="yt-comment-heart-icon">❤️</span>
               </div>`
            : "";

        return `
            <div class="yt-comment-item">
                <div class="yt-comment-avatar" style="background:${c.avatarBg};">${c.avatarLetter}</div>
                <div class="yt-comment-content">
                    <div class="yt-comment-header">
                        <span class="yt-comment-author">${c.autor}</span>
                        <span class="yt-comment-time">${c.tiempo}</span>
                    </div>
                    <p class="yt-comment-text">${c.texto}</p>
                    <div class="yt-comment-actions">
                        <button class="yt-comment-action-btn" aria-label="Me gusta">
                            <svg viewBox="0 0 24 24"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>
                            <span>${c.likes}</span>
                        </button>
                        <button class="yt-comment-action-btn" aria-label="No me gusta">
                            <svg viewBox="0 0 24 24"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/></svg>
                        </button>
                        <button class="yt-comment-action-btn" aria-label="Responder">
                            <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                        </button>
                        ${heartHtml}
                    </div>
                    ${c.id === 1 ? `<div class="yt-comment-replies-link">35 respuestas ▾</div>` : ""}
                </div>
            </div>
        `;
    }).join("");
}

// ---- NAVEGAR ENTRE VISTAS ----
function cambiarVista(viewId) {
    document.querySelectorAll("#pantallaYoutubeSimulador .yt-view").forEach(v => v.classList.remove("activa"));
    const view = $(`#${viewId}`);
    if (view) view.classList.add("activa");
}

// Helper para obtener el ID de YouTube
function obtenerYoutubeId(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// ---- ABRIR VIDEO EN EL PLAYER ----
function reproducirVideo(videoId) {
    const video = VIDEOS_DATA.find(v => v.id === videoId);
    if (!video) return;

    // Resetear estados del video
    yaLikedVideo = false;
    yaSubscribed = false;

    // Cargar datos en el reproductor de video (iframe o video HTML5)
    const playerFrame = $(".yt-video-player-frame");
    const titleEl = $("#ytPlayerTitleText");
    const metaEl = $("#ytPlayerMetaText");
    const nameEl = $("#ytPlayerChannelName");
    const avEl = $("#ytPlayerChannelAvatar");
    const subBtn = $("#ytSubscribeBtn");
    const likeIcon = $("#ytLikeIcon");
    const likeLabel = $("#ytLikeLabel");

    if (playerFrame) {
        const ytId = obtenerYoutubeId(video.videoUrl);
        if (ytId) {
            playerFrame.innerHTML = `
                <iframe id="ytPlayerIframe" 
                    src="https://www.youtube.com/embed/${ytId}?autoplay=1" 
                    style="width:100%; height:100%; border:none;" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
                </iframe>
            `;
        } else {
            playerFrame.innerHTML = `
                <video id="ytPlayerVideo" style="width:100%; height:100%; object-fit:cover;" controls autoplay playsinline loop>
                    <source src="${video.videoUrl}" type="video/mp4">
                </video>
            `;
        }
    }

    if (titleEl) titleEl.textContent = video.titulo;
    if (metaEl) metaEl.textContent = `${video.vistas} · ${video.tiempo}`;
    if (nameEl) nameEl.textContent = video.canal;
    if (avEl) {
        avEl.textContent = video.avatarLetter;
        avEl.style.background = video.avatarBg;
    }

    // Configurar me gusta
    if (likeLabel) likeLabel.textContent = video.likes || "15 K";
    if (likeIcon) likeIcon.style.fill = "#0f0f0f";

    // Configurar suscripción
    if (subBtn) {
        subBtn.textContent = "Suscribirse";
        subBtn.classList.remove("subscribed");
        subBtn.style.background = "#0f0f0f";
        subBtn.style.color = "#ffffff";
    }

    // Comentarios preview
    const previewText = $("#ytCommentsPreviewText");
    if (previewText) {
        previewText.textContent = COMENTARIOS_DATA[0].texto;
    }

    cambiarVista("ytViewPlayer");
}

function detenerVideo() {
    const playerFrame = $(".yt-video-player-frame");
    if (playerFrame) {
        playerFrame.innerHTML = "";
    }
}


// ---- COMENTAR ----
function agregarComentario() {
    const input = $("#ytCommentInput");
    if (!input) return;

    const texto = input.value.trim();
    if (!texto) return;

    const nuevo = {
        id: Date.now(),
        autor: "@Tú",
        avatarLetter: "U",
        avatarBg: "#6200ee",
        texto: texto,
        tiempo: "Ahora",
        likes: 0,
        corazonPropietario: false
    };

    COMENTARIOS_DATA.unshift(nuevo);
    renderizarComentarios();

    // Actualizar preview en la vista player
    const previewText = $("#ytCommentsPreviewText");
    if (previewText) previewText.textContent = texto;

    input.value = "";
}

// ---- ENTRADAS DE MENÚ INFERIOR ----
function configurarNavTabs() {
    document.querySelectorAll("#pantallaYoutubeSimulador .yt-nav-tab").forEach(tab => {
        tab.addEventListener("click", () => {
            const viewId = tab.dataset.view;
            detenerVideo();
            if (viewId) {
                document.querySelectorAll("#pantallaYoutubeSimulador .yt-nav-tab").forEach(t => t.classList.remove("active"));
                tab.classList.add("active");
                cambiarVista(viewId);
            } else {
                alert("Esta pestaña no tiene contenido simulado. Navega en 'Principal'.");
            }
        });
    });
}

// ---- LISTENERS ----
function inicializarListeners() {
    // Clic en la insignia Nico para repetir instrucción
    const nicoBtn = $("#ytInstructionsBar")?.querySelector(".ws-instructions-nico");
    if (nicoBtn) {
        nicoBtn.onclick = (e) => {
            e.stopPropagation();
            const textEl = $("#ytInstructionsText");
            if (textEl) {
                speak(textEl.textContent);
            }
        };
    }

    // Salir del simulador
    const btnSalir = $("#ytSalirBtn");
    if (btnSalir) {
        btnSalir.onclick = () => {
            limpiarResaltados();
            detenerVideo();
            location.hash = "/modulo/YouTube";
        };
    }

    // Logo vuelve al home feed
    const logoHome = $("#ytLogoHome");
    if (logoHome) {
        logoHome.onclick = () => {
            detenerVideo();
            cambiarVista("ytViewFeed");
            document.querySelectorAll("#pantallaYoutubeSimulador .yt-nav-tab").forEach(t => t.classList.remove("active"));
            const principalTab = $("#ytNavPrincipal");
            if (principalTab) principalTab.classList.add("active");
        };
    }

    // Click en videos de la lista
    const feed = $("#ytFeedList");
    if (feed) {
        feed.addEventListener("click", e => {
            const card = e.target.closest(".yt-video-card");
            if (card) {
                const videoId = parseInt(card.dataset.videoId);
                reproducirVideo(videoId);
            }
        });
    }

    // Botón volver del Player
    const volverBtn = $("#ytPlayerVolverBtn");
    if (volverBtn) {
        volverBtn.onclick = () => {
            detenerVideo();
            cambiarVista("ytViewFeed");
        };
    }

    // Suscribirse
    const subBtn = $("#ytSubscribeBtn");
    if (subBtn) {
        subBtn.onclick = () => {
            yaSubscribed = !yaSubscribed;
            if (yaSubscribed) {
                subBtn.textContent = "Suscrito";
                subBtn.classList.add("subscribed");
                subBtn.style.background = "#f2f2f2";
                subBtn.style.color = "#0f0f0f";
            } else {
                subBtn.textContent = "Suscribirse";
                subBtn.classList.remove("subscribed");
                subBtn.style.background = "#0f0f0f";
                subBtn.style.color = "#ffffff";
            }
        };
    }

    // Me gusta (Like)
    const likeBtn = $("#ytLikeBtn");
    if (likeBtn) {
        likeBtn.onclick = () => {
            yaLikedVideo = !yaLikedVideo;
            const likeIcon = $("#ytLikeIcon");
            if (likeIcon) {
                likeIcon.style.fill = yaLikedVideo ? "#065fd4" : "#0f0f0f";
            }
        };
    }

    // Abrir comentarios
    const previewBox = $("#ytCommentsPreviewBox");
    if (previewBox) {
        previewBox.onclick = () => {
            renderizarComentarios();
            const drawer = $("#ytCommentsDrawer");
            if (drawer) drawer.classList.add("activa");
            comentariosAbierto = true;
        };
    }

    // Cerrar comentarios
    const closeDrawerBtn = $("#ytDrawerCloseBtn");
    if (closeDrawerBtn) {
        closeDrawerBtn.onclick = () => {
            const drawer = $("#ytCommentsDrawer");
            if (drawer) drawer.classList.remove("activa");
            comentariosAbierto = false;
        };
    }

    // Comentar (botón y Enter)
    const sendBtn = $("#ytCommentSendBtn");
    if (sendBtn) {
        sendBtn.onclick = agregarComentario;
    }
    const input = $("#ytCommentInput");
    if (input) {
        input.oninput = () => {
            if (input.value.trim().length > 0) {
                resaltarElemento("#ytCommentSendBtn");
            } else {
                resaltarElemento("#ytCommentInput");
            }
        };
        input.onkeypress = (e) => {
            if (e.key === "Enter") agregarComentario();
        };
    }

    configurarNavTabs();
}

const INSTRUCCIONES_YOUTUBE = {
    "buscar-video": "Toca el icono de la lupa para buscar un video que te interese.",
    "reproducir-video": "Toca cualquier video del listado para reproducirlo a pantalla completa.",
    "dar-like": "Toca el botón 'Me gusta' debajo del video para apoyar al creador.",
    "comentar-video": "Abre la sección de comentarios para dejar tu opinión en el video.",
};

function actualizarGuiaVisualYoutube(idNivel) {
    if (!idNivel) idNivel = nivelActual;
    const viewPlayer = $("#ytViewPlayer");
    const enPlayer = viewPlayer && viewPlayer.classList.contains("activa");

    if (idNivel === "buscar-video") {
        resaltarElemento(".yt-header-icon[aria-label='Buscar']");
    } else if (idNivel === "reproducir-video") {
        if (!enPlayer) {
            resaltarElemento("#ytFeedList .yt-video-card:first-child");
        } else {
            limpiarResaltados();
        }
    } else if (idNivel === "dar-like") {
        if (enPlayer) {
            resaltarElemento("#ytLikeBtn");
        } else {
            resaltarElemento("#ytFeedList .yt-video-card:first-child");
        }
    } else if (idNivel === "comentar-video") {
        if (enPlayer) {
            const drawer = $("#ytCommentsDrawer");
            if (drawer && drawer.classList.contains("activa")) {
                const inputVal = $("#ytCommentInput") ? $("#ytCommentInput").value.trim() : "";
                if (inputVal.length > 0) {
                    resaltarElemento("#ytCommentSendBtn");
                } else {
                    resaltarElemento("#ytCommentInput");
                }
            } else {
                resaltarElemento("#ytCommentsPreviewBtn");
            }
        } else {
            resaltarElemento("#ytFeedList .yt-video-card:first-child");
        }
    }
}

// ---- PUNTO DE ENTRADA ----
export function iniciarSimulador(idNivel) {
    nivelActual = idNivel;
    comentariosAbierto = false;

    asegurarTemplateHTML();
    renderizarFeed();

    document.querySelectorAll(".pantalla").forEach(p => p.classList.remove("activa"));
    const sim = $("#pantallaYoutubeSimulador");
    if (sim) sim.classList.add("activa");

    // Reiniciar vista
    cambiarVista("ytViewFeed");
    document.querySelectorAll("#pantallaYoutubeSimulador .yt-nav-tab").forEach(t => t.classList.remove("active"));
    const principalTab = $("#ytNavPrincipal");
    if (principalTab) principalTab.classList.add("active");

    const msg = INSTRUCCIONES_YOUTUBE[idNivel] || "Explora y disfruta de los videos.";
    const textEl = $("#ytInstructionsText");
    if (textEl) textEl.textContent = msg;

    speak(msg);
    actualizarGuiaVisualYoutube(idNivel);

    if (!simuladorInicializado) {
        inicializarListeners();
        simuladorInicializado = true;
    }
}
