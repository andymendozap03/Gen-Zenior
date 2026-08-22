import { $ } from "../../utils/dom.js";
import { speak, stopSpeech } from "../../services/speech.service.js";
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
let subPasoNivel3 = 1;
let subPasoNivel4 = 1;
let subPasoNivel5 = 1;
let reelActualIdx = 0;
let reelLikeYaDado = false;
let pestanaActiva = "inicio";
let activeCommentsPostId = 1;
let ultimaInstruccionHablada = "";

// ---------- DATOS DE PUBLICACIONES ----------
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
                        autoplay muted loop playsinline
                        src="./assets/video/piolin.mp4">
                    </video>
                    
                    <!-- Overlay de info -->
                    <div class="fb-reel-overlay">

                        <!-- Acciones laterales (derecha) -->
                        <div class="fb-reel-actions">
                            <button id="fbReelLikeBtn" class="fb-reel-action-btn" aria-label="Me gusta">
                                <svg viewBox="0 0 24 24" id="fbReelLikeIcon"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                                <span id="fbReelLikeCount" class="fb-reel-action-label">847</span>
                            </button>
                            <button class="fb-reel-action-btn" aria-label="Comentar">
                                <svg viewBox="0 0 24 24"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"/></svg>
                                <span class="fb-reel-action-label">32</span>
                            </button>
                            <button class="fb-reel-action-btn" aria-label="Compartir">
                                <svg viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>
                                <span class="fb-reel-action-label">Compartir</span>
                            </button>
                        </div>

                        <!-- Info del creador (abajo izquierda) -->
                        <div class="fb-reel-info">
                            <div class="fb-reel-creator">
                                <div class="fb-reel-avatar" id="fbReelAvatar">💪</div>
                                <div class="fb-reel-creator-details">
                                    <span class="fb-reel-creator-name" id="fbReelCreatorName">@SaludActiva</span>
                                    <button class="fb-reel-follow-btn">Seguir</button>
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

                    </div>

                    <!-- Contador de reel -->
                    <div class="fb-reel-counter" id="fbReelCounter">1 / 6</div>

                    <!-- Botón Siguiente Reel (flecha abajo) -->
                    <button id="fbReelNextBtn" class="fb-reel-next-btn" aria-label="Siguiente Reel">
                        <svg viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
                        <span>Siguiente Reel</span>
                    </button>

                    <!-- Botón Anterior Reel -->
                    <button id="fbReelPrevBtn" class="fb-reel-prev-btn" aria-label="Reel anterior" style="display:none;">
                        <svg viewBox="0 0 24 24"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6 1.41 1.41z"/></svg>
                    </button>

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
                        <span class="fb-create-username">Génesis Gutiérrez</span>
                        <div class="fb-create-audience-tag">
                            <span>🌐 Público</span>
                        </div>
                    </div>
                </div>

                <div class="fb-create-input-area">
                    <textarea id="fbCreatePostTextarea" class="fb-create-textarea" placeholder="¿Qué estás pensando, Génesis?" rows="4"></textarea>
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
                        </button>
                        <button type="button" id="fbAddonTagBtn" class="fb-addon-icon-btn" aria-label="Etiquetar personas">
                            <svg viewBox="0 0 24 24" style="fill:#1877f2;"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
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
                        </button>
                        <button type="button" class="fb-addon-icon-btn" aria-label="Sentimiento/actividad">
                            <svg viewBox="0 0 24 24" style="fill:#f7b928;"><circle cx="12" cy="12" r="10"/><path d="M12 16c2.2 0 4-1.8 4-4H8c0 2.2 1.8 4 4 4zm-3-6c.6 0 1-.4 1-1s-.4-1-1-1-1 .4-1 1 .4 1 1 1zm6 0c.6 0 1-.4 1-1s-.4-1-1-1-1 .4-1 1 .4 1 1 1z"/></svg>
                        </button>
                    </div>
                    <div id="fbCreateAttachments" class="fb-create-attachments"></div>
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

        const holdHintHtml = (nivelActual === "reaccionar-foto" && subPasoNivel2 === 1 && post.id === 1)
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
    activeCommentsPostId = postId;
    const post = POSTS_DATA.find(p => p.id === postId);
    if (!post) return;

    const modal = $("#fbCommentsModal");
    const lista = $("#fbCommentsList");
    if (!modal || !lista) return;

    lista.innerHTML = "";
    (post.comentariosData || []).forEach(com => {
        const el = document.createElement("div");
        el.className = "fb-comment";
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
                    <button class="fb-comment-action">Me gusta</button>
                    <button class="fb-comment-action">Responder</button>
                    ${com.likes > 0 ? `<span class="fb-comment-like-count">👍 ${com.likes}</span>` : ""}
                </div>
            </div>
        `;
        lista.appendChild(el);
    });

    modal.classList.add("activa");

    if (nivelActual === "comentar-publicacion") {
        subPasoNivel3 = 2;
        actualizarBarraInstrucciones(true);
    }
}

function cerrarComentarios() {
    const modal = $("#fbCommentsModal");
    if (modal) modal.classList.remove("activa");

    if (nivelActual === "comentar-publicacion") {
        subPasoNivel3 = 1;
        actualizarBarraInstrucciones(true);
    }
}

// ---------- REACCIONES ----------
let reactionHoldTimer = null;
let reactionPopupOpen = null;

function manejarLike(postId) {
    const estado = reaccionesEstado[postId];
    const post = POSTS_DATA.find(p => p.id === postId);
    if (!post) return;

    if (nivelActual === "reaccionar-foto" && postId === 1 && subPasoNivel2 === 1) {
        // Fallback amigable: si el usuario da un toque simple en vez de dejar presionado
        mostrarReacciones(1);
        const msg = "¡Muy bien! Para elegir más reacciones, deja presionado el botón. Ahora toca una de las emociones, como 'Me encanta' ❤️.";
        const textEl = $("#fbInstructionsText");
        if (textEl) textEl.textContent = msg;
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

        if (nivelActual === "reaccionar-foto" && postId === 1) {
            subPasoNivel2 = 2;
            actualizarBarraInstrucciones(true);
        }
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

    if (nivelActual === "reaccionar-foto" && (postId === 1 || subPasoNivel2 >= 1)) {
        subPasoNivel2 = 3;
        completarNivelActual("¡Excelente! Aprendiste a expresar tus emociones reaccionando a las fotos de tus amigos.");
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
    if (popup) popup.classList.toggle("visible");

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
    if (popup) popup.classList.toggle("visible");

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
        autor: "Génesis Gutiérrez",
        iniciales: "GG",
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
            actualizarBarraInstrucciones(true);

            setTimeout(() => {
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
            }, 2600);
        } else {
            subPasoNivel1 = 3;
            completarNivelActual("¡Excelente! Ya sabes crear publicaciones en Facebook, con foto y etiquetas incluidas.");
        }
    }
}

// ---------- NAVEGACIÓN DE PESTAÑAS (NIVEL 4) ----------
function cambiarPestana(tabName) {
    pestanaActiva = tabName;
    const tabs = document.querySelectorAll(".fb-nav-tab");
    tabs.forEach(t => {
        t.classList.toggle("activa", t.dataset.tab === tabName);
    });

    const feed = $("#fbFeed");
    const friendsView = $("#fbFriendsView");

    const reelsView = $("#fbReelsView");

    if (tabName === "amigos") {
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
const REELS_DATA = [
    { emoji: "🙏", autor: "@BendicionesDiarias", video: "./assets/video/piolin.mp4", desc: "Que la paz de Dios te cubra esta noche 🙏", likes: 847 },
    { emoji: "🍞", autor: "@PanCasero", video: "./assets/video/panes.mp4", desc: "Pan casero recien horneado, que delicia 🍞", likes: 1203 },
    { emoji: "🎤", autor: "@NilaStone", video: "./assets/video/nilastone.mp4", desc: "Ahora soy mi prioridad 🎤✨", likes: 532 },
    { emoji: "💧", autor: "@NaturalezaViva", video: "./assets/video/cascada.mp4", desc: "Un lugar hermoso para relajar la mente 💧", likes: 2148 },
    { emoji: "🍰", autor: "@RecetasSaludables", video: "./assets/video/minicake.mp4", desc: "Mini pastel saludable, facil y delicioso 🍰", likes: 918 },
    { emoji: "🌱", autor: "@MiJardin", video: "./assets/video/monte.mp4", desc: "Sembrando con cariño en casa 🌱", likes: 3052 },
];

function renderizarReel(idx) {
    const data = REELS_DATA[idx];
    if (!data) return;

    const video = $("#fbReelVideo");
    if (video) {
        video.src = data.video;
        video.load();
        video.play().catch(() => { });
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

    // Mostrar/ocultar flecha de anterior
    const prevBtn = $("#fbReelPrevBtn");
    if (prevBtn) prevBtn.style.display = idx > 0 ? "flex" : "none";
}

function manejarAgregarAmigo(friendId, btnElement) {
    if (!btnElement) return;

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

    if (nivelActual === "agregar-amigo" && (friendId === "rosa" || subPasoNivel4 >= 1)) {
        subPasoNivel4 = 3;
        completarNivelActual("¡Excelente! Has enviado tu primera solicitud de amistad en Facebook.");
    }
}

// ---------- FINALIZAR Y RETORNAR A NIVELES ----------
function completarNivelActual(mensajeExito) {
    completarNivel("Facebook", nivelActual);

    const msgEl = $("#fbSuccessMessage");
    if (msgEl) msgEl.textContent = mensajeExito;

    const modal = $("#fbModalExito");
    if (modal) modal.classList.add("activa");

    const mensajeVoz = "¡Excelente trabajo! Nivel completado con éxito. Presiona continuar para regresar a la lista de niveles.";
    speak(mensajeVoz);
}

function retornarANiveles() {
    stopSpeech();
    limpiarResaltados();

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
function actualizarBarraInstrucciones(autoSpeak = true) {
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
                instruccion = "¡Publicado! Mira tu mensaje arriba en el feed, con tu foto y tu etiqueta.";
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
                instruccion = "¡Excelente! Ya sabes crear publicaciones en Facebook.";
            }
        }
    } else if (nivelActual === "reaccionar-foto") {
        if (subPasoNivel2 === 1) {
            instruccion = "En la publicación de María, mantén presionado el botón 'Me gusta' para ver todas las reacciones.";
        } else if (subPasoNivel2 === 2) {
            instruccion = "Ahora toca la reacción que prefieras, como 'Me encanta' ❤️ o 'Me gusta' 👍.";
        } else if (subPasoNivel2 === 3) {
            instruccion = "¡Excelente! Has reaccionado a la publicación.";
        }
    } else if (nivelActual === "comentar-publicacion") {
        const modal = $("#fbCommentsModal");
        const estaAbierto = modal && modal.classList.contains("activa");
        const inputVal = $("#fbCommentInput") ? $("#fbCommentInput").value.trim() : "";

        if (subPasoNivel3 === 1) {
            instruccion = estaAbierto
                ? "Escribe un comentario o toca una frase sugerida para responder."
                : "En la publicación de María, toca el botón 'Comentar' para ver los comentarios.";
        } else if (subPasoNivel3 === 2) {
            instruccion = inputVal.length > 0
                ? "Toca el botón azul de la flecha para enviar tu comentario."
                : "Escribe lo que deseas responder o toca una de las frases sugeridas.";
        } else if (subPasoNivel3 === 3) {
            instruccion = "¡Excelente! Has publicado tu comentario.";
        }
    } else if (nivelActual === "agregar-amigo") {
        const friendsView = $("#fbFriendsView");
        const estaEnAmigos = friendsView && friendsView.style.display !== "none";

        if (subPasoNivel4 === 1) {
            instruccion = estaEnAmigos
                ? "Encuentra a Rosa Elena en 'Personas que quizás conozcas' y toca el botón azul 'Agregar a amigos'."
                : "Toca el icono de 'Amigos' en la barra superior (el que tiene dos personas).";
        } else if (subPasoNivel4 === 2) {
            instruccion = "Encuentra a Rosa Elena en 'Personas que quizás conozcas' y toca el botón azul 'Agregar a amigos'.";
        } else if (subPasoNivel4 === 3) {
            instruccion = "¡Excelente! Has enviado tu solicitud de amistad.";
        }
    } else if (nivelActual === "ver-reels") {
        const reelsView = $("#fbReelsView");
        const estaEnReels = reelsView && reelsView.style.display !== "none";

        if (subPasoNivel5 === 1) {
            instruccion = "Toca el icono de Video en la barra superior para entrar a los Reels.";
        } else if (subPasoNivel5 === 2) {
            instruccion = estaEnReels
                ? "Toca la flecha de abajo para ver el siguiente Reel."
                : "Toca el icono de Video en la barra superior para entrar a los Reels.";
        } else if (subPasoNivel5 === 3) {
            instruccion = "Ahora toca el corazon para dar Me gusta a este Reel.";
        } else if (subPasoNivel5 === 4) {
            instruccion = "¡Excelente! Has explorado los Reels de Facebook.";
        }
    }

    textEl.textContent = instruccion;

    if (autoSpeak && instruccion !== ultimaInstruccionHablada) {
        let instruccionLimpia = instruccion.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "");
        ultimaInstruccionHablada = instruccion;
        speak(instruccionLimpia);
    }

    actualizarGuiaVisualFacebook();
}

function actualizarGuiaVisualFacebook(idNivel) {
    if (!idNivel) idNivel = nivelActual;

    if (idNivel === "realizar-publicacion") {
        const modal = $("#fbCreatePostModal");
        const estaAbierto = modal && modal.classList.contains("activa");
        const textareaVal = $("#fbCreatePostTextarea") ? $("#fbCreatePostTextarea").value.trim() : "";

        if (!estaAbierto) {
            resaltarElemento(".fb-create-post");
        } else if (rondaNivel1 === 1) {
            if (subPasoNivel1 === 2) {
                resaltarElemento("#fbCreatePostTextarea");
            } else if (subPasoNivel1 === 3) {
                resaltarElemento(textareaVal.length > 0 ? "#fbAddonFotoBtn" : "#fbCreatePostTextarea");
            } else if (subPasoNivel1 === 4) {
                resaltarElemento("#fbPhotoPickerPopup .fb-photo-picker-option");
            } else if (subPasoNivel1 === 5) {
                resaltarElemento("#fbAddonTagBtn");
            } else if (subPasoNivel1 === 6) {
                resaltarElemento("#fbTagPickerPopup .fb-tag-option");
            } else if (subPasoNivel1 === 7) {
                resaltarElemento("#fbCreatePostSubmitBtn");
            } else if (subPasoNivel1 === 8) {
                resaltarElemento("#fbPostsContainer .fb-post:first-child", { scroll: true });
            }
        } else {
            if (textareaVal.length > 0) {
                resaltarElemento("#fbCreatePostSubmitBtn");
            } else {
                resaltarElemento("#fbCreatePostTextarea");
            }
        }
    } else if (idNivel === "reaccionar-foto") {
        if (subPasoNivel2 === 1) {
            resaltarElemento("#fbFeed .fb-post[data-post-id='1'] .fb-like-btn");
        } else if (subPasoNivel2 === 2) {
            resaltarElemento("#fbReactions-1");
        }
    } else if (idNivel === "comentar-publicacion") {
        const modal = $("#fbCommentsModal");
        const estaAbierto = modal && modal.classList.contains("activa");

        if (!estaAbierto || subPasoNivel3 === 1) {
            resaltarElemento("#fbFeed .fb-post[data-post-id='1'] .fb-open-comments");
        } else {
            const inputVal = $("#fbCommentInput") ? $("#fbCommentInput").value.trim() : "";
            if (inputVal.length > 0) {
                resaltarElemento("#fbCommentSend");
            } else {
                resaltarElemento("#fbCommentInput");
            }
        }
    } else if (idNivel === "agregar-amigo") {
        const friendsView = $("#fbFriendsView");
        const estaEnAmigos = friendsView && friendsView.style.display !== "none";

        if (!estaEnAmigos || subPasoNivel4 === 1) {
            resaltarElemento(".fb-nav-tab[data-tab='amigos']");
        } else {
            resaltarElemento("#fbAddFriendBtn-rosa");
        }
    } else if (idNivel === "ver-reels") {
        const reelsView = $("#fbReelsView");
        const estaEnReels = reelsView && reelsView.style.display !== "none";

        if (subPasoNivel5 === 1 || !estaEnReels) {
            resaltarElemento(".fb-nav-tab[data-tab='video']");
        } else if (subPasoNivel5 === 2) {
            resaltarElemento("#fbReelNextBtn");
        } else if (subPasoNivel5 === 3) {
            resaltarElemento("#fbReelLikeBtn");
        }
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

    // Botones de agregar amigo
    const addFriendBtns = document.querySelectorAll(".fb-btn-add-friend");
    addFriendBtns.forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            manejarAgregarAmigo(btn.dataset.friend, btn);
        };
    });

    // Botones de eliminar sugerencia de amigo
    const deleteFriendBtns = document.querySelectorAll(".fb-btn-delete-friend");
    deleteFriendBtns.forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const card = btn.closest(".fb-friend-card");
            if (card) {
                card.style.opacity = "0";
                setTimeout(() => card.remove(), 200);
            }
        };
    });

    // ---- Nivel 5: Reels ----
    const reelNextBtn = $("#fbReelNextBtn");
    if (reelNextBtn) {
        reelNextBtn.onclick = () => {
            if (reelActualIdx < REELS_DATA.length - 1) {
                reelActualIdx++;
                renderizarReel(reelActualIdx);

                if (nivelActual === "ver-reels" && subPasoNivel5 === 2) {
                    subPasoNivel5 = 3;
                    actualizarBarraInstrucciones(true);
                }
            }
        };
    }

    const reelPrevBtn = $("#fbReelPrevBtn");
    if (reelPrevBtn) {
        reelPrevBtn.onclick = () => {
            if (reelActualIdx > 0) {
                reelActualIdx--;
                renderizarReel(reelActualIdx);
            }
        };
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

            if (nivelActual === "ver-reels" && subPasoNivel5 === 3) {
                subPasoNivel5 = 4;
                completarNivelActual("¡Excelente! Entraste a Reels, navegaste entre videos y diste Me gusta. ¡Ya sabes usar los Reels de Facebook!");
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
        inputComentario.oninput = () => {
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

    const post = POSTS_DATA.find(p => p.id === activeCommentsPostId) || POSTS_DATA[0];
    if (post) {
        if (!post.comentariosData) post.comentariosData = [];
        post.comentariosData.push({
            autor: "Génesis Gutiérrez",
            iniciales: "GG",
            avatar: "./assets/img/facebook/user_profile.png",
            color: "#1877f2",
            texto: texto,
            tiempo: "Ahora",
            likes: 0
        });
        post.comentarios = (post.comentarios || 0) + 1;
    }

    const lista = $("#fbCommentsList");
    if (lista) {
        const el = document.createElement("div");
        el.className = "fb-comment";
        el.innerHTML = `
            <div class="fb-comment-avatar" style="background:#1877f2;">
                <img src="./assets/img/facebook/user_profile.png" alt="Tú" class="fb-avatar-img" onerror="this.style.display='none'; this.parentElement.innerText='GG'">
            </div>
            <div class="fb-comment-right">
                <div class="fb-comment-bubble">
                    <div class="fb-comment-author">Génesis Gutiérrez</div>
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
    renderizarPublicaciones();

    if (nivelActual === "comentar-publicacion") {
        subPasoNivel3 = 3;
        completarNivelActual("¡Excelente! Has publicado tu comentario exitosamente.");
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
    subPasoNivel3 = 1;
    subPasoNivel4 = 1;
    subPasoNivel5 = 1;
    reelActualIdx = 0;
    reelLikeYaDado = false;
    activeCommentsPostId = 1;
    ultimaInstruccionHablada = "";
    reaccionesEstado = {};

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
    const badge = $("#fbAmigosBadge");
    if (badge) {
        badge.textContent = "2";
        badge.style.display = "";
    }

    renderizarPublicaciones();
    renderizarAdjuntosNivel1();

    actualizarBarraInstrucciones(true);

    if (!simuladorInicializado) {
        inicializarListeners();
        simuladorInicializado = true;
    }
}
