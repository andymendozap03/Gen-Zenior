import { $ } from "../../utils/dom.js";
import { speak, speakPrioritario, stopSpeech } from "../../services/speech.service.js";
import { resaltarElemento, limpiarResaltados } from "../../services/guide-highlight.service.js";
import { completarNivel } from "../../services/progress.service.js";

let simuladorInicializado = false;
let nivelActual = null;
let reaccionesEstado = {}; // postId -> { emoji, conteo }
let subPasoNivel1 = 1;
let rondaNivel1 = 1; // 1 = primera publicación (con foto y etiqueta), 2 = repaso rápido (solo texto)
let fotoSeleccionadaNivel1 = null;
let etiquetaSeleccionadaNivel1 = null;
let subPasoNivel2 = 1;
let rondaNivel2 = 1; // 1 = primera publicación (María), 2 = repaso en otra publicación (Recetas)
let postObjetivoNivel2 = 1; // id del post donde se guía la reacción (1 en ronda 1, 3 en ronda 2)
let ultimaReaccionElegidaNivel2 = "👍";
let subPasoNivel3 = 1;
let rondaNivel3 = 1; // 1 = primer comentario (María), 2 = repaso en otra publicación (Club de Adultos Activos)
let postObjetivoNivel3 = 1; // id del post donde se guía el comentario (1 en ronda 1, 4 en ronda 2)
let subPasoNivel4 = 1;
let rondaNivel4 = 1;
let solicitudConfirmada = false;   // ya practicó aceptar
let solicitudEliminada = false;    // ya practicó rechazar // 1 = primera solicitud (Rosa Elena), 2 = repaso con Carlos Méndez o Beatriz Soto
let subPasoNivel5 = 1;
let rondaNivel5 = 1; // 1 y 2 = deslizar hacia arriba (siguiente, dos veces), 3 = deslizar hacia abajo (anterior)
let reelActualIdx = 0;
let reelLikeYaDado = false;
// Ritmo de la guía: pausa tras la voz de Nico antes de pasar al siguiente
// paso, y espera equivalente cuando no llegó a hablar.
// Volumen de los Reels: bajo a propósito, para que la voz de Nico se
// entienda por encima del video.
const VOLUMEN_REEL = 0.22;
let esperandoToqueParaSonido = false;

const PAUSA_TRAS_VOZ = 900;
const ESPERA_SIN_VOZ = 2200;

let respondiendoAComentarioReel = null; // índice del comentario del Reel al que se responde
let respondiendoAComentario = null;     // índice del comentario del muro al que se responde
let reelSwipeStartY = null;
let reelArrastrandoMouse = false;

// Gesto de reacción del Nivel 2: mantener presionado, arrastrar y soltar
let gestoReaccionPostId = null;
let gestoReaccionActivo = false;
let opcionReaccionEnfocada = null;
let momentoFinGestoReaccion = 0;
let pestanaActiva = "inicio";
let activeCommentsPostId = 1;
let ultimaInstruccionHablada = "";

// ---------- DATOS DE PUBLICACIONES ----------
// Catálogo original del feed. Nunca se modifica: al empezar cada nivel se hace
// una copia limpia en POSTS_DATA, porque publicar y comentar sí modifican el
// arreglo (y si no, las publicaciones y los comentarios de una partida se
// quedaban para toda la sesión).
const POSTS_ORIGINAL = [
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

// Copia de trabajo: es la que se renderiza y la que se modifica al publicar o
// comentar. Se regenera en iniciarSimulador().
let POSTS_DATA = JSON.parse(JSON.stringify(POSTS_ORIGINAL));

// ---------- INSTRUCCIONES POR DEFECTO ----------
const INSTRUCCIONES = {
    "realizar-publicacion": "Toca en '¿Qué estás pensando?' para escribir una nueva publicación.",
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
            <button class="fb-nav-tab activa" data-tab="inicio" aria-label="Inicio">
                <svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            </button>
            <button class="fb-nav-tab" data-tab="amigos" aria-label="Amigos">
                <svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                <span class="fb-badge" id="fbAmigosBadge">2</span>
            </button>
            <button class="fb-nav-tab" data-tab="video" aria-label="Video">
                <svg viewBox="0 0 24 24"><path d="M21 3H3C2 3 1 4 1 5v14c0 1.1.9 2 2 2h18c1 0 2-1 2-2V5c0-1-1-2-2-2zm-9 13l-5-3.19V18H5V6h2v4.19L12 7l7 4.5-7 4.5z"/></svg>
            </button>
            <button class="fb-nav-tab" data-tab="marketplace" aria-label="Marketplace">
                <svg viewBox="0 0 24 24"><path d="M11 9h2V6h3V4h-3V1h-2v3H8v2h3v3zm-4 9c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2zm-8.9-5h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0 0 19.96 4H5.21L4.27 2H1v2h2l3.6 7.59-1.35 2.44C4.52 15.37 5.48 17 7 17h12v-2H7.42c-.14 0-.25-.11-.32-.26z"/></svg>
            </button>
            <button class="fb-nav-tab" data-tab="grupos" aria-label="Grupos">
                <svg viewBox="0 0 24 24"><path d="M16.5 13c-1.2 0-3.07.34-4.5 1-1.43-.67-3.3-1-4.5-1C5.33 13 1 14.08 1 16.25V19h22v-2.75c0-2.17-4.33-3.25-6.5-3.25zm-4 4.5h-10v-.75C2.5 15.92 5.23 15 7.5 15c2.27 0 5 .92 5 1.75v.75zm9 0H14v-.75c0-.68-.21-1.35-.59-1.95.87-.27 1.76-.3 2.09-.3 2.27 0 5 .92 5 1.75v.75zM7.5 12c1.93 0 3.5-1.57 3.5-3.5S9.43 5 7.5 5 4 6.57 4 8.5 5.57 12 7.5 12zm0-5c.83 0 1.5.67 1.5 1.5S8.33 10 7.5 10 6 9.33 6 8.5 6.67 7 7.5 7zm9 5c1.93 0 3.5-1.57 3.5-3.5S18.43 5 16.5 5 13 6.57 13 8.5 14.57 12 16.5 12zm0-5c.83 0 1.5.67 1.5 1.5S17.33 10 16.5 10 15 9.33 15 8.5 15.67 7 16.5 7z"/></svg>
            </button>
            <button class="fb-nav-tab" data-tab="menu" aria-label="Menú">
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

            <!-- Crear publicación trigger -->
            <div class="fb-create-post" id="fbTriggerCreatePost" role="button" tabindex="0" aria-label="Crear publicación">
                <div class="fb-create-post-row">
                    <div class="fb-create-avatar">
                        <img src="./assets/img/facebook/user_profile.png" alt="Tú" class="fb-avatar-img">
                    </div>
                    <div class="fb-create-input">¿Qué estás pensando?</div>
                </div>
                <div class="fb-create-actions">
                    <button class="fb-create-action-btn" type="button">
                        <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:#f02849;"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
                        Video en vivo
                    </button>
                    <button class="fb-create-action-btn" type="button">
                        <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:#45bd62;"><circle cx="12" cy="12" r="3.2"/><path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>
                        Foto/video
                    </button>
                    <button class="fb-create-action-btn" type="button">
                        <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:#f7b928;"><circle cx="12" cy="12" r="10"/><path d="M12 16c2.2 0 4-1.8 4-4H8c0 2.2 1.8 4 4 4zm-3-6c.6 0 1-.4 1-1s-.4-1-1-1-1 .4-1 1 .4 1 1 1zm6 0c.6 0 1-.4 1-1s-.4-1-1-1-1 .4-1 1 .4 1 1 1z"/></svg>
                        Sentimiento
                    </button>
                </div>
            </div>

            <!-- Publicaciones dinámicas -->
            <div id="fbPostsContainer"></div>
        </div>

        <!-- Vista de Amigos / Solicitudes (Nivel 4) -->
        <div id="fbFriendsView" class="fb-friends-view" style="display:none;">
            <div class="fb-friends-header">
                <h2 class="fb-friends-title">Amigos</h2>
                <div class="fb-friends-filters">
                    <button class="fb-friends-filter-btn activa" type="button">Sugerencias</button>
                    <button class="fb-friends-filter-btn" type="button">Tus amigos</button>
                </div>
            </div>

            <!-- Solicitudes que TE han enviado a ti (Nivel 4, ronda 2) -->
            <div class="fb-friends-section-title">
                <span>Solicitudes de amistad</span>
                <span class="fb-friends-section-count" id="fbSolicitudesCount">2</span>
            </div>

            <div class="fb-requests-list" id="fbRequestsList">
                <div class="fb-request-card" data-request="lucia">
                    <div class="fb-friend-avatar" style="background:#7e57c2;">
                        <span>LC</span>
                    </div>
                    <div class="fb-friend-info">
                        <div class="fb-friend-name">Lucía Campos</div>
                        <div class="fb-friend-mutual">
                            <span class="fb-mutual-icon">👥</span> 6 amigos en común
                        </div>
                        <div class="fb-friend-actions">
                            <button class="fb-btn-confirm-request" data-request="lucia" type="button">Confirmar</button>
                            <button class="fb-btn-delete-request" data-request="lucia" type="button">Eliminar</button>
                        </div>
                    </div>
                </div>

                <div class="fb-request-card" data-request="hector">
                    <div class="fb-friend-avatar" style="background:#00897b;">
                        <span>HV</span>
                    </div>
                    <div class="fb-friend-info">
                        <div class="fb-friend-name">Héctor Vera</div>
                        <div class="fb-friend-mutual">
                            <span class="fb-mutual-icon">👥</span> 3 amigos en común
                        </div>
                        <div class="fb-friend-actions">
                            <button class="fb-btn-confirm-request" data-request="hector" type="button">Confirmar</button>
                            <button class="fb-btn-delete-request" data-request="hector" type="button">Eliminar</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="fb-friends-section-title">
                <span>Personas que quizás conozcas</span>
            </div>

            <div class="fb-friends-list">
                <!-- Tarjeta Rosa Elena Morales (Objetivo Nivel 4) -->
                <div class="fb-friend-card" id="fbFriendCardRosa">
                    <div class="fb-friend-avatar" style="background:#e91e8c;">
                        <span>RM</span>
                    </div>
                    <div class="fb-friend-info">
                        <div class="fb-friend-name">Rosa Elena Morales</div>
                        <div class="fb-friend-mutual">
                            <span class="fb-mutual-icon">👥</span> 2 amigos en común: María Fernanda y 1 más
                        </div>
                        <div class="fb-friend-actions">
                            <button id="fbAddFriendBtn-rosa" class="fb-btn-add-friend" data-friend="rosa" type="button">
                                <svg viewBox="0 0 24 24"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                                Agregar a amigos
                            </button>
                            <button class="fb-btn-delete-friend" data-friend="rosa" type="button">Eliminar</button>
                        </div>
                    </div>
                </div>

                <!-- Tarjeta Carlos Méndez (Decorativo) -->
                <div class="fb-friend-card" id="fbFriendCardCarlos">
                    <div class="fb-friend-avatar" style="background:#2196f3;">
                        <span>CM</span>
                    </div>
                    <div class="fb-friend-info">
                        <div class="fb-friend-name">Carlos Méndez</div>
                        <div class="fb-friend-mutual">
                            <span class="fb-mutual-icon">👥</span> 4 amigos en común
                        </div>
                        <div class="fb-friend-actions">
                            <button class="fb-btn-add-friend" data-friend="carlos" type="button">
                                <svg viewBox="0 0 24 24"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                                Agregar a amigos
                            </button>
                            <button class="fb-btn-delete-friend" data-friend="carlos" type="button">Eliminar</button>
                        </div>
                    </div>
                </div>

                <!-- Tarjeta Beatriz Soto (Decorativo) -->
                <div class="fb-friend-card" id="fbFriendCardBeatriz">
                    <div class="fb-friend-avatar" style="background:#ff9800;">
                        <span>BS</span>
                    </div>
                    <div class="fb-friend-info">
                        <div class="fb-friend-name">Beatriz Soto</div>
                        <div class="fb-friend-mutual">
                            <span class="fb-mutual-icon">👥</span> 1 amigo en común
                        </div>
                        <div class="fb-friend-actions">
                            <button class="fb-btn-add-friend" data-friend="beatriz" type="button">
                                <svg viewBox="0 0 24 24"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                                Agregar a amigos
                            </button>
                            <button class="fb-btn-delete-friend" data-friend="beatriz" type="button">Eliminar</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Buscador de personas (Nivel 4, ronda 2) -->
        <div id="fbSearchView" class="fb-search-view" style="display:none;">
            <div class="fb-search-header">
                <button id="fbSearchVolver" class="fb-messenger-volver" type="button" aria-label="Volver">
                    <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                </button>
                <input type="text" id="fbSearchInput" class="fb-search-input" placeholder="Buscar personas" autocomplete="off">
                <button id="fbSearchGo" class="fb-search-go" type="button" aria-label="Buscar">
                    <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                </button>
            </div>

            <div id="fbSearchSugerencias" class="fb-search-sugerencias">
                <p class="fb-search-sugerencias-titulo">Prueba a buscar por nombre</p>
                <button class="fb-search-chip" data-nombre="Rafael" type="button">Rafael</button>
                <button class="fb-search-chip" data-nombre="María" type="button">María</button>
                <button class="fb-search-chip" data-nombre="Carlos" type="button">Carlos</button>
            </div>

            <div id="fbSearchResultados" class="fb-search-resultados"></div>
        </div>

        <!-- Vista de Reels / Video (Nivel 5) -->
        <div id="fbReelsView" class="fb-reels-view" style="display:none;">

            <!-- Header de Reels -->
            <div class="fb-reels-header">
                <span class="fb-reels-header-title">Reels</span>
                <div class="fb-reels-header-icons">
                    <button class="fb-reels-icon-btn" aria-label="Buscar Reels">
                        <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                    </button>
                    <button class="fb-reels-icon-btn" aria-label="Cámara">
                        <svg viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
                    </button>
                </div>
            </div>

            <!-- Reproductor de Reel activo -->
            <div class="fb-reel-player-wrapper">
                <div id="fbReelPlayer" class="fb-reel-player">
                    <!-- Video -->
                    <video id="fbReelVideo" class="fb-reel-video"
                        loop playsinline preload="none"
                        poster="./assets/img/reels/piolin.jpg">
                    </video>
                    
                    <!-- Overlay de info -->
                    <div class="fb-reel-overlay">

                        <!-- Info del creador (izquierda, ocupa el espacio flexible) -->
                        <div class="fb-reel-info">
                            <div class="fb-reel-creator">
                                <div class="fb-reel-avatar" id="fbReelAvatar">💪</div>
                                <div class="fb-reel-creator-details">
                                    <span class="fb-reel-creator-name" id="fbReelCreatorName">@SaludActiva</span>
                                    <button class="fb-reel-follow-btn" id="fbReelFollowBtn" type="button">Seguir</button>
                                </div>
                            </div>
                            <div class="fb-reel-description" id="fbReelDescription">
                                Ejercicios suaves para empezar el día 💪
                            </div>
                            <div class="fb-reel-audio">
                                <svg viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                                <span id="fbReelAudioLabel">Sonido original · @SaludActiva</span>
                            </div>
                        </div>

                        <!-- Acciones apiladas (derecha), igual que Facebook real -->
                        <div class="fb-reel-actions">
                            <button id="fbReelLikeBtn" class="fb-reel-action-btn" aria-label="Me gusta">
                                <svg viewBox="0 0 24 24" id="fbReelLikeIcon"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                                <span id="fbReelLikeCount" class="fb-reel-action-label">847</span>
                            </button>
                            <button class="fb-reel-action-btn" id="fbReelCommentBtn" type="button" aria-label="Comentar">
                                <svg viewBox="0 0 24 24"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"/></svg>
                                <span class="fb-reel-action-label" id="fbReelCommentCount">32</span>
                            </button>
                            <button class="fb-reel-action-btn" id="fbReelShareBtn" type="button" aria-label="Compartir">
                                <svg viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>
                                <span class="fb-reel-action-label">Compartir</span>
                            </button>
                        </div>

                    </div>

                    <!-- Contador de reel -->
                    <div class="fb-reel-counter" id="fbReelCounter">1 / 6</div>

                    <!-- Aviso visual del gesto de deslizar (solo durante el paso guiado del Nivel 5) -->
                    <!-- Enseña el gesto en vez de dar un zoom al video: un dedo
                         recorre la pantalla en la dirección que toca, con tres
                         flechas encadenadas marcando el camino. -->
                    <div id="fbReelSwipeHint" class="fb-reel-swipe-hint" style="display:none;">
                        <div class="fb-swipe-pista">
                            <span class="fb-swipe-flecha f1"></span>
                            <span class="fb-swipe-flecha f2"></span>
                            <span class="fb-swipe-flecha f3"></span>
                            <span class="fb-swipe-dedo">👆</span>
                        </div>
                        <span id="fbReelSwipeHintText" class="fb-swipe-texto">Desliza hacia arriba</span>
                    </div>

                    <!-- Respaldo del gesto: mismas acciones que deslizar, para quien no
                         logre el arrastre (ratón poco preciso, pulso, lápiz). El gesto
                         sigue siendo lo que se enseña; esto solo evita quedarse atascado. -->
                    <div class="fb-reel-fallback-nav">
                        <button id="fbReelPrevBtn" class="fb-reel-fallback-btn" aria-label="Reel anterior" style="display:none;">
                            <svg viewBox="0 0 24 24"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6 1.41 1.41z"/></svg>
                        </button>
                        <button id="fbReelNextBtn" class="fb-reel-fallback-btn" aria-label="Siguiente Reel">
                            <svg viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
                        </button>
                    </div>

                </div>
            </div>

        </div>

        <!-- Modal de Crear Publicación (Nivel 1) -->
        <div id="fbCreatePostModal" class="fb-create-modal" aria-hidden="true">
            <div class="fb-create-modal-content">
                <div class="fb-create-modal-header">
                    <h3 class="fb-create-modal-title">Crear publicación</h3>
                    <button id="fbCreatePostClose" class="fb-create-modal-close" aria-label="Cerrar ventana de publicación">✕</button>
                </div>
                
                <div class="fb-create-user-info">
                    <div class="fb-create-avatar-wrapper">
                        <img src="./assets/img/facebook/user_profile.png" alt="Tú" class="fb-avatar-img fb-create-avatar-img">
                    </div>
                    <div class="fb-create-user-details">
                        <span class="fb-create-username">Ramona Pico</span>
                        <div class="fb-create-audience-tag">
                            <span>🌐 Público</span>
                        </div>
                    </div>
                </div>

                <div class="fb-create-input-area">
                    <textarea id="fbCreatePostTextarea" class="fb-create-textarea" placeholder="¿Qué estás pensando, Ramona?" rows="4"></textarea>
                </div>

                <!-- Frases sugeridas para accesibilidad -->
                <div class="fb-quick-suggestions">
                    <span class="fb-suggestions-title">💡 Frases sugeridas (toca para elegir una):</span>
                    <div class="fb-suggestions-list">
                        <button type="button" class="fb-suggestion-chip" data-text="¡Qué hermoso día para compartir con la familia! ☀️🌸">¡Qué hermoso día! ☀️</button>
                        <button type="button" class="fb-suggestion-chip" data-text="Un saludo muy especial con mucho cariño para todos ❤️">Un saludo para todos ❤️</button>
                        <button type="button" class="fb-suggestion-chip" data-text="¡Disfrutando de la tarde y agradeciendo por todo! ☕✨">Disfrutando la tarde ☕</button>
                    </div>
                </div>

                <div class="fb-create-addons">
                    <span class="fb-create-addons-label">Agregar a tu publicación</span>
                    <div class="fb-create-addons-icons">
                        <button type="button" id="fbAddonFotoBtn" class="fb-addon-icon-btn" aria-label="Foto/video">
                            <svg viewBox="0 0 24 24" style="fill:#45bd62;"><circle cx="12" cy="12" r="3.2"/><path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>
                        </button>
                        <button type="button" id="fbAddonTagBtn" class="fb-addon-icon-btn" aria-label="Etiquetar personas">
                            <svg viewBox="0 0 24 24" style="fill:#1877f2;"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                        </button>
                        <button type="button" class="fb-addon-icon-btn" aria-label="Sentimiento/actividad">
                            <svg viewBox="0 0 24 24" style="fill:#f7b928;"><circle cx="12" cy="12" r="10"/><path d="M12 16c2.2 0 4-1.8 4-4H8c0 2.2 1.8 4 4 4zm-3-6c.6 0 1-.4 1-1s-.4-1-1-1-1 .4-1 1 .4 1 1 1zm6 0c.6 0 1-.4 1-1s-.4-1-1-1-1 .4-1 1 .4 1 1 1z"/></svg>
                        </button>
                    </div>
                    <div id="fbCreateAttachments" class="fb-create-attachments"></div>
                </div>

                <!-- Popups de selección de foto y etiqueta (se reubican en document.body para no quedar recortados por el overflow:hidden del modal) -->
                <div id="fbPhotoPickerPopup" class="fb-photo-picker-popup">
                    <div class="fb-photo-picker-option" data-photo="mascota">
                        <img src="./assets/img/facebook/mascota.png" alt="Foto de mascota">
                        <span>Mascota</span>
                    </div>
                    <div class="fb-photo-picker-option" data-photo="vacaciones">
                        <img src="./assets/img/facebook/vacaciones.png" alt="Foto de vacaciones">
                        <span>Vacaciones</span>
                    </div>
                </div>
                <div id="fbTagPickerPopup" class="fb-tag-picker-popup">
                    <div class="fb-tag-option" data-nombre="María Fernanda López" data-iniciales="ML" data-color="#e91e8c">
                        <span class="fb-tag-option-avatar" style="background:#e91e8c;">ML</span>
                        <span>María Fernanda López</span>
                    </div>
                    <div class="fb-tag-option" data-nombre="Carmen Ruiz" data-iniciales="CR" data-color="#9c27b0">
                        <span class="fb-tag-option-avatar" style="background:#9c27b0;">CR</span>
                        <span>Carmen Ruiz</span>
                    </div>
                    <div class="fb-tag-option" data-nombre="Rosa Elena Morales" data-iniciales="RM" data-color="#2196f3">
                        <span class="fb-tag-option-avatar" style="background:#2196f3;">RM</span>
                        <span>Rosa Elena Morales</span>
                    </div>
                </div>

                <button id="fbCreatePostSubmitBtn" class="fb-create-submit-btn" disabled>Publicar</button>
            </div>
        </div>

        <!-- Modal de comentarios -->
        <div id="fbCommentsModal" class="fb-comments-modal">
            <div class="fb-comments-header">
                <span class="fb-comments-title">Comentarios</span>
                <button id="fbCommentsClose" class="fb-comments-close" aria-label="Cerrar comentarios">✕</button>
            </div>
            <div class="fb-comments-sort">
                Más relevantes
                <svg viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>
            </div>
            <div id="fbCommentsList" class="fb-comments-list"></div>

            <!-- Frases sugeridas para comentarios -->
            <div class="fb-comments-quick-suggestions">
                <div class="fb-comments-suggestions-list">
                    <button type="button" class="fb-comment-suggestion-chip" data-text="¡Qué hermosa foto! 🌸">¡Qué hermosa foto! 🌸</button>
                    <button type="button" class="fb-comment-suggestion-chip" data-text="¡Totalmente de acuerdo contigo! 😊">Totalmente de acuerdo 😊</button>
                    <button type="button" class="fb-comment-suggestion-chip" data-text="¡Un abrazo con mucho cariño! ❤️">Un abrazo con cariño ❤️</button>
                </div>
            </div>

            <div id="fbRespondiendoA" class="fb-respondiendo-a" style="display:none;"></div>

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

        <!-- Comentarios de un Reel (Nivel 5) -->
        <div id="fbReelCommentsPanel" class="fb-reel-sheet">
            <div class="fb-reel-sheet-panel">
                <div class="fb-reel-sheet-header">
                    <span class="fb-reel-sheet-title">Comentarios</span>
                    <button class="fb-reel-sheet-close" id="fbReelCommentsClose" type="button" aria-label="Cerrar">✕</button>
                </div>

                <div class="fb-reel-comments-list" id="fbReelCommentsList"></div>

                <div id="fbReelRespondiendo" class="fb-reel-respondiendo" style="display:none;"></div>

                <div class="fb-reel-comment-bar">
                    <div class="fb-comment-input-avatar">
                        <img src="./assets/img/facebook/user_profile.png" alt="Tú" class="fb-avatar-img">
                    </div>
                    <input type="text" id="fbReelCommentInput" class="fb-comment-input" placeholder="Escribe un comentario...">
                    <button id="fbReelCommentSend" class="fb-comment-send-btn" type="button" aria-label="Enviar comentario">
                        <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                    </button>
                </div>
            </div>
        </div>

        <!-- Compartir un Reel (Nivel 5) -->
        <div id="fbReelSharePanel" class="fb-reel-sheet">
            <div class="fb-reel-sheet-panel">
                <div class="fb-reel-sheet-header">
                    <span class="fb-reel-sheet-title">Compartir</span>
                    <button class="fb-reel-sheet-close" id="fbReelShareClose" type="button" aria-label="Cerrar">✕</button>
                </div>

                <div class="fb-reel-share-options" id="fbReelShareOptions">
                    <button class="fb-reel-share-option" data-destino="Messenger" type="button">
                        <span class="fb-reel-share-icon" style="background:#0084ff;">💬</span>
                        <span>Enviar por Messenger</span>
                    </button>
                    <button class="fb-reel-share-option" data-destino="tu biografía" type="button">
                        <span class="fb-reel-share-icon" style="background:#1877f2;">📋</span>
                        <span>Compartir en tu biografía</span>
                    </button>
                    <button class="fb-reel-share-option" data-destino="WhatsApp" type="button">
                        <span class="fb-reel-share-icon" style="background:#25d366;">📱</span>
                        <span>Enviar por WhatsApp</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- Messenger: al compartir por aquí se abre de verdad para elegir a quién -->
        <div id="fbMessengerPanel" class="fb-messenger-panel">
            <div class="fb-messenger-header">
                <button class="fb-messenger-volver" id="fbMessengerVolver" type="button" aria-label="Volver">
                    <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                </button>
                <span class="fb-messenger-titulo">Messenger</span>
            </div>

            <div class="fb-messenger-aviso">
                <span class="fb-messenger-aviso-icono">🎬</span>
                <span>Vas a enviar este Reel. Elige a quién.</span>
            </div>

            <div class="fb-messenger-lista" id="fbMessengerLista">
                <div class="fb-messenger-chat">
                    <div class="fb-friend-avatar" style="background:#3f51b5;"><span>JN</span></div>
                    <div class="fb-messenger-chat-info">
                        <div class="fb-messenger-chat-nombre">Juan (Nieto)</div>
                        <div class="fb-messenger-chat-estado">Activo ahora</div>
                    </div>
                    <button class="fb-messenger-enviar" data-nombre="Juan" type="button">Enviar</button>
                </div>
                <div class="fb-messenger-chat">
                    <div class="fb-friend-avatar" style="background:#e91e8c;"><span>MF</span></div>
                    <div class="fb-messenger-chat-info">
                        <div class="fb-messenger-chat-nombre">María Fernanda</div>
                        <div class="fb-messenger-chat-estado">Activa hace 10 min</div>
                    </div>
                    <button class="fb-messenger-enviar" data-nombre="María Fernanda" type="button">Enviar</button>
                </div>
                <div class="fb-messenger-chat">
                    <div class="fb-friend-avatar" style="background:#00897b;"><span>FM</span></div>
                    <div class="fb-messenger-chat-info">
                        <div class="fb-messenger-chat-nombre">Familia Mendoza</div>
                        <div class="fb-messenger-chat-estado">Grupo · 6 personas</div>
                    </div>
                    <button class="fb-messenger-enviar" data-nombre="la Familia Mendoza" type="button">Enviar</button>
                </div>
            </div>
        </div>

        <!-- Menú de un comentario propio (Nivel 3) -->
        <div id="fbCommentMenu" class="fb-comment-menu">
            <div class="fb-comment-menu-panel">
                <button class="fb-comment-menu-opcion fb-comment-menu-eliminar" id="fbCommentMenuEliminar" type="button">
                    <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                    <span>Eliminar</span>
                </button>
                <button class="fb-comment-menu-opcion" id="fbCommentMenuCancelar" type="button">
                    <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    <span>Cancelar</span>
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

        <!-- Modal de Éxito Estándar -->
        <div id="fbModalExito" class="fb-modal-exito">
            <div class="fb-success-container">
                <img src="./assets/img/icons/trofeo.svg" alt="Trofeo" class="fb-success-trophy">
                <h2>¡Nivel Completado!</h2>
                <p id="fbSuccessMessage">¡Has realizado la acción con éxito!</p>
                <button id="fbSuccessBtnContinuar" class="fb-success-btn-continuar">Continuar</button>
            </div>
        </div>
    `;

    // Los popups de foto y etiqueta se reubican en document.body (position:fixed calculado por JS)
    // para que nunca queden recortados por el overflow:hidden del modal de crear publicación.
    const fotoPopupEl = $("#fbPhotoPickerPopup");
    if (fotoPopupEl) document.body.appendChild(fotoPopupEl);
    const tagPopupEl = $("#fbTagPickerPopup");
    if (tagPopupEl) document.body.appendChild(tagPopupEl);
}

// ---------- POSICIONAMIENTO DE POPUPS FLOTANTES (evita recortes por overflow:hidden) ----------
function posicionarPopupCerca(popupEl, anchorEl) {
    if (!popupEl || !anchorEl) return;

    const margen = 10;
    const rectAnchor = anchorEl.getBoundingClientRect();
    const rectPopup = popupEl.getBoundingClientRect();

    // Los íconos de Foto/Etiqueta están justo encima del botón "Publicar", con muy poco
    // espacio libre debajo. Por eso se prefiere abrir el popup HACIA ARRIBA del ícono
    // (así nunca tapa el botón "Publicar"); solo si no cabe arriba, se abre hacia abajo.
    const espacioArriba = rectAnchor.top - margen;
    const espacioAbajo = window.innerHeight - rectAnchor.bottom - margen;
    let top;

    if (rectPopup.height <= espacioArriba || espacioArriba >= espacioAbajo) {
        top = rectAnchor.top - rectPopup.height - margen;
    } else {
        top = rectAnchor.bottom + margen;
    }

    // Asegurar que quede siempre dentro del viewport vertical
    if (top < margen) top = margen;
    if (top + rectPopup.height > window.innerHeight - margen) {
        top = Math.max(margen, window.innerHeight - rectPopup.height - margen);
    }

    let left = rectAnchor.right - rectPopup.width;
    if (left < margen) left = margen;
    if (left + rectPopup.width > window.innerWidth - margen) {
        left = window.innerWidth - rectPopup.width - margen;
    }

    popupEl.style.top = `${top}px`;
    popupEl.style.left = `${left}px`;
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

        const holdHintHtml = (nivelActual === "reaccionar-foto" && subPasoNivel2 === 1 && post.id === postObjetivoNivel2)
            ? `<span class="fb-hold-hint">👆 Deja presionado</span>`
            : "";

        postEl.innerHTML = `
            <div class="fb-post-header">
                <div class="fb-post-header-left">
                    <div class="fb-post-avatar" style="background:${post.color || '#1877f2'};">
                        ${post.avatar ? `<img src="${post.avatar}" alt="${post.autor}" class="fb-avatar-img" onerror="this.style.display='none'; this.parentElement.innerText='${post.iniciales || 'U'}'">` : (post.iniciales || 'U')}
                    </div>
                    <div>
                        <div class="fb-post-author-name">
                            ${post.autor}${post.verificado ? ' <span class="fb-verified">✓</span>' : ""}${post.etiqueta ? ` <span class="fb-post-etiqueta">está con <strong>${post.etiqueta}</strong></span>` : ""}
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
            ` : (post.emoji ? `
            <div class="fb-post-image-placeholder" style="background:${post.emojiBg || '#1877f2'};">
                <span style="font-size:72px;">${post.emoji}</span>
                <span class="fb-post-image-label">${post.autor}</span>
            </div>
            ` : '')}
            <div class="fb-post-stats">
                <div class="fb-post-reactions-summary fb-open-comments" data-post-id="${post.id}">
                    <div class="fb-reaction-emojis">
                        ${post.reacciones && post.reacciones.length > 0 ? post.reacciones.map(e => `<span class="fb-reaction-emoji-icon">${e}</span>`).join("") : '<span>👍</span>'}
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
                    ${holdHintHtml}
                    <div class="fb-reactions-popup" id="fbReactions-${post.id}">
                        <div class="fb-reaction-option" data-emoji="👍" data-post-id="${post.id}">👍<span class="label">Me gusta</span></div>
                        <div class="fb-reaction-option" data-emoji="❤️" data-post-id="${post.id}">❤️<span class="label">Me encanta</span></div>
                        <div class="fb-reaction-option" data-emoji="😂" data-post-id="${post.id}">😂<span class="label">Me divierte</span></div>
                        <div class="fb-reaction-option" data-emoji="😮" data-post-id="${post.id}">😮<span class="label">Me asombra</span></div>
                        <div class="fb-reaction-option" data-emoji="😢" data-post-id="${post.id}">😢<span class="label">Me entristece</span></div>
                        <div class="fb-reaction-option" data-emoji="😡" data-post-id="${post.id}">😡<span class="label">Me enoja</span></div>
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
    const mapa = { "👍": "Me gusta", "❤️": "Me encanta", "😂": "Me divierte", "😮": "Me asombra", "😢": "Me entristece", "😡": "Me enoja" };
    return mapa[emoji] || "Me gusta";
}

// ---------- COMENTARIOS ----------
/**
 * Pinta los comentarios de la publicación abierta. Se llama también al dar
 * "Me gusta" a un comentario o al borrar el propio, para refrescar la lista.
 */
function renderizarComentariosModal() {
    const post = POSTS_DATA.find(p => p.id === activeCommentsPostId);
    const lista = $("#fbCommentsList");
    if (!post || !lista) return;

    lista.innerHTML = "";
    (post.comentariosData || []).forEach((com, indice) => {
        const el = document.createElement("div");
        el.className = "fb-comment" + (com.esMio ? " fb-comment-mio" : "") + (com.esRespuesta ? " fb-comment-respuesta" : "");
        el.dataset.indice = indice;

        // Los tres puntitos solo en los comentarios propios: solo esos se pueden borrar
        const menuHtml = com.esMio
            ? `<button class="fb-comment-menu-btn" data-indice="${indice}" type="button" aria-label="Opciones de tu comentario">
                   <svg viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
               </button>`
            : "";

        el.innerHTML = `
            <div class="fb-comment-avatar" style="background:${com.color || '#1877f2'};">
                ${com.avatar ? `<img src="${com.avatar}" alt="${com.autor}" class="fb-avatar-img" onerror="this.style.display='none'; this.parentElement.innerText='${com.iniciales || 'U'}'">` : (com.iniciales || 'U')}
            </div>
            <div class="fb-comment-right">
                <div class="fb-comment-bubble">
                    <div class="fb-comment-author">${com.autor}</div>
                    <div class="fb-comment-text">${com.texto}</div>
                </div>
                <div class="fb-comment-footer">
                    <span class="fb-comment-time">${com.tiempo}</span>
                    <button class="fb-comment-action fb-comment-like-btn${com.miLike ? " activo" : ""}" data-indice="${indice}" type="button">Me gusta</button>
                    <button class="fb-comment-action fb-comment-reply-btn" data-indice="${indice}" type="button">Responder</button>
                    ${com.likes > 0 ? `<span class="fb-comment-like-count">👍 ${com.likes}</span>` : ""}
                </div>
            </div>
            ${menuHtml}
        `;
        lista.appendChild(el);
    });
}

function abrirComentarios(postId) {
    activeCommentsPostId = postId;
    const post = POSTS_DATA.find(p => p.id === postId);
    if (!post) return;

    const modal = $("#fbCommentsModal");
    const lista = $("#fbCommentsList");
    if (!modal || !lista) return;

    renderizarComentariosModal();

    modal.classList.add("activa");

    if (nivelActual === "comentar-publicacion" && postId === postObjetivoNivel3 && subPasoNivel3 === 1) {
        subPasoNivel3 = 2;
        actualizarBarraInstrucciones(true);
    }
}

/**
 * Marca o desmarca "Me gusta" en un comentario ajeno.
 */
/**
 * Prepara la caja para responder a un comentario del muro.
 */
function responderComentario(indice) {
    const post = POSTS_DATA.find(p => p.id === activeCommentsPostId);
    const com = post && post.comentariosData[indice];
    if (!com) return;

    respondiendoAComentario = indice;

    const input = $("#fbCommentInput");
    if (input) {
        input.placeholder = `Respondiendo a ${com.autor}...`;
        input.focus();
    }

    const aviso = $("#fbRespondiendoA");
    if (aviso) {
        aviso.textContent = `Respondiendo a ${com.autor}`;
        aviso.style.display = "block";
    }

    if (nivelActual === "comentar-publicacion" && rondaNivel3 === 2 && subPasoNivel3 === 4) {
        subPasoNivel3 = 5;
        actualizarBarraInstrucciones(true);
    } else {
        actualizarGuiaVisualFacebook();
    }
}

function cancelarRespuestaComentario() {
    respondiendoAComentario = null;

    const input = $("#fbCommentInput");
    if (input) input.placeholder = "Escribe un comentario...";

    const aviso = $("#fbRespondiendoA");
    if (aviso) aviso.style.display = "none";
}

function alternarLikeComentario(indice) {
    const post = POSTS_DATA.find(p => p.id === activeCommentsPostId);
    if (!post || !post.comentariosData || !post.comentariosData[indice]) return;

    const com = post.comentariosData[indice];
    com.miLike = !com.miLike;
    com.likes = Math.max(0, (com.likes || 0) + (com.miLike ? 1 : -1));

    renderizarComentariosModal();

    if (nivelActual === "comentar-publicacion" && rondaNivel3 === 2 && subPasoNivel3 === 3 && com.miLike && !com.esMio) {
        subPasoNivel3 = 4;
        actualizarBarraInstrucciones(true);
    } else {
        actualizarGuiaVisualFacebook();
    }
}

function abrirMenuComentario(indice) {
    const menu = $("#fbCommentMenu");
    if (!menu) return;

    menu.dataset.indice = indice;
    menu.classList.add("activa");
    actualizarGuiaVisualFacebook();
}

function cerrarMenuComentario() {
    const menu = $("#fbCommentMenu");
    if (menu) menu.classList.remove("activa");
}

/**
 * Borra el comentario propio seleccionado en el menú de tres puntitos.
 */
function eliminarComentarioPropio() {
    const menu = $("#fbCommentMenu");
    const post = POSTS_DATA.find(p => p.id === activeCommentsPostId);
    if (!menu || !post) return;

    const indice = parseInt(menu.dataset.indice, 10);
    if (!isNaN(indice) && post.comentariosData[indice]) {
        post.comentariosData.splice(indice, 1);
        post.comentarios = Math.max(0, (post.comentarios || 1) - 1);
    }

    cerrarMenuComentario();
    renderizarComentariosModal();
    renderizarPublicaciones();

    if (nivelActual === "comentar-publicacion" && rondaNivel3 === 2 && subPasoNivel3 === 6) {
        // Se le deja ver que su comentario ya no está antes de cerrar el nivel
        subPasoNivel3 = 7;
        actualizarBarraInstrucciones(true, () => {
            if (nivelActual !== "comentar-publicacion" || subPasoNivel3 !== 7) return;
            completarNivelActual("¡Excelente! Ya sabes comentar, dar Me gusta, responder a otras personas y borrar lo que tú escribes.");
        });
    } else {
        actualizarBarraInstrucciones(false);
    }
}

function cerrarComentarios() {
    const modal = $("#fbCommentsModal");
    if (modal) modal.classList.remove("activa");

    cerrarMenuComentario();

    // Si ya escribió su comentario, al reabrir sigue donde estaba
    cancelarRespuestaComentario();

    if (nivelActual === "comentar-publicacion" && subPasoNivel3 < 3) {
        subPasoNivel3 = 1;
        actualizarBarraInstrucciones(true);
    } else if (nivelActual === "comentar-publicacion") {
        actualizarBarraInstrucciones(false);
    }
}

// ---------- REACCIONES ----------
let reactionHoldTimer = null;
let reactionPopupOpen = null;

function manejarLike(postId) {
    const estado = reaccionesEstado[postId];
    const post = POSTS_DATA.find(p => p.id === postId);
    if (!post) return;

    if (nivelActual === "reaccionar-foto" && postId === postObjetivoNivel2 && subPasoNivel2 === 1) {
        // Fallback amigable: si el usuario da un toque simple en vez de dejar presionado
        mostrarReacciones(postObjetivoNivel2);
        const msg = "¡Muy bien! Para elegir más reacciones, deja presionado el botón. Ahora toca una de las emociones, como 'Me encanta' ❤️.";
        const textEl = $("#fbInstructionsText");
        if (textEl) textEl.textContent = msg;
        // Se registra como la última instrucción hablada para no descuadrar el
        // control anti-repetición del resto del archivo
        ultimaInstruccionHablada = msg;
        speak(msg);
        subPasoNivel2 = 2;
        actualizarGuiaVisualFacebook();
        return;
    }

    if (estado && estado.emoji) {
        reaccionesEstado[postId] = { emoji: null, conteo: post.likes };
    } else {
        reaccionesEstado[postId] = { emoji: "👍", conteo: post.likes + 1 };
    }
    renderizarPublicaciones();
}

function mostrarReacciones(postId) {
    cerrarTodosPopups();
    const popup = $(`#fbReactions-${postId}`);
    if (popup) {
        popup.classList.add("visible");
        reactionPopupOpen = postId;

        if (nivelActual === "reaccionar-foto" && postId === postObjetivoNivel2 && subPasoNivel2 === 1) {
            subPasoNivel2 = 2;
            actualizarBarraInstrucciones(true);
        }
    }
}

/**
 * Devuelve la opción de reacción que hay bajo un punto de la pantalla.
 * Hace falta porque en móvil los eventos del gesto siguen apuntando al botón
 * donde empezó, no al elemento que hay debajo del dedo.
 */
function opcionReaccionDesdePunto(x, y) {
    const el = document.elementFromPoint(x, y);
    return el ? el.closest(".fb-reaction-option") : null;
}

/**
 * Agranda la reacción que está bajo el dedo, como hace Facebook.
 */
function enfocarOpcionReaccion(opcion) {
    if (opcionReaccionEnfocada === opcion) return;

    if (opcionReaccionEnfocada) opcionReaccionEnfocada.classList.remove("enfocada");
    opcionReaccionEnfocada = opcion || null;
    if (opcionReaccionEnfocada) opcionReaccionEnfocada.classList.add("enfocada");
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

    if (nivelActual === "reaccionar-foto" && postId === postObjetivoNivel2 && subPasoNivel2 === 2) {
        subPasoNivel2 = 3;
        ultimaReaccionElegidaNivel2 = emoji;
        actualizarBarraInstrucciones(true, () => {
            const sim = $("#pantallaFacebookSimulador");
            const enPantalla = sim && sim.classList.contains("activa");
            if (!enPantalla || nivelActual !== "reaccionar-foto" || subPasoNivel2 !== 3) return;

            if (rondaNivel2 === 1) {
                rondaNivel2 = 2;
                postObjetivoNivel2 = 3;
                subPasoNivel2 = 1;
                renderizarPublicaciones();
                actualizarBarraInstrucciones(true);
            } else {
                completarNivelActual("¡Excelente! Aprendiste a expresar tus emociones reaccionando a las fotos de tus amigos.");
            }
        });
    }
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

// ---------- MODAL CREAR PUBLICACIÓN (NIVEL 1) ----------
function abrirModalCrearPublicacion() {
    const modal = $("#fbCreatePostModal");
    if (!modal) return;
    modal.classList.add("activa");
    modal.setAttribute("aria-hidden", "false");

    const textarea = $("#fbCreatePostTextarea");
    if (textarea) {
        textarea.focus();
    }

    renderizarAdjuntosNivel1();

    if (nivelActual === "realizar-publicacion") {
        subPasoNivel1 = 2;
        actualizarBarraInstrucciones(true);
    }
}

function cerrarModalCrearPublicacion() {
    const modal = $("#fbCreatePostModal");
    if (!modal) return;
    modal.classList.remove("activa");
    modal.setAttribute("aria-hidden", "true");

    const fotoPopup = $("#fbPhotoPickerPopup");
    if (fotoPopup) fotoPopup.classList.remove("visible");
    const tagPopup = $("#fbTagPickerPopup");
    if (tagPopup) tagPopup.classList.remove("visible");

    if (nivelActual === "realizar-publicacion") {
        subPasoNivel1 = 1;
        actualizarBarraInstrucciones(true);
    }
}

// ---------- FOTO Y ETIQUETA (NIVEL 1 - RONDA 1) ----------
function renderizarAdjuntosNivel1() {
    const cont = $("#fbCreateAttachments");
    if (!cont) return;

    let html = "";
    if (fotoSeleccionadaNivel1) {
        html += `
            <div class="fb-attachment-chip">
                <img src="${fotoSeleccionadaNivel1.src}" alt="" class="fb-attachment-thumb">
                <span>Foto agregada</span>
            </div>`;
    }
    if (etiquetaSeleccionadaNivel1) {
        html += `
            <div class="fb-attachment-chip">
                <span class="fb-attachment-tag-avatar" style="background:${etiquetaSeleccionadaNivel1.color};">${etiquetaSeleccionadaNivel1.iniciales}</span>
                <span>Con ${etiquetaSeleccionadaNivel1.nombre}</span>
            </div>`;
    }
    cont.innerHTML = html;
}

function abrirSelectorFoto() {
    const tagPopup = $("#fbTagPickerPopup");
    if (tagPopup) tagPopup.classList.remove("visible");
    const popup = $("#fbPhotoPickerPopup");
    const btn = $("#fbAddonFotoBtn");
    if (popup) {
        const seVaAMostrar = !popup.classList.contains("visible");
        popup.classList.toggle("visible");
        if (seVaAMostrar) posicionarPopupCerca(popup, btn);
    }

    if (nivelActual === "realizar-publicacion" && rondaNivel1 === 1 && subPasoNivel1 === 3) {
        subPasoNivel1 = 4;
        actualizarBarraInstrucciones(true);
    }
}

function seleccionarFoto(clave) {
    const rutas = {
        mascota: "./assets/img/facebook/mascota.png",
        vacaciones: "./assets/img/facebook/vacaciones.png"
    };
    fotoSeleccionadaNivel1 = { src: rutas[clave] || rutas.mascota };

    const popup = $("#fbPhotoPickerPopup");
    if (popup) popup.classList.remove("visible");
    renderizarAdjuntosNivel1();

    if (nivelActual === "realizar-publicacion" && rondaNivel1 === 1 && subPasoNivel1 === 4) {
        subPasoNivel1 = 5;
        actualizarBarraInstrucciones(true);
    }
}

function abrirSelectorEtiqueta() {
    const fotoPopup = $("#fbPhotoPickerPopup");
    if (fotoPopup) fotoPopup.classList.remove("visible");
    const popup = $("#fbTagPickerPopup");
    const btn = $("#fbAddonTagBtn");
    if (popup) {
        const seVaAMostrar = !popup.classList.contains("visible");
        popup.classList.toggle("visible");
        if (seVaAMostrar) posicionarPopupCerca(popup, btn);
    }

    if (nivelActual === "realizar-publicacion" && rondaNivel1 === 1 && subPasoNivel1 === 5) {
        subPasoNivel1 = 6;
        actualizarBarraInstrucciones(true);
    }
}

function seleccionarEtiqueta(nombre, iniciales, color) {
    etiquetaSeleccionadaNivel1 = { nombre, iniciales, color };

    const popup = $("#fbTagPickerPopup");
    if (popup) popup.classList.remove("visible");
    renderizarAdjuntosNivel1();

    if (nivelActual === "realizar-publicacion" && rondaNivel1 === 1 && subPasoNivel1 === 6) {
        subPasoNivel1 = 7;
        actualizarBarraInstrucciones(true);
    }
}

function publicarNuevoPost() {
    const textarea = $("#fbCreatePostTextarea");
    if (!textarea || !textarea.value.trim()) return;

    const texto = textarea.value.trim();
    const esRonda1DeNivel1 = nivelActual === "realizar-publicacion" && rondaNivel1 === 1;

    const nuevoPost = {
        id: Date.now(),
        autor: "Ramona Pico",
        iniciales: "RP",
        avatar: "./assets/img/facebook/user_profile.png",
        color: "#1877f2",
        tiempo: "Hace un momento",
        texto: texto,
        likes: 0,
        comentarios: 0,
        compartidos: 0,
        reacciones: [],
        comentariosData: []
    };

    if (esRonda1DeNivel1) {
        if (fotoSeleccionadaNivel1) nuevoPost.imagen = fotoSeleccionadaNivel1.src;
        if (etiquetaSeleccionadaNivel1) nuevoPost.etiqueta = etiquetaSeleccionadaNivel1.nombre;
    }

    // Insertar al inicio del feed
    POSTS_DATA.unshift(nuevoPost);

    // Resetear campo y deshabilitar botón
    textarea.value = "";
    const submitBtn = $("#fbCreatePostSubmitBtn");
    if (submitBtn) submitBtn.disabled = true;

    // Cerrar modal
    const modal = $("#fbCreatePostModal");
    if (modal) modal.classList.remove("activa");

    // Re-renderizar feed
    renderizarPublicaciones();

    // Scroll al tope del feed
    const feed = $("#fbFeed");
    if (feed) feed.scrollTop = 0;

    if (nivelActual === "realizar-publicacion") {
        if (rondaNivel1 === 1) {
            subPasoNivel1 = 8;
            actualizarBarraInstrucciones(true, () => {
                const sim = $("#pantallaFacebookSimulador");
                const enPantalla = sim && sim.classList.contains("activa");
                if (enPantalla && nivelActual === "realizar-publicacion" && rondaNivel1 === 1 && subPasoNivel1 === 8) {
                    rondaNivel1 = 2;
                    subPasoNivel1 = 1;
                    fotoSeleccionadaNivel1 = null;
                    etiquetaSeleccionadaNivel1 = null;
                    renderizarAdjuntosNivel1();
                    actualizarBarraInstrucciones(true);
                }
            });
        } else {
            // Se le deja ver su segunda publicación antes de cerrar el nivel
            subPasoNivel1 = 3;
            actualizarBarraInstrucciones(true, () => {
                if (nivelActual !== "realizar-publicacion" || subPasoNivel1 !== 3) return;
                completarNivelActual("¡Excelente! Ya sabes crear publicaciones en Facebook, con foto y etiquetas incluidas.");
            });
        }
    }
}

// ---------- NAVEGACIÓN DE PESTAÑAS (NIVEL 4) ----------
function cambiarPestana(tabName) {
    pestanaActiva = tabName;

    // El buscador es una vista aparte: se cierra al tocar cualquier pestaña
    const buscador = $("#fbSearchView");
    if (buscador) buscador.style.display = "none";
    const tabs = document.querySelectorAll(".fb-nav-tab");
    tabs.forEach(t => {
        t.classList.toggle("activa", t.dataset.tab === tabName);
    });

    const feed = $("#fbFeed");
    const friendsView = $("#fbFriendsView");

    const reelsView = $("#fbReelsView");

    if (tabName === "amigos") {
        pausarReel();
        if (feed) feed.style.display = "none";
        if (friendsView) friendsView.style.display = "block";
        if (reelsView) reelsView.style.display = "none";

        if (nivelActual === "agregar-amigo") {
            subPasoNivel4 = 2;
            actualizarBarraInstrucciones(true);
        }
    } else if (tabName === "video") {
        if (feed) feed.style.display = "none";
        if (friendsView) friendsView.style.display = "none";
        if (reelsView) reelsView.style.display = "flex";

        // Inicializar Reels en el primer video
        renderizarReel(reelActualIdx);

        if (nivelActual === "ver-reels" && subPasoNivel5 === 1) {
            subPasoNivel5 = 2;
            actualizarBarraInstrucciones(true);
        }
    } else {
        pausarReel();
        if (feed) feed.style.display = "block";
        if (friendsView) friendsView.style.display = "none";
        if (reelsView) reelsView.style.display = "none";

        if (nivelActual === "agregar-amigo") {
            subPasoNivel4 = 1;
            actualizarBarraInstrucciones(true);
        }
    }
}

// ---------- DATOS Y RENDERIZADO DE REELS (NIVEL 5) ----------
// Personas que aparecen al buscar por nombre (Nivel 4, ronda 2)
const PERSONAS_BUSCABLES = [
    { nombre: "Rafael Moreira", ciudad: "Quevedo", comunes: 4 },
    { nombre: "Rafael Zambrano", ciudad: "Babahoyo", comunes: 1 },
    { nombre: "María Elena Vera", ciudad: "Quevedo", comunes: 7 },
    { nombre: "María José Cedeño", ciudad: "Guayaquil", comunes: 2 },
    { nombre: "José Luis Andrade", ciudad: "Quito", comunes: 3 },
    { nombre: "Josefina Bravo", ciudad: "Quevedo", comunes: 5 },
    { nombre: "Carmen Villacís", ciudad: "Manta", comunes: 6 },
    { nombre: "Carlos Mendoza", ciudad: "Quevedo", comunes: 8 },
    { nombre: "Carlota Pinargote", ciudad: "Portoviejo", comunes: 1 },
    { nombre: "Teresa Andrade", ciudad: "Quevedo", comunes: 3 },
    { nombre: "Teresa Bravo", ciudad: "Guayaquil", comunes: 5 },
    { nombre: "Miguel Ponce", ciudad: "Quevedo", comunes: 1 },
    { nombre: "Miguel Ángel Solís", ciudad: "Ambato", comunes: 2 },
    { nombre: "Rosa Elena Morales", ciudad: "Quevedo", comunes: 2 },
    { nombre: "Rosario Delgado", ciudad: "Loja", comunes: 4 },
    { nombre: "Luis Alberto Chávez", ciudad: "Quevedo", comunes: 9 },
    { nombre: "Luisa Fernanda Ortiz", ciudad: "Guayaquil", comunes: 3 },
    { nombre: "Ana Belén Rodríguez", ciudad: "Quevedo", comunes: 5 },
    { nombre: "Anabel Suárez", ciudad: "Machala", comunes: 1 },
    { nombre: "Pedro Sánchez Loor", ciudad: "Quevedo", comunes: 6 },
    { nombre: "Pedro Pablo Mera", ciudad: "Esmeraldas", comunes: 2 },
    { nombre: "Juan Carlos Macías", ciudad: "Quevedo", comunes: 4 },
    { nombre: "Juana Alarcón", ciudad: "Riobamba", comunes: 1 },
    { nombre: "Gloria Castro", ciudad: "Quevedo", comunes: 7 },
    { nombre: "Dolores Pérez", ciudad: "Quevedo", comunes: 3 },
    { nombre: "Ramón Flores", ciudad: "Guayaquil", comunes: 2 },
    { nombre: "Elena Vargas", ciudad: "Quevedo", comunes: 5 },
    { nombre: "Ernesto Campos", ciudad: "Quito", comunes: 1 },
    { nombre: "Patricia Mora", ciudad: "Quevedo", comunes: 4 },
    { nombre: "Jorge Andrade", ciudad: "Quevedo", comunes: 6 }
];

// Se muestran pocos resultados a propósito: una lista larga abruma
const MAX_RESULTADOS_BUSQUEDA = 4;

// Colores para el círculo con las iniciales de cada persona
const COLORES_PERSONA = ["#8e24aa", "#00838f", "#ef6c00", "#3949ab", "#43a047", "#d81b60", "#5d4037", "#00897b"];

function inicialesDe(nombre) {
    const partes = nombre.split(" ").filter(Boolean);
    return ((partes[0] || "")[0] + (partes[1] || "")[0] || "?").toUpperCase();
}

function colorDe(nombre) {
    let suma = 0;
    for (let i = 0; i < nombre.length; i++) suma += nombre.charCodeAt(i);
    return COLORES_PERSONA[suma % COLORES_PERSONA.length];
}

/**
 * Busca por nombre sin exigir tildes ni mayúsculas: quien escribe "rafael"
 * debe encontrar a "Rafael Moreira".
 */
function normalizar(texto) {
    return String(texto).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Cada Reel tiene su propia gente comentando y su propio estado de "Seguir".
// Antes se compartían: seguir a uno seguía a todos y los comentarios eran los
// mismos en los seis videos.
const REELS_ORIGINAL = [
    {
        emoji: "🙏", autor: "@BendicionesDiarias", video: "./assets/video/piolin.mp4",
        portada: "./assets/img/reels/piolin.jpg",
        desc: "Que la paz de Dios te cubra esta noche 🙏", likes: 847, siguiendo: false,
        comentarios: [
            { autor: "Marta Ruiz", inicial: "M", color: "#e91e8c", texto: "Amén, qué bonito mensaje 🙏", tiempo: "2 h", likes: 24 },
            { autor: "Pedro Salas", inicial: "P", color: "#2196f3", texto: "Se lo mando a mi hermana ahora mismo", tiempo: "5 h", likes: 8 }
        ]
    },
    {
        emoji: "🍞", autor: "@PanCasero", video: "./assets/video/panrico.mp4",
        portada: "./assets/img/reels/panrico.jpg",
        desc: "Pan casero recien horneado, que delicia 🍞", likes: 1203, siguiendo: false,
        comentarios: [
            { autor: "Dolores Pérez", inicial: "D", color: "#8bc34a", texto: "¡Se ve riquísimo! ¿Con harina normal queda igual?", tiempo: "1 h", likes: 41 },
            { autor: "Tomás Herrera", inicial: "T", color: "#795548", texto: "Huele hasta por la pantalla 😋", tiempo: "6 h", likes: 15 }
        ]
    },
    {
        emoji: "🎤", autor: "@NilaStone", video: "./assets/video/nilastone.mp4",
        portada: "./assets/img/reels/nilastone.jpg",
        desc: "Ahora soy mi prioridad 🎤✨", likes: 532, siguiendo: false,
        comentarios: [
            { autor: "Gloria Castro", inicial: "G", color: "#9c27b0", texto: "Qué voz tan bonita, me puso la piel de gallina", tiempo: "3 h", likes: 33 },
            { autor: "Ernesto Campos", inicial: "E", color: "#3f51b5", texto: "Esta canción me recuerda a mi juventud", tiempo: "8 h", likes: 12 }
        ]
    },
    {
        emoji: "💧", autor: "@NaturalezaViva", video: "./assets/video/cascadas.mp4",
        portada: "./assets/img/reels/cascadas.jpg",
        desc: "Un lugar hermoso para relajar la mente 💧", likes: 2148, siguiendo: false,
        comentarios: [
            { autor: "Consuelo Reyes", inicial: "C", color: "#00bcd4", texto: "Qué paz da verlo. ¿Dónde queda ese lugar?", tiempo: "4 h", likes: 57 },
            { autor: "Ramón Flores", inicial: "R", color: "#009688", texto: "Lo pongo por las noches para dormir tranquilo", tiempo: "1 d", likes: 20 }
        ]
    },
    {
        emoji: "🍫", autor: "@ReposteriaCasera", video: "./assets/video/panchocolate.mp4",
        portada: "./assets/img/reels/panchocolate.jpg",
        desc: "Pan de chocolate recien hecho, para el cafe de la tarde 🍫", likes: 918, siguiendo: false,
        comentarios: [
            { autor: "Sandra López", inicial: "S", color: "#ff5722", texto: "¿Se puede hacer sin azúcar? Soy diabética", tiempo: "2 h", likes: 62 },
            { autor: "Patricia Mora", inicial: "P", color: "#ff9800", texto: "Lo hice el domingo con mis nietas 🎂", tiempo: "1 d", likes: 18 }
        ]
    },
    {
        emoji: "🌱", autor: "@MiJardin", video: "./assets/video/plantas.mp4",
        portada: "./assets/img/reels/plantas.jpg",
        desc: "Mis plantas de casa, cuidadas con cariño 🌱", likes: 3052, siguiendo: false,
        comentarios: [
            { autor: "Luis García", inicial: "L", color: "#4caf50", texto: "Mis plantas se secan siempre, ¿algún consejo?", tiempo: "30 min", likes: 9 },
            { autor: "Elena Vargas", inicial: "E", color: "#673ab7", texto: "Qué bien te quedó el huerto, felicidades", tiempo: "7 h", likes: 27 }
        ]
    }
];

let REELS_DATA = JSON.parse(JSON.stringify(REELS_ORIGINAL));

/**
 * @param {number} idx      Reel a mostrar.
 * @param {string} entrada  "arriba" si el nuevo entra desde abajo (pasar al
 *                          siguiente), "abajo" si entra desde arriba (volver
 *                          al anterior). Sin valor, aparece sin animación.
 */
function renderizarReel(idx, entrada) {
    const data = REELS_DATA[idx];
    if (!data) return;

    const video = $("#fbReelVideo");
    if (video) {
        // La portada evita el rectángulo negro mientras el video carga
        if (data.portada) {
            video.poster = data.portada;
        } else {
            video.removeAttribute("poster");
        }

        video.src = data.video;

        // Los Reels suenan, pero bajito: Nico tiene que oírse por encima
        video.muted = false;
        video.volume = VOLUMEN_REEL;

        video.load();

        // Solo suena si los Reels están de verdad a la vista: si no, el video
        // se oía nada más entrar a cualquier nivel con la pestaña oculta.
        const reelsView = $("#fbReelsView");
        const aLaVista = reelsView && reelsView.style.display !== "none";

        if (!aLaVista) {
            video.pause();
        } else {
            video.play().catch((err) => {
                // Si el fallo es porque nosotros mismos lo pausamos al salir de
                // Reels, el navegador aborta la reproducción: no hay nada que
                // reintentar. Sin esta comprobación el video se volvía a poner
                // en marcha (silenciado) al cambiar de pestaña.
                if (err && err.name === "AbortError") return;
                if (!reelsView || reelsView.style.display === "none") return;

                // Algunos navegadores no dejan reproducir con sonido hasta que
                // haya habido un toque en la página. En ese caso se reproduce sin
                // sonido para que al menos se vea, y se recupera al primer toque.
                video.muted = true;
                video.play().catch(() => { });
                esperandoToqueParaSonido = true;
            });
        }
    }

    const avatar = $("#fbReelAvatar");
    if (avatar) avatar.textContent = data.emoji;

    const creator = $("#fbReelCreatorName");
    if (creator) creator.textContent = data.autor;

    const desc = $("#fbReelDescription");
    if (desc) desc.textContent = data.desc;

    const audio = $("#fbReelAudioLabel");
    if (audio) audio.textContent = `Sonido original · ${data.autor}`;

    const likeCount = $("#fbReelLikeCount");
    if (likeCount) likeCount.textContent = data.likes.toLocaleString("es-MX");

    const counter = $("#fbReelCounter");
    if (counter) counter.textContent = `${idx + 1} / ${REELS_DATA.length}`;

    // Resetear estado del like para el nuevo reel
    const likeBtn = $("#fbReelLikeBtn");
    const likeIcon = $("#fbReelLikeIcon");
    if (likeBtn) likeBtn.classList.remove("liked");
    if (likeIcon) likeIcon.style.fill = "";
    reelLikeYaDado = false;

    // Cada Reel tiene su propio "Seguir" y sus propios comentarios
    actualizarBotonSeguirReel();
    cancelarRespuestaReel();
    renderizarComentariosReel();

    animarEntradaReel(entrada);
}

/**
 * Hace que el Reel nuevo entre deslizándose, en lugar de aparecer de golpe.
 */
function animarEntradaReel(entrada) {
    const player = $("#fbReelPlayer");
    if (!player || !entrada) return;

    player.classList.remove("entra-desde-abajo", "entra-desde-arriba");

    // Forzar el recálculo para poder repetir la misma animación seguida
    void player.offsetWidth;

    player.classList.add(entrada === "arriba" ? "entra-desde-abajo" : "entra-desde-arriba");
}

// ---------- NAVEGACIÓN POR GESTO DE DESLIZAR (NIVEL 5) ----------
/**
 * Detiene el video de Reels. Sin esto seguía reproduciéndose oculto al cambiar
 * de pestaña o al salir del simulador.
 */
function pausarReel() {
    const video = $("#fbReelVideo");
    if (video && !video.paused) video.pause();
}

/**
 * Si el usuario desliza en la dirección contraria a la que toca practicar,
 * Nico repite el gesto correcto. Se usa también cuando no hay Reel al que ir
 * (por ejemplo, deslizar hacia abajo estando en el primero), que si no dejaba
 * al usuario sin ninguna respuesta.
 */
function avisarDireccionIncorrectaNivel5(direccion) {
    if (nivelActual !== "ver-reels" || subPasoNivel5 !== 2) return;
    if (direccion === direccionEsperadaNivel5()) return;

    ultimaInstruccionHablada = "";
    actualizarBarraInstrucciones(true);
}

function irReelSiguiente() {
    if (reelActualIdx >= REELS_DATA.length - 1) {
        avisarDireccionIncorrectaNivel5("arriba");
        return;
    }
    reelActualIdx++;
    renderizarReel(reelActualIdx, "arriba");
    actualizarBotonesRespaldoReel();
    manejarProgresoNivel5("arriba");
}

function irReelAnterior() {
    if (reelActualIdx <= 0) {
        avisarDireccionIncorrectaNivel5("abajo");
        return;
    }
    reelActualIdx--;
    renderizarReel(reelActualIdx, "abajo");
    actualizarBotonesRespaldoReel();
    manejarProgresoNivel5("abajo");
}

/**
 * Oculta las flechas de respaldo cuando no hay Reel al que ir.
 */
function actualizarBotonesRespaldoReel() {
    const prev = $("#fbReelPrevBtn");
    const next = $("#fbReelNextBtn");
    if (prev) prev.style.display = reelActualIdx > 0 ? "flex" : "none";
    if (next) next.style.display = reelActualIdx < REELS_DATA.length - 1 ? "flex" : "none";
}

// Dirección de deslizamiento que corresponde practicar en la ronda actual:
// rondas 1 y 2 = arriba (dos veces seguidas, refuerzo del mismo gesto),
// ronda 3 = abajo (el gesto nuevo, para volver al Reel anterior).
function direccionEsperadaNivel5() {
    return rondaNivel5 === 2 ? "abajo" : "arriba";
}

// Avanza la guía del Nivel 5 cuando el deslizamiento ocurre en la dirección esperada
// para la ronda actual. En cualquier otro caso el Reel cambia igual, pero sin
// afectar el progreso del nivel.
function manejarProgresoNivel5(direccion) {
    if (nivelActual !== "ver-reels" || subPasoNivel5 !== 2) return;

    if (direccion !== direccionEsperadaNivel5()) {
        // Deslizó al revés: el Reel cambia igual, pero Nico repite el gesto que toca
        avisarDireccionIncorrectaNivel5(direccion);
        return;
    }

    subPasoNivel5 = 3;
    actualizarBarraInstrucciones(true, () => {
        const sim = $("#pantallaFacebookSimulador");
        const enPantalla = sim && sim.classList.contains("activa");
        if (!enPantalla || nivelActual !== "ver-reels" || subPasoNivel5 !== 3) return;

        if (rondaNivel5 < 2) {
            rondaNivel5++;
            subPasoNivel5 = 2;
            actualizarBarraInstrucciones(true);
        } else {
            // Ya sabe moverse entre Reels: ahora las cuatro acciones de un Reel
            subPasoNivel5 = 4;
            actualizarBarraInstrucciones(true);
        }
    });
}

// Actualiza el aviso visual de "desliza hacia arriba/abajo" durante el paso guiado
function actualizarSwipeHintReel() {
    const hint = $("#fbReelSwipeHint");
    if (!hint) return;

    const reelsView = $("#fbReelsView");
    const estaEnReels = reelsView && reelsView.style.display !== "none";
    const mostrar = nivelActual === "ver-reels" && estaEnReels && subPasoNivel5 === 2;

    if (!mostrar) {
        hint.style.display = "none";
        return;
    }

    hint.style.display = "flex";

    const haciaArriba = direccionEsperadaNivel5() === "arriba";
    const textoHint = $("#fbReelSwipeHintText");
    if (textoHint) {
        textoHint.textContent = haciaArriba ? "Desliza hacia arriba" : "Desliza hacia abajo";
    }

    hint.classList.toggle("hacia-abajo", !haciaArriba);
}

/**
 * Acepta o rechaza una solicitud de amistad recibida (Nivel 4, ronda 2).
 * Es la otra mitad de la amistad en Facebook: además de enviar solicitudes,
 * también hay que saber responder a las que llegan.
 */
/**
 * Abre el buscador de personas (Nivel 4, ronda 2).
 */
function abrirBuscadorFb() {
    const vista = $("#fbSearchView");
    const feed = $("#fbFeed");
    const amigos = $("#fbFriendsView");
    const reels = $("#fbReelsView");
    if (!vista) return;

    if (feed) feed.style.display = "none";
    if (amigos) amigos.style.display = "none";
    if (reels) reels.style.display = "none";
    vista.style.display = "flex";

    const input = $("#fbSearchInput");
    if (input) input.value = "";
    const sug = $("#fbSearchSugerencias");
    if (sug) sug.style.display = "block";
    const res = $("#fbSearchResultados");
    if (res) res.innerHTML = "";

    if (nivelActual === "agregar-amigo" && rondaNivel4 === 2 && subPasoNivel4 === 1) {
        subPasoNivel4 = 2;
    }
    actualizarBarraInstrucciones(true);
}

function cerrarBuscadorFb() {
    const vista = $("#fbSearchView");
    if (vista) vista.style.display = "none";
    cambiarPestana(pestanaActiva === "amigos" ? "amigos" : "inicio");

    if (nivelActual === "agregar-amigo" && rondaNivel4 === 2) {
        subPasoNivel4 = 1;
    }
    actualizarBarraInstrucciones(true);
}

function ejecutarBusquedaFb() {
    const input = $("#fbSearchInput");
    const cont = $("#fbSearchResultados");
    if (!input || !cont) return;

    const termino = input.value.trim().toLowerCase();
    if (termino.length < 3) return;

    const buscado = normalizar(termino);
    const encontrados = PERSONAS_BUSCABLES.filter(p => normalizar(p.nombre).includes(buscado));
    const lista = (encontrados.length > 0 ? encontrados : PERSONAS_BUSCABLES).slice(0, MAX_RESULTADOS_BUSQUEDA);

    const sug = $("#fbSearchSugerencias");
    if (sug) sug.style.display = "none";

    cont.innerHTML = `
        <div class="fb-friends-section-title"><span>Personas</span></div>
        ${lista.map((p, i) => `
            <div class="fb-friend-card fb-search-card">
                <div class="fb-friend-avatar" style="background:${colorDe(p.nombre)};"><span>${inicialesDe(p.nombre)}</span></div>
                <div class="fb-friend-info">
                    <div class="fb-friend-name">${p.nombre}</div>
                    <div class="fb-friend-mutual"><span class="fb-mutual-icon">👥</span> Vive en ${p.ciudad} · ${p.comunes} ${p.comunes === 1 ? "amigo" : "amigos"} en común</div>
                    <div class="fb-friend-actions">
                        <button class="fb-btn-add-friend" data-friend="buscado-${i}" type="button">
                            <svg viewBox="0 0 24 24"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                            Agregar a amigos
                        </button>
                    </div>
                </div>
            </div>
        `).join("")}
    `;

    if (nivelActual === "agregar-amigo" && rondaNivel4 === 2 && subPasoNivel4 === 3) {
        subPasoNivel4 = 4;
    }
    actualizarBarraInstrucciones(true);
}

/**
 * Devuelve las solicitudes recibidas que siguen sin contestar, y las repone si
 * el usuario ya las había contestado antes de llegar a esa parte del nivel.
 */
function solicitudPendiente() {
    let pendientes = document.querySelectorAll(".fb-request-card .fb-btn-confirm-request");
    if (pendientes.length === 0) {
        reponerSolicitudesRecibidas();
        pendientes = document.querySelectorAll(".fb-request-card .fb-btn-confirm-request");
    }
    return pendientes[0] || null;
}

function reponerSolicitudesRecibidas() {
    document.querySelectorAll(".fb-request-card").forEach(card => {
        const id = card.dataset.request;
        const acciones = card.querySelector(".fb-friend-actions");
        if (acciones) {
            acciones.innerHTML = `
                <button class="fb-btn-confirm-request" data-request="${id}" type="button">Confirmar</button>
                <button class="fb-btn-delete-request" data-request="${id}" type="button">Eliminar</button>
            `;
        }
    });

    const contador = $("#fbSolicitudesCount");
    if (contador) {
        contador.textContent = "2";
        contador.style.display = "";
    }
}

function responderSolicitud(requestId, aceptada) {
    const tarjeta = document.querySelector(`.fb-request-card[data-request="${requestId}"]`);
    if (!tarjeta) return;

    const acciones = tarjeta.querySelector(".fb-friend-actions");
    if (acciones) {
        acciones.innerHTML = aceptada
            ? `<span class="fb-request-resultado aceptada">✓ Ahora son amigos</span>`
            : `<span class="fb-request-resultado">Solicitud eliminada</span>`;
    }

    // Baja el contador de solicitudes pendientes
    const contador = $("#fbSolicitudesCount");
    if (contador) {
        const restantes = Math.max(0, (parseInt(contador.textContent, 10) || 1) - 1);
        contador.textContent = restantes;
        if (restantes === 0) contador.style.display = "none";
    }

    const badge = $("#fbAmigosBadge");
    if (badge) {
        const restantes = Math.max(0, (parseInt(badge.textContent, 10) || 1) - 1);
        badge.textContent = restantes;
        if (restantes === 0) badge.style.display = "none";
    }

    if (nivelActual !== "agregar-amigo" || rondaNivel4 !== 3) return;

    if (aceptada) solicitudConfirmada = true;
    else solicitudEliminada = true;

    // Hay que practicar las dos respuestas: aceptar una y rechazar otra.
    // El orden da igual, y entre una y otra se deja ver el resultado.
    if (solicitudConfirmada && solicitudEliminada) {
        subPasoNivel4 = 4;
        actualizarBarraInstrucciones(true, () => {
            if (nivelActual !== "agregar-amigo" || subPasoNivel4 !== 4) return;
            completarNivelActual("¡Excelente! Ya sabes enviar solicitudes, buscar a alguien por su nombre, cancelar lo enviado y responder a las que te llegan.");
        });
        return;
    }

    subPasoNivel4 = 3;
    actualizarBarraInstrucciones(true, () => {
        if (nivelActual !== "agregar-amigo" || subPasoNivel4 !== 3) return;

        // Si ya no queda ninguna sin contestar, se repone una para la otra acción
        if (!document.querySelector(".fb-request-card .fb-btn-confirm-request")) {
            reponerSolicitudesRecibidas();
        }
        subPasoNivel4 = 2;
        actualizarBarraInstrucciones(true);
    });
}

// ---------- ACCIONES SOBRE UN REEL (NIVEL 5) ----------

/**
 * Sigue o deja de seguir la cuenta del Reel.
 */
function reelActual() {
    return REELS_DATA[reelActualIdx];
}

/**
 * Sigue o deja de seguir la cuenta de ESTE Reel. Antes el estado era único
 * para todos, así que seguir a uno los dejaba a todos como "Siguiendo".
 */
function alternarSeguirReel() {
    const btn = $("#fbReelFollowBtn");
    const reel = reelActual();
    if (!btn || !reel) return;

    reel.siguiendo = !reel.siguiendo;
    actualizarBotonSeguirReel();

    if (reel.siguiendo && nivelActual === "ver-reels" && subPasoNivel5 === 5) {
        subPasoNivel5 = 6;
        actualizarBarraInstrucciones(true);
    }
}

function actualizarBotonSeguirReel() {
    const btn = $("#fbReelFollowBtn");
    const reel = reelActual();
    if (!btn || !reel) return;

    btn.textContent = reel.siguiendo ? "Siguiendo" : "Seguir";
    btn.classList.toggle("siguiendo", !!reel.siguiendo);
}

function renderizarComentariosReel() {
    const lista = $("#fbReelCommentsList");
    const reel = reelActual();
    if (!lista || !reel) return;

    lista.innerHTML = reel.comentarios.map((c, i) => `
        <div class="fb-reel-comment${c.esMio ? " mio" : ""}${c.esRespuesta ? " respuesta" : ""}" data-indice="${i}">
            <div class="fb-reel-comment-avatar" style="background:${c.color};">${c.inicial}</div>
            <div class="fb-reel-comment-cuerpo">
                <div class="fb-reel-comment-autor">${c.autor} <span class="fb-reel-comment-tiempo">${c.tiempo}</span></div>
                <div class="fb-reel-comment-texto">${c.texto}</div>
                <div class="fb-reel-comment-acciones">
                    <button type="button" class="fb-reel-comment-btn fb-reel-comment-like${c.miLike ? " activo" : ""}" data-indice="${i}">Me gusta</button>
                    <button type="button" class="fb-reel-comment-btn fb-reel-comment-responder" data-indice="${i}">Responder</button>
                    ${c.likes > 0 ? `<span class="fb-reel-comment-likes">👍 ${c.likes}</span>` : ""}
                </div>
            </div>
        </div>
    `).join("");

    const contador = $("#fbReelCommentCount");
    if (contador) contador.textContent = reel.comentarios.length;
}

/**
 * Me gusta a un comentario de otra persona dentro del Reel.
 */
function alternarLikeComentarioReel(indice) {
    const reel = reelActual();
    const com = reel && reel.comentarios[indice];
    if (!com) return;

    com.miLike = !com.miLike;
    com.likes = Math.max(0, (com.likes || 0) + (com.miLike ? 1 : -1));
    renderizarComentariosReel();

    if (com.miLike && !com.esMio && nivelActual === "ver-reels" && subPasoNivel5 === 7) {
        subPasoNivel5 = 8;
        actualizarBarraInstrucciones(true);
    } else {
        actualizarGuiaVisualFacebook();
    }
}

/**
 * Prepara la caja de texto para responder a un comentario concreto.
 */
function responderComentarioReel(indice) {
    const reel = reelActual();
    const com = reel && reel.comentarios[indice];
    if (!com) return;

    respondiendoAComentarioReel = indice;

    const input = $("#fbReelCommentInput");
    if (input) {
        input.placeholder = `Respondiendo a ${com.autor}...`;
        input.focus();
    }

    const aviso = $("#fbReelRespondiendo");
    if (aviso) {
        aviso.textContent = `Respondiendo a ${com.autor}`;
        aviso.style.display = "block";
    }

    actualizarBarraInstrucciones(true);
}

function cancelarRespuestaReel() {
    respondiendoAComentarioReel = null;

    const input = $("#fbReelCommentInput");
    if (input) input.placeholder = "Escribe un comentario...";

    const aviso = $("#fbReelRespondiendo");
    if (aviso) aviso.style.display = "none";
}


function abrirComentariosReel() {
    cancelarRespuestaReel();
    renderizarComentariosReel();

    const panel = $("#fbReelCommentsPanel");
    if (panel) panel.classList.add("activa");

    if (nivelActual === "ver-reels" && subPasoNivel5 === 6) {
        // Ya está dentro: la guía pasa a explicar qué escribir
        actualizarBarraInstrucciones(true);
    } else {
        actualizarBarraInstrucciones(false);
    }
}

function cerrarComentariosReel() {
    const panel = $("#fbReelCommentsPanel");
    if (panel) panel.classList.remove("activa");
    cancelarRespuestaReel();
    actualizarBarraInstrucciones(false);
}

/**
 * Publica un comentario propio, o una respuesta si se tocó "Responder".
 * El panel NO se cierra: el usuario tiene que poder ver lo que escribió.
 */
function enviarComentarioReel() {
    const input = $("#fbReelCommentInput");
    const reel = reelActual();
    if (!input || !input.value.trim() || !reel) return;

    const nuevo = {
        esMio: true,
        autor: "Ramona Pico",
        inicial: "R",
        color: "#1877f2",
        texto: input.value.trim(),
        tiempo: "Ahora",
        likes: 0
    };

    if (respondiendoAComentarioReel !== null) {
        // Las respuestas van justo debajo del comentario respondido
        nuevo.esRespuesta = true;
        reel.comentarios.splice(respondiendoAComentarioReel + 1, 0, nuevo);
    } else {
        reel.comentarios.unshift(nuevo);
    }

    const eraRespuesta = respondiendoAComentarioReel !== null;
    input.value = "";
    cancelarRespuestaReel();
    renderizarComentariosReel();

    // Se deja a la vista el comentario recién escrito
    const mio = $("#fbReelCommentsList .fb-reel-comment.mio");
    if (mio) mio.scrollIntoView({ behavior: "smooth", block: "center" });

    if (nivelActual !== "ver-reels") return;

    if (!eraRespuesta && subPasoNivel5 === 6) {
        subPasoNivel5 = 7;
        actualizarBarraInstrucciones(true);
    } else if (eraRespuesta && subPasoNivel5 === 8) {
        subPasoNivel5 = 9;
        actualizarBarraInstrucciones(true);
    }
}

function abrirCompartirReel() {
    const panel = $("#fbReelSharePanel");
    if (panel) panel.classList.add("activa");

    // Volver a la lista de destinos por si quedó abierto Messenger
    const opciones = $("#fbReelShareOptions");
    const messenger = $("#fbMessengerPanel");
    if (opciones) opciones.style.display = "block";
    if (messenger) messenger.classList.remove("activa");

    if (nivelActual === "ver-reels" && subPasoNivel5 === 9) {
        subPasoNivel5 = 10;
    }
    actualizarBarraInstrucciones(true);
}

function cerrarCompartirReel() {
    const panel = $("#fbReelSharePanel");
    if (panel) panel.classList.remove("activa");

    if (nivelActual === "ver-reels" && subPasoNivel5 === 10) {
        subPasoNivel5 = 9; // volvió atrás: se le vuelve a pedir compartir
    }
    actualizarBarraInstrucciones(true);
}

/**
 * Abre la pantalla de Messenger con la lista de chats, como haría Facebook
 * al compartir por ahí.
 */
function abrirMessenger() {
    const panel = $("#fbReelSharePanel");
    const messenger = $("#fbMessengerPanel");
    if (panel) panel.classList.remove("activa");
    if (messenger) messenger.classList.add("activa");

    // Los chats vuelven a estar sin enviar
    document.querySelectorAll("#fbMessengerLista .fb-messenger-enviar").forEach(btn => {
        btn.textContent = "Enviar";
        btn.classList.remove("enviado");
        btn.disabled = false;
    });

    if (nivelActual === "ver-reels" && subPasoNivel5 === 10) {
        subPasoNivel5 = 11;
    }
    actualizarBarraInstrucciones(true);
}

function cerrarMessenger() {
    const messenger = $("#fbMessengerPanel");
    if (messenger) messenger.classList.remove("activa");

    if (nivelActual === "ver-reels" && subPasoNivel5 === 11) {
        subPasoNivel5 = 10;
    }
    actualizarBarraInstrucciones(true);
}

/**
 * Envía el Reel por Messenger a un contacto concreto.
 */
function enviarPorMessenger(btn) {
    if (!btn || btn.classList.contains("enviado")) return;

    const nombre = btn.dataset.nombre || "tu contacto";
    btn.textContent = "Enviado ✓";
    btn.classList.add("enviado");
    btn.disabled = true;

    if (nivelActual === "ver-reels" && subPasoNivel5 === 11) {
        subPasoNivel5 = 12;
        completarNivelActual(`¡Muy bien! Le enviaste el Reel a ${nombre} por Messenger. Ya sabes usar los Reels de Facebook.`);
    }
}

function compartirReel(destino) {
    // Messenger abre de verdad su pantalla para elegir a quién enviarlo;
    // el resto de destinos son atajos que se resuelven al momento.
    if (destino === "Messenger") {
        abrirMessenger();
        return;
    }

    const panel = $("#fbReelSharePanel");
    if (panel) panel.classList.remove("activa");

    if (nivelActual === "ver-reels" && subPasoNivel5 >= 10) {
        subPasoNivel5 = 12;
        completarNivelActual(`¡Muy bien! Compartiste el Reel en ${destino}. Ya sabes usar los Reels de Facebook.`);
    }
}

/**
 * Deshace una solicitud ya enviada y devuelve el botón a su estado original.
 */
/**
 * Simula que la persona a la que enviaste la solicitud la acepta. En Facebook
 * real llega por notificación, así que aquí también se avisa arriba.
 */
function mostrarSolicitudAceptada() {
    const card = $("#fbFriendCardRosa");
    if (card) {
        const acciones = card.querySelector(".fb-friend-actions");
        if (acciones) {
            acciones.innerHTML = `<span class="fb-request-resultado aceptada">✓ Rosa Elena aceptó tu solicitud. Ya son amigos</span>`;
        }
    }

    // La campana de notificaciones sube: así se ve de dónde viene el aviso
    const badge = document.querySelector('.fb-header-btn[aria-label="Notificaciones"] .fb-badge');
    if (badge) badge.textContent = (parseInt(badge.textContent, 10) || 3) + 1;

    subPasoNivel4 = 6;
    actualizarBarraInstrucciones(true, () => {
        const sim = $("#pantallaFacebookSimulador");
        const enPantalla = sim && sim.classList.contains("activa");
        if (!enPantalla || nivelActual !== "agregar-amigo" || subPasoNivel4 !== 6) return;

        // Ronda 2: enviar una solicitud buscando a la persona por su nombre
        rondaNivel4 = 2;
        subPasoNivel4 = 1;
        actualizarBarraInstrucciones(true);
    });
}

function cancelarSolicitudEnviada(friendId, btnElement) {
    btnElement.classList.remove("solicitud-enviada");
    btnElement.innerHTML = `
        <svg viewBox="0 0 24 24"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
        Agregar a amigos
    `;

    const card = btnElement.closest(".fb-friend-card");
    if (card) {
        const deleteBtn = card.querySelector(".fb-btn-delete-friend");
        if (deleteBtn) deleteBtn.style.display = "";
    }

    if (nivelActual === "agregar-amigo" && friendId === "rosa" && subPasoNivel4 === 3) {
        subPasoNivel4 = 4;
        actualizarBarraInstrucciones(true);
    }
}

function manejarAgregarAmigo(friendId, btnElement) {
    if (!btnElement) return;

    // Segundo toque sobre "Solicitud enviada" = cancelar la solicitud,
    // igual que en Facebook real
    if (btnElement.classList.contains("solicitud-enviada")) {
        cancelarSolicitudEnviada(friendId, btnElement);
        return;
    }

    btnElement.classList.add("solicitud-enviada");
    btnElement.innerHTML = `
        <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
        Solicitud enviada
    `;

    const card = btnElement.closest(".fb-friend-card");
    if (card) {
        const deleteBtn = card.querySelector(".fb-btn-delete-friend");
        if (deleteBtn) deleteBtn.style.display = "none";
    }

    const badge = $("#fbAmigosBadge");
    if (badge) {
        let currentCount = parseInt(badge.textContent) || 2;
        if (currentCount > 1) {
            badge.textContent = currentCount - 1;
        } else {
            badge.style.display = "none";
        }
    }

    if (nivelActual === "agregar-amigo") {
        // Ronda 1: solo Rosa Elena es válida. Ronda 2: cualquiera de los dos perfiles restantes.
        const esBuscado = String(friendId || "").startsWith("buscado-");

        // Ronda 2: vale cualquier persona encontrada en el buscador
        if (rondaNivel4 === 2 && esBuscado && subPasoNivel4 === 4) {
            subPasoNivel4 = 5;
            actualizarBarraInstrucciones(true, () => {
                const sim = $("#pantallaFacebookSimulador");
                if (!sim || !sim.classList.contains("activa")) return;
                if (nivelActual !== "agregar-amigo" || rondaNivel4 !== 2 || subPasoNivel4 !== 5) return;

                // Ronda 3: el lado contrario, responder a una solicitud recibida
                rondaNivel4 = 3;
                subPasoNivel4 = 1;
                cerrarBuscadorFb();
                cambiarPestana("amigos");
                reponerSolicitudesRecibidas();
                subPasoNivel4 = 2;
                actualizarBarraInstrucciones(true);
            });
            return;
        }

        const esObjetivoValido = rondaNivel4 === 1 && friendId === "rosa";

        if (esObjetivoValido && subPasoNivel4 === 2) {
            // Primer envío: ahora se enseña que se puede cancelar
            subPasoNivel4 = 3;
            actualizarBarraInstrucciones(true);
        } else if (esObjetivoValido && subPasoNivel4 === 4) {
            // La volvió a enviar tras cancelarla: Rosa la acepta al rato
            subPasoNivel4 = 5;
            actualizarBarraInstrucciones(true, () => {
                const sim = $("#pantallaFacebookSimulador");
                const enPantalla = sim && sim.classList.contains("activa");
                if (!enPantalla || nivelActual !== "agregar-amigo" || subPasoNivel4 !== 5) return;

                mostrarSolicitudAceptada();
            });
        }
    }
}

// ---------- FINALIZAR Y RETORNAR A NIVELES ----------
/**
 * Quita los emojis de un texto antes de leerlo en voz alta.
 */
function limpiarEmojisFb(texto) {
    return String(texto)
        .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "")
        .replace(/\s{2,}/g, " ")
        .trim();
}

function completarNivelActual(mensajeExito) {
    completarNivel("Facebook", nivelActual);

    const msgEl = $("#fbSuccessMessage");
    if (msgEl) msgEl.textContent = mensajeExito;

    const modal = $("#fbModalExito");
    if (modal) modal.classList.add("activa");

    // Prioritario: corta cualquier frase pendiente para que la felicitación
    // se escuche completa y no la pise la instrucción anterior
    speakPrioritario(`¡Excelente trabajo! ${limpiarEmojisFb(mensajeExito)} Presiona el botón azul de continuar para regresar a la lista de niveles.`);

    // Nada debe hablar después de la felicitación
    ultimaInstruccionHablada = "";
}

function retornarANiveles() {
    stopSpeech();
    limpiarResaltados();
    pausarReel();

    const modalExito = $("#fbModalExito");
    if (modalExito) modalExito.classList.remove("activa");

    const modalCrear = $("#fbCreatePostModal");
    if (modalCrear) modalCrear.classList.remove("activa");

    const modalComentarios = $("#fbCommentsModal");
    if (modalComentarios) modalComentarios.classList.remove("activa");

    const modalLightbox = $("#fbLightboxModal");
    if (modalLightbox) modalLightbox.classList.remove("activa");

    const sim = $("#pantallaFacebookSimulador");
    if (sim) sim.classList.remove("activa");

    cambiarPestana("inicio");

    location.hash = "/modulo/Facebook";
}

// ---------- INSTRUCCIONES Y GUÍA VISUAL ----------
/**
 * Publica la altura real de la barra de Nico como variable CSS, para que los
 * paneles a pantalla completa (comentarios, Reels) empiecen justo debajo y
 * Nico siga a la vista guiando al usuario.
 */
function ajustarAlturaNico() {
    const barra = $("#fbInstructionsBar");
    const pantalla = $("#pantallaFacebookSimulador");
    if (!barra || !pantalla) return;

    pantalla.style.setProperty("--fb-nico-h", barra.offsetHeight + "px");
}

/**
 * @param {boolean} autoSpeak  Si Nico debe leer la instrucción.
 * @param {Function|null} alTerminarVoz  Acción que se ejecuta cuando Nico
 *        termina la frase. Los avances automáticos de la guía la usan para no
 *        pisarle la voz a mitad de la explicación.
 */
function actualizarBarraInstrucciones(autoSpeak = true, alTerminarVoz = null) {
    const textEl = $("#fbInstructionsText");
    if (!textEl) return;

    let instruccion = INSTRUCCIONES[nivelActual] || "Explora el feed de Facebook.";

    if (nivelActual === "realizar-publicacion") {
        const modalCrear = $("#fbCreatePostModal");
        const estaModalAbierto = modalCrear && modalCrear.classList.contains("activa");
        const textareaVal = $("#fbCreatePostTextarea") ? $("#fbCreatePostTextarea").value.trim() : "";

        if (rondaNivel1 === 1) {
            // Ronda 1: flujo completo guiado (texto + foto + etiqueta)
            if (subPasoNivel1 === 1) {
                instruccion = "Toca en '¿Qué estás pensando?' para escribir una nueva publicación.";
            } else if (subPasoNivel1 === 2) {
                instruccion = "Toca el cuadro de texto para empezar a escribir.";
            } else if (subPasoNivel1 === 3) {
                instruccion = textareaVal.length > 0
                    ? "Muy bien. Ahora toca el ícono verde de 'Foto/video' para agregar una imagen."
                    : "Escribe tu mensaje o toca una de las frases sugeridas.";
            } else if (subPasoNivel1 === 4) {
                instruccion = "Elige una foto para tu publicación.";
            } else if (subPasoNivel1 === 5) {
                instruccion = "Ahora toca el ícono azul de 'Etiquetar personas'.";
            } else if (subPasoNivel1 === 6) {
                instruccion = "Elige a quién quieres etiquetar.";
            } else if (subPasoNivel1 === 7) {
                instruccion = "Revisa tu publicación. Cuando estés listo, toca el botón azul 'Publicar'.";
            } else if (subPasoNivel1 === 8) {
                instruccion = "¡Publicado! Te llevo a tu publicación: ahí está, la primera del muro, con tu foto y tu etiqueta.";
            }
        } else {
            // Ronda 2: repaso rápido, solo texto
            if (subPasoNivel1 === 1) {
                instruccion = estaModalAbierto
                    ? "Escribe un mensaje distinto o toca otra frase sugerida."
                    : "¡Vamos a practicarlo una vez más! Toca en '¿Qué estás pensando?' otra vez.";
            } else if (subPasoNivel1 === 2) {
                instruccion = textareaVal.length > 0
                    ? "Toca el botón azul 'Publicar' para compartir tu segundo mensaje."
                    : "Escribe lo que deseas compartir o toca una de las frases sugeridas.";
            } else if (subPasoNivel1 === 3) {
                instruccion = "Ahí está tu segunda publicación, arriba del todo. Mira cómo las tuyas van quedando por encima de las demás.";
            }
        }
    } else if (nivelActual === "reaccionar-foto") {
        const postObjetivo = POSTS_DATA.find(p => p.id === postObjetivoNivel2);
        const autorObjetivo = postObjetivo ? postObjetivo.autor : "esa publicación";

        if (subPasoNivel2 === 1) {
            instruccion = rondaNivel2 === 1
                ? `En la publicación de ${autorObjetivo}, mantén presionado el botón 'Me gusta' para ver todas las reacciones.`
                : `¡Practiquemos una vez más! En la publicación de ${autorObjetivo}, mantén presionado el botón 'Me gusta'.`;
        } else if (subPasoNivel2 === 2) {
            instruccion = "Ahora toca la reacción que prefieras, como 'Me encanta' ❤️ o 'Me gusta' 👍.";
        } else if (subPasoNivel2 === 3) {
            instruccion = rondaNivel2 === 1
                ? `¡Reaccionaste con "${etiquetaReaccion(ultimaReaccionElegidaNivel2)}"! ${ultimaReaccionElegidaNivel2} Mira cómo se refleja en la publicación.`
                : `¡Reaccionaste con "${etiquetaReaccion(ultimaReaccionElegidaNivel2)}"! ${ultimaReaccionElegidaNivel2} Ya sabes reaccionar a las publicaciones de tus amigos.`;
        }
    } else if (nivelActual === "comentar-publicacion") {
        const modal = $("#fbCommentsModal");
        const estaAbierto = modal && modal.classList.contains("activa");
        const inputVal = $("#fbCommentInput") ? $("#fbCommentInput").value.trim() : "";
        const postObjetivoN3 = POSTS_DATA.find(p => p.id === postObjetivoNivel3);
        const autorObjetivoN3 = postObjetivoN3 ? postObjetivoN3.autor : "esa publicación";

        if (rondaNivel3 === 1) {
            // Ronda 1: flujo completo guiado (identificar → tocar campo → escribir → confirmación)
            if (subPasoNivel3 === 1) {
                instruccion = `En la publicación de ${autorObjetivoN3}, toca el botón 'Comentar' que está abajo, en el centro, al lado de 'Me gusta'.`;
            } else if (subPasoNivel3 === 2) {
                instruccion = "Toca el cuadro blanco de la parte de abajo que dice 'Escribe un comentario'.";
            } else if (subPasoNivel3 === 3) {
                instruccion = inputVal.length > 0
                    ? "Ahora toca la flecha azul que está a la derecha del cuadro para enviar tu comentario."
                    : "Escribe lo que quieras decirle, o toca una de las frases sugeridas de encima del cuadro.";
            } else if (subPasoNivel3 === 4) {
                instruccion = "¡Tu comentario ya se publicó! Ahí está, al final de la lista, con tu nombre.";
            }
        } else {
            // Ronda 2: comentar otra vez y aprender a reaccionar, responder y borrar
            const menuAbierto = $("#fbCommentMenu") && $("#fbCommentMenu").classList.contains("activa");

            if (subPasoNivel3 === 1) {
                instruccion = estaAbierto
                    ? "Toca el cuadro blanco de abajo y escribe tu comentario."
                    : `¡Practiquemos una vez más! Toca 'Comentar' en la publicación de ${autorObjetivoN3}, abajo en el centro.`;
            } else if (subPasoNivel3 === 2) {
                instruccion = inputVal.length > 0
                    ? "Toca la flecha azul de la derecha para enviar tu comentario."
                    : "Escribe lo que deseas responder en el cuadro de abajo, o toca una de las frases sugeridas.";
            } else if (subPasoNivel3 === 3) {
                instruccion = "¿Te gustó lo que escribió otra persona? Toca 'Me gusta', el texto pequeño que hay justo debajo de su mensaje.";
            } else if (subPasoNivel3 === 4) {
                instruccion = "También puedes contestarle: toca 'Responder', al lado de 'Me gusta', debajo del mensaje de esa persona.";
            } else if (subPasoNivel3 === 5) {
                instruccion = inputVal.length > 0
                    ? "Toca la flecha azul para enviar tu respuesta."
                    : "Escribe tu respuesta en el cuadro de abajo y luego toca la flecha azul.";
            } else if (subPasoNivel3 === 6) {
                instruccion = menuAbierto
                    ? "Toca 'Eliminar', la opción roja, para borrar tu comentario."
                    : "¿Te arrepentiste de lo que escribiste? Toca los tres puntitos que hay a la derecha de tu propio comentario.";
            } else if (subPasoNivel3 === 7) {
                instruccion = "Tu comentario ya desapareció de la lista. Fíjate: los de las otras personas siguen ahí, porque cada quien borra solo lo suyo.";
            }
        }
    } else if (nivelActual === "agregar-amigo") {
        const friendsView = $("#fbFriendsView");
        const estaEnAmigos = friendsView && friendsView.style.display !== "none";

        if (rondaNivel4 === 1) {
            // Ronda 1: identificar pestaña → tocar Agregar en Rosa Elena → confirmación
            if (subPasoNivel4 === 1) {
                instruccion = estaEnAmigos
                    ? "Busca a Rosa Elena en la lista 'Personas que quizás conozcas' y toca su botón azul 'Agregar a amigos'."
                    : "Toca el icono de 'Amigos' en la barra de arriba: es el segundo, el de las dos personitas.";
            } else if (subPasoNivel4 === 2) {
                instruccion = "Busca a Rosa Elena en la lista 'Personas que quizás conozcas' y toca su botón azul 'Agregar a amigos'.";
            } else if (subPasoNivel4 === 3) {
                instruccion = "Enviada. Fíjate que el botón ahora dice 'Solicitud enviada': eso significa que Rosa todavía no la acepta. Si te equivocaste de persona, tócalo otra vez para cancelarla. Pruébalo.";
            } else if (subPasoNivel4 === 4) {
                instruccion = "Eso es: la solicitud se canceló y el botón volvió a 'Agregar a amigos'. Ahora vuelve a enviársela a Rosa.";
            } else if (subPasoNivel4 === 5) {
                instruccion = "Ya está enviada otra vez. Ahora hay que esperar: Rosa tiene que aceptarla desde su teléfono.";
            } else if (subPasoNivel4 === 6) {
                instruccion = "¡Rosa aceptó tu solicitud! Mira su tarjeta: ya son amigos. Así te enteras, y también te llega un aviso en la campana de arriba.";
            }
        } else if (rondaNivel4 === 2) {
            // Ronda 2: encontrar a alguien por su nombre y enviarle la solicitud
            const buscadorAbierto = $("#fbSearchView") && $("#fbSearchView").style.display !== "none";
            const valorBusqueda = $("#fbSearchInput") ? $("#fbSearchInput").value.trim() : "";

            if (subPasoNivel4 === 1) {
                instruccion = "¿Y si la persona no sale en la lista? Se la busca por su nombre. Toca la lupa de arriba a la derecha.";
            } else if (subPasoNivel4 === 2) {
                instruccion = valorBusqueda.length >= 3
                    ? "Muy bien. Ahora toca el botón azul de la lupa, a la derecha, para buscar."
                    : "Escribe el nombre de la persona en el cuadro de arriba, o toca una de las sugerencias.";
            } else if (subPasoNivel4 === 3) {
                instruccion = "Toca el botón azul de la lupa, a la derecha del cuadro, para buscar.";
            } else if (subPasoNivel4 === 4) {
                instruccion = "Estas son las personas que se llaman así. Toca 'Agregar a amigos' en la que quieras.";
            } else if (subPasoNivel4 === 5) {
                instruccion = "¡Enviada! Así puedes encontrar a cualquier persona aunque no aparezca en las sugerencias.";
            }
        } else {
            // Ronda 3: responder a una solicitud que te han enviado a ti
            if (subPasoNivel4 === 1) {
                instruccion = "Toca el icono de 'Amigos' en la barra de arriba, el de las dos personitas.";
            } else if (subPasoNivel4 === 2) {
                if (!solicitudConfirmada && !solicitudEliminada) {
                    instruccion = "Arriba, en 'Solicitudes de amistad', están las personas que quieren ser tus amigas. Tienes dos opciones: 'Confirmar' para aceptar, o 'Eliminar' para decir que no. Empieza tocando 'Confirmar' en la primera.";
                } else if (solicitudConfirmada) {
                    instruccion = "Ahora practica la otra opción: si no conoces a esa persona, no tienes por qué aceptarla. Toca 'Eliminar' en la solicitud que queda.";
                } else {
                    instruccion = "Ahora practica aceptar: toca 'Confirmar' en la solicitud que queda.";
                }
            } else if (subPasoNivel4 === 3) {
                instruccion = solicitudConfirmada && !solicitudEliminada
                    ? "Mira su tarjeta: ya son amigos. Fíjate también en que el número rojo de solicitudes bajó."
                    : "Esa quedó rechazada, y eso está perfectamente bien: no tienes por qué aceptar a quien no conozcas.";
            } else if (subPasoNivel4 === 4) {
                instruccion = "Ya practicaste las dos: aceptar a quien conoces y rechazar a quien no.";
            }
        }
    } else if (nivelActual === "ver-reels") {
        const reelsView = $("#fbReelsView");
        const estaEnReels = reelsView && reelsView.style.display !== "none";

        if (subPasoNivel5 === 1 || !estaEnReels) {
            instruccion = "Toca el icono de Video en la barra superior para entrar a los Reels.";
        } else if (subPasoNivel5 === 2) {
            instruccion = rondaNivel5 === 1
                ? "Desliza el video hacia arriba para ver el siguiente Reel."
                : "¡Bien hecho! Ahora desliza hacia abajo para volver al Reel anterior.";
        } else if (subPasoNivel5 === 3) {
            instruccion = rondaNivel5 === 1
                ? "¡Muy bien! Así se pasa al siguiente Reel."
                : "¡Perfecto! Ya sabes moverte entre Reels en las dos direcciones.";
        } else if (subPasoNivel5 === 4) {
            instruccion = "¿Te gustó este Reel? Toca el corazón blanco de la columna de la derecha, el de más arriba.";
        } else if (subPasoNivel5 === 5) {
            instruccion = "Si quieres que te salgan más videos de esta cuenta, toca el botón 'Seguir' que está abajo a la izquierda, al lado del nombre.";
        } else if (subPasoNivel5 === 6) {
            const panelComentarios = $("#fbReelCommentsPanel");
            const abierto = panelComentarios && panelComentarios.classList.contains("activa");
            const val = $("#fbReelCommentInput") ? $("#fbReelCommentInput").value.trim() : "";
            if (!abierto) {
                instruccion = "Ahora deja un comentario: toca el globo de diálogo de la derecha, el que está debajo del corazón.";
            } else {
                instruccion = val.length > 0
                    ? "Ahora toca la flecha azul de la derecha, al lado del cuadro, para publicar tu comentario."
                    : "Toca el cuadro blanco de abajo que dice 'Escribe un comentario' y escribe lo que quieras decir.";
            }
        } else if (subPasoNivel5 === 7) {
            instruccion = "Ahí está tu comentario, en la lista. Ahora dale 'Me gusta' al comentario de otra persona: toca donde dice 'Me gusta', debajo de su mensaje.";
        } else if (subPasoNivel5 === 8) {
            const val = $("#fbReelCommentInput") ? $("#fbReelCommentInput").value.trim() : "";
            if (respondiendoAComentarioReel !== null) {
                instruccion = val.length > 0
                    ? "Toca la flecha azul para enviar tu respuesta."
                    : "Escribe tu respuesta en el cuadro de abajo y luego toca la flecha azul.";
            } else {
                instruccion = "También puedes contestarle: toca 'Responder' debajo del comentario de esa persona.";
            }
        } else if (subPasoNivel5 === 9) {
            instruccion = "Ya contestaste. Por último vamos a compartirlo: cierra los comentarios con la equis de arriba y toca la flecha de compartir, la de más abajo de la columna derecha.";
        } else if (subPasoNivel5 === 10) {
            instruccion = "Elige por dónde mandarlo. Toca 'Enviar por Messenger', la primera opción.";
        } else if (subPasoNivel5 === 11) {
            instruccion = "Este es Messenger. Toca el botón azul 'Enviar' de la persona a la que se lo quieras mandar.";
        } else if (subPasoNivel5 === 12) {
            instruccion = "¡Excelente! Ya sabes usar los Reels de Facebook.";
        }
    }

    textEl.textContent = instruccion;
    ajustarAlturaNico();

    if (autoSpeak && instruccion !== ultimaInstruccionHablada) {
        ultimaInstruccionHablada = instruccion;

        // Se guarda el valor antes de vaciar la variable: si no, el callback
        // capturaría la variable ya puesta a null y fallaría al dispararse.
        const accionFinal = alTerminarVoz;
        alTerminarVoz = null;

        speak(limpiarEmojisFb(instruccion), accionFinal
            ? () => setTimeout(accionFinal, PAUSA_TRAS_VOZ)
            : undefined);
    }

    actualizarGuiaVisualFacebook();

    // No habló (era la misma frase o la voz está apagada): se espera un poco
    // igualmente para que dé tiempo a leer el mensaje en pantalla
    if (alTerminarVoz) setTimeout(alTerminarVoz, ESPERA_SIN_VOZ);
}

/**
 * Resalta un objetivo y lo centra en pantalla. El servicio compartido solo
 * hace scroll "nearest", que deja el objetivo pegado al borde o directamente
 * fuera de la vista cuando el feed acaba de renderizarse.
 */
function enfocarObjetivo(selector, opciones = {}) {
    resaltarElemento(selector, opciones);

    const el = document.querySelector(selector);
    if (!el) return;

    // OJO: no se usa scrollIntoView. Ese método desplaza TODOS los contenedores
    // con scroll que haya por encima, incluido .app, y eso empujaba la app
    // entera hacia arriba dejando la barra de Nico fuera de la pantalla.
    // Aquí se desplaza únicamente el contenedor propio del simulador.
    const cont = contenedorDesplazable(el);
    if (!cont) return;

    const rEl = el.getBoundingClientRect();
    const rCont = cont.getBoundingClientRect();
    const destino = cont.scrollTop + (rEl.top - rCont.top) - (rCont.height - rEl.height) / 2;

    try {
        cont.scrollTo({ top: Math.max(0, destino), behavior: "smooth" });
    } catch (e) {
        cont.scrollTop = Math.max(0, destino);
    }
}

/**
 * Busca el contenedor con scroll que contiene al elemento, sin salirse nunca
 * de la pantalla del simulador.
 */
function contenedorDesplazable(el) {
    const limite = $("#pantallaFacebookSimulador");
    let nodo = el.parentElement;

    while (nodo && nodo !== limite) {
        const estilo = getComputedStyle(nodo);
        const desplazable = /(auto|scroll)/.test(estilo.overflowY);
        if (desplazable && nodo.scrollHeight > nodo.clientHeight + 4) return nodo;
        nodo = nodo.parentElement;
    }

    return null;
}

function actualizarGuiaVisualFacebook(idNivel) {
    if (!idNivel) idNivel = nivelActual;

    if (idNivel === "realizar-publicacion") {
        const modal = $("#fbCreatePostModal");
        const estaAbierto = modal && modal.classList.contains("activa");
        const textareaVal = $("#fbCreatePostTextarea") ? $("#fbCreatePostTextarea").value.trim() : "";

        if (rondaNivel1 === 1 && subPasoNivel1 === 8) {
            // Ya publicó: el objetivo es su publicación recién creada, no el
            // cuadro de escribir (que es lo que se resaltaba antes por error)
            enfocarObjetivo("#fbPostsContainer .fb-post:first-child");
        } else if (!estaAbierto) {
            enfocarObjetivo(".fb-create-post");
        } else if (rondaNivel1 === 1) {
            if (subPasoNivel1 === 2) {
                enfocarObjetivo("#fbCreatePostTextarea");
            } else if (subPasoNivel1 === 3) {
                enfocarObjetivo(textareaVal.length > 0 ? "#fbAddonFotoBtn" : "#fbCreatePostTextarea");
            } else if (subPasoNivel1 === 4) {
                enfocarObjetivo("#fbPhotoPickerPopup .fb-photo-picker-option");
            } else if (subPasoNivel1 === 5) {
                enfocarObjetivo("#fbAddonTagBtn");
            } else if (subPasoNivel1 === 6) {
                enfocarObjetivo("#fbTagPickerPopup .fb-tag-option");
            } else if (subPasoNivel1 === 7) {
                enfocarObjetivo("#fbCreatePostSubmitBtn");
            } else if (subPasoNivel1 === 8) {
                enfocarObjetivo("#fbPostsContainer .fb-post:first-child");
            }
        } else {
            if (textareaVal.length > 0) {
                enfocarObjetivo("#fbCreatePostSubmitBtn");
            } else {
                enfocarObjetivo("#fbCreatePostTextarea");
            }
        }
    } else if (idNivel === "reaccionar-foto") {
        if (subPasoNivel2 === 1) {
            // scroll: en la ronda 2 el objetivo es la 3ª publicación, que queda fuera de pantalla
            enfocarObjetivo(`#fbFeed .fb-post[data-post-id='${postObjetivoNivel2}'] .fb-like-btn`);
        } else if (subPasoNivel2 === 2) {
            enfocarObjetivo(`#fbReactions-${postObjetivoNivel2}`);
        } else if (subPasoNivel2 === 3) {
            enfocarObjetivo(`#fbFeed .fb-post[data-post-id='${postObjetivoNivel2}'] .fb-post-reactions-summary`);
        }
    } else if (idNivel === "comentar-publicacion") {
        const modal = $("#fbCommentsModal");
        const estaAbierto = modal && modal.classList.contains("activa");
        const inputVal = $("#fbCommentInput") ? $("#fbCommentInput").value.trim() : "";

        if (!estaAbierto || subPasoNivel3 === 1) {
            // .fb-open-comments también la comparten el resumen de reacciones y el contador de
            // comentarios (ambos abren el modal en uso libre); aquí se resalta solo el botón real.
            // scroll: en la ronda 2 el objetivo es la 4ª publicación, que queda fuera de pantalla
            enfocarObjetivo(`#fbFeed .fb-post[data-post-id='${postObjetivoNivel3}'] .fb-action-btn.fb-open-comments`);
        } else if (rondaNivel3 === 1) {
            if (subPasoNivel3 === 2) {
                enfocarObjetivo("#fbCommentInput");
            } else if (subPasoNivel3 === 3) {
                enfocarObjetivo(inputVal.length > 0 ? "#fbCommentSend" : "#fbCommentInput");
            } else if (subPasoNivel3 === 4) {
                enfocarObjetivo("#fbCommentsList .fb-comment:last-child");
            }
        } else if (subPasoNivel3 === 3) {
            // Primer comentario que no sea el tuyo
            enfocarObjetivo("#fbCommentsList .fb-comment:not(.fb-comment-mio) .fb-comment-like-btn");
        } else if (subPasoNivel3 === 4) {
            enfocarObjetivo("#fbCommentsList .fb-comment:not(.fb-comment-mio) .fb-comment-reply-btn");
        } else if (subPasoNivel3 === 5) {
            enfocarObjetivo(inputVal.length > 0 ? "#fbCommentSend" : "#fbCommentInput");
        } else if (subPasoNivel3 === 6) {
            const menuAbierto = $("#fbCommentMenu") && $("#fbCommentMenu").classList.contains("activa");
            enfocarObjetivo(menuAbierto ? "#fbCommentMenuEliminar" : "#fbCommentsList .fb-comment-mio .fb-comment-menu-btn");
        } else {
            if (inputVal.length > 0) {
                enfocarObjetivo("#fbCommentSend");
            } else {
                enfocarObjetivo("#fbCommentInput");
            }
        }
    } else if (idNivel === "agregar-amigo") {
        const friendsView = $("#fbFriendsView");
        const estaEnAmigos = friendsView && friendsView.style.display !== "none";

        const enBuscador = $("#fbSearchView") && $("#fbSearchView").style.display !== "none";

        if (rondaNivel4 !== 2 && (!estaEnAmigos || (rondaNivel4 === 1 && subPasoNivel4 === 1)) && !enBuscador) {
            enfocarObjetivo(".fb-nav-tab[data-tab='amigos']");
        } else if (rondaNivel4 === 1 && (subPasoNivel4 === 5 || subPasoNivel4 === 6)) {
            // Esperando respuesta o ya aceptada: se mira la tarjeta completa
            enfocarObjetivo("#fbFriendCardRosa");
        } else if (rondaNivel4 === 1) {
            enfocarObjetivo("#fbAddFriendBtn-rosa");
        } else if (rondaNivel4 === 2) {
            const buscadorAbierto = $("#fbSearchView") && $("#fbSearchView").style.display !== "none";
            const valorBusqueda = $("#fbSearchInput") ? $("#fbSearchInput").value.trim() : "";

            if (!buscadorAbierto) {
                enfocarObjetivo('.fb-header-btn[aria-label="Buscar"]');
            } else if (subPasoNivel4 === 2) {
                enfocarObjetivo(valorBusqueda.length >= 3 ? "#fbSearchGo" : "#fbSearchInput, .fb-search-chip");
            } else if (subPasoNivel4 === 3) {
                enfocarObjetivo("#fbSearchGo");
            } else if (subPasoNivel4 === 4) {
                enfocarObjetivo("#fbSearchResultados .fb-btn-add-friend");
            } else {
                limpiarResaltados();
            }
        } else if (subPasoNivel4 === 2) {
            // Ronda 3: se resalta la acción que aún no ha practicado
            const selector = solicitudConfirmada
                ? ".fb-request-card .fb-btn-delete-request"
                : ".fb-request-card .fb-btn-confirm-request";
            if (document.querySelector(selector)) {
                enfocarObjetivo(selector);
            } else {
                limpiarResaltados();
            }
        } else {
            limpiarResaltados();
        }
    } else if (idNivel === "ver-reels") {
        const reelsView = $("#fbReelsView");
        const estaEnReels = reelsView && reelsView.style.display !== "none";

        if (subPasoNivel5 === 1 || !estaEnReels) {
            enfocarObjetivo(".fb-nav-tab[data-tab='video']");
        } else if (subPasoNivel5 === 2 || subPasoNivel5 === 3) {
            // Sin resaltado: el zoom intermitente sobre el video molestaba y no
            // explicaba nada. El gesto se enseña con la animación del dedo.
            limpiarResaltados();
        } else if (subPasoNivel5 === 4) {
            resaltarElemento("#fbReelLikeBtn");
        } else if (subPasoNivel5 === 5) {
            resaltarElemento("#fbReelFollowBtn");
        } else if (subPasoNivel5 === 6) {
            const panel = $("#fbReelCommentsPanel");
            const abierto = panel && panel.classList.contains("activa");
            if (abierto) {
                const val = $("#fbReelCommentInput") ? $("#fbReelCommentInput").value.trim() : "";
                resaltarElemento(val.length > 0 ? "#fbReelCommentSend" : "#fbReelCommentInput");
            } else {
                resaltarElemento("#fbReelCommentBtn");
            }
        } else if (subPasoNivel5 === 7) {
            resaltarElemento("#fbReelCommentsList .fb-reel-comment:not(.mio) .fb-reel-comment-like");
        } else if (subPasoNivel5 === 8) {
            if (respondiendoAComentarioReel !== null) {
                const val = $("#fbReelCommentInput") ? $("#fbReelCommentInput").value.trim() : "";
                resaltarElemento(val.length > 0 ? "#fbReelCommentSend" : "#fbReelCommentInput");
            } else {
                resaltarElemento("#fbReelCommentsList .fb-reel-comment:not(.mio) .fb-reel-comment-responder");
            }
        } else if (subPasoNivel5 === 9) {
            const panel = $("#fbReelCommentsPanel");
            const abierto = panel && panel.classList.contains("activa");
            resaltarElemento(abierto ? "#fbReelCommentsClose" : "#fbReelShareBtn");
        } else if (subPasoNivel5 === 10) {
            resaltarElemento("#fbReelShareOptions .fb-reel-share-option:first-child");
        } else if (subPasoNivel5 === 11) {
            resaltarElemento("#fbMessengerLista .fb-messenger-enviar");
        } else {
            limpiarResaltados();
        }
        actualizarSwipeHintReel();
    } else {
        enfocarObjetivo("#fbFeed .fb-post:first-child");
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
                let instruccionLimpia = textEl.textContent.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "");
                speak(instruccionLimpia);
            }
        };
    }

    // Salir del simulador
    const btnSalir = $("#fbSalirBtn");
    if (btnSalir) {
        btnSalir.onclick = retornarANiveles;
    }

    // Pestañas de navegación
    const navTabs = document.querySelectorAll(".fb-nav-tab");
    navTabs.forEach(tab => {
        tab.onclick = () => {
            if (tab.dataset.tab) {
                cambiarPestana(tab.dataset.tab);
            }
        };
    });

    // Agregar / cancelar / descartar sugerencias de amigos.
    // Por delegación: las tarjetas se vuelven a dibujar al reiniciar el nivel
    // o al aceptarse una solicitud, y con enlaces directos se quedaban muertas.
    const vistaAmigos = $("#fbFriendsView");
    if (vistaAmigos) {
        vistaAmigos.addEventListener("click", (e) => {
            const agregar = e.target.closest(".fb-btn-add-friend");
            if (agregar) {
                e.stopPropagation();
                manejarAgregarAmigo(agregar.dataset.friend, agregar);
                return;
            }

            const descartar = e.target.closest(".fb-btn-delete-friend");
            if (descartar) {
                e.stopPropagation();
                const card = descartar.closest(".fb-friend-card");
                if (card) {
                    card.style.opacity = "0";
                    setTimeout(() => card.remove(), 200);
                }
            }
        });
    }

    // ---- Nivel 5: Reels — navegación por gesto de deslizar (sin botón de respaldo) ----
    const reelPlayer = $("#fbReelPlayer");
    if (reelPlayer) {
        const UMBRAL_SWIPE = 40; // px mínimos para considerar el gesto intencional
        const dentroDeAccionesOInfo = (target) =>
            target.closest(".fb-reel-actions") || target.closest(".fb-reel-info") ||
            target.closest(".fb-reel-fallback-nav");

        const manejarSwipeReel = (deltaY) => {
            if (deltaY <= -UMBRAL_SWIPE) {
                irReelSiguiente();
            } else if (deltaY >= UMBRAL_SWIPE) {
                irReelAnterior();
            }
        };

        // Touch (móvil)
        reelPlayer.addEventListener("touchstart", (e) => {
            if (dentroDeAccionesOInfo(e.target)) { reelSwipeStartY = null; return; }
            reelSwipeStartY = e.touches[0].clientY;
        }, { passive: true });

        // Sin esto, deslizar hacia abajo activaba el "tirar para recargar" del
        // navegador y se recargaba la aplicación entera a mitad del nivel.
        reelPlayer.addEventListener("touchmove", (e) => {
            if (reelSwipeStartY !== null && e.cancelable) e.preventDefault();
        }, { passive: false });

        reelPlayer.addEventListener("touchend", (e) => {
            if (reelSwipeStartY === null) return;
            manejarSwipeReel(e.changedTouches[0].clientY - reelSwipeStartY);
            reelSwipeStartY = null;
        }, { passive: true });

        // Flechas de respaldo: llaman a las mismas funciones que el gesto, así
        // que la secuencia guiada del nivel avanza exactamente igual
        const prevBtn = $("#fbReelPrevBtn");
        if (prevBtn) {
            prevBtn.onclick = (e) => {
                e.stopPropagation();
                irReelAnterior();
            };
        }

        const nextBtn = $("#fbReelNextBtn");
        if (nextBtn) {
            nextBtn.onclick = (e) => {
                e.stopPropagation();
                irReelSiguiente();
            };
        }

        // Arrastre con mouse (equivalente de escritorio)
        reelPlayer.addEventListener("mousedown", (e) => {
            if (dentroDeAccionesOInfo(e.target)) return;
            reelSwipeStartY = e.clientY;
            reelArrastrandoMouse = true;
        });

        window.addEventListener("mouseup", (e) => {
            if (!reelArrastrandoMouse || reelSwipeStartY === null) return;
            reelArrastrandoMouse = false;
            manejarSwipeReel(e.clientY - reelSwipeStartY);
            reelSwipeStartY = null;
        });
    }

    const reelFollowBtn = $("#fbReelFollowBtn");
    if (reelFollowBtn) reelFollowBtn.onclick = alternarSeguirReel;

    const reelCommentBtn = $("#fbReelCommentBtn");
    if (reelCommentBtn) reelCommentBtn.onclick = abrirComentariosReel;

    const reelCommentsClose = $("#fbReelCommentsClose");
    if (reelCommentsClose) reelCommentsClose.onclick = cerrarComentariosReel;

    const reelCommentSend = $("#fbReelCommentSend");
    if (reelCommentSend) reelCommentSend.onclick = enviarComentarioReel;

    const reelCommentInput = $("#fbReelCommentInput");
    if (reelCommentInput) {
        reelCommentInput.oninput = () => actualizarGuiaVisualFacebook();
        reelCommentInput.onkeypress = (e) => { if (e.key === "Enter") enviarComentarioReel(); };
    }

    const reelShareBtn = $("#fbReelShareBtn");
    if (reelShareBtn) reelShareBtn.onclick = abrirCompartirReel;

    const reelShareClose = $("#fbReelShareClose");
    if (reelShareClose) reelShareClose.onclick = cerrarCompartirReel;

    // Me gusta y responder dentro de los comentarios del Reel
    const listaComentariosReel = $("#fbReelCommentsList");
    if (listaComentariosReel) {
        listaComentariosReel.addEventListener("click", (e) => {
            const like = e.target.closest(".fb-reel-comment-like");
            if (like) {
                alternarLikeComentarioReel(parseInt(like.dataset.indice, 10));
                return;
            }

            const responder = e.target.closest(".fb-reel-comment-responder");
            if (responder) {
                responderComentarioReel(parseInt(responder.dataset.indice, 10));
            }
        });
    }

    // Messenger
    const messengerVolver = $("#fbMessengerVolver");
    if (messengerVolver) messengerVolver.onclick = cerrarMessenger;

    const messengerLista = $("#fbMessengerLista");
    if (messengerLista) {
        messengerLista.addEventListener("click", (e) => {
            const btn = e.target.closest(".fb-messenger-enviar");
            if (btn) enviarPorMessenger(btn);
        });
    }

    const reelShareOptions = $("#fbReelShareOptions");
    if (reelShareOptions) {
        reelShareOptions.addEventListener("click", (e) => {
            const opcion = e.target.closest(".fb-reel-share-option");
            if (opcion) compartirReel(opcion.dataset.destino);
        });
    }

    const reelLikeBtn = $("#fbReelLikeBtn");
    if (reelLikeBtn) {
        reelLikeBtn.onclick = () => {
            if (reelLikeYaDado) return;
            reelLikeYaDado = true;

            reelLikeBtn.classList.add("liked");
            const likeIcon = $("#fbReelLikeIcon");
            if (likeIcon) likeIcon.style.fill = "#e0245e";

            const likeCount = $("#fbReelLikeCount");
            if (likeCount) {
                const current = REELS_DATA[reelActualIdx].likes;
                likeCount.textContent = (current + 1).toLocaleString("es-MX");
            }

            if (nivelActual === "ver-reels" && subPasoNivel5 === 4) {
                subPasoNivel5 = 5;
                actualizarBarraInstrucciones(true);
            }
        };
    }

    // Abrir modal crear publicación desde el trigger
    const triggerCrear = $("#fbTriggerCreatePost");
    if (triggerCrear) {
        triggerCrear.onclick = abrirModalCrearPublicacion;
    }

    // Cerrar modal crear publicación
    const btnCerrarCrear = $("#fbCreatePostClose");
    if (btnCerrarCrear) {
        btnCerrarCrear.onclick = cerrarModalCrearPublicacion;
    }

    // ---- Nivel 1: Foto y etiquetar personas ----
    const addonFotoBtn = $("#fbAddonFotoBtn");
    if (addonFotoBtn) {
        addonFotoBtn.onclick = (e) => {
            e.stopPropagation();
            abrirSelectorFoto();
        };
    }

    document.querySelectorAll(".fb-photo-picker-option").forEach(opt => {
        opt.onclick = (e) => {
            e.stopPropagation();
            seleccionarFoto(opt.dataset.photo);
        };
    });

    const addonTagBtn = $("#fbAddonTagBtn");
    if (addonTagBtn) {
        addonTagBtn.onclick = (e) => {
            e.stopPropagation();
            abrirSelectorEtiqueta();
        };
    }

    document.querySelectorAll(".fb-tag-option").forEach(opt => {
        opt.onclick = (e) => {
            e.stopPropagation();
            seleccionarEtiqueta(opt.dataset.nombre, opt.dataset.iniciales, opt.dataset.color);
        };
    });

    // Reposicionar los popups flotantes si cambia el tamaño de la ventana mientras están abiertos
    window.addEventListener("resize", () => {
        const fotoPopup = $("#fbPhotoPickerPopup");
        if (fotoPopup && fotoPopup.classList.contains("visible")) {
            posicionarPopupCerca(fotoPopup, $("#fbAddonFotoBtn"));
        }
        const tagPopup = $("#fbTagPickerPopup");
        if (tagPopup && tagPopup.classList.contains("visible")) {
            posicionarPopupCerca(tagPopup, $("#fbAddonTagBtn"));
        }
    });

    // Campo textarea de publicación
    const textarea = $("#fbCreatePostTextarea");
    const submitBtn = $("#fbCreatePostSubmitBtn");
    if (textarea) {
        textarea.onfocus = () => {
            if (nivelActual === "realizar-publicacion" && rondaNivel1 === 1 && subPasoNivel1 === 2) {
                subPasoNivel1 = 3;
                actualizarBarraInstrucciones(true);
            }
        };
        textarea.oninput = () => {
            const val = textarea.value.trim();
            if (submitBtn) {
                submitBtn.disabled = val.length === 0;
            }
            if (nivelActual === "realizar-publicacion" && rondaNivel1 === 1 && subPasoNivel1 === 2) {
                subPasoNivel1 = 3;
            }
            if (nivelActual === "realizar-publicacion") {
                actualizarBarraInstrucciones(false);
            } else {
                actualizarGuiaVisualFacebook();
            }
        };
    }

    // Chips de frases sugeridas para publicación (Nivel 1)
    const chipsPublicacion = document.querySelectorAll(".fb-suggestion-chip");
    chipsPublicacion.forEach(chip => {
        chip.onclick = (e) => {
            e.stopPropagation();
            const texto = chip.dataset.text;
            if (textarea) {
                textarea.value = texto;
                if (submitBtn) submitBtn.disabled = false;
                if (nivelActual === "realizar-publicacion" && rondaNivel1 === 1 && subPasoNivel1 === 2) {
                    subPasoNivel1 = 3;
                }
                if (nivelActual === "realizar-publicacion") {
                    actualizarBarraInstrucciones(true);
                } else {
                    actualizarGuiaVisualFacebook();
                }
            }
        };
    });

    // Chips de frases sugeridas para comentarios (Nivel 3)
    const commentChips = document.querySelectorAll(".fb-comment-suggestion-chip");
    commentChips.forEach(chip => {
        chip.onclick = (e) => {
            e.stopPropagation();
            const texto = chip.dataset.text;
            const inputComentario = $("#fbCommentInput");
            if (inputComentario) {
                inputComentario.value = texto;
                if (nivelActual === "comentar-publicacion" && rondaNivel3 === 1 && subPasoNivel3 === 2) {
                    subPasoNivel3 = 3;
                }
                if (nivelActual === "comentar-publicacion") {
                    actualizarBarraInstrucciones(true);
                } else {
                    resaltarElemento("#fbCommentSend");
                }
            }
        };
    });

    // Botón Publicar
    if (submitBtn) {
        submitBtn.onclick = publicarNuevoPost;
    }

    // Botón continuar en modal de éxito
    const btnContinuarExito = $("#fbSuccessBtnContinuar");
    if (btnContinuarExito) {
        btnContinuarExito.onclick = retornarANiveles;
    }

    // Cerrar modal comentarios
    const btnCerrarComentarios = $("#fbCommentsClose");
    if (btnCerrarComentarios) {
        btnCerrarComentarios.onclick = () => {
            cerrarComentarios();
            actualizarGuiaVisualFacebook(nivelActual);
        };
    }

    // Enviar comentario
    const sendBtn = $("#fbCommentSend");
    if (sendBtn) {
        sendBtn.onclick = enviarComentario;
    }
    const inputComentario = $("#fbCommentInput");
    if (inputComentario) {
        inputComentario.onfocus = () => {
            if (nivelActual === "comentar-publicacion" && rondaNivel3 === 1 && subPasoNivel3 === 2) {
                subPasoNivel3 = 3;
                actualizarBarraInstrucciones(true);
            }
        };
        inputComentario.oninput = () => {
            if (nivelActual === "comentar-publicacion" && rondaNivel3 === 1 && subPasoNivel3 === 2) {
                subPasoNivel3 = 3;
            }
            if (nivelActual === "comentar-publicacion") {
                actualizarBarraInstrucciones(false);
            } else {
                if (inputComentario.value.trim().length > 0) {
                    resaltarElemento("#fbCommentSend");
                } else {
                    resaltarElemento("#fbCommentInput");
                }
            }
        };
        inputComentario.onkeypress = (e) => { if (e.key === "Enter") enviarComentario(); };
    }

    // ---- Nivel 3: Me gusta y borrado dentro de la lista de comentarios ----
    const listaComentarios = $("#fbCommentsList");
    if (listaComentarios) {
        listaComentarios.addEventListener("click", (e) => {
            const like = e.target.closest(".fb-comment-like-btn");
            if (like) {
                alternarLikeComentario(parseInt(like.dataset.indice, 10));
                return;
            }

            const responder = e.target.closest(".fb-comment-reply-btn");
            if (responder) {
                responderComentario(parseInt(responder.dataset.indice, 10));
                return;
            }

            const menuBtn = e.target.closest(".fb-comment-menu-btn");
            if (menuBtn) {
                abrirMenuComentario(parseInt(menuBtn.dataset.indice, 10));
            }
        });
    }

    // Si el navegador bloqueó el sonido al entrar, se recupera en cuanto el
    // usuario toca cualquier cosa (que es cuando el navegador ya lo permite).
    const pantallaFb = $("#pantallaFacebookSimulador");
    if (pantallaFb) {
        pantallaFb.addEventListener("pointerdown", () => {
            if (!esperandoToqueParaSonido) return;
            esperandoToqueParaSonido = false;

            const video = $("#fbReelVideo");
            if (video) {
                video.muted = false;
                video.volume = VOLUMEN_REEL;
            }
        }, { capture: true });
    }

    // ---- Nivel 4: buscador de personas ----
    const btnBuscar = document.querySelector('.fb-header-btn[aria-label="Buscar"]');
    if (btnBuscar) btnBuscar.onclick = abrirBuscadorFb;

    const searchVolver = $("#fbSearchVolver");
    if (searchVolver) searchVolver.onclick = cerrarBuscadorFb;

    const searchGo = $("#fbSearchGo");
    if (searchGo) searchGo.onclick = ejecutarBusquedaFb;

    const searchInput = $("#fbSearchInput");
    if (searchInput) {
        searchInput.oninput = () => {
            if (nivelActual === "agregar-amigo" && rondaNivel4 === 2 && subPasoNivel4 === 2 && searchInput.value.trim().length >= 3) {
                subPasoNivel4 = 3;
                actualizarBarraInstrucciones(true);
            } else {
                actualizarGuiaVisualFacebook();
            }
        };
        searchInput.onkeypress = (e) => { if (e.key === "Enter") ejecutarBusquedaFb(); };
    }

    const searchSug = $("#fbSearchSugerencias");
    if (searchSug) {
        searchSug.addEventListener("click", (e) => {
            const chip = e.target.closest(".fb-search-chip");
            if (!chip) return;

            const input = $("#fbSearchInput");
            if (input) input.value = chip.dataset.nombre;

            if (nivelActual === "agregar-amigo" && rondaNivel4 === 2 && subPasoNivel4 === 2) {
                subPasoNivel4 = 3;
            }
            actualizarBarraInstrucciones(true);
        });
    }

    // Los resultados se dibujan al vuelo, así que van por delegación
    const searchRes = $("#fbSearchResultados");
    if (searchRes) {
        searchRes.addEventListener("click", (e) => {
            const agregar = e.target.closest(".fb-btn-add-friend");
            if (agregar) manejarAgregarAmigo(agregar.dataset.friend, agregar);
        });
    }

    // ---- Nivel 4: solicitudes de amistad recibidas ----
    const listaSolicitudes = $("#fbRequestsList");
    if (listaSolicitudes) {
        listaSolicitudes.addEventListener("click", (e) => {
            const confirmar = e.target.closest(".fb-btn-confirm-request");
            if (confirmar) {
                responderSolicitud(confirmar.dataset.request, true);
                return;
            }

            const eliminar = e.target.closest(".fb-btn-delete-request");
            if (eliminar) {
                responderSolicitud(eliminar.dataset.request, false);
            }
        });
    }

    const menuEliminar = $("#fbCommentMenuEliminar");
    if (menuEliminar) menuEliminar.onclick = eliminarComentarioPropio;

    const menuCancelar = $("#fbCommentMenuCancelar");
    if (menuCancelar) {
        menuCancelar.onclick = () => {
            cerrarMenuComentario();
            actualizarBarraInstrucciones(false);
        };
    }

    // Feed delegado
    const feed = $("#fbFeed");
    if (feed) {
        feed.addEventListener("click", (e) => {
            // Click generado al soltar el gesto de arrastre: ya se resolvió en pointerup
            if (Date.now() - momentoFinGestoReaccion < 400) {
                e.stopPropagation();
                return;
            }

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

        // ---- Gesto de reacción igual que en Facebook real ----
        // Se deja presionado "Me gusta", aparecen las reacciones, se arrastra el
        // dedo (o el ratón) sin soltar hasta la que se quiere y al soltar se
        // aplica esa. Un toque corto sigue funcionando como "Me gusta" normal.
        feed.addEventListener("pointerdown", (e) => {
            const likeBtn = e.target.closest(".fb-like-btn");
            if (!likeBtn) return;

            gestoReaccionPostId = parseInt(likeBtn.dataset.postId);
            gestoReaccionActivo = false;

            clearTimeout(reactionHoldTimer);
            reactionHoldTimer = setTimeout(() => {
                gestoReaccionActivo = true;
                mostrarReacciones(gestoReaccionPostId);
            }, 500);
        });

        // El movimiento se escucha en window: el dedo sale del botón al subir
        // hacia las reacciones, y en móvil el evento sigue yendo al elemento
        // donde empezó el gesto.
        window.addEventListener("pointermove", (e) => {
            if (!gestoReaccionActivo) return;
            e.preventDefault();
            enfocarOpcionReaccion(opcionReaccionDesdePunto(e.clientX, e.clientY));
        }, { passive: false });

        window.addEventListener("pointerup", (e) => {
            clearTimeout(reactionHoldTimer);
            reactionHoldTimer = null;

            if (!gestoReaccionActivo) {
                gestoReaccionPostId = null;
                return;
            }

            const opcion = opcionReaccionDesdePunto(e.clientX, e.clientY);
            enfocarOpcionReaccion(null);
            gestoReaccionActivo = false;
            gestoReaccionPostId = null;

            // Tras soltar, el navegador dispara un click; se ignora durante un
            // instante para que no vuelva a alternar la reacción recién puesta.
            momentoFinGestoReaccion = Date.now();

            if (opcion) {
                aplicarReaccion(opcion.dataset.emoji, parseInt(opcion.dataset.postId));
            }
            // Si soltó fuera de las reacciones, el panel se queda abierto para
            // que pueda elegir tocando, como también permite Facebook.
        });

        // Si el gesto se cancela (por ejemplo al entrar una llamada), se limpia
        window.addEventListener("pointercancel", () => {
            clearTimeout(reactionHoldTimer);
            reactionHoldTimer = null;
            enfocarOpcionReaccion(null);
            gestoReaccionActivo = false;
            gestoReaccionPostId = null;
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

    const post = POSTS_DATA.find(p => p.id === activeCommentsPostId) || POSTS_DATA[0];
    const eraRespuesta = respondiendoAComentario !== null;
    if (post) {
        if (!post.comentariosData) post.comentariosData = [];
        const nuevoComentario = {
            esMio: true,
            esRespuesta: eraRespuesta,
            autor: "Ramona Pico",
            iniciales: "RP",
            avatar: "./assets/img/facebook/user_profile.png",
            color: "#1877f2",
            texto: texto,
            tiempo: "Ahora",
            likes: 0
        };

        if (eraRespuesta) {
            // La respuesta queda justo debajo del comentario contestado
            post.comentariosData.splice(respondiendoAComentario + 1, 0, nuevoComentario);
        } else {
            post.comentariosData.push(nuevoComentario);
        }
        post.comentarios = (post.comentarios || 0) + 1;
    }

    input.value = "";
    cancelarRespuestaComentario();
    renderizarComentariosModal();
    renderizarPublicaciones();

    // Dejar a la vista lo que acaba de escribir
    const mio = $("#fbCommentsList .fb-comment-mio:last-of-type");
    if (mio) mio.scrollIntoView({ behavior: "smooth", block: "center" });

    if (nivelActual === "comentar-publicacion" && activeCommentsPostId === postObjetivoNivel3) {
        if (rondaNivel3 === 1 && subPasoNivel3 === 3) {
            subPasoNivel3 = 4;
            actualizarBarraInstrucciones(true, () => {
                const sim = $("#pantallaFacebookSimulador");
                const enPantalla = sim && sim.classList.contains("activa");
                if (!enPantalla || nivelActual !== "comentar-publicacion" || subPasoNivel3 !== 4) return;

                rondaNivel3 = 2;
                postObjetivoNivel3 = 4;
                subPasoNivel3 = 1; // la ronda 2 empieza otra vez por tocar 'Comentar'
                cerrarComentarios();
            });
        } else if (rondaNivel3 === 2 && subPasoNivel3 === 2 && !eraRespuesta) {
            subPasoNivel3 = 3;
            actualizarBarraInstrucciones(true);
        } else if (rondaNivel3 === 2 && subPasoNivel3 === 5 && eraRespuesta) {
            subPasoNivel3 = 6;
            actualizarBarraInstrucciones(true);
        }
    }
}

// ---------- PUNTO DE ENTRADA ----------
export function iniciarSimulador(idNivel) {
    nivelActual = idNivel;
    subPasoNivel1 = 1;
    rondaNivel1 = 1;
    fotoSeleccionadaNivel1 = null;
    etiquetaSeleccionadaNivel1 = null;
    subPasoNivel2 = 1;
    rondaNivel2 = 1;
    postObjetivoNivel2 = 1;
    ultimaReaccionElegidaNivel2 = "👍";
    subPasoNivel3 = 1;
    rondaNivel3 = 1;
    postObjetivoNivel3 = 1;
    subPasoNivel4 = 1;
    rondaNivel4 = 1;
    solicitudConfirmada = false;
    solicitudEliminada = false;
    subPasoNivel5 = 1;
    rondaNivel5 = 1;
    reelActualIdx = 0;
    reelLikeYaDado = false;
    REELS_DATA = JSON.parse(JSON.stringify(REELS_ORIGINAL));
    respondiendoAComentarioReel = null;
    reelSwipeStartY = null;
    reelArrastrandoMouse = false;
    activeCommentsPostId = 1;
    ultimaInstruccionHablada = "";
    reaccionesEstado = {};

    // Feed limpio en cada intento: sin las publicaciones ni los comentarios
    // que se crearon en partidas anteriores
    POSTS_DATA = JSON.parse(JSON.stringify(POSTS_ORIGINAL));

    asegurarTemplateHTML();

    document.querySelectorAll(".pantalla").forEach(p => p.classList.remove("activa"));
    const sim = $("#pantallaFacebookSimulador");
    if (sim) sim.classList.add("activa");

    cambiarPestana("inicio");

    // Resetear botones de amigos si se reingresa
    document.querySelectorAll(".fb-btn-add-friend").forEach(btn => {
        btn.classList.remove("solicitud-enviada");
        btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg> Agregar a amigos`;
    });
    document.querySelectorAll(".fb-btn-delete-friend").forEach(btn => btn.style.display = "");

    // Rosa vuelve a estar sin agregar (su tarjeta cambia al aceptar la solicitud)
    const accionesRosa = $("#fbFriendCardRosa .fb-friend-actions");
    if (accionesRosa) {
        accionesRosa.innerHTML = `
            <button id="fbAddFriendBtn-rosa" class="fb-btn-add-friend" data-friend="rosa" type="button">
                <svg viewBox="0 0 24 24"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                Agregar a amigos
            </button>
            <button class="fb-btn-delete-friend" data-friend="rosa" type="button">Eliminar</button>
        `;
    }
    const badgeNotif = document.querySelector('.fb-header-btn[aria-label="Notificaciones"] .fb-badge');
    if (badgeNotif) badgeNotif.textContent = "3";

    // Devolver las solicitudes recibidas a su estado inicial
    document.querySelectorAll(".fb-request-card").forEach(card => {
        const id = card.dataset.request;
        const acciones = card.querySelector(".fb-friend-actions");
        if (acciones) {
            acciones.innerHTML = `
                <button class="fb-btn-confirm-request" data-request="${id}" type="button">Confirmar</button>
                <button class="fb-btn-delete-request" data-request="${id}" type="button">Eliminar</button>
            `;
        }
    });
    const contadorSolicitudes = $("#fbSolicitudesCount");
    if (contadorSolicitudes) {
        contadorSolicitudes.textContent = "2";
        contadorSolicitudes.style.display = "";
    }
    const badge = $("#fbAmigosBadge");
    if (badge) {
        badge.textContent = "2";
        badge.style.display = "";
    }

    renderizarPublicaciones();
    renderizarAdjuntosNivel1();

    const feedEl = $("#fbFeed");
    if (feedEl) feedEl.scrollTop = 0;
    actualizarBotonesRespaldoReel();

    actualizarBarraInstrucciones(true);

    if (!simuladorInicializado) {
        inicializarListeners();
        simuladorInicializado = true;
    }
}
