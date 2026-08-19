import { $ } from "../../utils/dom.js";
import { speak, stopSpeech } from "../../services/speech.service.js";
import { resaltarElemento, limpiarResaltados } from "../../services/guide-highlight.service.js";

let simuladorInicializado = false;
let nivelActual = null;
let reaccionesEstado = {}; // postId -> { emoji, conteo }

// ---------- DATOS FALSOS ----------
const POSTS_DATA = [
    {
        id: 1,
        autor: "María Fernanda López",
        iniciales: "ML",
        avatar: "./assets/img/facebook/maria_profile.png",
        imagen: "./assets/img/facebook/maria_post.png",
        color: "#e91e8c",
        tiempo: "2 h",
        texto: "¡Qué hermoso amanecer tuve hoy! Nada mejor que empezar el día con agradecimiento y una taza de café ☀️☕",
        emoji: "🌅",
        emojiBg: "linear-gradient(135deg, #ff9a44, #fc6076)",
        likes: 128,
        comentarios: 14,
        compartidos: 3,
        reacciones: ["❤️", "😍", "👍"],
        comentariosData: [
            { autor: "Carmen Ruiz", iniciales: "CR", color: "#9c27b0", texto: "¡Qué bonito! Yo también me levanté temprano hoy 🌸", tiempo: "1 h", likes: 5 },
            { autor: "José Martínez", iniciales: "JM", color: "#2196f3", texto: "Hay que disfrutar esos momentos 😊", tiempo: "45 min", likes: 2 },
            { autor: "Ana Belén", iniciales: "AB", color: "#ff5722", texto: "Me encanta tu actitud tan positiva, amiga!", tiempo: "30 min", likes: 8 },
            { autor: "Pedro Sánchez", iniciales: "PS", color: "#4caf50", texto: "¡Buenos días! 🌞", tiempo: "20 min", likes: 1 },
        ]
    },
    {
        id: 2,
        autor: "Noticias del Barrio",
        iniciales: "NB",
        avatar: "./assets/img/facebook/noticias_profile.png",
        imagen: "./assets/img/facebook/noticias_post.jpg",
        color: "#1877f2",
        verificado: true,
        tiempo: "5 h",
        texto: "📢 AVISO IMPORTANTE: Mañana martes se realizará mantenimiento al acueducto del sector norte. Se suspende el servicio de 8am a 2pm. ¡Guarden agua!",
        emoji: "🔧",
        emojiBg: "linear-gradient(135deg, #4facfe, #00f2fe)",
        likes: 312,
        comentarios: 47,
        compartidos: 89,
        reacciones: ["😮", "😡", "👍"],
        comentariosData: [
            { autor: "Luis García", iniciales: "LG", color: "#ff9800", texto: "Gracias por el aviso, ya voy a guardar agua 🪣", tiempo: "4 h", likes: 12 },
            { autor: "Rosa Mendoza", iniciales: "RM", color: "#e91e63", texto: "¡Qué fastidio! Siempre tan de repente", tiempo: "4 h", likes: 7 },
            { autor: "Carlos Jiménez", iniciales: "CJ", color: "#009688", texto: "¿Y por qué no avisan con más tiempo?", tiempo: "3 h", likes: 15 },
            { autor: "Elena Vargas", iniciales: "EV", color: "#673ab7", texto: "Gracias por el aviso vecinos 🙏", tiempo: "2 h", likes: 3 },
            { autor: "Miguel Torres", iniciales: "MT", color: "#f44336", texto: "Eso ya era de esperarse 😤", tiempo: "1 h", likes: 6 },
        ]
    },
    {
        id: 3,
        autor: "Recetas de la Abuela",
        iniciales: "RA",
        avatar: "./assets/img/facebook/recetas_profile.png",
        imagen: "./assets/img/facebook/recetas_post.png",
        color: "#ff9800",
        tiempo: "Ayer",
        texto: "🍲 RECETA DEL DÍA: Sopa de pollo casera, la mejor para los días fríos. Con zanahoria, papa, apio y el amor de siempre. ¿Quién la prepara hoy?",
        emoji: "🍲",
        emojiBg: "linear-gradient(135deg, #f093fb, #f5576c)",
        likes: 856,
        comentarios: 103,
        compartidos: 241,
        reacciones: ["❤️", "😋", "👍"],
        comentariosData: [
            { autor: "Dolores Pérez", iniciales: "DP", color: "#8bc34a", texto: "¡La hice el domingo y quedó deliciosa! 😋", tiempo: "22 h", likes: 24 },
            { autor: "Ramón Flores", iniciales: "RF", color: "#00bcd4", texto: "Mi mamá la hacía exactamente así 🥹", tiempo: "20 h", likes: 31 },
            { autor: "Sandra López", iniciales: "SL", color: "#ff5722", texto: "¿Comparte la receta completa por favor?", tiempo: "18 h", likes: 9 },
            { autor: "Tomás Herrera", iniciales: "TH", color: "#795548", texto: "Eso se llama nostalgia en un plato 🍵", tiempo: "16 h", likes: 18 },
            { autor: "Gloria Castro", iniciales: "GC", color: "#9c27b0", texto: "¡Hoy la hago! Gracias por el tip 👏", tiempo: "14 h", likes: 4 },
        ]
    },
    {
        id: 4,
        autor: "Club de Adultos Activos",
        iniciales: "CA",
        avatar: "./assets/img/facebook/club_profile.png",
        imagen: "./assets/img/facebook/club_post.png",
        color: "#4caf50",
        tiempo: "Ayer",
        texto: "💃🕺 ¡El próximo sábado tenemos clase de baile salsa para todos los niveles! No importa la edad, lo que importa es el entusiasmo. Inscripciones abiertas 🎶",
        emoji: "🎶",
        emojiBg: "linear-gradient(135deg, #43e97b, #38f9d7)",
        likes: 445,
        comentarios: 62,
        compartidos: 38,
        reacciones: ["😍", "❤️", "😂"],
        comentariosData: [
            { autor: "Consuelo Reyes", iniciales: "CR", color: "#e91e63", texto: "¡Allá estaremos! Ya le avisé a mi hermana 💃", tiempo: "20 h", likes: 11 },
            { autor: "Ernesto Campos", iniciales: "EC", color: "#3f51b5", texto: "¿A qué hora comienza? No veo el aviso", tiempo: "19 h", likes: 2 },
            { autor: "Patricia Mora", iniciales: "PM", color: "#ff9800", texto: "Ya me inscribí, qué emoción 🙌", tiempo: "17 h", likes: 8 },
            { autor: "Roberto Silva", iniciales: "RS", color: "#607d8b", texto: "¿Hacen clases entre semana también?", tiempo: "15 h", likes: 1 },
        ]
    }
];

// ---------- INSTRUCCIONES POR NIVEL ----------
const INSTRUCCIONES = {
    "realizar-publicacion": "Toca el campo '¿Qué estás pensando?' para escribir una publicación.",
    "reaccionar-foto": "Mantén presionado el botón 'Me gusta' en una publicación para ver las reacciones y seleccionar una.",
    "comentar-publicacion": "Toca el botón 'Comentar' en una publicación para ver y escribir comentarios.",
    "agregar-amigo": "Explora el feed y toca 'Agregar amigo' en el perfil de alguien.",
    "ver-reels": "Explora el feed y disfruta del contenido.",
};

// ---------- PLANTILLA HTML ----------
function asegurarTemplateHTML() {
    const contenedor = $("#pantallaFacebookSimulador");
    if (!contenedor || contenedor.children.length > 0) return;

    contenedor.innerHTML = `
        <!-- Barra de instrucciones (NICO Guía) -->
        <div id="fbInstructionsBar" class="ws-instructions-bar">
            <div class="ws-instructions-nico" style="cursor: pointer;" aria-label="Escuchar instrucción de Nico">
                <img src="./assets/img/icons/voz.svg" alt="Nico" class="ws-instructions-icono-nico">
                <small>NICO</small>
            </div>
            <div id="fbInstructionsText" class="ws-instructions-text">Cargando objetivo...</div>
        </div>

        <!-- Header -->
        <header class="fb-header">
            <button id="fbSalirBtn" class="fb-salir-btn" aria-label="Salir de Facebook">
                <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
            </button>
            <span class="fb-logo">facebook</span>
            <div class="fb-header-actions">
                <button class="fb-header-btn" aria-label="Buscar">
                    <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                </button>
                <button class="fb-header-btn" aria-label="Mensajes">
                    <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>
                    <span class="fb-badge">5</span>
                </button>
                <button class="fb-header-btn" aria-label="Notificaciones">
                    <svg viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
                    <span class="fb-badge">3</span>
                </button>
            </div>
        </header>

        <!-- Nav Tabs -->
        <nav class="fb-nav-tabs">
            <button class="fb-nav-tab activa" aria-label="Inicio">
                <svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            </button>
            <button class="fb-nav-tab" aria-label="Amigos">
                <svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                <span class="fb-badge">2</span>
            </button>
            <button class="fb-nav-tab" aria-label="Video">
                <svg viewBox="0 0 24 24"><path d="M21 3H3C2 3 1 4 1 5v14c0 1.1.9 2 2 2h18c1 0 2-1 2-2V5c0-1-1-2-2-2zm-9 13l-5-3.19V18H5V6h2v4.19L12 7l7 4.5-7 4.5z"/></svg>
            </button>
            <button class="fb-nav-tab" aria-label="Marketplace">
                <svg viewBox="0 0 24 24"><path d="M11 9h2V6h3V4h-3V1h-2v3H8v2h3v3zm-4 9c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2zm-8.9-5h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0 0 19.96 4H5.21L4.27 2H1v2h2l3.6 7.59-1.35 2.44C4.52 15.37 5.48 17 7 17h12v-2H7.42c-.14 0-.25-.11-.32-.26z"/></svg>
            </button>
            <button class="fb-nav-tab" aria-label="Grupos">
                <svg viewBox="0 0 24 24"><path d="M16.5 13c-1.2 0-3.07.34-4.5 1-1.43-.67-3.3-1-4.5-1C5.33 13 1 14.08 1 16.25V19h22v-2.75c0-2.17-4.33-3.25-6.5-3.25zm-4 4.5h-10v-.75C2.5 15.92 5.23 15 7.5 15c2.27 0 5 .92 5 1.75v.75zm9 0H14v-.75c0-.68-.21-1.35-.59-1.95.87-.27 1.76-.3 2.09-.3 2.27 0 5 .92 5 1.75v.75zM7.5 12c1.93 0 3.5-1.57 3.5-3.5S9.43 5 7.5 5 4 6.57 4 8.5 5.57 12 7.5 12zm0-5c.83 0 1.5.67 1.5 1.5S8.33 10 7.5 10 6 9.33 6 8.5 6.67 7 7.5 7zm9 5c1.93 0 3.5-1.57 3.5-3.5S18.43 5 16.5 5 13 6.57 13 8.5 14.57 12 16.5 12zm0-5c.83 0 1.5.67 1.5 1.5S17.33 10 16.5 10 15 9.33 15 8.5 15.67 7 16.5 7z"/></svg>
            </button>
            <button class="fb-nav-tab" aria-label="Menú">
                <svg viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
            </button>
        </nav>

        <!-- Feed -->
        <div id="fbFeed" class="fb-feed">

            <!-- Historias -->
            <div class="fb-stories">
                <div class="fb-story fb-story-create">
                    <img src="./assets/img/facebook/user_profile.png" alt="Tú" class="fb-story-create-img">
                    <div class="fb-story-create-info">
                        <div class="fb-story-add-btn">
                            <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                        </div>
                        <span class="fb-story-create-label">Crear historia</span>
                    </div>
                </div>
                <div class="fb-story" style="background:linear-gradient(160deg,#e91e8c,#ff6b6b);">
                    <div class="fb-story-avatar-ring">
                        <img src="./assets/img/facebook/maria_profile.png" alt="María" class="fb-avatar-img">
                    </div>
                    <div class="fb-story-bg">🌸</div>
                    <span class="fb-story-name">María</span>
                </div>
                <div class="fb-story" style="background:linear-gradient(160deg,#1877f2,#42a5f5);">
                    <div class="fb-story-avatar-ring">
                        <img src="./assets/img/facebook/club_profile.png" alt="Club Activos" class="fb-avatar-img">
                    </div>
                    <div class="fb-story-bg">💃</div>
                    <span class="fb-story-name">Club Activos</span>
                </div>
                <div class="fb-story" style="background:linear-gradient(160deg,#ff9800,#ffc107);">
                    <div class="fb-story-avatar-ring">
                        <img src="./assets/img/facebook/recetas_profile.png" alt="Recetas" class="fb-avatar-img">
                    </div>
                    <div class="fb-story-bg">🍲</div>
                    <span class="fb-story-name">Recetas</span>
                </div>
                <div class="fb-story" style="background:linear-gradient(160deg,#4caf50,#8bc34a);">
                    <div class="fb-story-avatar-ring" style="background:#4caf50;">JN</div>
                    <div class="fb-story-bg">⚽</div>
                    <span class="fb-story-name">Juan</span>
                </div>
            </div>

            <!-- Crear publicación -->
            <div class="fb-create-post">
                <div class="fb-create-post-row">
                    <div class="fb-create-avatar">
                        <img src="./assets/img/facebook/user_profile.png" alt="Tú" class="fb-avatar-img">
                    </div>
                    <div class="fb-create-input">¿Qué estás pensando?</div>
                </div>
                <div class="fb-create-actions">
                    <button class="fb-create-action-btn">
                        <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:#f02849;"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
                        Video en vivo
                    </button>
                    <button class="fb-create-action-btn">
                        <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:#45bd62;"><circle cx="12" cy="12" r="3.2"/><path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>
                        Foto/video
                    </button>
                    <button class="fb-create-action-btn">
                        <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:#f7b928;"><circle cx="12" cy="12" r="10"/><path d="M12 16c2.2 0 4-1.8 4-4H8c0 2.2 1.8 4 4 4zm-3-6c.6 0 1-.4 1-1s-.4-1-1-1-1 .4-1 1 .4 1 1 1zm6 0c.6 0 1-.4 1-1s-.4-1-1-1-1 .4-1 1 .4 1 1 1z"/></svg>
                        Sentimiento
                    </button>
                </div>
            </div>

            <!-- Publicaciones dinámicas -->
            <div id="fbPostsContainer"></div>
        </div>

        <!-- Modal de comentarios -->
        <div id="fbCommentsModal" class="fb-comments-modal">
            <div class="fb-comments-header">
                <span class="fb-comments-title">Comentarios</span>
                <button id="fbCommentsClose" class="fb-comments-close">✕</button>
            </div>
            <div class="fb-comments-sort">
                Más relevantes
                <svg viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>
            </div>
            <div id="fbCommentsList" class="fb-comments-list"></div>
            <div class="fb-comment-input-bar">
                <div class="fb-comment-input-avatar">
                    <img src="./assets/img/facebook/user_profile.png" alt="Tú" class="fb-avatar-img">
                </div>
                <input type="text" id="fbCommentInput" class="fb-comment-input" placeholder="Escribe un comentario...">
                <button id="fbCommentSend" class="fb-comment-send-btn" aria-label="Enviar comentario">
                    <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                </button>
            </div>
        </div>

        <!-- Lightbox para imágenes -->
        <div id="fbLightboxModal" class="fb-lightbox-modal" aria-hidden="true">
            <button id="fbLightboxClose" class="fb-lightbox-close" aria-label="Cerrar vista de imagen">✕</button>
            <div class="fb-lightbox-content">
                <img id="fbLightboxImg" src="" alt="Imagen ampliada">
            </div>
        </div>
    `;
}

// ---------- RENDERIZAR PUBLICACIONES ----------
function renderizarPublicaciones() {
    const container = $("#fbPostsContainer");
    if (!container) return;
    container.innerHTML = "";

    POSTS_DATA.forEach(post => {
        const estado = reaccionesEstado[post.id] || { emoji: null, conteo: post.likes };
        const likedClass = estado.emoji ? "liked" : "";
        const likedLabel = estado.emoji ? estado.emoji + " " + etiquetaReaccion(estado.emoji) : "Me gusta";

        const postEl = document.createElement("div");
        postEl.className = "fb-post";
        postEl.dataset.postId = post.id;

        postEl.innerHTML = `
            <div class="fb-post-header">
                <div class="fb-post-header-left">
                    <div class="fb-post-avatar" style="background:${post.color};">
                        ${post.avatar ? `<img src="${post.avatar}" alt="${post.autor}" class="fb-avatar-img" onerror="this.style.display='none'; this.parentElement.innerText='${post.iniciales}'">` : post.iniciales}
                    </div>
                    <div>
                        <div class="fb-post-author-name">
                            ${post.autor}${post.verificado ? ' <span class="fb-verified">✓</span>' : ""}
                        </div>
                        <div class="fb-post-meta">${post.tiempo} · 🌐</div>
                    </div>
                </div>
                <div class="fb-post-header-right">
                    <button class="fb-post-more-btn" aria-label="Más opciones">
                        <svg viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                    </button>
                </div>
            </div>
            <div class="fb-post-text">${post.texto}</div>
            ${post.imagen ? `
            <div class="fb-post-image">
                <img src="${post.imagen}" alt="Imagen de la publicación" class="fb-post-img">
            </div>
            ` : `
            <div class="fb-post-image-placeholder" style="background:${post.emojiBg};">
                <span style="font-size:72px;">${post.emoji}</span>
                <span class="fb-post-image-label">${post.autor}</span>
            </div>
            `}
            <div class="fb-post-stats">
                <div class="fb-post-reactions-summary fb-open-comments" data-post-id="${post.id}">
                    <div class="fb-reaction-emojis">
                        ${post.reacciones.map(e => `<span class="fb-reaction-emoji-icon">${e}</span>`).join("")}
                    </div>
                    <span>${estado.conteo}</span>
                </div>
                <div class="fb-post-right-stats">
                    <span class="fb-post-comments-count fb-open-comments" data-post-id="${post.id}">${post.comentarios} comentarios</span>
                    <span class="fb-post-shares-count">${post.compartidos} veces</span>
                </div>
            </div>
            <div class="fb-post-actions">
                <button class="fb-action-btn fb-like-btn ${likedClass}" data-post-id="${post.id}" aria-label="Me gusta">
                    <div class="fb-reactions-popup" id="fbReactions-${post.id}">
                        <div class="fb-reaction-option" data-emoji="👍" data-post-id="${post.id}">👍<span class="label">Me gusta</span></div>
                        <div class="fb-reaction-option" data-emoji="❤️" data-post-id="${post.id}">❤️<span class="label">Me encanta</span></div>
                        <div class="fb-reaction-option" data-emoji="😂" data-post-id="${post.id}">😂<span class="label">Divertido</span></div>
                        <div class="fb-reaction-option" data-emoji="😮" data-post-id="${post.id}">😮<span class="label">Asombrado</span></div>
                        <div class="fb-reaction-option" data-emoji="😢" data-post-id="${post.id}">😢<span class="label">Triste</span></div>
                        <div class="fb-reaction-option" data-emoji="😡" data-post-id="${post.id}">😡<span class="label">Enojado</span></div>
                    </div>
                    <svg viewBox="0 0 24 24"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>
                    <span class="fb-like-label">${likedLabel}</span>
                </button>
                <button class="fb-action-btn fb-open-comments" data-post-id="${post.id}" aria-label="Comentar">
                    <svg viewBox="0 0 24 24"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"/></svg>
                    Comentar
                </button>
                <button class="fb-action-btn" aria-label="Compartir">
                    <svg viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92z"/></svg>
                    Compartir
                </button>
            </div>
        `;
        container.appendChild(postEl);
    });
}

function etiquetaReaccion(emoji) {
    const mapa = { "👍": "Me gusta", "❤️": "Me encanta", "😂": "Divertido", "😮": "Asombrado", "😢": "Triste", "😡": "Enojado" };
    return mapa[emoji] || "Me gusta";
}

// ---------- COMENTARIOS ----------
function abrirComentarios(postId) {
    const post = POSTS_DATA.find(p => p.id === postId);
    if (!post) return;

    const modal = $("#fbCommentsModal");
    const lista = $("#fbCommentsList");
    if (!modal || !lista) return;

    lista.innerHTML = "";
    post.comentariosData.forEach(com => {
        const el = document.createElement("div");
        el.className = "fb-comment";
        el.innerHTML = `
            <div class="fb-comment-avatar" style="background:${com.color};">
                ${com.avatar ? `<img src="${com.avatar}" alt="${com.autor}" class="fb-avatar-img" onerror="this.style.display='none'; this.parentElement.innerText='${com.iniciales}'">` : com.iniciales}
            </div>
            <div class="fb-comment-right">
                <div class="fb-comment-bubble">
                    <div class="fb-comment-author">${com.autor}</div>
                    <div class="fb-comment-text">${com.texto}</div>
                </div>
                <div class="fb-comment-footer">
                    <span class="fb-comment-time">${com.tiempo}</span>
                    <button class="fb-comment-action">Me gusta</button>
                    <button class="fb-comment-action">Responder</button>
                    ${com.likes > 0 ? `<span class="fb-comment-like-count">👍 ${com.likes}</span>` : ""}
                </div>
            </div>
        `;
        lista.appendChild(el);
    });

    modal.classList.add("activa");
}

function cerrarComentarios() {
    const modal = $("#fbCommentsModal");
    if (modal) modal.classList.remove("activa");
}

// ---------- REACCIONES ----------
let reactionHoldTimer = null;
let reactionPopupOpen = null;

function manejarLike(postId) {
    const estado = reaccionesEstado[postId];
    const post = POSTS_DATA.find(p => p.id === postId);
    if (estado && estado.emoji) {
        reaccionesEstado[postId] = { emoji: null, conteo: post.likes };
    } else {
        reaccionesEstado[postId] = { emoji: " ", conteo: post.likes + 1 };
    }
    renderizarPublicaciones();
}

function mostrarReacciones(postId) {
    cerrarTodosPopups();
    const popup = $(`#fbReactions-${postId}`);
    if (popup) {
        popup.classList.add("visible");
        reactionPopupOpen = postId;
    }
}

function cerrarTodosPopups() {
    document.querySelectorAll(".fb-reactions-popup.visible").forEach(p => p.classList.remove("visible"));
    reactionPopupOpen = null;
}

function aplicarReaccion(emoji, postId) {
    const post = POSTS_DATA.find(p => p.id === postId);
    if (!post) return;
    const yaReaccionado = reaccionesEstado[postId]?.emoji === emoji;
    reaccionesEstado[postId] = yaReaccionado
        ? { emoji: null, conteo: post.likes }
        : { emoji, conteo: post.likes + 1 };
    cerrarTodosPopups();
    renderizarPublicaciones();
}

// ---------- LIGHTBOX ----------
function abrirLightbox(src) {
    const modal = $("#fbLightboxModal");
    const img = $("#fbLightboxImg");
    if (!modal || !img) return;
    img.src = src;
    modal.classList.add("activa");
    modal.setAttribute("aria-hidden", "false");
}

function cerrarLightbox() {
    const modal = $("#fbLightboxModal");
    if (modal) {
        modal.classList.remove("activa");
        modal.setAttribute("aria-hidden", "true");
    }
}

// ---------- GUÍA VISUAL ----------
function actualizarGuiaVisualFacebook(idNivel) {
    if (!idNivel) idNivel = nivelActual;
    if (idNivel === "realizar-publicacion") {
        resaltarElemento(".fb-create-post");
    } else if (idNivel === "reaccionar-foto") {
        resaltarElemento("#fbFeed .fb-post:first-child .fb-like-btn");
    } else if (idNivel === "comentar-publicacion") {
        const modal = $("#fbCommentsModal");
        if (modal && modal.classList.contains("activa")) {
            const inputVal = $("#fbCommentInput") ? $("#fbCommentInput").value.trim() : "";
            if (inputVal.length > 0) {
                resaltarElemento("#fbCommentSend");
            } else {
                resaltarElemento("#fbCommentInput");
            }
        } else {
            resaltarElemento("#fbFeed .fb-post:first-child .fb-open-comments");
        }
    } else if (idNivel === "agregar-amigo") {
        resaltarElemento(".fb-stories");
    } else {
        resaltarElemento("#fbFeed .fb-post:first-child");
    }
}

// ---------- LISTENERS ----------
function inicializarListeners() {
    // Clic en la insignia Nico para repetir instrucción
    const nicoBtn = $("#fbInstructionsBar")?.querySelector(".ws-instructions-nico");
    if (nicoBtn) {
        nicoBtn.onclick = (e) => {
            e.stopPropagation();
            const textEl = $("#fbInstructionsText");
            if (textEl) {
                speak(textEl.textContent);
            }
        };
    }

    // Salir
    const btnSalir = $("#fbSalirBtn");
    if (btnSalir) {
        btnSalir.onclick = () => {
            limpiarResaltados();
            location.hash = "/modulo/Facebook";
        };
    }


    // Cerrar modal comentarios
    $("#fbCommentsClose").onclick = () => {
        cerrarComentarios();
        actualizarGuiaVisualFacebook(nivelActual);
    };

    // Enviar comentario
    const sendBtn = $("#fbCommentSend");
    if (sendBtn) {
        sendBtn.onclick = enviarComentario;
    }
    const input = $("#fbCommentInput");
    if (input) {
        input.oninput = () => {
            if (input.value.trim().length > 0) {
                resaltarElemento("#fbCommentSend");
            } else {
                resaltarElemento("#fbCommentInput");
            }
        };
        input.onkeypress = (e) => { if (e.key === "Enter") enviarComentario(); };
    }

    // Feed delegado
    const feed = $("#fbFeed");
    if (feed) {
        feed.addEventListener("click", (e) => {
            const reaccionOption = e.target.closest(".fb-reaction-option");
            if (reaccionOption) {
                aplicarReaccion(reaccionOption.dataset.emoji, parseInt(reaccionOption.dataset.postId));
                return;
            }

            const btnComentarios = e.target.closest(".fb-open-comments");
            if (btnComentarios) {
                abrirComentarios(parseInt(btnComentarios.dataset.postId));
                return;
            }

            const likeBtn = e.target.closest(".fb-like-btn");
            if (likeBtn && !e.target.closest(".fb-reactions-popup")) {
                manejarLike(parseInt(likeBtn.dataset.postId));
                return;
            }

            const postImg = e.target.closest(".fb-post-img");
            if (postImg) {
                abrirLightbox(postImg.src);
                return;
            }

            if (!e.target.closest(".fb-like-btn") && !e.target.closest(".fb-reactions-popup")) {
                cerrarTodosPopups();
            }
        });

        // Hold para reacciones - Touch
        feed.addEventListener("touchstart", (e) => {
            const likeBtn = e.target.closest(".fb-like-btn");
            if (!likeBtn) return;
            const postId = parseInt(likeBtn.dataset.postId);
            reactionHoldTimer = setTimeout(() => mostrarReacciones(postId), 600);
        }, { passive: true });

        feed.addEventListener("touchend", () => {
            clearTimeout(reactionHoldTimer);
            reactionHoldTimer = null;
        }, { passive: true });

        // Hold para reacciones - Mouse
        feed.addEventListener("mousedown", (e) => {
            const likeBtn = e.target.closest(".fb-like-btn");
            if (!likeBtn) return;
            reactionHoldTimer = setTimeout(() => mostrarReacciones(parseInt(likeBtn.dataset.postId)), 600);
        });

        feed.addEventListener("mouseup", () => {
            clearTimeout(reactionHoldTimer);
            reactionHoldTimer = null;
        });
    }

    // Cerrar popup si se hace click fuera (bubbling al document)
    document.addEventListener("click", (e) => {
        if (reactionPopupOpen !== null) {
            if (!e.target.closest(".fb-like-btn") && !e.target.closest(".fb-reactions-popup")) {
                cerrarTodosPopups();
            }
        }
    });

    // Lightbox listeners
    const lightboxClose = $("#fbLightboxClose");
    if (lightboxClose) {
        lightboxClose.onclick = cerrarLightbox;
    }
    const lightboxModal = $("#fbLightboxModal");
    if (lightboxModal) {
        lightboxModal.onclick = (e) => {
            if (e.target.id === "fbLightboxModal") {
                cerrarLightbox();
            }
        };
    }
}

function enviarComentario() {
    const input = $("#fbCommentInput");
    if (!input || !input.value.trim()) return;
    const texto = input.value.trim();
    const lista = $("#fbCommentsList");
    if (lista) {
        const el = document.createElement("div");
        el.className = "fb-comment";
        el.innerHTML = `
            <div class="fb-comment-avatar" style="background:#1877f2;">
                <img src="./assets/img/facebook/user_profile.png" alt="Tú" class="fb-avatar-img" onerror="this.style.display='none'; this.parentElement.innerText='TU'">
            </div>
            <div class="fb-comment-right">
                <div class="fb-comment-bubble">
                    <div class="fb-comment-author">Tú</div>
                    <div class="fb-comment-text">${texto}</div>
                </div>
                <div class="fb-comment-footer">
                    <span class="fb-comment-time">Ahora</span>
                    <button class="fb-comment-action">Me gusta</button>
                    <button class="fb-comment-action">Responder</button>
                </div>
            </div>
        `;
        lista.appendChild(el);
        lista.scrollTop = lista.scrollHeight;
    }
    input.value = "";
}

// ---------- PUNTO DE ENTRADA ----------
export function iniciarSimulador(idNivel) {
    nivelActual = idNivel;
    reaccionesEstado = {};

    asegurarTemplateHTML();

    document.querySelectorAll(".pantalla").forEach(p => p.classList.remove("activa"));
    const sim = $("#pantallaFacebookSimulador");
    if (sim) sim.classList.add("activa");

    renderizarPublicaciones();

    const textEl = $("#fbInstructionsText");
    const msg = INSTRUCCIONES[idNivel] || "Explora el feed de Facebook. Puedes reaccionar y ver comentarios.";
    if (textEl) {
        textEl.textContent = msg;
    }
    speak(msg);
    actualizarGuiaVisualFacebook(idNivel);

    if (!simuladorInicializado) {
        inicializarListeners();
        simuladorInicializado = true;
    }
}
