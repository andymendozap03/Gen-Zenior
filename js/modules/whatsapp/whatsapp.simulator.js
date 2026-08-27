import { $ } from "../../utils/dom.js";
import { cargar, guardar } from "../../services/storage.service.js";
import { completarNivel } from "../../services/progress.service.js";
import { speak, stopSpeech } from "../../services/speech.service.js";
import { resaltarElemento, limpiarResaltados } from "../../services/guide-highlight.service.js";

let simuladorInicializado = false;
let nivelActual = null;
let chatSeleccionado = null;
let listaChatsData = [];
let callTimerInterval = null;
let videoCallTimerInterval = null;

// Lógica de sub-pasos para los niveles de WhatsApp
let subPasoNivel1 = 1;
let subPasoNivel2 = 1;
let subPasoNivel3 = 1; // 1: entrar chat o llamar, 2: conectando, 3: silenciado por error, 4: desmuteado (habla contacto), 5: colgar
let subPasoNivel4 = 1; // 1: entrar chat o videollamar, 2: conectando, 3: videollamada activa con PiP, 4: colgar
let subPasoNivel5 = 1; // 1: entrar chat o adjuntar, 2: galería abierta, 3: preview de foto, 4: enviada

let isMicMutedInCall = true;
let isVideoCameraOn = true;
let isVideoMicMuted = false;
let fotoSeleccionadaParaPreview = null;

let ultimaInstruccionHablada = "";

// Timers globales para evitar fugas asíncronas y duplicación de mensajes
let juanResponseTimeout = null;
let familyMessageTimeout = null;
let typingStatusTimeout = null;
let playbackIntervals = [];
let recordingDurationInterval = null;

// Elementos para grabación real de micrófono
let mediaRecorder = null;
let audioChunks = [];
let audioStream = null;
let estaGrabandoAudio = false;
let audioActivo = null;
let audioActivoMsg = null; // Referencia al mensaje del audio activo

// Tiempos para cálculo de duración real
let recordingStartTime = 0;

/**
 * Devuelve un listado limpio y nuevo de chats predeterminados
 * Recrea los literales de objeto para prevenir errores de compartición de referencias en memoria.
 */
function obtenerChatsDefecto(nivel) {
    if (nivel === "enviar-mensaje") {
        return [
            {
                id: "juan-nieto",
                nombre: "Juan (Nieto)",
                avatarClass: "ws-avatar-color-4",
                iniciales: "JN",
                preview: "¡Hola abuelo! ¿Qué tal te fue hoy en tu paseo?",
                hora: "Ayer",
                unreadCount: 0,
                mensajes: [
                    { sender: "recibida", text: "¡Hola abuelo! ¿Qué tal te fue hoy en tu paseo?", time: "Ayer" }
                ]
            },
            {
                id: "amigos-barrio",
                nombre: "Amigos del Barrio",
                avatarClass: "ws-avatar-color-2",
                iniciales: "AB",
                preview: "Carlos: ¿Mañana jugamos dominó?",
                hora: "09:25",
                unreadCount: 0,
                mensajes: [
                    { sender: "recibida", text: "¿Mañana jugamos dominó?", time: "09:25" }
                ]
            }
        ];
    }

    if (nivel === "grabar-audio") {
        return [
            {
                id: "juan-nieto",
                nombre: "Juan (Nieto)",
                avatarClass: "ws-avatar-color-4",
                iniciales: "JN",
                preview: "¡Hola abuelo! ¿Qué tal te fue hoy en tu paseo?",
                hora: "Ayer",
                unreadCount: 0,
                mensajes: [
                    { sender: "recibida", text: "¡Hola abuelo! ¿Qué tal te fue hoy en tu paseo?", time: "Ayer" }
                ]
            },
            {
                id: "vecinos-edificio",
                nombre: "Vecinos Edificio",
                avatarClass: "ws-avatar-color-3",
                iniciales: "VE",
                preview: "Elena: Compartió un contacto",
                hora: "07:10",
                unreadCount: 0,
                mensajes: [
                    { sender: "recibida", text: "Compartió un contacto", time: "07:10" }
                ]
            }
        ];
    }

    if (nivel === "hacer-llamada") {
        return [
            {
                id: "juan-nieto",
                nombre: "Juan (Nieto)",
                avatarClass: "ws-avatar-color-4",
                iniciales: "JN",
                preview: "¡Hola abuelo! ¿Qué tal te fue hoy en tu paseo?",
                hora: "Ayer",
                unreadCount: 0,
                mensajes: [
                    { sender: "recibida", text: "¡Hola abuelo! ¿Qué tal te fue hoy en tu paseo?", time: "Ayer" }
                ]
            }
        ];
    }

    if (nivel === "videollamada" || nivel === "llamada-grupal") {
        return [
            {
                id: "juan-nieto",
                nombre: "Juan (Nieto)",
                avatarClass: "ws-avatar-color-4",
                iniciales: "JN",
                preview: "¡Hola abuelo! ¿Hacemos una videollamada para vernos?",
                hora: "10:15",
                unreadCount: 0,
                mensajes: [
                    { sender: "recibida", text: "¡Hola abuelo! ¿Hacemos una videollamada para vernos?", time: "10:15" }
                ]
            },
            {
                id: "familia-mendoza",
                nombre: "Familia Mendoza",
                avatarClass: "ws-avatar-color-1",
                iniciales: "FM",
                preview: "Hija Ana: ¡Buen día papá! Nos vemos al rato",
                hora: "09:31",
                unreadCount: 0,
                mensajes: [
                    { sender: "recibida", text: "¡Buen día papá! Nos vemos al rato", time: "09:31", senderName: "Hija Ana" }
                ]
            }
        ];
    }

    if (nivel === "enviar-foto") {
        return [
            {
                id: "juan-nieto",
                nombre: "Juan (Nieto)",
                avatarClass: "ws-avatar-color-4",
                iniciales: "JN",
                preview: "Abuelo, ¿tienes la foto del viaje a Mitad del Mundo?",
                hora: "11:20",
                unreadCount: 0,
                mensajes: [
                    { sender: "recibida", text: "Abuelo, ¿tienes la foto del viaje a Mitad del Mundo?", time: "11:20" }
                ]
            }
        ];
    }

    // General fallback
    return [
        {
            id: "dr-martinez",
            nombre: "Dr. Martínez",
            avatarClass: "ws-avatar-color-6",
            iniciales: "DM",
            preview: "Confirmada la consulta para el jueves",
            hora: "Ayer",
            unreadCount: 0,
            mensajes: [
                { sender: "recibida", text: "Confirmada la consulta para el jueves", time: "Ayer" }
            ]
        },
        {
            id: "familia-mendoza",
            nombre: "Familia Mendoza",
            avatarClass: "ws-avatar-color-1",
            iniciales: "FM",
            preview: "Hija Ana: ¡Buen día papá! Nos vemos al rato",
            hora: "09:31",
            unreadCount: 0,
            mensajes: [
                { sender: "recibida", text: "¡Buen día papá! Nos vemos al rato", time: "09:31", senderName: "Hija Ana" }
            ]
        },
        {
            id: "juan-nieto",
            nombre: "Juan (Nieto)",
            avatarClass: "ws-avatar-color-4",
            iniciales: "JN",
            preview: "¡Hola abuelo! ¿Qué tal te fue hoy en tu paseo?",
            hora: "Ayer",
            unreadCount: 0,
            mensajes: [
                { sender: "recibida", text: "¡Hola abuelo! ¿Qué tal te fue hoy en tu paseo?", time: "Ayer" }
            ]
        }
    ];
}

const INSTRUCCIONES_NIVELES = {
    "enviar-mensaje": "Toca el chat de Juan para empezar a escribirle.",
    "grabar-audio": "Toca el chat de Juan para entrar a la conversación.",
    "hacer-llamada": "Toca el chat de Juan para hacerle una llamada.",
    "llamada-grupal": "Toca el chat de la Familia Mendoza para hacer una llamada grupal.",
    "enviar-foto": "Toca el chat de Juan para enviarle una foto."
};

/**
 * Solicita acceso previo al micrófono para evitar latencias de inicialización
 */
async function solicitarMicrofonoTemprano() {
    try {
        if (!audioStream) {
            audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log("Acceso al micrófono pre-concedido con éxito");
        }
    } catch (e) {
        console.warn("No se pudo pre-aprobar el micrófono:", e);
    }
}

/**
 * Inicia la grabación del micrófono usando la API MediaRecorder
 */
async function iniciarGrabacionReal() {
    try {
        if (!audioStream) {
            audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        mediaRecorder = new MediaRecorder(audioStream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        mediaRecorder.start();
        recordingStartTime = Date.now();
        return true;
    } catch (err) {
        console.warn("No se pudo iniciar la grabación real de audio:", err);
        return false;
    }
}

/**
 * Detiene la grabación del micrófono y devuelve un Object URL del audio
 */
async function detenerGrabacionReal() {
    return new Promise((resolve) => {
        if (!mediaRecorder || mediaRecorder.state === "inactive") {
            resolve(null);
            return;
        }

        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
            const audioUrl = URL.createObjectURL(audioBlob);
            resolve(audioUrl);
        };

        mediaRecorder.stop();
    });
}

/**
 * Detiene todos los timers activos e intervalos para prevenir fugas de ejecución
 */
function limpiarTodosLosTimers() {
    if (juanResponseTimeout) {
        clearTimeout(juanResponseTimeout);
        juanResponseTimeout = null;
    }
    if (familyMessageTimeout) {
        clearTimeout(familyMessageTimeout);
        familyMessageTimeout = null;
    }
    if (typingStatusTimeout) {
        clearTimeout(typingStatusTimeout);
        typingStatusTimeout = null;
    }
    if (callTimerInterval) {
        clearInterval(callTimerInterval);
        callTimerInterval = null;
    }
    if (recordingDurationInterval) {
        clearInterval(recordingDurationInterval);
        recordingDurationInterval = null;
    }
    const inputField = $("#wsInputMensaje");
    if (inputField) {
        inputField.disabled = false;
        inputField.value = "";
    }
    playbackIntervals.forEach(interval => clearInterval(interval));
    playbackIntervals = [];

    // Detener reproducción si estuviera activa
    if (audioActivo) {
        audioActivo.pause();
        audioActivo = null;
    }
    audioActivoMsg = null;

    // Detener la grabación de audio si está en progreso
    if (estaGrabandoAudio) {
        detenerGrabacionReal().catch(e => console.warn(e));
        estaGrabandoAudio = false;

        const sendBtn = $("#wsEnviarMensajeBtn");
        if (sendBtn) {
            sendBtn.style.backgroundColor = "";
            sendBtn.innerHTML = `
                <svg id="wsMicIcon" class="ws-action-circle-icon" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>
            `;
        }
    }

    // Liberar hardware de micrófono al salir por completo
    if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        audioStream = null;
    }
}

/**
 * Inyecta el marcado HTML del simulador si no existe
 */
function asegurarTemplateHTML() {
    const contenedor = $("#pantallaWhatsappSimulador");
    if (!contenedor) return;

    if (contenedor.children.length === 0) {
        contenedor.innerHTML = `
            <!-- Barra de instrucciones (NICO Guía) -->
            <div id="wsInstructionsBar" class="ws-instructions-bar">
                <div class="ws-instructions-nico" style="cursor: pointer;">
                    <img src="./assets/img/icons/voz.svg" alt="Nico" class="ws-instructions-icono-nico">
                    <small>NICO</small>
                </div>
                <div id="wsInstructionsText" class="ws-instructions-text">Cargando objetivo...</div>
            </div>

            <!-- Vista 1: Lista de Chats -->
            <div id="wsChatsList" class="ws-view activa">
                <!-- Encabezado -->
                <header class="ws-header">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <button id="wsSalirSimulador" class="ws-header-btn" aria-label="Salir de WhatsApp">
                            <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: white;"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                        </button>
                        <span class="ws-header-title">WhatsApp</span>
                    </div>
                    <div class="ws-header-actions">
                        <button class="ws-header-btn" aria-label="Buscar">
                            <svg viewBox="0 0 24 24" style="width: 22px; height: 22px; fill: white;"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                        </button>
                        <button class="ws-header-btn" aria-label="Más opciones">
                            <svg viewBox="0 0 24 24" style="width: 22px; height: 22px; fill: white;"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                        </button>
                    </div>
                </header>

                <!-- Barra de Estados (Historias) -->
                <div class="ws-status-bar">
                    <div class="ws-status-item mine">
                        <div class="ws-status-avatar-wrapper">
                            <img src="./assets/img/icons/voz.svg" class="ws-status-avatar" alt="Mi estado">
                            <span class="ws-status-add-btn">+</span>
                        </div>
                        <span class="ws-status-name">Mi estado</span>
                    </div>
                    <div class="ws-status-item">
                        <div class="ws-status-avatar-wrapper">
                            <div class="ws-avatar ws-status-avatar ws-avatar-color-1">A</div>
                        </div>
                        <span class="ws-status-name">Adriana</span>
                    </div>
                    <div class="ws-status-item">
                        <div class="ws-status-avatar-wrapper">
                            <div class="ws-avatar ws-status-avatar ws-avatar-color-2">M</div>
                        </div>
                        <span class="ws-status-name">Mayra</span>
                    </div>
                    <div class="ws-status-item">
                        <div class="ws-status-avatar-wrapper">
                            <div class="ws-avatar ws-status-avatar ws-avatar-color-3">S</div>
                        </div>
                        <span class="ws-status-name">Samuel</span>
                    </div>
                    <div class="ws-status-item">
                        <div class="ws-status-avatar-wrapper">
                            <div class="ws-avatar ws-status-avatar ws-avatar-color-5">S</div>
                        </div>
                        <span class="ws-status-name">Sofi</span>
                    </div>
                </div>

                <!-- Buscador -->
                <div class="ws-search-container">
                    <div class="ws-search-box">
                        <svg class="ws-search-icon" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                        <span>Preguntar a Meta AI o buscar</span>
                    </div>
                </div>

                <!-- Filtros -->
                <div class="ws-filters-bar">
                    <button class="ws-filter-pill activa">Todos</button>
                    <button class="ws-filter-pill">No leídos</button>
                    <button class="ws-filter-pill">+</button>
                </div>

                <!-- Lista de Chats -->
                <div id="wsListaChats" class="ws-chats-list"></div>

                <!-- Botón flotante FAB -->
                <button class="ws-fab" aria-label="Nuevo chat">
                    <svg class="ws-fab-icon" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/></svg>
                </button>

                <!-- Menú de navegación inferior -->
                <nav class="ws-bottom-nav">
                    <button class="ws-nav-item activa">
                        <div class="ws-nav-icon-wrapper">
                            <svg class="ws-nav-icon" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                        </div>
                        <span>Chats</span>
                    </button>
                    <button class="ws-nav-item">
                        <div class="ws-nav-icon-wrapper">
                            <svg class="ws-nav-icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                        </div>
                        <span>Novedades</span>
                    </button>
                    <button class="ws-nav-item">
                        <div class="ws-nav-icon-wrapper">
                            <svg class="ws-nav-icon" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                        </div>
                        <span>Comunidades</span>
                    </button>
                    <button class="ws-nav-item">
                        <div class="ws-nav-icon-wrapper">
                            <svg class="ws-nav-icon" viewBox="0 0 24 24"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-2.2 2.2a15.045 15.045 0 0 1-6.59-6.59l2.2-2.21a.96.96 0 0 0 .25-1a11.36 11.36 0 0 1 8.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.62c0-.55-.45-1-1-1z"/></svg>
                        </div>
                        <span>Llamadas</span>
                    </button>
                </nav>
            </div>

            <!-- Vista 2: Conversación Individual -->
            <div id="wsChatConversation" class="ws-view">
                <header class="ws-chat-header">
                    <button id="wsVolverChats" class="ws-chat-back-btn" aria-label="Volver a chats">
                        <svg class="ws-chat-back-icon" viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                    </button>
                    <div class="ws-chat-contact">
                        <div id="wsContactAvatar" class="ws-avatar ws-chat-contact-avatar"></div>
                        <div class="ws-chat-contact-info">
                            <h3 id="wsContactName" class="ws-chat-contact-name"></h3>
                            <span class="ws-chat-contact-status">en línea</span>
                        </div>
                    </div>
                    <div class="ws-chat-actions">
                        <button id="wsBtnVideoLlamada" class="ws-chat-action-btn" aria-label="Videollamada">
                            <svg class="ws-chat-action-icon" viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
                        </button>
                        <button id="wsBtnLlamada" class="ws-chat-action-btn" aria-label="Llamada">
                            <svg class="ws-chat-action-icon" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                        </button>
                        <button class="ws-chat-action-btn" aria-label="Opciones de chat">
                            <svg class="ws-chat-action-icon" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                        </button>
                    </div>
                </header>
                <div id="wsChatBody" class="ws-chat-body"></div>
                <footer class="ws-chat-footer">
                    <div class="ws-input-container">
                        <button class="ws-input-btn" aria-label="Emojis">
                            <svg class="ws-input-btn-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16c2.2 0 4-1.8 4-4H8c0 2.2 1.8 4 4 4zm-3-6c.6 0 1-.4 1-1s-.4-1-1-1-1 .4-1 1 .4 1 1 1zm6 0c.6 0 1-.4 1-1s-.4-1-1-1-1 .4-1 1 .4 1 1 1z"/></svg>
                        </button>
                        <input type="text" id="wsInputMensaje" class="ws-input-field" placeholder="Mensaje" autocomplete="off">
                        <button id="wsBtnAdjuntar" class="ws-input-btn" aria-label="Adjuntar archivo">
                            <svg class="ws-input-btn-icon" viewBox="0 0 24 24"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 0 1 5 0v10.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5V6H9v9.5c0 2.48 2.02 4.5 4.5 4.5s4.5-2.02 4.5-4.5V5c0-3.31-2.69-6-6-6S6 2.69 6 6v11.5c0 4.14 3.36 7.5 7.5 7.5s7.5-3.36 7.5-7.5V6h-1.5z"/></svg>
                        </button>
                        <button id="wsBtnCamara" class="ws-input-btn" aria-label="Cámara">
                            <svg class="ws-input-btn-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>
                        </button>
                    </div>
                    <button id="wsEnviarMensajeBtn" class="ws-action-circle-btn" aria-label="Grabar nota de voz o Enviar">
                        <svg id="wsMicIcon" class="ws-action-circle-icon" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>
                        <svg id="wsSendIcon" class="ws-action-circle-icon" viewBox="0 0 24 24" style="display: none; fill: white;"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                    </button>
                </footer>
            </div>

            <!-- Aviso flotante acción bloqueada -->
            <div id="wsToastBlocked" class="ws-toast-blocked"></div>

            <!-- Modales -->
            <!-- 1. Modal de llamada de voz realista estilo WhatsApp -->
            <div id="wsModalLlamada" class="ws-modal-llamada">
                <header class="ws-call-header">
                    <button id="wsCallBtnMinimizar" class="ws-call-header-btn" aria-label="Minimizar llamada">
                        <svg viewBox="0 0 24 24" style="width: 22px; height: 22px; fill: white;"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-14v3h3v2h-5V5h2z"/></svg>
                    </button>
                    <div class="ws-call-header-info">
                        <h2 id="wsCallName" class="ws-call-name">Juan (Nieto)</h2>
                        <p id="wsCallStatus" class="ws-call-status">Llamando...</p>
                    </div>
                    <button class="ws-call-header-btn" aria-label="Añadir participante">
                        <svg viewBox="0 0 24 24" style="width: 22px; height: 22px; fill: white;"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                    </button>
                </header>

                <div class="ws-call-center-body">
                    <div class="ws-call-avatar-wrapper">
                        <div id="wsCallAvatarLetter" class="ws-avatar ws-call-avatar ws-avatar-color-4 ws-call-avatar-letter">JN</div>
                    </div>
                </div>

                <div class="ws-call-bottom-card">
                    <div class="ws-call-controls-grid">
                        <div class="ws-call-control-item">
                            <button class="ws-call-ctrl-btn" aria-label="Altavoz">
                                <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: white;"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                            </button>
                            <span class="ws-call-ctrl-label">Altavoz</span>
                        </div>
                        <div class="ws-call-control-item">
                            <button class="ws-call-ctrl-btn" aria-label="Video">
                                <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: white;"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
                            </button>
                            <span class="ws-call-ctrl-label">Video</span>
                        </div>
                        <div class="ws-call-control-item">
                            <button id="wsCallBtnMute" class="ws-call-ctrl-btn" aria-label="Silenciar">
                                <svg id="wsCallMicMutedIcon" viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: white; display: none;"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l4.07 4.07c-1.38.72-2.96 1.13-4.72 1.13-4.42 0-8-3.58-8-8H2c0 5.18 3.95 9.45 9 9.93V23h2v-2.07c1.78-.17 3.42-.82 4.84-1.78l2.89 2.89L22 20.73 4.27 3z"/></svg>
                                <svg id="wsCallMicUnmutedIcon" viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: white;"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>
                            </button>
                            <span id="wsCallMuteLabel" class="ws-call-ctrl-label">Silenciar</span>
                        </div>
                        <div class="ws-call-control-item">
                            <button class="ws-call-ctrl-btn" aria-label="Más opciones">
                                <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: white;"><path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                            </button>
                            <span class="ws-call-ctrl-label">Más</span>
                        </div>
                        <div class="ws-call-control-item">
                            <button class="ws-call-ctrl-btn" aria-label="Compartir">
                                <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: white;"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>
                            </button>
                            <span class="ws-call-ctrl-label">Compartir</span>
                        </div>
                        <div class="ws-call-control-item">
                            <button id="wsCallBtnColgar" class="ws-call-ctrl-btn end-call" aria-label="Finalizar llamada">
                                <svg viewBox="0 0 24 24" style="width: 26px; height: 26px; fill: white; transform: rotate(135deg);"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-2.2 2.2a15.045 15.045 0 0 1-6.59-6.59l2.2-2.21a.96.96 0 0 0 .25-1A11.36 11.36 0 0 1 8.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.62c0-.55-.45-1-1-1z"/></svg>
                            </button>
                            <span class="ws-call-ctrl-label">Finalizar</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal de Llamada Entrante Realista -->
            <div id="wsModalLlamadaEntrante" class="ws-modal-llamada-entrante">
                <header class="ws-incoming-header">
                    <span class="ws-incoming-app-label">
                        <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; fill: #25D366; vertical-align: middle; margin-right: 6px;"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z"/></svg>
                        WhatsApp audio
                    </span>
                </header>
                <div class="ws-incoming-body">
                    <div id="wsIncomingAvatarLetter" class="ws-avatar ws-incoming-avatar ws-avatar-color-4">JN</div>
                    <h2 id="wsIncomingName" class="ws-incoming-name">Juan (Nieto)</h2>
                    <p class="ws-incoming-type">Llamada entrante...</p>
                </div>
                <div class="ws-incoming-actions">
                    <button id="wsIncomingBtnRechazar" class="ws-incoming-btn reject" aria-label="Rechazar">
                        <div class="ws-incoming-btn-icon-wrapper">
                            <svg viewBox="0 0 24 24" style="width: 28px; height: 28px; fill: white; transform: rotate(135deg);"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-2.2 2.2a15.045 15.045 0 0 1-6.59-6.59l2.2-2.21a.96.96 0 0 0 .25-1A11.36 11.36 0 0 1 8.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.62c0-.55-.45-1-1-1z"/></svg>
                        </div>
                        <span>Rechazar</span>
                    </button>
                    <button id="wsIncomingBtnContestar" class="ws-incoming-btn accept" aria-label="Contestar">
                        <div class="ws-incoming-btn-icon-wrapper">
                            <svg viewBox="0 0 24 24" style="width: 28px; height: 28px; fill: white;"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-2.2 2.2a15.045 15.045 0 0 1-6.59-6.59l2.2-2.21a.96.96 0 0 0 .25-1A11.36 11.36 0 0 1 8.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.62c0-.55-.45-1-1-1z"/></svg>
                        </div>
                        <span>Contestar</span>
                    </button>
                </div>
            </div>

            <!-- 2. Modal de videollamada realista estilo WhatsApp -->
            <div id="wsModalVideoLlamada" class="ws-modal-videollamada">
                <div class="ws-videocall-remote-bg"></div>
                <div class="ws-videocall-overlay-gradient"></div>
                <div class="ws-videocall-content">
                    <header class="ws-call-header">
                        <button id="wsVideoCallBtnMinimizar" class="ws-call-header-btn" aria-label="Minimizar">
                            <svg viewBox="0 0 24 24" style="width: 22px; height: 22px; fill: white;"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-14v3h3v2h-5V5h2z"/></svg>
                        </button>
                        <div class="ws-call-header-info">
                            <h2 id="wsVideoCallName" class="ws-call-name">Juan (Nieto)</h2>
                            <p id="wsVideoCallStatus" class="ws-call-status">0:01</p>
                        </div>
                        <button class="ws-call-header-btn" aria-label="Añadir participante">
                            <svg viewBox="0 0 24 24" style="width: 22px; height: 22px; fill: white;"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                        </button>
                    </header>

                    <!-- Ventana flotante PiP (propia cámara) -->
                    <div id="wsVideoCallPip" class="ws-videocall-pip">
                        <img id="wsVideoCallPipImg" src="./assets/img/whatsapp/video_self.png" alt="Mi cámara" class="ws-videocall-pip-img">
                        <div id="wsVideoCallPipOff" class="ws-videocall-pip-off" style="display: none;">
                            <svg viewBox="0 0 24 24" style="width: 32px; height: 32px; fill: rgba(255,255,255,0.7);"><path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2zM5 16V8h1.73l8 8H5z"/></svg>
                            <span>Cámara apagada</span>
                        </div>
                        <div class="ws-videocall-pip-actions">
                            <button class="ws-videocall-pip-btn" aria-label="Girar cámara">
                                <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: white;"><path d="M9.01 14H2v2h7.01v3L13 15l-3.99-4v3zm5.98-1v-3H22V8h-7.01V5L11 9l3.99 4z"/></svg>
                            </button>
                            <button class="ws-videocall-pip-btn" aria-label="Efectos">
                                <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: white;"><path d="M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.71a1.003 1.003 0 0 0-1.42 0L17.5 6.09l-1.79-1.8a1.003 1.003 0 0 0-1.42 1.42L16.09 7.5l-1.8 1.79a1.003 1.003 0 0 0 1.42 1.42L17.5 8.91l1.79 1.8a1.003 1.003 0 0 0 1.42-1.42L18.91 7.5l1.8-1.79c.39-.39.39-1.03 0-1.42z"/></svg>
                            </button>
                        </div>
                    </div>

                    <!-- Barra de control horizontal -->
                    <div class="ws-videocall-bottom-bar">
                        <button id="wsVideoCallBtnMore" class="ws-videocall-bottom-btn" aria-label="Más opciones">
                            <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: white;"><path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                        </button>
                        <button id="wsVideoCallBtnVideo" class="ws-videocall-bottom-btn" aria-label="Cámara">
                            <svg id="wsVideoCamOnIcon" viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: white;"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
                            <svg id="wsVideoCamOffIcon" viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: white; display: none;"><path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2zM5 16V8h1.73l8 8H5z"/></svg>
                        </button>
                        <button id="wsVideoCallBtnSpeaker" class="ws-videocall-bottom-btn" aria-label="Altavoz">
                            <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: white;"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
                        </button>
                        <button id="wsVideoCallBtnMute" class="ws-videocall-bottom-btn" aria-label="Silenciar">
                            <svg id="wsVideoMicUnmutedIcon" viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: white;"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>
                            <svg id="wsVideoMicMutedIcon" viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: white; display: none;"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l4.07 4.07c-1.38.72-2.96 1.13-4.72 1.13-4.42 0-8-3.58-8-8H2c0 5.18 3.95 9.45 9 9.93V23h2v-2.07c1.78-.17 3.42-.82 4.84-1.78l2.89 2.89L22 20.73 4.27 3z"/></svg>
                        </button>
                        <button id="wsVideoCallBtnColgar" class="ws-videocall-bottom-btn end-call" aria-label="Finalizar videollamada">
                            <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: white; transform: rotate(135deg);"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-2.2 2.2a15.045 15.045 0 0 1-6.59-6.59l2.2-2.21a.96.96 0 0 0 .25-1A11.36 11.36 0 0 1 8.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.62c0-.55-.45-1-1-1z"/></svg>
                        </button>
                    </div>
                </div>
            </div>

            <!-- 3. Modal de adjuntar archivos y fotos recientes -->
            <div id="wsModalGaleria" class="ws-modal-galeria">
                <div class="ws-galeria-container">
                    <header class="ws-galeria-header">
                        <h3>Compartir contenido</h3>
                        <button id="wsGaleriaBtnCerrar" class="ws-galeria-close-btn" aria-label="Cerrar">&times;</button>
                    </header>
                    <div class="ws-attach-options-grid">
                        <button class="ws-attach-option" data-attach="galeria">
                            <div class="ws-attach-circle" style="background: linear-gradient(135deg, #1877f2, #0056b3);">
                                <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:white;"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                            </div>
                            <span class="ws-attach-label">Galería</span>
                        </button>
                        <button class="ws-attach-option" data-attach="camara">
                            <div class="ws-attach-circle" style="background: linear-gradient(135deg, #e91e63, #c2185b);">
                                <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:white;"><circle cx="12" cy="12" r="3.2"/><path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>
                            </div>
                            <span class="ws-attach-label">Cámara</span>
                        </button>
                        <button class="ws-attach-option" data-attach="ubicacion">
                            <div class="ws-attach-circle" style="background: linear-gradient(135deg, #00a884, #00796b);">
                                <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:white;"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                            </div>
                            <span class="ws-attach-label">Ubicación</span>
                        </button>
                        <button class="ws-attach-option" data-attach="contacto">
                            <div class="ws-attach-circle" style="background: linear-gradient(135deg, #0288d1, #01579b);">
                                <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:white;"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                            </div>
                            <span class="ws-attach-label">Contacto</span>
                        </button>
                        <button class="ws-attach-option" data-attach="documento">
                            <div class="ws-attach-circle" style="background: linear-gradient(135deg, #7c4dff, #512da8);">
                                <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:white;"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                            </div>
                            <span class="ws-attach-label">Documento</span>
                        </button>
                        <button class="ws-attach-option" data-attach="encuesta">
                            <div class="ws-attach-circle" style="background: linear-gradient(135deg, #ff9800, #f57c00);">
                                <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:white;"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>
                            </div>
                            <span class="ws-attach-label">Encuesta</span>
                        </button>
                        <button class="ws-attach-option" data-attach="evento">
                            <div class="ws-attach-circle" style="background: linear-gradient(135deg, #e91e63, #ad1457);">
                                <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:white;"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/></svg>
                            </div>
                            <span class="ws-attach-label">Evento</span>
                        </button>
                        <button class="ws-attach-option" data-attach="ia">
                            <div class="ws-attach-circle" style="background: linear-gradient(135deg, #00b0ff, #0081cb);">
                                <svg viewBox="0 0 24 24" style="width:24px;height:24px;fill:white;"><path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5z"/></svg>
                            </div>
                            <span class="ws-attach-label">Imágenes IA</span>
                        </button>
                    </div>

                    <div class="ws-galeria-recent-section">
                        <p class="ws-galeria-recent-label">Fotos recientes</p>
                        <div class="ws-galeria-grid">
                            <div class="ws-galeria-item" data-photo-path="./assets/img/whatsapp/photo_mitad_mundo.jpg" data-photo-caption="Paseo familiar Mitad del Mundo">
                                <img src="./assets/img/whatsapp/photo_mitad_mundo.jpg" alt="Mitad del Mundo" class="ws-galeria-item-img">
                                <small>Mitad del Mundo</small>
                            </div>
                            <div class="ws-galeria-item" data-photo-path="./assets/img/whatsapp/photo_almuerzo.jpg" data-photo-caption="Almuerzo en familia delicioso">
                                <img src="./assets/img/whatsapp/photo_almuerzo.jpg" alt="Almuerzo familiar" class="ws-galeria-item-img">
                                <small>Almuerzo familiar</small>
                            </div>
                            <div class="ws-galeria-item" data-photo-path="./assets/img/whatsapp/photo_parque.jpg" data-photo-caption="Perrito en el parque">
                                <img src="./assets/img/whatsapp/photo_parque.jpg" alt="Perrito parque" class="ws-galeria-item-img">
                                <small>Perrito parque</small>
                            </div>
                            <div class="ws-galeria-item" data-photo-path="./assets/img/whatsapp/mami_avatar.jpg" data-photo-caption="Foto de recuerdo">
                                <img src="./assets/img/whatsapp/mami_avatar.jpg" alt="Foto familiar" class="ws-galeria-item-img">
                                <small>Foto recuerdo</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 4. Modal de preview de foto antes de enviar (Estilo WhatsApp) -->
            <div id="wsModalPreviewFoto" class="ws-modal-preview-foto">
                <header class="ws-photo-preview-header">
                    <button id="wsPhotoPreviewBtnCerrar" class="ws-call-header-btn" aria-label="Cancelar envío">
                        <svg viewBox="0 0 24 24" style="width: 22px; height: 22px; fill: white;"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </button>
                    <div class="ws-photo-preview-actions-top">
                        <button class="ws-call-header-btn" aria-label="Recortar">
                            <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: white;"><path d="M17 15h2V7c0-1.1-.9-2-2-2H9v2h8v8zM7 17V1H5v4H1v2h4v10c0 1.1.9 2 2 2h10v4h2v-4h4v-2H7z"/></svg>
                        </button>
                        <button class="ws-call-header-btn" aria-label="Stickers">
                            <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: white;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>
                        </button>
                        <button class="ws-call-header-btn" aria-label="Texto">
                            <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: white;"><path d="M5 4v3h5.5v12h3V7H19V4z"/></svg>
                        </button>
                    </div>
                </header>

                <div class="ws-photo-preview-main">
                    <img id="wsPhotoPreviewImg" src="./assets/img/whatsapp/photo_mitad_mundo.jpg" alt="Foto seleccionada" class="ws-photo-preview-img">
                </div>

                <footer class="ws-photo-preview-footer">
                    <div class="ws-photo-preview-input-box">
                        <svg viewBox="0 0 24 24" style="width: 22px; height: 22px; fill: #8696a0; flex-shrink: 0;"><circle cx="12" cy="12" r="10"/><path d="M12 16c2.2 0 4-1.8 4-4H8c0 2.2 1.8 4 4 4zm-3-6c.6 0 1-.4 1-1s-.4-1-1-1-1 .4-1 1 .4 1 1 1zm6 0c.6 0 1-.4 1-1s-.4-1-1-1-1 .4-1 1 .4 1 1 1z"/></svg>
                        <input type="text" id="wsPhotoPreviewCaption" class="ws-photo-preview-input" placeholder="Añade un comentario..." autocomplete="off">
                    </div>
                    <button id="wsBtnEnviarFotoPreview" class="ws-photo-preview-send-btn" aria-label="Enviar foto">
                        <svg viewBox="0 0 24 24" style="width: 22px; height: 22px; fill: white; margin-left: 2px;"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                    </button>
                </footer>
            </div>

            <!-- 5. Modal de Visor de Foto en Pantalla Completa (Estilo WhatsApp) -->
            <div id="wsModalVisorFoto" class="ws-modal-visor-foto">
                <header class="ws-visor-header">
                    <button id="wsVisorBtnVolver" class="ws-call-header-btn" aria-label="Volver al chat">
                        <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: white;"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                    </button>
                    <div class="ws-visor-header-info">
                        <h3 id="wsVisorSenderName">Juan (Nieto)</h3>
                        <span id="wsVisorDate">Hoy a las 14:30</span>
                    </div>
                    <div class="ws-visor-header-actions">
                        <button class="ws-call-header-btn" aria-label="Destacar">
                            <svg viewBox="0 0 24 24" style="width: 22px; height: 22px; fill: white;"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                        </button>
                        <button class="ws-call-header-btn" aria-label="Compartir">
                            <svg viewBox="0 0 24 24" style="width: 22px; height: 22px; fill: white;"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>
                        </button>
                    </div>
                </header>
                <div class="ws-visor-main">
                    <img id="wsVisorImg" src="./assets/img/whatsapp/photo_parque.jpg" alt="Foto en pantalla completa" class="ws-visor-img">
                </div>
                <footer id="wsVisorFooter" class="ws-visor-footer">
                    <p id="wsVisorCaption" class="ws-visor-caption">Un perrito en el parque 🐶</p>
                </footer>
            </div>

            <!-- 6. Modal de éxito y trofeo -->
            <div id="wsModalExito" class="ws-modal-exito">
                <div class="ws-success-container">
                    <img src="./assets/img/icons/trofeo.svg" alt="Trofeo" class="ws-success-trophy">
                    <h2>¡Nivel Completado!</h2>
                    <p id="wsSuccessMessage">¡Has realizado la acción con éxito!</p>
                    <button id="wsSuccessBtnContinuar" class="ws-success-btn-continuar">Continuar</button>
                </div>
            </div>

            <!-- 7. Modal de confirmación al salir del nivel -->
            <div id="wsModalConfirmarSalida" class="modal-confirmar-reinicio">
                <div class="modal-confirmar-card">
                    <img src="./assets/img/icons/advertencia.svg" alt="" style="width: 48px; height: 48px; margin-bottom: 8px;">
                    <h2>¿Seguro que quieres salir?</h2>
                    <p>Si sales ahora, perderás el progreso de este nivel y tendrás que empezar de nuevo.</p>
                    <div class="modal-confirmar-acciones">
                        <button id="wsBtnCancelarSalida" class="btn-modal-cancelar">Cancelar</button>
                        <button id="wsBtnConfirmarSalida" class="btn-modal-peligro">Sí, salir</button>
                    </div>
                </div>
            </div>
        `;
    }
}

/**
 * Inicia la interfaz del simulador de WhatsApp
 */
export function iniciarSimulador(idNivel) {
    nivelActual = idNivel;

    // Limpiar cualquier timer/rec residual antes de arrancar
    limpiarTodosLosTimers();

    // Asegurar que el HTML de WhatsApp esté renderizado en el contenedor
    asegurarTemplateHTML();

    // Cambiar a la pantalla del simulador de WhatsApp
    const pantallas = document.querySelectorAll(".pantalla");
    pantallas.forEach(pantalla => pantalla.classList.remove("activa"));

    const simulador = $("#pantallaWhatsappSimulador");
    simulador.classList.add("activa");

    // Asegurar que abrimos en la lista de chats
    $("#wsChatsList").classList.add("activa");
    $("#wsChatConversation").classList.remove("activa");

    // Cerrar cualquier modal abierto
    $("#wsModalLlamada")?.classList.remove("activa");
    $("#wsModalLlamadaEntrante")?.classList.remove("activa");
    $("#wsModalVideoLlamada")?.classList.remove("activa");
    $("#wsModalGaleria")?.classList.remove("activa");
    $("#wsModalPreviewFoto")?.classList.remove("activa");
    $("#wsModalVisorFoto")?.classList.remove("activa");
    $("#wsModalExito")?.classList.remove("activa");

    // Generar una copia limpia de los chats predeterminados recreando los arrays
    const defaultChats = obtenerChatsDefecto(nivelActual);
    const storageKey = `gz_whatsapp_chats_${nivelActual}`;

    // Restablecer el estado específico e independiente de listaChatsData y subpasos
    subPasoNivel1 = 1;
    subPasoNivel2 = 1;
    subPasoNivel3 = 1;
    subPasoNivel4 = 1;
    subPasoNivel5 = 1;
    isMicMutedInCall = true;
    fotoSeleccionadaParaPreview = null;
    ultimaInstruccionHablada = "";

    if (nivelActual === "enviar-mensaje" || nivelActual === "grabar-audio") {
        try {
            localStorage.removeItem(storageKey);
        } catch (e) { }
        listaChatsData = JSON.parse(JSON.stringify(defaultChats));
        guardar(storageKey, listaChatsData);
        if (nivelActual === "grabar-audio") {
            solicitarMicrofonoTemprano();
        }
    } else {
        listaChatsData = JSON.parse(JSON.stringify(defaultChats));
    }

    // Renderizar la lista de chats dinámicamente
    renderizarListaChats();

    // Actualizar barra de instrucciones y leer con voz de Nico (primera vez)
    actualizarBarraInstrucciones(true);

    // Inicializar listeners si es la primera vez
    if (!simuladorInicializado) {
        inicializarListeners();
        simuladorInicializado = true;
    }

    console.log(`Simulador de WhatsApp iniciado para el nivel: ${idNivel}`);
}

/**
 * Muestra el objetivo de nivel en la barra de instrucciones
 */
function actualizarBarraInstrucciones(autoSpeak = true) {
    const textEl = $("#wsInstructionsText");
    if (!textEl) return;

    const estaEnChat = $("#wsChatConversation") && $("#wsChatConversation").classList.contains("activa");
    let instruccion = INSTRUCCIONES_NIVELES[nivelActual] || "Practica libremente en el simulador de WhatsApp.";

    // Bloquear el botón de volver en pasos críticos (espera o grabación activa)
    const btnVolver = $("#wsVolverChats");
    if (btnVolver) {
        const bloquearVolver =
            (nivelActual === "enviar-mensaje" && subPasoNivel1 === 2) ||
            (nivelActual === "grabar-audio" && (subPasoNivel2 === 4 || estaGrabandoAudio));

        if (bloquearVolver) {
            btnVolver.style.visibility = "hidden";
        } else {
            btnVolver.style.visibility = "visible";
        }
    }

    if (estaGrabandoAudio) {
        instruccion = "Presiona el botón rojo para detener la grabación y enviar el audio.";
    } else if (nivelActual === "enviar-mensaje") {
        if (subPasoNivel1 === 1) {
            instruccion = estaEnChat
                ? "Escribe un saludo para Juan. Cuando termines, toca el botón verde para enviarlo."
                : "Toca el chat de Juan para empezar a escribirle.";
        } else if (subPasoNivel1 === 2) {
            instruccion = "Mira junto a tu mensaje: un relojito es que se está enviando. Un visto, que ya se envió. Dos vistos grises, que ya le llegó a Juan. Espera un momento, se pondrán azules cuando él lo lea.";
        } else if (subPasoNivel1 === 3) {
            instruccion = "¡Mira, los vistos se pusieron azules! Eso quiere decir que Juan ya leyó tu mensaje. Ahora escríbele cómo estás, y toca enviar.";
        } else if (subPasoNivel1 === 4) {
            instruccion = "Muy bien. Ahora toca la flecha de arriba a la izquierda para volver a la lista de chats.";
        } else if (subPasoNivel1 === 4.5) {
            instruccion = "Espera un momento, te va a llegar un mensaje nuevo.";
        } else if (subPasoNivel1 >= 5) {
            if (estaEnChat && chatSeleccionado && chatSeleccionado.id !== "familia-mendoza") {
                instruccion = "Toca la flecha de arriba a la izquierda para volver a la lista de chats.";
            } else {
                if (subPasoNivel1 === 5) {
                    instruccion = "Te llegó un mensaje nuevo. Toca el chat de 'Familia Mendoza' para leerlo.";
                } else if (subPasoNivel1 === 6) {
                    instruccion = "Escribe que sí vas a la cena, y toca enviar.";
                }
            }
        }
    } else if (nivelActual === "grabar-audio") {
        if (subPasoNivel2 < 7.5) {
            if (estaEnChat && chatSeleccionado && chatSeleccionado.id !== "juan-nieto") {
                instruccion = "Regresa a la lista de chats presionando la flecha arriba a la izquierda.";
            } else {
                if (subPasoNivel2 === 1) {
                    instruccion = estaEnChat
                        ? "Presiona el botón del micrófono verde abajo a la derecha para grabar y de nuevo para enviar."
                        : "Toca el chat de Juan para entrar a la conversación.";
                } else if (subPasoNivel2 === 3) {
                    instruccion = "Toca el botón de reproducir en tu nota de voz enviada para escucharla.";
                } else if (subPasoNivel2 === 4) {
                    instruccion = "Espera a que Juan escuche tu audio y te responda con otro audio.";
                } else if (subPasoNivel2 === 5) {
                    instruccion = "Toca el botón de reproducir en la nota de voz recibida de Juan.";
                } else if (subPasoNivel2 === 6) {
                    instruccion = "Presiona el micrófono verde para responder a Juan con otra nota de voz.";
                } else if (subPasoNivel2 === 7) {
                    instruccion = "Regresa a la lista de chats presionando la flecha arriba a la izquierda.";
                }
            }
        } else {
            if (estaEnChat && chatSeleccionado && chatSeleccionado.id !== "dr-martinez") {
                instruccion = "Regresa a la lista de chats presionando la flecha arriba a la izquierda.";
            } else {
                if (subPasoNivel2 === 7.5) {
                    instruccion = "Espera a recibir un nuevo mensaje en la lista de chats.";
                } else if (subPasoNivel2 === 8) {
                    instruccion = "Toca el chat del Dr. Martínez para abrir los nuevos mensajes.";
                } else if (subPasoNivel2 === 9) {
                    instruccion = "Toca el botón de reproducir en la nota de voz recibida del doctor.";
                } else if (subPasoNivel2 === 10) {
                    instruccion = "Presiona el micrófono verde para enviar una nota de voz de respuesta confirmando tu consulta.";
                }
            }
        }
    } else if (nivelActual === "hacer-llamada") {
        if (!estaEnChat) {
            instruccion = "Toca el chat de Juan para entrar a la conversación.";
        } else {
            const modalEntrante = $("#wsModalLlamadaEntrante");
            const modalLlamada = $("#wsModalLlamada");
            if (modalEntrante && modalEntrante.classList.contains("activa")) {
                instruccion = "Tienes una llamada entrante de Juan. Toca el botón verde para contestar.";
            } else if (modalLlamada && modalLlamada.classList.contains("activa")) {
                if (subPasoNivel3 === 3) {
                    instruccion = "Se ha silenciado tu micrófono. Toca el botón 'Silenciar' para activarlo de nuevo.";
                } else if (subPasoNivel3 === 4) {
                    instruccion = "Escucha lo que te dice Juan.";
                } else if (subPasoNivel3 === 5) {
                    instruccion = "Presiona el botón rojo para colgar la llamada.";
                } else if (subPasoNivel3 === 8) {
                    instruccion = "Escucha a Juan en la llamada.";
                } else if (subPasoNivel3 === 9) {
                    instruccion = "Muy bien, ahora presiona el botón rojo para colgar y finalizar el nivel.";
                } else {
                    instruccion = "Llamando a Juan...";
                }
            } else {
                if (subPasoNivel3 === 6) {
                    instruccion = "Espera un momento, estás a punto de recibir una llamada entrante.";
                } else {
                    instruccion = "Presiona el botón de llamada telefónica en la esquina superior derecha.";
                }
            }
        }
    } else if (nivelActual === "videollamada" || nivelActual === "llamada-grupal") {
        if (!estaEnChat) {
            instruccion = "Toca el chat de Juan para entrar a la conversación.";
        } else {
            const modalVideo = $("#wsModalVideoLlamada");
            if (modalVideo && modalVideo.classList.contains("activa")) {
                if (subPasoNivel4 === 2) {
                    instruccion = "Conectando videollamada con Juan...";
                } else if (subPasoNivel4 === 3) {
                    instruccion = "Por error se apagó tu cámara. Toca el botón de la cámara para volver a encenderla.";
                } else if (subPasoNivel4 === 4) {
                    instruccion = "Escucha lo que te dice Juan.";
                } else if (subPasoNivel4 === 5) {
                    instruccion = "Se ha silenciado tu micrófono. Toca el botón del micrófono para activarlo.";
                } else if (subPasoNivel4 === 6) {
                    instruccion = "Escucha a Juan en la videollamada.";
                } else if (subPasoNivel4 >= 7) {
                    instruccion = "Muy bien, ahora presiona el botón rojo para finalizar la videollamada.";
                } else {
                    instruccion = "En videollamada con Juan...";
                }
            } else {
                instruccion = "Presiona el botón de videollamada (icono de cámara) en la esquina superior derecha.";
            }
        }
    } else if (nivelActual === "enviar-foto") {
        if (!estaEnChat) {
            instruccion = "Toca el chat de Juan para entrar a la conversación.";
        } else {
            const modalVisor = $("#wsModalVisorFoto");
            const modalPreview = $("#wsModalPreviewFoto");
            const modalGaleria = $("#wsModalGaleria");
            if (modalVisor && modalVisor.classList.contains("activa")) {
                instruccion = "¡Excelente! Aquí puedes ver la foto en pantalla completa. Toca la flecha arriba a la izquierda para volver al chat.";
            } else if (modalPreview && modalPreview.classList.contains("activa")) {
                instruccion = "Escribe un comentario si deseas y presiona el botón verde circular para enviar la foto.";
            } else if (modalGaleria && modalGaleria.classList.contains("activa")) {
                instruccion = "Toca la foto de 'Mitad del Mundo' para seleccionarla.";
            } else {
                if (subPasoNivel5 === 5) {
                    instruccion = "¡Juan te ha respondido con una foto! Toca la foto del perrito para abrirla en grande.";
                } else if (subPasoNivel5 === 6) {
                    instruccion = "¡Has completado todas las acciones con fotos!";
                } else {
                    instruccion = "Presiona el icono del clip para adjuntar una foto de tu galería.";
                }
            }
        }
    }

    textEl.textContent = instruccion;

    if (autoSpeak && instruccion !== ultimaInstruccionHablada) {
        let instruccionLimpia = instruccion.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "");
        ultimaInstruccionHablada = instruccion;
        speak(instruccionLimpia);
    }

    // Actualizar la guía visual animada para el elemento objetivo
    actualizarGuiaVisualWhatsApp();
}

/**
 * Resalta de forma animada el elemento correspondiente a la instrucción activa
 */
function actualizarGuiaVisualWhatsApp() {
    const estaEnChat = $("#wsChatConversation") && $("#wsChatConversation").classList.contains("activa");
    const inputVal = $("#wsInputMensaje") ? $("#wsInputMensaje").value.trim() : "";

    if (estaGrabandoAudio) {
        resaltarElemento("#wsEnviarMensajeBtn");
        return;
    }

    if (nivelActual === "enviar-mensaje") {
        if (subPasoNivel1 === 1) {
            if (!estaEnChat) {
                resaltarElemento("[data-chat-id='juan-nieto']");
            } else {
                if (inputVal.length > 0) {
                    resaltarElemento("#wsEnviarMensajeBtn");
                } else {
                    resaltarElemento("#wsInputMensaje");
                }
            }
        } else if (subPasoNivel1 === 2) {
            limpiarResaltados();
        } else if (subPasoNivel1 === 3) {
            if (inputVal.length > 0) {
                resaltarElemento("#wsEnviarMensajeBtn");
            } else {
                resaltarElemento("#wsInputMensaje");
            }
        } else if (subPasoNivel1 === 4) {
            resaltarElemento("#wsVolverChats");
        } else if (subPasoNivel1 === 4.5) {
            limpiarResaltados();
        } else if (subPasoNivel1 >= 5) {
            if (estaEnChat && chatSeleccionado && chatSeleccionado.id !== "familia-mendoza") {
                resaltarElemento("#wsVolverChats");
            } else {
                if (subPasoNivel1 === 5) {
                    resaltarElemento("[data-chat-id='familia-mendoza']");
                } else if (subPasoNivel1 === 6) {
                    if (inputVal.length > 0) {
                        resaltarElemento("#wsEnviarMensajeBtn");
                    } else {
                        resaltarElemento("#wsInputMensaje");
                    }
                }
            }
        }
    } else if (nivelActual === "grabar-audio") {
        if (subPasoNivel2 < 7.5) {
            if (estaEnChat && chatSeleccionado && chatSeleccionado.id !== "juan-nieto") {
                resaltarElemento("#wsVolverChats");
            } else {
                if (subPasoNivel2 === 1) {
                    if (!estaEnChat) {
                        resaltarElemento("[data-chat-id='juan-nieto']");
                    } else {
                        resaltarElemento("#wsEnviarMensajeBtn");
                    }
                } else if (subPasoNivel2 === 3) {
                    const playBtn = document.querySelector("#wsChatBody .ws-msg-bubble.enviada .ws-audio-btn");
                    if (playBtn) resaltarElemento(playBtn);
                } else if (subPasoNivel2 === 4) {
                    limpiarResaltados();
                } else if (subPasoNivel2 === 5) {
                    const playBtns = document.querySelectorAll("#wsChatBody .ws-msg-bubble.recibida .ws-audio-btn");
                    const lastPlayBtn = playBtns[playBtns.length - 1];
                    if (lastPlayBtn) resaltarElemento(lastPlayBtn);
                } else if (subPasoNivel2 === 6) {
                    resaltarElemento("#wsEnviarMensajeBtn");
                } else if (subPasoNivel2 === 7) {
                    resaltarElemento("#wsVolverChats");
                }
            }
        } else {
            if (estaEnChat && chatSeleccionado && chatSeleccionado.id !== "dr-martinez") {
                resaltarElemento("#wsVolverChats");
            } else {
                if (subPasoNivel2 === 7.5) {
                    limpiarResaltados();
                } else if (subPasoNivel2 === 8) {
                    resaltarElemento("[data-chat-id='dr-martinez']");
                } else if (subPasoNivel2 === 9) {
                    const playBtns = document.querySelectorAll("#wsChatBody .ws-msg-bubble.recibida .ws-audio-btn");
                    const lastPlayBtn = playBtns[playBtns.length - 1];
                    if (lastPlayBtn) resaltarElemento(lastPlayBtn);
                } else if (subPasoNivel2 === 10) {
                    resaltarElemento("#wsEnviarMensajeBtn");
                }
            }
        }
    } else if (nivelActual === "hacer-llamada") {
        if (!estaEnChat) {
            resaltarElemento("[data-chat-id='juan-nieto']");
        } else {
            const modalEntrante = $("#wsModalLlamadaEntrante");
            const modalLlamada = $("#wsModalLlamada");
            if (modalEntrante && modalEntrante.classList.contains("activa")) {
                resaltarElemento("#wsIncomingBtnContestar");
            } else if (modalLlamada && modalLlamada.classList.contains("activa")) {
                if (subPasoNivel3 === 3) {
                    resaltarElemento("#wsCallBtnMute");
                } else if (subPasoNivel3 === 5 || subPasoNivel3 === 9) {
                    resaltarElemento("#wsCallBtnColgar");
                } else {
                    limpiarResaltados();
                }
            } else {
                if (subPasoNivel3 === 6) {
                    limpiarResaltados();
                } else {
                    resaltarElemento("#wsBtnLlamada");
                }
            }
        }
    } else if (nivelActual === "videollamada" || nivelActual === "llamada-grupal") {
        if (!estaEnChat) {
            resaltarElemento("[data-chat-id='juan-nieto']");
        } else {
            const modalVideo = $("#wsModalVideoLlamada");
            if (modalVideo && modalVideo.classList.contains("activa")) {
                if (subPasoNivel4 === 3) {
                    resaltarElemento("#wsVideoCallBtnVideo");
                } else if (subPasoNivel4 === 5) {
                    resaltarElemento("#wsVideoCallBtnMute");
                } else if (subPasoNivel4 >= 7) {
                    resaltarElemento("#wsVideoCallBtnColgar");
                } else {
                    limpiarResaltados();
                }
            } else {
                resaltarElemento("#wsBtnVideoLlamada");
            }
        }
    } else if (nivelActual === "enviar-foto") {
        if (!estaEnChat) {
            resaltarElemento("[data-chat-id='juan-nieto']");
        } else {
            const modalVisor = $("#wsModalVisorFoto");
            const modalPreview = $("#wsModalPreviewFoto");
            const modalGaleria = $("#wsModalGaleria");
            if (modalVisor && modalVisor.classList.contains("activa")) {
                resaltarElemento("#wsVisorBtnVolver");
            } else if (modalPreview && modalPreview.classList.contains("activa")) {
                resaltarElemento("#wsBtnEnviarFotoPreview");
            } else if (modalGaleria && modalGaleria.classList.contains("activa")) {
                resaltarElemento(".ws-galeria-item:first-child");
            } else {
                if (subPasoNivel5 === 5) {
                    const receivedPhotos = document.querySelectorAll("#wsChatBody .ws-msg-bubble.recibida .ws-photo-msg-clickable");
                    const lastPhoto = receivedPhotos[receivedPhotos.length - 1];
                    if (lastPhoto) {
                        resaltarElemento(lastPhoto);
                    } else {
                        limpiarResaltados();
                    }
                } else if (subPasoNivel5 >= 6) {
                    limpiarResaltados();
                } else {
                    resaltarElemento("#wsBtnAdjuntar");
                }
            }
        }
    }
}

/**
 * Renderiza la lista de chats en el DOM
 */
function renderizarListaChats() {
    const listaChatsContainer = $("#wsListaChats");
    if (!listaChatsContainer) return;

    listaChatsContainer.innerHTML = "";

    listaChatsData.forEach(chat => {
        const chatItem = document.createElement("div");
        chatItem.className = "ws-chat-item";
        if (chat.unreadCount > 0) {
            chatItem.classList.add("no-leido");
        }
        chatItem.dataset.chatId = chat.id;

        const ultimoMsg = chat.mensajes[chat.mensajes.length - 1];
        const checkmarkHTML = ultimoMsg && ultimoMsg.sender === "enviada"
            ? `<span style="width: 15px; height: 15px; margin-right: 2px; display: inline-flex;">${crearCheckmarkHTML(ultimoMsg.status)}</span>`
            : "";

        const timeClass = chat.unreadCount > 0 ? "ws-chat-time unread" : "ws-chat-time";
        const previewClass = chat.unreadCount > 0 ? "ws-chat-preview unread" : "ws-chat-preview";
        const badgeHTML = chat.unreadCount > 0 ? `<span class="ws-chat-badge">${chat.unreadCount}</span>` : "";

        chatItem.innerHTML = `
            <div class="ws-avatar ws-chat-avatar ${chat.avatarClass}">${chat.iniciales}</div>
            <div class="ws-chat-info">
                <div class="ws-chat-row">
                    <h3 class="ws-chat-name">${chat.nombre}</h3>
                    <span class="${timeClass}">${chat.hora}</span>
                </div>
                <div class="ws-chat-row">
                    <p class="${previewClass}">
                        ${checkmarkHTML}
                        ${chat.preview}
                    </p>
                    ${badgeHTML}
                </div>
            </div>
        `;

        chatItem.onclick = () => {
            abrirConversacion(chat.id);
        };

        listaChatsContainer.appendChild(chatItem);
    });
}

/**
 * Abre la pantalla de conversación individual
 */
function abrirConversacion(chatId) {
    console.log("DEBUG abrirConversacion chatId param=" + chatId + " listaIds=" + listaChatsData.map(c => c.id).join(","));
    chatSeleccionado = listaChatsData.find(c => c.id === chatId);
    console.log("DEBUG abrirConversacion resolved chatSeleccionado.id=" + (chatSeleccionado && chatSeleccionado.id) + " nombre=" + (chatSeleccionado && chatSeleccionado.nombre));
    if (!chatSeleccionado) return;

    if (chatSeleccionado.unreadCount > 0) {
        chatSeleccionado.unreadCount = 0;
        guardar(`gz_whatsapp_chats_${nivelActual}`, listaChatsData);
    }

    $("#wsContactName").textContent = chatSeleccionado.nombre;

    const contactAvatar = $("#wsContactAvatar");
    contactAvatar.textContent = chatSeleccionado.iniciales;
    contactAvatar.className = `ws-avatar ws-chat-contact-avatar ${chatSeleccionado.avatarClass}`;

    $("#wsChatsList").classList.remove("activa");
    $("#wsChatConversation").classList.add("activa");

    $("#wsInputMensaje").value = "";
    $("#wsMicIcon").style.display = "block";
    $("#wsSendIcon").style.display = "none";

    const statusEl = $("#wsChatConversation").querySelector(".ws-chat-contact-status");
    if (statusEl) {
        statusEl.textContent = "en línea";
    }

    renderizarMensajes();

    if (nivelActual === "enviar-mensaje") {
        if (chatSeleccionado.id === "juan-nieto") {
            if (subPasoNivel1 === 1 || subPasoNivel1 === 3) {
                actualizarBarraInstrucciones(true);
            }
        } else if (chatSeleccionado.id === "familia-mendoza" && subPasoNivel1 === 5) {
            subPasoNivel1 = 6;
            actualizarBarraInstrucciones(true);
        }
    } else if (nivelActual === "grabar-audio") {
        if (chatSeleccionado.id === "juan-nieto") {
            if (subPasoNivel2 === 1 || subPasoNivel2 === 6) {
                actualizarBarraInstrucciones(true);
            }
        } else if (chatSeleccionado.id === "dr-martinez") {
            if (subPasoNivel2 === 8) {
                subPasoNivel2 = 9;
                actualizarBarraInstrucciones(true);
            }
        }
    } else {
        actualizarBarraInstrucciones(true);
    }
}

/**
 * Renderiza los mensajes del chat seleccionado en el DOM
 */
function renderizarMensajes() {
    const chatBody = $("#wsChatBody");
    console.log("DEBUG renderizarMensajes chatId=" + (chatSeleccionado && chatSeleccionado.id) + " nMsgs=" + (chatSeleccionado && chatSeleccionado.mensajes.length));
    if (!chatBody || !chatSeleccionado) return;

    chatBody.innerHTML = `
        <span class="ws-date-separator">Hoy</span>
    `;

    chatSeleccionado.mensajes.forEach((msg, index) => {
        const bubble = document.createElement("div");
        bubble.className = `ws-msg-bubble ${msg.sender}`;
        bubble.dataset.msgIndex = index;

        if (msg.type === "audio") {
            const esEnviado = msg.sender === "enviada";
            // En los mensajes que la persona envía se muestra el mismo
            // indicador de estado (relojito/vistos) que en un mensaje de
            // texto. En los que llegan del contacto se muestra su avatar con
            // el iconito de micrófono, para saber de un vistazo que es un
            // audio y quién lo mandó (a los propios no hace falta, ya se sabe).
            const indicadorHTML = esEnviado
                ? `<div class="ws-audio-check-wrap">${crearCheckmarkHTML(msg.status)}</div>`
                : `
                    <div style="position: relative; width: 26px; height: 26px;">
                        <div class="ws-avatar ${chatSeleccionado.avatarClass}" style="width: 100%; height: 100%; font-size: 10px;">${chatSeleccionado.iniciales}</div>
                        <svg viewBox="0 0 24 24" style="position: absolute; bottom:-4px; right:-4px; width: 14px; height: 14px; fill: #53bdeb;"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>
                    </div>
                `;
            bubble.innerHTML = `
                <div class="ws-msg-audio-player">
                    <button class="ws-audio-btn" data-estado="detenido" aria-label="Reproducir nota de voz">
                        <svg class="ws-audio-btn-icon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </button>
                    <div class="ws-audio-timeline-wrapper">
                        <div class="ws-audio-timeline" style="cursor: pointer;">
                            <div class="ws-audio-progress" style="width: 0%;"></div>
                            <div class="ws-audio-pin" style="left: 0%;"></div>
                        </div>
                        <div class="ws-audio-meta">
                            <span>${msg.duration || "0:05"}</span>
                            <span>${msg.time}</span>
                        </div>
                    </div>
                    ${indicadorHTML}
                </div>
            `;
        } else if (msg.type === "photo") {
            bubble.style.padding = "6px";
            bubble.style.borderRadius = "14px";
            const imageTag = msg.photoUrl
                ? `<img src="${msg.photoUrl}" alt="Foto" style="width: 100%; height: 160px; object-fit: cover; border-radius: 10px; display: block;">`
                : `<div style="background-color: #b9e7b3; height: 120px; border-radius: 10px; display: grid; place-items: center; font-size: 40px;">${msg.photoEmoji || "📷"}</div>`;
            const captionHTML = msg.text ? `<span style="font-size: 14px; color: #111b21; font-weight: 500; padding: 4px 2px 0; display: block;">${msg.text}</span>` : "";
            const senderName = msg.senderName || (msg.sender === "enviada" ? "Tú" : (chatSeleccionado ? chatSeleccionado.nombre : "Contacto"));
            
            bubble.innerHTML = `
                <div class="ws-photo-msg-clickable" data-photo-url="${msg.photoUrl || ''}" data-photo-caption="${msg.text || ''}" data-photo-sender="${senderName}" data-photo-time="${msg.time}" style="display: flex; flex-direction: column; gap: 4px; width: 220px;">
                    ${imageTag}
                    ${captionHTML}
                </div>
                <div class="ws-msg-meta" style="margin-top: 2px; margin-right: 0;">
                    <span>${msg.time}</span>
                    ${msg.sender === "enviada" ? crearCheckmarkHTML(msg.status) : ""}
                </div>
            `;
        } else {
            const checkmarkHTML = msg.sender === "enviada"
                ? crearCheckmarkHTML(msg.status)
                : "";

            const senderNameHTML = msg.senderName
                ? `<span style="font-size: 12px; font-weight: bold; color: #e91e63; display: block; margin-bottom: 2px;">${msg.senderName}</span>`
                : "";

            bubble.innerHTML = `
                ${senderNameHTML}
                <span>${msg.text}</span>
                <div class="ws-msg-meta">
                    <span>${msg.time}</span>
                    ${checkmarkHTML}
                </div>
            `;
        }

        chatBody.appendChild(bubble);
    });

    setTimeout(() => {
        chatBody.scrollTop = chatBody.scrollHeight;
    }, 50);
}

/**
 * Mueve un chat al principio del listado
 */
function moverChatAlTop(chatId) {
    const index = listaChatsData.findIndex(c => c.id === chatId);
    if (index > -1) {
        const chat = listaChatsData.splice(index, 1)[0];
        listaChatsData.unshift(chat);
    }
}

/**
 * Deja el botón de una nota de voz como recién detenido y avanza el nivel
 * si corresponde. Vive fuera de simularReproduccionAudio() porque "reanudar"
 * y "reproducir por primera vez" son clics distintos (cada uno con su
 * propio timer/cierre), pero ambos deben terminar de la misma forma
 * cuando la voz simulada de verdad acaba de hablar.
 */
function finalizarNotaDeVoz(btn, bubble, esEnviada) {
    const progress = bubble?.querySelector(".ws-audio-progress");
    const pin = bubble?.querySelector(".ws-audio-pin");
    const timeline = bubble?.querySelector(".ws-audio-timeline");

    btn.dataset.estado = "detenido";
    btn.classList.remove("reproduciendo");
    btn.innerHTML = `<svg class="ws-audio-btn-icon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
    if (progress) progress.style.width = "0%";
    if (pin) pin.style.left = "0%";
    if (timeline) delete timeline.dataset.seekPercentage;
    audioActivo = null;
    audioActivoMsg = null;

    avanzarNivel2DespuesDeAudio(esEnviada);
}

/**
 * Simula y controla la reproducción de un mensaje de audio (Play / Pausa / Reanudar / Seek)
 */
function simularReproduccionAudio(btn, esEnviada, msg) {
    const bubble = btn.closest(".ws-msg-bubble");
    if (!bubble) return;
    const progress = bubble.querySelector(".ws-audio-progress");
    const pin = bubble.querySelector(".ws-audio-pin");
    const timeline = bubble.querySelector(".ws-audio-timeline");
    const estado = btn.dataset.estado || "detenido";

    // 1. Si se hace clic en pausa sobre el audio en reproducción
    if (estado === "reproduciendo") {
        btn.dataset.estado = "pausado";
        btn.classList.remove("reproduciendo");
        btn.innerHTML = `<svg class="ws-audio-btn-icon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;

        if (audioActivo) {
            audioActivo.pause();
        }
        stopSpeech();
        return;
    }

    // 2. Si se hace clic en reanudar sobre el mismo audio pausado
    if (estado === "pausado" && audioActivoMsg === msg) {
        btn.dataset.estado = "reproduciendo";
        btn.classList.add("reproduciendo");
        btn.innerHTML = `
            <svg class="ws-audio-btn-icon" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
        `;
        if (audioActivo) {
            audioActivo.play().catch(e => console.warn(e));
        } else {
            const mensajeTexto = !esEnviada && msg && msg.textToSpeak
                ? msg.textToSpeak
                : "Reproduciendo nota de voz.";
            // Igual que en la primera reproducción: es la voz la que avisa
            // cuándo termina de verdad, no un tiempo fijo.
            speak(mensajeTexto, () => finalizarNotaDeVoz(btn, bubble, esEnviada));
        }
        return;
    }

    // 3. NUEVA REPRODUCCIÓN (Detener cualquier audio o síntesis anterior)
    const otrosBtns = $("#wsChatBody") ? $("#wsChatBody").querySelectorAll(".ws-msg-bubble button.reproduciendo, .ws-msg-bubble button[data-estado='pausado']") : [];
    otrosBtns.forEach(otroBtn => {
        otroBtn.dataset.estado = "detenido";
        otroBtn.classList.remove("reproduciendo");
        otroBtn.innerHTML = `<svg class="ws-audio-btn-icon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
        const otraBubble = otroBtn.closest(".ws-msg-bubble");
        const otroProgress = otraBubble?.querySelector(".ws-audio-progress");
        const otroPin = otraBubble?.querySelector(".ws-audio-pin");
        if (otroProgress) otroProgress.style.width = "0%";
        if (otroPin) otroPin.style.left = "0%";
    });

    if (audioActivo) {
        audioActivo.pause();
        audioActivo.currentTime = 0;
        audioActivo = null;
    }
    stopSpeech();
    playbackIntervals.forEach(t => clearInterval(t));
    playbackIntervals = [];

    btn.dataset.estado = "reproduciendo";
    btn.classList.add("reproduciendo");
    btn.innerHTML = `
        <svg class="ws-audio-btn-icon" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
        </svg>
    `;

    audioActivoMsg = msg;
    let pct = 0;
    let duracion = 5000;
    let playReal = false;

    // Se declaran antes de arrancar el audio o la voz: si Nico está
    // desactivado, speak() avisa de que "terminó" en el acto (de forma
    // síncrona), y si completarReproduccion todavía no existiera en ese
    // momento, esto fallaría con un error.
    const paso = 50;
    let timer = null;

    const completarReproduccion = () => {
        if (timer) clearInterval(timer);
        finalizarNotaDeVoz(btn, bubble, esEnviada);
    };

    // Verificar si el mensaje es una nota de voz enviada con archivo real
    if (esEnviada && msg && msg.audioUrl) {
        const audio = new Audio(msg.audioUrl);
        audioActivo = audio;
        playReal = true;

        if (timeline && timeline.dataset.seekPercentage !== undefined) {
            const seekPct = parseFloat(timeline.dataset.seekPercentage);
            pct = seekPct;
            audio.addEventListener("loadedmetadata", () => {
                duracion = audio.duration * 1000;
                audio.currentTime = (seekPct / 100) * audio.duration;
            }, { once: true });
        } else {
            audio.addEventListener("loadedmetadata", () => {
                duracion = audio.duration * 1000;
            }, { once: true });
        }

        audio.play().catch(e => {
            console.warn("No se pudo iniciar la reproducción del audio real:", e);
            playReal = false;
        });

        audio.onended = () => {
            completarReproduccion();
        };
    } else {
        // Mensaje recibido simulado del contacto (nunca usa audioUrl del usuario)
        audioActivo = null;
        playReal = false;
        const mensajeTexto = !esEnviada && msg && msg.textToSpeak
            ? msg.textToSpeak
            : (esEnviada ? "Reproduciendo nota de voz." : "Hola abuelo, muchas gracias por tu mensaje, te quiero mucho.");

        // La duración de la etiqueta ("0:06", "0:08"...) es solo un dato de
        // adorno para mostrar junto al audio; no sirve para calcular cuánto
        // tarda Nico en leer el texto real, que suele ser más largo de lo
        // que dice esa etiqueta. Para que la barra avance a un ritmo
        // parecido al de la voz de verdad (y no se quede esperando "clavada"
        // cerca del final), se calcula a partir del propio texto a leer,
        // con el mismo criterio que usa el motor de voz y ajustado según la
        // velocidad elegida en Ajustes.
        let msPorCaracter = 62;
        if (window.nicoVoiceSpeed === "lenta") msPorCaracter = 95;
        else if (window.nicoVoiceSpeed === "rapida") msPorCaracter = 44;
        duracion = 1800 + mensajeTexto.length * msPorCaracter;

        // Aun así, quien decide cuándo "termina" de verdad el audio
        // simulado es la voz (ver más abajo), no esta duración: si por lo
        // que sea Nico tarda más de lo calculado aquí, la barra se queda
        // esperando en el 99% en vez de reiniciarse antes de tiempo.
        speak(mensajeTexto, () => completarReproduccion());
    }

    timer = setInterval(() => {
        const currentEstado = btn.dataset.estado;
        if (currentEstado === "pausado") {
            return;
        }
        if (currentEstado === "detenido") {
            clearInterval(timer);
            return;
        }

        // Si se hizo seek interactivo
        if (timeline && timeline.dataset.seekPercentage !== undefined) {
            pct = parseFloat(timeline.dataset.seekPercentage);
            delete timeline.dataset.seekPercentage;
        }

        if (playReal && audioActivo && audioActivo.duration) {
            pct = (audioActivo.currentTime / audioActivo.duration) * 100;
            if (pct >= 100) {
                pct = 100;
                completarReproduccion();
                return;
            }
            if (progress) progress.style.width = `${pct}%`;
            if (pin) pin.style.left = `${pct}%`;
        } else {
            // Aquí quien decide que terminó es la voz (ver speak(...,
            // completarReproduccion) más arriba), así que la barra no pasa
            // del 99%: si llegara sola al 100% y disparara el final, el
            // audio se daría por terminado aunque Nico siguiera hablando.
            const incremento = (paso / duracion) * 100;
            pct = Math.min(pct + incremento, 99);
            if (progress) progress.style.width = `${pct}%`;
            if (pin) pin.style.left = `${pct}%`;
        }
    }, paso);
    playbackIntervals.push(timer);
}

/**
 * Lógica para avanzar el Nivel 2 según qué audio finalizó de reproducirse
 */
function avanzarNivel2DespuesDeAudio(esEnviada) {
    if (nivelActual !== "grabar-audio") return;

    if (esEnviada && subPasoNivel2 <= 3) {
        // Escuchó el primer audio enviado
        subPasoNivel2 = 4;
        actualizarBarraInstrucciones(true); // "Espera a que Juan te responda..."

        // Simular escritura de Juan
        const statusEl = $("#wsChatConversation")?.querySelector(".ws-chat-contact-status");
        if (statusEl) statusEl.textContent = "escribiendo...";

        // Respuesta de Juan tras 6 segundos
        juanResponseTimeout = setTimeout(() => {
            const conversacionEl = $("#wsChatConversation");
            if (conversacionEl && conversacionEl.classList.contains("activa") && chatSeleccionado && chatSeleccionado.id === "juan-nieto" && subPasoNivel2 === 4) {
                if (statusEl) statusEl.textContent = "en línea";
                marcarChatComoLeido(chatSeleccionado);

                const hora = obtenerHoraActual();
                chatSeleccionado.mensajes.push({
                    sender: "recibida",
                    type: "audio",
                    duration: "0:08",
                    time: hora,
                    textToSpeak: "Hola abuelo, muchas gracias por tu mensaje, me alegro de que estés muy bien. ¿Vas a venir a visitarme mañana?"
                });
                chatSeleccionado.preview = "Nota de voz recibida (0:08)";
                chatSeleccionado.hora = hora;

                moverChatAlTop("juan-nieto");
                guardar(`gz_whatsapp_chats_${nivelActual}`, listaChatsData);
                renderizarMensajes();

                subPasoNivel2 = 5;
                actualizarBarraInstrucciones(true); // Nico: "Toca reproducir en el audio recibido..."
            }
        }, 8000);
    } else if (!esEnviada && subPasoNivel2 === 5) {
        // Escuchó el audio recibido de Juan
        subPasoNivel2 = 6;
        actualizarBarraInstrucciones(true); // Nico: "Juan te ha hecho una pregunta. Graba otra..."
    } else if (!esEnviada && subPasoNivel2 === 9) {
        // Escuchó el audio del doctor
        subPasoNivel2 = 10;
        actualizarBarraInstrucciones(true); // Nico: "Graba una última nota de voz..."
    }
}

// ---- AVISO FLOTANTE DE ACCIÓN BLOQUEADA ----
function mostrarAvisoBloqueado(mensaje = "Para este nivel el envío de audio está bloqueado. Por favor, escribe un mensaje de texto.") {
    let toast = $("#wsToastBlocked");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "wsToastBlocked";
        toast.className = "ws-toast-blocked";
        $("#pantallaWhatsappSimulador")?.appendChild(toast);
    }
    toast.textContent = mensaje;
    toast.classList.add("mostrar");
    setTimeout(() => {
        toast.classList.remove("mostrar");
    }, 3200);
}

// ---- LISTENERS DE LA INTERFAZ ----
function inicializarListeners() {
    // Retorno al selector de niveles
    const retornarANiveles = () => {
        limpiarTodosLosTimers();
        if (estaGrabandoAudio) {
            detenerGrabacionReal().catch(e => console.warn(e));
            estaGrabandoAudio = false;
        }
        if (audioActivo) {
            audioActivo.pause();
            audioActivo = null;
        }
        audioActivoMsg = null;
        stopSpeech();

        const modalExito = $("#wsModalExito");
        if (modalExito) modalExito.classList.remove("activa");

        const modalLlamada = $("#wsModalLlamada");
        if (modalLlamada) modalLlamada.classList.remove("activa");

        const modalEntrante = $("#wsModalLlamadaEntrante");
        if (modalEntrante) modalEntrante.classList.remove("activa");

        const modalVideo = $("#wsModalVideoLlamada");
        if (modalVideo) modalVideo.classList.remove("activa");

        const modalGaleria = $("#wsModalGaleria");
        if (modalGaleria) modalGaleria.classList.remove("activa");

        const modalPreview = $("#wsModalPreviewFoto");
        if (modalPreview) modalPreview.classList.remove("activa");

        const modalVisor = $("#wsModalVisorFoto");
        if (modalVisor) modalVisor.classList.remove("activa");

        const modalSalida = $("#wsModalConfirmarSalida");
        if (modalSalida) modalSalida.classList.remove("activa");

        const simulador = $("#pantallaWhatsappSimulador");
        if (simulador) simulador.classList.remove("activa");

        limpiarResaltados();
        location.hash = "/modulo/WhatsApp";
    };

    // Salir del simulador: pide confirmación antes de perder el progreso del nivel
    const btnSalir = $("#wsSalirSimulador");
    const modalConfirmarSalida = $("#wsModalConfirmarSalida");
    if (btnSalir) {
        btnSalir.onclick = () => {
            if (modalConfirmarSalida) {
                modalConfirmarSalida.classList.add("activa");
            } else {
                retornarANiveles();
            }
        };
    }

    const btnCancelarSalida = $("#wsBtnCancelarSalida");
    if (btnCancelarSalida) {
        btnCancelarSalida.onclick = () => modalConfirmarSalida?.classList.remove("activa");
    }

    const btnConfirmarSalida = $("#wsBtnConfirmarSalida");
    if (btnConfirmarSalida) btnConfirmarSalida.onclick = retornarANiveles;

    // Volver de la conversación a la lista de chats
    const btnVolver = $("#wsVolverChats");
    if (btnVolver) {
        btnVolver.onclick = () => {
            if (audioActivo) {
                audioActivo.pause();
                audioActivo = null;
            }
            audioActivoMsg = null;
            stopSpeech();

            const activeAudioBtns = $("#wsChatBody") ? $("#wsChatBody").querySelectorAll("button.reproduciendo") : [];
            activeAudioBtns.forEach(btn => {
                btn.dataset.estado = "detenido";
                btn.classList.remove("reproduciendo");
                btn.innerHTML = `<svg class="ws-audio-btn-icon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
            });

            $("#wsChatConversation").classList.remove("activa");
            $("#wsChatsList").classList.add("activa");
            renderizarListaChats();

            if (nivelActual === "grabar-audio" && subPasoNivel2 >= 7 && subPasoNivel2 < 8) {
                subPasoNivel2 = 7.5;
                actualizarBarraInstrucciones(true);

                familyMessageTimeout = setTimeout(() => {
                    const simulador = $("#pantallaWhatsappSimulador");
                    if (simulador && simulador.classList.contains("activa") && subPasoNivel2 === 7.5) {
                        let drChat = listaChatsData.find(c => c.id === "dr-martinez");
                        if (!drChat) {
                            drChat = {
                                id: "dr-martinez",
                                nombre: "Dr. Martínez",
                                avatarClass: "ws-avatar-color-6",
                                iniciales: "DM",
                                preview: "",
                                hora: "",
                                unreadCount: 0,
                                mensajes: []
                            };
                            listaChatsData.push(drChat);
                        }
                        const hora = obtenerHoraActual();
                        drChat.mensajes = [
                            {
                                sender: "recibida",
                                type: "audio",
                                duration: "0:08",
                                time: hora,
                                senderName: "Dr. Martínez",
                                textToSpeak: "Hola, le hablo del consultorio médico. Por favor confirme por nota de voz si asistirá a su consulta de mañana."
                            }
                        ];
                        drChat.preview = "Dr. Martínez: Nota de voz recibida (0:08)";
                        drChat.hora = hora;
                        drChat.unreadCount = 1;

                        moverChatAlTop("dr-martinez");
                        guardar(`gz_whatsapp_chats_${nivelActual}`, listaChatsData);
                        renderizarListaChats();

                        subPasoNivel2 = 8;
                        actualizarBarraInstrucciones(true);
                    }
                }, 6000);
            } else if (nivelActual === "enviar-mensaje" && subPasoNivel1 === 4) {
                subPasoNivel1 = 4.5;
                actualizarBarraInstrucciones(true);

                familyMessageTimeout = setTimeout(() => {
                    const simulador = $("#pantallaWhatsappSimulador");
                    if (simulador && simulador.classList.contains("activa") && subPasoNivel1 === 4.5) {
                        let familiaChat = listaChatsData.find(c => c.id === "familia-mendoza");
                        if (!familiaChat) {
                            familiaChat = {
                                id: "familia-mendoza",
                                nombre: "Familia Mendoza",
                                avatarClass: "ws-avatar-color-1",
                                iniciales: "FM",
                                preview: "",
                                hora: "",
                                unreadCount: 0,
                                mensajes: []
                            };
                            listaChatsData.push(familiaChat);
                        }
                        const hora = obtenerHoraActual();
                        familiaChat.mensajes = [
                            {
                                sender: "recibida",
                                text: "Papá, ¿puedes confirmar si vienes a cenar el sábado?",
                                time: hora,
                                senderName: "Hija Ana"
                            }
                        ];
                        familiaChat.preview = "Hija Ana: Papá, ¿puedes confirmar si vienes a cenar el sábado?";
                        familiaChat.hora = hora;
                        familiaChat.unreadCount = 1;

                        moverChatAlTop("familia-mendoza");
                        guardar(`gz_whatsapp_chats_${nivelActual}`, listaChatsData);
                        renderizarListaChats();

                        subPasoNivel1 = 5;
                        actualizarBarraInstrucciones(true);
                    }
                }, 6000);
            } else {
                actualizarBarraInstrucciones(true);
            }
        };
    }

    // Clic en la insignia Nico para repetir instrucción
    const nicoBtn = $("#wsInstructionsBar")?.querySelector(".ws-instructions-nico");
    if (nicoBtn) {
        nicoBtn.onclick = (e) => {
            e.stopPropagation();
            const textEl = $("#wsInstructionsText");
            if (textEl) {
                let instruccionLimpia = textEl.textContent.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "");
                speak(instruccionLimpia);
            }
        };
    }

    // Reproducción y Scrubber / Seek de notas de voz en chat
    const chatBody = $("#wsChatBody");
    if (chatBody) {
        // Manejador común de adelantar o retroceder audios
        const handleBarSeek = (clientX, timeline) => {
            if (!timeline) return;
            const rect = timeline.getBoundingClientRect();
            const clickX = clientX - rect.left;
            const percentage = Math.max(0, Math.min(100, (clickX / rect.width) * 100));

            const progress = timeline.querySelector(".ws-audio-progress");
            const pin = timeline.querySelector(".ws-audio-pin");
            if (progress) progress.style.width = `${percentage}%`;
            if (pin) pin.style.left = `${percentage}%`;

            const bubble = timeline.closest(".ws-msg-bubble");
            if (!bubble) return;
            const index = bubble.dataset.msgIndex;
            const msg = chatSeleccionado?.mensajes[index];
            const esEnviada = bubble.classList.contains("enviada");

            timeline.dataset.seekPercentage = percentage;

            if (audioActivo && audioActivoMsg === msg && esEnviada && audioActivo.duration) {
                audioActivo.currentTime = (percentage / 100) * audioActivo.duration;
            }
        };

        // Click en play/pause
        chatBody.onclick = (e) => {
            const btn = e.target.closest(".ws-audio-btn");
            if (btn) {
                const bubble = btn.closest(".ws-msg-bubble");
                if (!bubble) return;

                const index = bubble.dataset.msgIndex;
                const msg = chatSeleccionado.mensajes[index];
                const esEnviada = bubble.classList.contains("enviada");

                simularReproduccionAudio(btn, esEnviada, msg);
                return;
            }

            // Click directo en la barra para seek
            const timeline = e.target.closest(".ws-audio-timeline");
            if (timeline) {
                handleBarSeek(e.clientX, timeline);
            }
        };

        // Soporte de arrastre con mouse
        chatBody.onmousedown = (e) => {
            const timeline = e.target.closest(".ws-audio-timeline");
            if (!timeline) return;

            handleBarSeek(e.clientX, timeline);

            const onMouseMove = (moveEvent) => {
                handleBarSeek(moveEvent.clientX, timeline);
            };

            const onMouseUp = () => {
                document.removeEventListener("mousemove", onMouseMove);
                document.removeEventListener("mouseup", onMouseUp);
            };

            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
        };

        // Soporte de arrastre táctil en móviles/tablets
        chatBody.ontouchstart = (e) => {
            const timeline = e.target.closest(".ws-audio-timeline");
            if (!timeline) return;

            handleBarSeek(e.touches[0].clientX, timeline);

            const onTouchMove = (moveEvent) => {
                handleBarSeek(moveEvent.touches[0].clientX, timeline);
            };

            const onTouchEnd = () => {
                document.removeEventListener("touchmove", onTouchMove);
                document.removeEventListener("touchend", onTouchEnd);
            };

            document.addEventListener("touchmove", onTouchMove);
            document.addEventListener("touchend", onTouchEnd);
        };
    }

    // Entrada de texto
    const campoTexto = $("#wsInputMensaje");
    if (campoTexto) {
        campoTexto.oninput = () => {
            const texto = campoTexto.value.trim();
            const micIcon = $("#wsMicIcon");
            const sendIcon = $("#wsSendIcon");

            if (texto.length > 0) {
                if (micIcon) micIcon.style.display = "none";
                if (sendIcon) sendIcon.style.display = "block";
            } else {
                if (micIcon) micIcon.style.display = "block";
                if (sendIcon) sendIcon.style.display = "none";
            }
            actualizarGuiaVisualWhatsApp();
        };

        campoTexto.onkeypress = (evento) => {
            if (evento.key === "Enter") {
                if (estaGrabandoAudio) return;
                const texto = campoTexto.value.trim();
                if (texto.length > 0) {
                    enviarMensajeTexto(texto);
                }
            }
        };
    }

    // Botón verde circular de envío / micrófono
    const btnEnviar = $("#wsEnviarMensajeBtn");
    if (btnEnviar) {
        btnEnviar.onclick = () => {
            if (estaGrabandoAudio) {
                enviarMensajeVoz();
                return;
            }
            const texto = campoTexto ? campoTexto.value.trim() : "";
            if (texto.length > 0) {
                enviarMensajeTexto(texto);
            } else {
                // Validación Nivel 1: Bloqueo de audio en el primer nivel (SOLO visual sin narrar)
                if (nivelActual === "enviar-mensaje") {
                    mostrarAvisoBloqueado("Para este nivel el envío de audio está bloqueado. Por favor, escribe un mensaje de texto.");
                    return;
                }
                enviarMensajeVoz();
            }
        };
    }

    // Botón de Llamada de Voz
    const btnLlamada = $("#wsBtnLlamada");
    if (btnLlamada) {
        btnLlamada.onclick = () => {
            iniciarLlamadaSimulada();
        };
    }

    // Botón de Contestar Llamada Entrante
    const btnIncomingContestar = $("#wsIncomingBtnContestar");
    if (btnIncomingContestar) {
        btnIncomingContestar.onclick = () => {
            $("#wsModalLlamadaEntrante")?.classList.remove("activa");

            const modal = $("#wsModalLlamada");
            const name = $("#wsCallName");
            const status = $("#wsCallStatus");
            const avatarLetter = $("#wsCallAvatarLetter");
            const muteBtn = $("#wsCallBtnMute");
            const micMutedIcon = $("#wsCallMicMutedIcon");
            const micUnmutedIcon = $("#wsCallMicUnmutedIcon");
            const muteLabel = $("#wsCallMuteLabel");

            if (name) name.textContent = "Juan (Nieto)";
            if (status) status.textContent = "0:01";

            if (avatarLetter) {
                avatarLetter.textContent = "JN";
                avatarLetter.className = "ws-avatar ws-call-avatar ws-avatar-color-4 ws-call-avatar-letter";
            }

            isMicMutedInCall = false;
            if (muteBtn) muteBtn.classList.remove("muted");
            if (micMutedIcon) micMutedIcon.style.display = "none";
            if (micUnmutedIcon) micUnmutedIcon.style.display = "block";
            if (muteLabel) muteLabel.textContent = "Silenciar";

            modal?.classList.add("activa");

            let segundos = 1;
            if (callTimerInterval) clearInterval(callTimerInterval);
            callTimerInterval = setInterval(() => {
                segundos++;
                const mins = Math.floor(segundos / 60).toString().padStart(2, "0");
                const secs = (segundos % 60).toString().padStart(2, "0");
                if (status) status.textContent = `${mins}:${secs}`;
            }, 1000);

            subPasoNivel3 = 8;
            actualizarBarraInstrucciones(false);

            stopSpeech();
            speak("¡Hola abuelo! Olvidé preguntarte si nos vemos este fin de semana. ¡Cuídate mucho!", () => {
                setTimeout(() => {
                    if (subPasoNivel3 === 8) {
                        subPasoNivel3 = 9;
                        actualizarBarraInstrucciones(true); // "Muy bien, ahora presiona el botón rojo para colgar y finalizar el nivel."
                    }
                }, 1500);
            });
        };
    }

    // Botón de Rechazar Llamada Entrante (Si la cancela, repite la secuencia completa de llamada entrante)
    const btnIncomingRechazar = $("#wsIncomingBtnRechazar");
    if (btnIncomingRechazar) {
        btnIncomingRechazar.onclick = () => {
            $("#wsModalLlamadaEntrante")?.classList.remove("activa");
            stopSpeech();

            subPasoNivel3 = 6;
            const textoRechazo = "Has rechazado la llamada. Espera un momento, estás a punto de recibirla de nuevo para contestarla.";
            const textEl = $("#wsInstructionsText");
            if (textEl) textEl.textContent = textoRechazo;
            limpiarResaltados();

            speak(textoRechazo, () => {
                setTimeout(() => {
                    const simulador = $("#pantallaWhatsappSimulador");
                    if (simulador && simulador.classList.contains("activa") && subPasoNivel3 === 6) {
                        const modalEntrante = $("#wsModalLlamadaEntrante");
                        if (modalEntrante) {
                            modalEntrante.classList.add("activa");
                            subPasoNivel3 = 7;
                            actualizarBarraInstrucciones(true); // "Tienes una llamada entrante de Juan. Toca el botón verde para contestar."
                        }
                    }
                }, 1800);
            });
        };
    }

    // Botón de Silenciar Micrófono en Llamada (Dinámica Nivel 3)
    const btnMute = $("#wsCallBtnMute");
    if (btnMute) {
        btnMute.onclick = () => {
            alternarSilencioLlamada();
        };
    }

    // Botón Colgar en Llamada de Voz
    const btnColgar = $("#wsCallBtnColgar");
    if (btnColgar) {
        btnColgar.onclick = () => {
            finalizarLlamadaSimulada();
        };
    }

    const btnMinimizarLlamada = $("#wsCallBtnMinimizar");
    if (btnMinimizarLlamada) {
        btnMinimizarLlamada.onclick = () => {
            finalizarLlamadaSimulada();
        };
    }

    // Botón de Videollamada
    const btnVideoLlamada = $("#wsBtnVideoLlamada");
    if (btnVideoLlamada) {
        btnVideoLlamada.onclick = () => {
            iniciarVideollamadaSimulada();
        };
    }

    // Botón de Cámara en Videollamada (Dinámica Nivel 4)
    const btnVideoCamara = $("#wsVideoCallBtnVideo");
    if (btnVideoCamara) {
        btnVideoCamara.onclick = () => {
            alternarCamaraVideoLlamada();
        };
    }

    // Botón de Silenciar Micrófono en Videollamada (Dinámica Nivel 4)
    const btnVideoMute = $("#wsVideoCallBtnMute");
    if (btnVideoMute) {
        btnVideoMute.onclick = () => {
            alternarSilencioVideoLlamada();
        };
    }

    // Botón Colgar en Videollamada
    const btnVideoColgar = $("#wsVideoCallBtnColgar");
    if (btnVideoColgar) {
        btnVideoColgar.onclick = () => {
            finalizarVideollamadaSimulada();
        };
    }

    const btnMinimizarVideo = $("#wsVideoCallBtnMinimizar");
    if (btnMinimizarVideo) {
        btnMinimizarVideo.onclick = () => {
            finalizarVideollamadaSimulada();
        };
    }

    // Adjuntar / Galería
    const openGaleria = () => {
        $("#wsModalGaleria")?.classList.add("activa");
        if (nivelActual === "enviar-foto") {
            subPasoNivel5 = 2;
        }
        actualizarBarraInstrucciones(true);
    };

    const btnAdjuntar = $("#wsBtnAdjuntar");
    if (btnAdjuntar) btnAdjuntar.onclick = openGaleria;

    const btnCamara = $("#wsBtnCamara");
    if (btnCamara) btnCamara.onclick = openGaleria;

    const btnCerrarGaleria = $("#wsGaleriaBtnCerrar");
    if (btnCerrarGaleria) {
        btnCerrarGaleria.onclick = () => {
            $("#wsModalGaleria")?.classList.remove("activa");
            if (nivelActual === "enviar-foto") subPasoNivel5 = 1;
            actualizarBarraInstrucciones(true);
        };
    }

    // Click en fotos de la galería -> abre preview de WhatsApp
    const galeriaContainer = $("#wsModalGaleria");
    if (galeriaContainer) {
        galeriaContainer.onclick = (e) => {
            const item = e.target.closest(".ws-galeria-item");
            if (!item) return;
            const photoPath = item.dataset.photoPath || "./assets/img/whatsapp/photo_mitad_mundo.jpg";
            const photoCaption = item.dataset.photoCaption || "Paseo familiar Mitad del Mundo";

            fotoSeleccionadaParaPreview = {
                path: photoPath,
                caption: photoCaption
            };

            const previewImg = $("#wsPhotoPreviewImg");
            if (previewImg) previewImg.src = photoPath;

            const captionInput = $("#wsPhotoPreviewCaption");
            if (captionInput) captionInput.value = photoCaption;

            $("#wsModalGaleria")?.classList.remove("activa");
            $("#wsModalPreviewFoto")?.classList.add("activa");

            if (nivelActual === "enviar-foto") {
                subPasoNivel5 = 3;
            }
            actualizarBarraInstrucciones(true);
        };
    }

    // Clic en fotos del chat para abrir visor en pantalla completa
    if (chatBody) {
        chatBody.addEventListener("click", (e) => {
            const photoEl = e.target.closest(".ws-photo-msg-clickable");
            if (photoEl) {
                const photoUrl = photoEl.dataset.photoUrl;
                const photoCaption = photoEl.dataset.photoCaption;
                const photoSender = photoEl.dataset.photoSender;
                const photoTime = photoEl.dataset.photoTime;
                if (photoUrl) {
                    abrirVisorFoto(photoUrl, photoCaption, photoSender, photoTime);
                }
            }
        });
    }

    // Botón volver en el visor de fotos
    const btnVisorVolver = $("#wsVisorBtnVolver");
    if (btnVisorVolver) {
        btnVisorVolver.onclick = () => {
            cerrarVisorFoto();
        };
    }

    // Cerrar preview de foto
    const btnCerrarPreview = $("#wsPhotoPreviewBtnCerrar");
    if (btnCerrarPreview) {
        btnCerrarPreview.onclick = () => {
            $("#wsModalPreviewFoto")?.classList.remove("activa");
            if (nivelActual === "enviar-foto") subPasoNivel5 = 1;
            actualizarBarraInstrucciones(true);
        };
    }

    // Botón verde de enviar foto en el preview
    const btnEnviarFotoPreview = $("#wsBtnEnviarFotoPreview");
    if (btnEnviarFotoPreview) {
        btnEnviarFotoPreview.onclick = () => {
            const captionInput = $("#wsPhotoPreviewCaption");
            const captionText = captionInput ? captionInput.value.trim() : "";
            const photoPath = (fotoSeleccionadaParaPreview && fotoSeleccionadaParaPreview.path)
                ? fotoSeleccionadaParaPreview.path
                : "./assets/img/whatsapp/photo_mitad_mundo.jpg";

            enviarFotoReal(photoPath, captionText);
            $("#wsModalPreviewFoto")?.classList.remove("activa");
        };
    }

    // Botón continuar en modal de éxito
    const btnContinuar = $("#wsSuccessBtnContinuar");
    if (btnContinuar) btnContinuar.onclick = retornarANiveles;
}

/**
 * Devuelve el SVG del estado de un mensaje enviado, igual que en WhatsApp
 * real: relojito mientras se envía, un visto cuando se envió, dos vistos
 * grises cuando le llegó al contacto, y dos vistos azules cuando el
 * contacto ya lo leyó.
 */
function crearCheckmarkHTML(status) {
    const RELOJ = `<svg class="ws-msg-checkmark gris" viewBox="0 0 24 24"><path d="M12 20c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>`;
    const UNA_PALOMITA = `<svg class="ws-msg-checkmark gris" viewBox="0 0 24 24"><path d="M0.293,12.293L1.707,10.88L6,15.17L18.293,2.88L19.707,4.293L6,18L0.293,12.293Z"/></svg>`;
    const DOS_PALOMITAS = `<svg class="ws-msg-checkmark gris" viewBox="0 0 24 24"><path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/></svg>`;
    const DOS_PALOMITAS_AZULES = `<svg class="ws-msg-checkmark" viewBox="0 0 24 24"><path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/></svg>`;

    switch (status) {
        case "enviando": return RELOJ;
        case "enviado": return UNA_PALOMITA;
        case "leido": return DOS_PALOMITAS_AZULES;
        case "entregado":
        default: return DOS_PALOMITAS;
    }
}

/**
 * Redibuja el chat y la lista si el chat en cuestión sigue a la vista.
 * Se llama cada vez que el "estado" de un mensaje cambia solo, con el
 * tiempo, para que la persona vea el relojito y los vistos moverse.
 */
function refrescarSiChatVisible(chat) {
    if (chatSeleccionado === chat && $("#wsChatConversation")?.classList.contains("activa")) {
        renderizarMensajes();
    }
    renderizarListaChats();
}

/**
 * Hace que un mensaje recién enviado pase, solo, por los mismos estados
 * que en WhatsApp real: enviando -> enviado -> entregado. Se queda en
 * "entregado" hasta que el contacto lo lea de verdad (ver
 * marcarChatComoLeido), igual que pasa en la vida real.
 */
function iniciarProgresoEstadoMensaje(mensaje, chat) {
    mensaje.status = "enviando";
    setTimeout(() => {
        if (mensaje.status !== "enviando") return;
        mensaje.status = "enviado";
        refrescarSiChatVisible(chat);

        setTimeout(() => {
            if (mensaje.status !== "enviado") return;
            mensaje.status = "entregado";
            refrescarSiChatVisible(chat);
        }, 900);
    }, 500);
}

/**
 * Pone en azul (leído) todos los mensajes que la persona le había
 * enviado a este chat. Se llama justo antes de que el contacto
 * "responda", que es el momento en que en WhatsApp real se ven azules.
 */
function marcarChatComoLeido(chat) {
    if (!chat) return;
    chat.mensajes.forEach(m => {
        if (m.sender === "enviada" && m.status && m.status !== "leido") {
            m.status = "leido";
        }
    });
    refrescarSiChatVisible(chat);
}

// Selector del icono de estado (relojito/vistos) del mensaje que se está
// enseñando. Se resalta por selector y no por elemento: resaltarElemento()
// solo reconoce HTMLElement, y un <svg> es un SVGElement, así que pasarle
// el nodo directamente no lo marcaba nunca.
const SELECTOR_CHECKMARK_ENVIADO = ".ws-msg-bubble.enviada .ws-msg-checkmark";

/**
 * Explica el primer mensaje que la persona manda en el Nivel 1, un estado
 * a la vez: aparece el relojito y Nico lo explica; en cuanto termina de
 * hablar, pasa al visto y lo explica; y así hasta los dos vistos grises.
 * La guía visual (el resaltado) siempre marca el icono del que se está
 * hablando, para que la persona sepa exactamente dónde mirar.
 */
function enseñarEstadosDeMensaje(mensaje, chat) {
    const sigueEnEsteMomento = () =>
        chatSeleccionado === chat &&
        subPasoNivel1 === 2 &&
        $("#wsChatConversation")?.classList.contains("activa");

    const explicarPaso = (status, texto, siguientePaso) => {
        if (!sigueEnEsteMomento()) return;

        mensaje.status = status;
        renderizarMensajes();

        const textEl = $("#wsInstructionsText");
        if (textEl) textEl.textContent = texto;

        limpiarResaltados();
        resaltarElemento(SELECTOR_CHECKMARK_ENVIADO, { scroll: true });

        speak(texto, () => {
            if (siguientePaso) siguientePaso();
        });
    };

    explicarPaso(
        "enviando",
        "Mira, apareció un relojito junto a tu mensaje. Eso significa que se está enviando.",
        () => explicarPaso(
            "enviado",
            "Ahora aparece un visto. Quiere decir que tu mensaje ya se envió.",
            () => explicarPaso(
                "entregado",
                "Ahora aparecen dos vistos grises. Eso significa que el mensaje ya le llegó a Juan.",
                () => {
                    if (!sigueEnEsteMomento()) return;
                    limpiarResaltados();
                    iniciarEsperaRespuestaJuan(chat);
                }
            )
        )
    );
}

/**
 * Espera unos segundos y hace que Juan responda al primer mensaje,
 * explicando cada cosa a su tiempo, igual que los estados del mensaje:
 * primero que lo leyó (vistos azules), después que está escribiendo
 * (mostrando dónde se ve eso), y solo entonces llega su respuesta.
 */
function iniciarEsperaRespuestaJuan(chat) {
    const statusEl = $("#wsChatConversation")?.querySelector(".ws-chat-contact-status");
    const textEl = $("#wsInstructionsText");

    const sigueVigente = () => {
        const conversacionEl = $("#wsChatConversation");
        return conversacionEl && conversacionEl.classList.contains("activa") &&
            chatSeleccionado === chat && chatSeleccionado.id === "juan-nieto" && subPasoNivel1 === 2;
    };

    // Simula que Juan abrió el chat y leyó el mensaje un momento después
    // de que le llegó (antes de esto se queda en dos vistos grises).
    juanResponseTimeout = setTimeout(() => {
        if (!sigueVigente()) return;

        // En WhatsApp real es justo cuando el contacto abre el chat que
        // nuestros vistos se ponen azules.
        marcarChatComoLeido(chat);

        const textoLeido = "¡Mira, tus vistos se pusieron azules! Eso significa que Juan ya leyó tu mensaje.";
        if (textEl) textEl.textContent = textoLeido;

        limpiarResaltados();
        resaltarElemento(SELECTOR_CHECKMARK_ENVIADO, { scroll: true });

        speak(textoLeido, () => {
            if (!sigueVigente()) return;

            // Ahora Juan empieza a redactar su respuesta.
            if (statusEl) statusEl.textContent = "escribiendo...";

            const textoEscribiendo = "Mira, junto al nombre de Juan ahora dice escribiendo... Eso quiere decir que te está por responder.";
            if (textEl) textEl.textContent = textoEscribiendo;

            limpiarResaltados();
            resaltarElemento(".ws-chat-contact-status", { scroll: true });

            speak(textoEscribiendo, () => {
                if (!sigueVigente()) return;

                // Un momento más "escribiendo" antes de que llegue su respuesta.
                setTimeout(() => {
                    if (!sigueVigente()) return;

                    if (statusEl) statusEl.textContent = "en línea";

                    const horaResp = obtenerHoraActual();
                    chat.mensajes.push({
                        sender: "recibida",
                        text: "¡Hola abuelo! Qué bueno que me escribes. ¿Cómo has estado?",
                        time: horaResp
                    });
                    chat.preview = "¡Hola abuelo! Qué bueno que me escribes. ¿Cómo has estado?";
                    chat.hora = horaResp;

                    moverChatAlTop("juan-nieto");
                    guardar(`gz_whatsapp_chats_${nivelActual}`, listaChatsData);
                    renderizarMensajes();

                    subPasoNivel1 = 3;

                    const textoSiguiente = "Ahora escríbele cómo estás, y toca enviar.";
                    if (textEl) textEl.textContent = textoSiguiente;
                    ultimaInstruccionHablada = textoSiguiente;

                    limpiarResaltados();
                    const inputVal = $("#wsInputMensaje") ? $("#wsInputMensaje").value.trim() : "";
                    resaltarElemento(inputVal.length > 0 ? "#wsEnviarMensajeBtn" : "#wsInputMensaje");

                    speak(textoSiguiente);
                }, 2500);
            });
        });
    }, 1800);
}

/**
 * Obtiene la hora actual formateada
 */
function obtenerHoraActual() {
    const ahora = new Date();
    const hora = ahora.getHours().toString().padStart(2, "0");
    const minutos = ahora.getMinutes().toString().padStart(2, "0");
    return `${hora}:${minutos}`;
}

/**
 * Envía un mensaje de texto y desencadena lógica conversacional
 */
function enviarMensajeTexto(texto) {
    if (!chatSeleccionado) return;

    const hora = obtenerHoraActual();
    const nuevoMensaje = {
        sender: "enviada",
        text: texto,
        time: hora
    };

    chatSeleccionado.mensajes.push(nuevoMensaje);
    chatSeleccionado.preview = texto;
    chatSeleccionado.hora = hora;

    moverChatAlTop(chatSeleccionado.id);
    guardar(`gz_whatsapp_chats_${nivelActual}`, listaChatsData);

    // El primer mensaje del Nivel 1 explica los estados paso a paso con voz
    // propia (ver enseñarEstadosDeMensaje); el resto de mensajes sigue el
    // progreso automático normal, sin narración.
    const esPrimerMensajeDeEnseñanza =
        nivelActual === "enviar-mensaje" && chatSeleccionado.id === "juan-nieto" && subPasoNivel1 === 1;
    if (!esPrimerMensajeDeEnseñanza) {
        iniciarProgresoEstadoMensaje(nuevoMensaje, chatSeleccionado);
    }

    const campoTexto = $("#wsInputMensaje");
    if (campoTexto) campoTexto.value = "";
    const micIcon = $("#wsMicIcon");
    const sendIcon = $("#wsSendIcon");
    if (micIcon) micIcon.style.display = "block";
    if (sendIcon) sendIcon.style.display = "none";
    renderizarMensajes();

    // Lógica del Nivel 1 (Enviar mensaje)
    if (nivelActual === "enviar-mensaje") {
        if (chatSeleccionado.id === "juan-nieto" && subPasoNivel1 === 1) {
            subPasoNivel1 = 2;
            enseñarEstadosDeMensaje(nuevoMensaje, chatSeleccionado);
        } else if (chatSeleccionado.id === "juan-nieto" && subPasoNivel1 === 3) {
            subPasoNivel1 = 4;
            actualizarBarraInstrucciones(true);
        } else if (chatSeleccionado.id === "familia-mendoza" && subPasoNivel1 === 6) {
            marcarChatComoLeido(chatSeleccionado);
            completarNivelActual("¡Has completado toda la conversación y confirmaste tu asistencia a la cena!");
        }
    } else {
        console.log(`Mensaje enviado en el chat ${chatSeleccionado.id}: "${texto}"`);
    }
}

/**
 * Envía una nota de voz real o simulada (corta voz de Nico inmediatamente)
 */
async function enviarMensajeVoz() {
    if (!chatSeleccionado) return;

    // Detener de inmediato cualquier voz de Nico al empezar a grabar
    stopSpeech();

    const sendBtn = $("#wsEnviarMensajeBtn");
    const inputField = $("#wsInputMensaje");

    if (!estaGrabandoAudio) {
        recordingStartTime = Date.now();
        estaGrabandoAudio = true;

        if (inputField) {
            inputField.disabled = true;
            inputField.value = "Grabando... 0:00";
            let elapsedSecs = 0;
            recordingDurationInterval = setInterval(() => {
                elapsedSecs++;
                const m = Math.floor(elapsedSecs / 60);
                const s = (elapsedSecs % 60).toString().padStart(2, "0");
                inputField.value = `Grabando... ${m}:${s}`;
            }, 1000);
        }

        const exito = await iniciarGrabacionReal();
        sendBtn.style.backgroundColor = "#ea0038";
        sendBtn.innerHTML = `
            <svg class="ws-action-circle-icon" viewBox="0 0 24 24" style="fill: white; width: 20px; height: 20px;">
                <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
        `;

        if (!exito) {
            console.warn("Simulando grabación de audio...");
        }

        actualizarBarraInstrucciones(false);
    } else {
        estaGrabandoAudio = false;
        sendBtn.style.backgroundColor = "";
        sendBtn.innerHTML = `
            <svg id="wsMicIcon" class="ws-action-circle-icon" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>
            <svg id="wsSendIcon" class="ws-action-circle-icon" viewBox="0 0 24 24" style="display: none; fill: white;"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        `;

        if (recordingDurationInterval) {
            clearInterval(recordingDurationInterval);
            recordingDurationInterval = null;
        }
        if (inputField) {
            inputField.disabled = false;
            inputField.value = "";
        }

        let audioUrl = await detenerGrabacionReal();
        const hora = obtenerHoraActual();

        const recordingDurationSeconds = Math.round((Date.now() - recordingStartTime) / 1000) || 1;
        const mins = Math.floor(recordingDurationSeconds / 60);
        const secs = (recordingDurationSeconds % 60).toString().padStart(2, "0");
        const realDurationText = `${mins}:${secs}`;

        const nuevoMensaje = {
            sender: "enviada",
            type: "audio",
            audioUrl: audioUrl,
            duration: realDurationText,
            time: hora
        };

        chatSeleccionado.mensajes.push(nuevoMensaje);
        chatSeleccionado.preview = `Nota de voz (${realDurationText})`;
        chatSeleccionado.hora = hora;

        moverChatAlTop(chatSeleccionado.id);
        guardar(`gz_whatsapp_chats_${nivelActual}`, listaChatsData);
        iniciarProgresoEstadoMensaje(nuevoMensaje, chatSeleccionado);
        renderizarMensajes();

        // Control de pasos de Nivel 2
        if (nivelActual === "grabar-audio") {
            if (chatSeleccionado.id === "juan-nieto") {
                if (subPasoNivel2 <= 2) {
                    subPasoNivel2 = 3;
                    actualizarBarraInstrucciones(true);
                } else if (subPasoNivel2 >= 5) {
                    subPasoNivel2 = 7;
                    actualizarBarraInstrucciones(true);
                }
            } else if (chatSeleccionado.id === "dr-martinez") {
                if (subPasoNivel2 >= 9) {
                    marcarChatComoLeido(chatSeleccionado);
                    completarNivelActual("¡Has grabado, enviado y escuchado notas de voz reales y confirmaste tu consulta médica!");
                }
            }
        }
    }
}

/**
 * Abre el visor de fotos en pantalla completa
 */
function abrirVisorFoto(photoUrl, caption, senderName, time) {
    const modalVisor = $("#wsModalVisorFoto");
    const imgEl = $("#wsVisorImg");
    const captionEl = $("#wsVisorCaption");
    const senderEl = $("#wsVisorSenderName");
    const dateEl = $("#wsVisorDate");

    if (imgEl) imgEl.src = photoUrl;
    if (captionEl) captionEl.textContent = caption || "";
    if (senderEl) senderEl.textContent = senderName || (chatSeleccionado ? chatSeleccionado.nombre : "Foto");
    if (dateEl) dateEl.textContent = time ? `Hoy a las ${time}` : "Hoy";

    modalVisor?.classList.add("activa");

    if (nivelActual === "enviar-foto" && subPasoNivel5 === 5) {
        subPasoNivel5 = 6;
        actualizarBarraInstrucciones(true); // "¡Excelente! Aquí puedes ver la foto en pantalla completa. Toca la flecha arriba a la izquierda para volver al chat."
    }
}

/**
 * Cierra el visor de fotos en pantalla completa
 */
function cerrarVisorFoto() {
    $("#wsModalVisorFoto")?.classList.remove("activa");

    if (nivelActual === "enviar-foto" && subPasoNivel5 === 6) {
        completarNivelActual("¡Has aprendido a adjuntar, enviar, recibir y abrir fotos en pantalla completa en WhatsApp!");
    }
}

/**
 * Envía una foto real al chat con previsualización
 */
function enviarFotoReal(photoUrl, caption) {
    if (!chatSeleccionado) return;

    const hora = obtenerHoraActual();
    const nuevoMensaje = {
        sender: "enviada",
        type: "photo",
        photoUrl: photoUrl,
        text: caption || "",
        time: hora
    };

    chatSeleccionado.mensajes.push(nuevoMensaje);
    chatSeleccionado.preview = `📷 ${caption || "Foto"}`;
    chatSeleccionado.hora = hora;

    moverChatAlTop(chatSeleccionado.id);
    guardar(`gz_whatsapp_chats_${nivelActual}`, listaChatsData);
    iniciarProgresoEstadoMensaje(nuevoMensaje, chatSeleccionado);
    renderizarMensajes();

    if (nivelActual === "enviar-foto" && chatSeleccionado.id === "juan-nieto") {
        subPasoNivel5 = 4;
        actualizarBarraInstrucciones(false);

        // Juan responde con mensaje y foto recibida
        const statusEl = $("#wsChatStatus");
        setTimeout(() => {
            if (statusEl) statusEl.textContent = "escribiendo...";
        }, 1200);

        setTimeout(() => {
            if (statusEl) statusEl.textContent = "en línea";
            marcarChatComoLeido(chatSeleccionado);

            const horaResp = obtenerHoraActual();
            const mensajeFotoJuan = {
                sender: "recibida",
                type: "photo",
                photoUrl: "./assets/img/whatsapp/photo_parque.jpg",
                text: "¡Qué hermosa foto abuelo! Mira este lindo perrito que vi en el parque 🐶",
                time: horaResp
            };

            chatSeleccionado.mensajes.push(mensajeFotoJuan);
            chatSeleccionado.preview = "📷 Foto recibida";
            chatSeleccionado.hora = horaResp;

            moverChatAlTop(chatSeleccionado.id);
            guardar(`gz_whatsapp_chats_${nivelActual}`, listaChatsData);
            renderizarMensajes();

            subPasoNivel5 = 5;
            actualizarBarraInstrucciones(true); // "¡Juan te ha respondido con una foto! Toca la foto del perrito para abrirla en grande."
        }, 3000);
    }
}

/**
 * Inicia la pantalla de llamada de voz realista (Nivel 3)
 */
function iniciarLlamadaSimulada() {
    if (!chatSeleccionado) return;

    const modal = $("#wsModalLlamada");
    const name = $("#wsCallName");
    const status = $("#wsCallStatus");
    const avatarLetter = $("#wsCallAvatarLetter");
    const muteBtn = $("#wsCallBtnMute");
    const micMutedIcon = $("#wsCallMicMutedIcon");
    const micUnmutedIcon = $("#wsCallMicUnmutedIcon");
    const muteLabel = $("#wsCallMuteLabel");

    if (name) name.textContent = chatSeleccionado.nombre;
    if (status) status.textContent = "Llamando...";

    if (avatarLetter) {
        avatarLetter.textContent = chatSeleccionado.iniciales || "JN";
        avatarLetter.className = `ws-avatar ws-call-avatar ${chatSeleccionado.avatarClass || "ws-avatar-color-4"} ws-call-avatar-letter`;
    }

    // Inicialmente con micrófono encendido (normal)
    isMicMutedInCall = false;
    if (muteBtn) muteBtn.classList.remove("muted");
    if (micMutedIcon) micMutedIcon.style.display = "none";
    if (micUnmutedIcon) micUnmutedIcon.style.display = "block";
    if (muteLabel) muteLabel.textContent = "Silenciar";

    modal?.classList.add("activa");
    subPasoNivel3 = 2;
    actualizarBarraInstrucciones(false);

    let segundos = 0;
    setTimeout(() => {
        if (status) status.textContent = "0:01";
        if (callTimerInterval) clearInterval(callTimerInterval);

        callTimerInterval = setInterval(() => {
            segundos++;
            const mins = Math.floor(segundos / 60).toString().padStart(2, "0");
            const secs = (segundos % 60).toString().padStart(2, "0");
            if (status) status.textContent = `${mins}:${secs}`;
        }, 1000);

        // 1. Juan saluda primero por voz
        stopSpeech();
        speak("¡Hola abuelo! Qué alegría escucharte, ¿cómo estás?", () => {
            // 2. Dar 1.5 segundos de pausa natural antes de silenciar por error
            setTimeout(() => {
                if (subPasoNivel3 === 2) {
                    isMicMutedInCall = true;
                    if (muteBtn) muteBtn.classList.add("muted");
                    if (micMutedIcon) micMutedIcon.style.display = "block";
                    if (micUnmutedIcon) micUnmutedIcon.style.display = "none";
                    if (muteLabel) muteLabel.textContent = "Silenciado";

                    subPasoNivel3 = 3;
                    actualizarBarraInstrucciones(true); // "Se ha silenciado tu micrófono. Toca el botón 'Silenciar' para activarlo de nuevo."
                }
            }, 1500);
        });
    }, 1000);
}

/**
 * Alterna el estado del micrófono en la llamada de voz
 */
function alternarSilencioLlamada() {
    const muteBtn = $("#wsCallBtnMute");
    const micMutedIcon = $("#wsCallMicMutedIcon");
    const micUnmutedIcon = $("#wsCallMicUnmutedIcon");
    const muteLabel = $("#wsCallMuteLabel");

    isMicMutedInCall = !isMicMutedInCall;

    if (isMicMutedInCall) {
        muteBtn?.classList.add("muted");
        if (micMutedIcon) micMutedIcon.style.display = "block";
        if (micUnmutedIcon) micUnmutedIcon.style.display = "none";
        if (muteLabel) muteLabel.textContent = "Silenciado";
    } else {
        muteBtn?.classList.remove("muted");
        if (micMutedIcon) micMutedIcon.style.display = "none";
        if (micUnmutedIcon) micUnmutedIcon.style.display = "block";
        if (muteLabel) muteLabel.textContent = "Silenciar";

        // Dinámica Nivel 3: El contacto habla cariñosamente
        if (subPasoNivel3 === 3) {
            subPasoNivel3 = 4;
            stopSpeech();
            speak("¡Ahora sí te escucho abuelo! Te llamo luego que voy a almorzar, ¡un abrazo!", () => {
                setTimeout(() => {
                    if (subPasoNivel3 === 4) {
                        subPasoNivel3 = 5;
                        actualizarBarraInstrucciones(true); // "Presiona el botón rojo para colgar la llamada."
                    }
                }, 1000);
            });
        }
    }
}

/**
 * Finaliza la llamada de voz simulada (Maneja llamada 1 saliente y llamada 2 entrante)
 */
function finalizarLlamadaSimulada() {
    if (nivelActual === "hacer-llamada") {
        // Impedir colgar antes de tiempo en llamada saliente
        if (subPasoNivel3 < 5) {
            mostrarAvisoBloqueado("Espera a terminar la conversación y reactivar tu micrófono antes de colgar.");
            return;
        }

        // Impedir colgar antes de tiempo en llamada entrante
        if (subPasoNivel3 === 8) {
            mostrarAvisoBloqueado("Espera a que Juan termine de hablar antes de colgar.");
            return;
        }
    }

    if (callTimerInterval) {
        clearInterval(callTimerInterval);
        callTimerInterval = null;
    }

    $("#wsModalLlamada")?.classList.remove("activa");
    stopSpeech();

    if (nivelActual === "hacer-llamada" && chatSeleccionado && chatSeleccionado.id === "juan-nieto") {
        if (subPasoNivel3 === 5) {
            // Terminó la primera llamada -> preparar llamada entrante
            subPasoNivel3 = 6;
            const textoEspera = "Espera un momento, estás a punto de recibir una llamada entrante.";
            actualizarBarraInstrucciones(false);

            speak(textoEspera, () => {
                setTimeout(() => {
                    const simulador = $("#pantallaWhatsappSimulador");
                    if (simulador && simulador.classList.contains("activa") && subPasoNivel3 === 6) {
                        const modalEntrante = $("#wsModalLlamadaEntrante");
                        if (modalEntrante) {
                            modalEntrante.classList.add("activa");
                            subPasoNivel3 = 7;
                            actualizarBarraInstrucciones(true); // "Tienes una llamada entrante de Juan. Toca el botón verde para contestar."
                        }
                    }
                }, 1800);
            });
        } else if (subPasoNivel3 >= 9) {
            // Terminó la segunda llamada (entrante) -> Completar nivel
            completarNivelActual("¡Excelente! Has aprendido a realizar y recibir llamadas en WhatsApp.");
        }
    }
}

/**
 * Inicia la pantalla de videollamada realista (Nivel 4)
 */
function iniciarVideollamadaSimulada() {
    if (!chatSeleccionado) return;

    const modal = $("#wsModalVideoLlamada");
    const name = $("#wsVideoCallName");
    const status = $("#wsVideoCallStatus");
    const pipImg = $("#wsVideoCallPipImg");
    const pipOff = $("#wsVideoCallPipOff");
    const btnVideo = $("#wsVideoCallBtnVideo");
    const camOnIcon = $("#wsVideoCamOnIcon");
    const camOffIcon = $("#wsVideoCamOffIcon");
    const btnMute = $("#wsVideoCallBtnMute");
    const micUnmutedIcon = $("#wsVideoMicUnmutedIcon");
    const micMutedIcon = $("#wsVideoMicMutedIcon");

    if (name) name.textContent = chatSeleccionado.nombre;
    if (status) status.textContent = "Conectando...";

    isVideoCameraOn = true;
    isVideoMicMuted = false;

    if (pipImg) pipImg.style.display = "block";
    if (pipOff) pipOff.style.display = "none";
    if (btnVideo) btnVideo.classList.remove("off");
    if (camOnIcon) camOnIcon.style.display = "block";
    if (camOffIcon) camOffIcon.style.display = "none";

    if (btnMute) btnMute.classList.remove("muted");
    if (micUnmutedIcon) micUnmutedIcon.style.display = "block";
    if (micMutedIcon) micMutedIcon.style.display = "none";

    modal?.classList.add("activa");
    subPasoNivel4 = 2;
    actualizarBarraInstrucciones(false);

    let segundos = 0;
    setTimeout(() => {
        if (status) status.textContent = "0:01";
        if (videoCallTimerInterval) clearInterval(videoCallTimerInterval);

        videoCallTimerInterval = setInterval(() => {
            segundos++;
            const mins = Math.floor(segundos / 60).toString().padStart(2, "0");
            const secs = (segundos % 60).toString().padStart(2, "0");
            if (status) status.textContent = `${mins}:${secs}`;
        }, 1000);

        // 1. Juan saluda alegremente por videollamada
        stopSpeech();
        speak("¡Hola abuelo! ¡Qué alegría verte por videollamada! Te veo súper bien.", () => {
            // 2. Dar 1.5 segundos antes de que la cámara se apague por error
            setTimeout(() => {
                if (subPasoNivel4 === 2) {
                    isVideoCameraOn = false;
                    if (pipImg) pipImg.style.display = "none";
                    if (pipOff) pipOff.style.display = "flex";
                    if (btnVideo) btnVideo.classList.add("off");
                    if (camOnIcon) camOnIcon.style.display = "none";
                    if (camOffIcon) camOffIcon.style.display = "block";

                    subPasoNivel4 = 3;
                    actualizarBarraInstrucciones(true); // "Por error se apagó tu cámara. Toca el botón de la cámara para volver a encenderla."
                }
            }, 1500);
        });
    }, 1000);
}

/**
 * Alterna el estado de la cámara en la videollamada
 */
function alternarCamaraVideoLlamada() {
    isVideoCameraOn = !isVideoCameraOn;
    const pipImg = $("#wsVideoCallPipImg");
    const pipOff = $("#wsVideoCallPipOff");
    const btnVideo = $("#wsVideoCallBtnVideo");
    const camOnIcon = $("#wsVideoCamOnIcon");
    const camOffIcon = $("#wsVideoCamOffIcon");

    if (isVideoCameraOn) {
        if (pipImg) pipImg.style.display = "block";
        if (pipOff) pipOff.style.display = "none";
        btnVideo?.classList.remove("off");
        if (camOnIcon) camOnIcon.style.display = "block";
        if (camOffIcon) camOffIcon.style.display = "none";

        if (subPasoNivel4 === 3) {
            subPasoNivel4 = 4;
            stopSpeech();
            speak("¡Eso, ya te veo clarito otra vez!", () => {
                setTimeout(() => {
                    if (subPasoNivel4 === 4) {
                        // Siguiente reto: se silencia el micrófono
                        isVideoMicMuted = true;
                        const btnMute = $("#wsVideoCallBtnMute");
                        const micUnmutedIcon = $("#wsVideoMicUnmutedIcon");
                        const micMutedIcon = $("#wsVideoMicMutedIcon");

                        if (btnMute) btnMute.classList.add("muted");
                        if (micUnmutedIcon) micUnmutedIcon.style.display = "none";
                        if (micMutedIcon) micMutedIcon.style.display = "block";

                        subPasoNivel4 = 5;
                        actualizarBarraInstrucciones(true); // "Se ha silenciado tu micrófono. Toca el botón del micrófono para activarlo."
                    }
                }, 1500);
            });
        }
    } else {
        if (pipImg) pipImg.style.display = "none";
        if (pipOff) pipOff.style.display = "flex";
        btnVideo?.classList.add("off");
        if (camOnIcon) camOnIcon.style.display = "none";
        if (camOffIcon) camOffIcon.style.display = "block";
    }
}

/**
 * Alterna el estado del micrófono en la videollamada
 */
function alternarSilencioVideoLlamada() {
    isVideoMicMuted = !isVideoMicMuted;
    const btnMute = $("#wsVideoCallBtnMute");
    const micUnmutedIcon = $("#wsVideoMicUnmutedIcon");
    const micMutedIcon = $("#wsVideoMicMutedIcon");

    if (isVideoMicMuted) {
        btnMute?.classList.add("muted");
        if (micUnmutedIcon) micUnmutedIcon.style.display = "none";
        if (micMutedIcon) micMutedIcon.style.display = "block";
    } else {
        btnMute?.classList.remove("muted");
        if (micUnmutedIcon) micUnmutedIcon.style.display = "block";
        if (micMutedIcon) micMutedIcon.style.display = "none";

        if (subPasoNivel4 === 5) {
            subPasoNivel4 = 6;
            stopSpeech();
            speak("¡Perfecto abuelo, ahora sí te escucho! Te mando un abrazo grande, hablamos luego.", () => {
                setTimeout(() => {
                    if (subPasoNivel4 === 6) {
                        subPasoNivel4 = 7;
                        actualizarBarraInstrucciones(true); // "Muy bien, ahora presiona el botón rojo para finalizar la videollamada."
                    }
                }, 1500);
            });
        }
    }
}

/**
 * Finaliza la videollamada simulada
 */
function finalizarVideollamadaSimulada() {
    if (nivelActual === "videollamada" || nivelActual === "llamada-grupal") {
        if (subPasoNivel4 < 7) {
            mostrarAvisoBloqueado("Espera a completar la videollamada antes de colgar.");
            return;
        }
    }

    if (videoCallTimerInterval) {
        clearInterval(videoCallTimerInterval);
        videoCallTimerInterval = null;
    }

    $("#wsModalVideoLlamada")?.classList.remove("activa");
    stopSpeech();

    if ((nivelActual === "videollamada" || nivelActual === "llamada-grupal") && chatSeleccionado) {
        completarNivelActual("¡Has aprendido a dominar la cámara y el micrófono en una videollamada de WhatsApp!");
    }
}

/**
 * Marca el nivel actual como completado en el backend y muestra overlay
 */
function completarNivelActual(mensajeExito) {
    completarNivel("WhatsApp", nivelActual);

    const msgEl = $("#wsSuccessMessage");
    if (msgEl) msgEl.textContent = mensajeExito;
    $("#wsModalExito")?.classList.add("activa");

    const mensajeVoz = `¡Excelente trabajo! Nivel completado con éxito. Presiona continuar para regresar a la lista de niveles.`;
    speak(mensajeVoz);
}
