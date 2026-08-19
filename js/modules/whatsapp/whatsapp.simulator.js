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

// Lógica de sub-pasos para el Nivel 1 (Enviar mensaje)
// 1: Escribir primer mensaje a Juan (Nieto)
// 2: Esperar respuesta de Juan (Typing...)
// 3: Responder a Juan
// 4: Regresar a la lista de chats
// 4.5: Esperando en la lista de chats
// 5: Recibir mensaje de Familia Mendoza, abrir chat
// 6: Responder en el grupo de Familia Mendoza
let subPasoNivel1 = 1;

// Lógica de sub-pasos para el Nivel 2 (Grabar audio)
// 1: Presionar micrófono para grabar y enviar audio
// 3: Tocar el botón de reproducción (Play) en la nota de voz enviada para escucharla
// 4: Esperar a que Juan escuche y responda con otro audio (Typing...)
// 5: Tocar el botón de reproducción (Play) en la nota de voz recibida de Juan para escucharla
// 6: Grabar un segundo audio respondiendo a Juan si vas a ir a visitarlo
// 7: Regresar a la lista de chats presionando la flecha arriba a la izquierda
// 7.5: Esperando en la lista de chats
// 8: Tocar el chat del Dr. Martínez para abrir el nuevo audio del doctor
// 9: Tocar reproducir en el audio recibido del doctor
// 10: Grabar una nota de voz de respuesta confirmando la cita al doctor
let subPasoNivel2 = 1;

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

    if (nivel === "llamada-grupal") {
        return [
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
                preview: "¡Hola abuelo! ¿Qué tal te fue hoy en tu paseo?",
                hora: "Ayer",
                unreadCount: 0,
                mensajes: [
                    { sender: "recibida", text: "¡Hola abuelo! ¿Qué tal te fue hoy en tu paseo?", time: "Ayer" }
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

            <!-- Modales -->
            <div id="wsModalLlamada" class="ws-modal-llamada">
                <div class="ws-call-container">
                    <div id="wsCallAvatar" class="ws-avatar ws-call-avatar"></div>
                    <h2 id="wsCallName" class="ws-call-name"></h2>
                    <p id="wsCallStatus" class="ws-call-status">Llamando...</p>
                    <div class="ws-call-actions-container">
                        <button id="wsCallBtnColgar" class="ws-call-btn-colgar" aria-label="Colgar llamada">
                            <svg viewBox="0 0 24 24" style="width: 28px; height: 28px; fill: white; transform: rotate(135deg);"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-2.2 2.2a15.045 15.045 0 0 1-6.59-6.59l2.2-2.21a.96.96 0 0 0 .25-1A11.36 11.36 0 0 1 8.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.62c0-.55-.45-1-1-1z"/></svg>
                        </button>
                    </div>
                </div>
            </div>

            <div id="wsModalGaleria" class="ws-modal-galeria">
                <div class="ws-galeria-container">
                    <header class="ws-galeria-header">
                        <h3>Selecciona una foto para enviar</h3>
                        <button id="wsGaleriaBtnCerrar" class="ws-galeria-close-btn" aria-label="Cerrar galería">&times;</button>
                    </header>
                    <div class="ws-galeria-grid">
                        <div class="ws-galeria-item" data-photo-name="flores.jpg" style="background: #ffcdd2;">🌸<small>flores.jpg</small></div>
                        <div class="ws-galeria-item" data-photo-name="paisaje.jpg" style="background: #c8e6c9;">🌲<small>paisaje.jpg</small></div>
                        <div class="ws-galeria-item" data-photo-name="comida.jpg" style="background: #ffe0b2;">🍕<small>comida.jpg</small></div>
                        <div class="ws-galeria-item" data-photo-name="familia.jpg" style="background: #bbdefb;">👨‍👩‍👧‍👦<small>familia.jpg</small></div>
                    </div>
                </div>
            </div>

            <div id="wsModalExito" class="ws-modal-exito">
                <div class="ws-success-container">
                    <img src="./assets/img/icons/trofeo.svg" alt="Trofeo" class="ws-success-trophy">
                    <h2>¡Nivel Completado!</h2>
                    <p id="wsSuccessMessage">¡Has realizado la acción con éxito!</p>
                    <button id="wsSuccessBtnContinuar" class="ws-success-btn-continuar">Continuar</button>
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

    // Generar una copia limpia de los chats predeterminados recreando los arrays
    const defaultChats = obtenerChatsDefecto(nivelActual);

    const storageKey = `gz_whatsapp_chats_${nivelActual}`;

    // Restablecer el estado específico e independiente de listaChatsData y subpasos
    if (nivelActual === "enviar-mensaje") {
        subPasoNivel1 = 1;
        ultimaInstruccionHablada = "";
        try {
            localStorage.removeItem(storageKey);
        } catch(e) {}
        listaChatsData = JSON.parse(JSON.stringify(defaultChats));
        guardar(storageKey, listaChatsData);
    } else if (nivelActual === "grabar-audio") {
        subPasoNivel2 = 1;
        ultimaInstruccionHablada = "";
        try {
            localStorage.removeItem(storageKey);
        } catch(e) {}
        listaChatsData = JSON.parse(JSON.stringify(defaultChats));
        guardar(storageKey, listaChatsData);
        // Pre-aprobar micrófono y calentarlo
        solicitarMicrofonoTemprano();
    } else {
        listaChatsData = cargar(storageKey, defaultChats);
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
                ? "Escribe un mensaje de saludo a Juan y presiona enviar."
                : "Toca el chat de Juan para empezar a escribirle.";
        } else if (subPasoNivel1 === 2) {
            instruccion = "Espera un momento a que Juan lea tu mensaje y responda.";
        } else if (subPasoNivel1 === 3) {
            instruccion = "Juan te ha respondido. Escríbele contándole cómo estás y presiona enviar.";
        } else if (subPasoNivel1 === 4) {
            instruccion = "Regresa a la lista de chats presionando la flecha arriba a la izquierda.";
        } else if (subPasoNivel1 === 4.5) {
            instruccion = "Espera a recibir un nuevo mensaje en la lista de chats.";
        } else if (subPasoNivel1 >= 5) {
            if (estaEnChat && chatSeleccionado && chatSeleccionado.id !== "familia-mendoza") {
                instruccion = "Regresa a la lista de chats presionando la flecha arriba a la izquierda.";
            } else {
                if (subPasoNivel1 === 5) {
                    instruccion = "Toca el chat de la Familia Mendoza para abrir los nuevos mensajes.";
                } else if (subPasoNivel1 === 6) {
                    instruccion = "Responde en el grupo confirmando tu asistencia y presiona enviar.";
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
        instruccion = estaEnChat
            ? "Presiona el botón de llamada en la esquina superior derecha."
            : "Toca el chat de Juan para entrar a la conversación.";
    } else if (nivelActual === "llamada-grupal") {
        instruccion = estaEnChat
            ? "Presiona el botón de llamada en la parte superior derecha de la conversación grupal."
            : "Toca el chat de la Familia Mendoza para entrar a la conversación grupal.";
    } else if (nivelActual === "enviar-foto") {
        instruccion = estaEnChat
            ? "Presiona el icono del clip o de la cámara, selecciona una foto y envíala."
            : "Toca el chat de Juan para entrar a la conversación.";
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
            const modalLlamada = $("#wsModalLlamada");
            if (modalLlamada && modalLlamada.classList.contains("activa")) {
                resaltarElemento("#wsCallBtnColgar", { variant: "amber" });
            } else {
                resaltarElemento("#wsBtnLlamada");
            }
        }
    } else if (nivelActual === "llamada-grupal") {
        if (!estaEnChat) {
            resaltarElemento("[data-chat-id='familia-mendoza']");
        } else {
            const modalLlamada = $("#wsModalLlamada");
            if (modalLlamada && modalLlamada.classList.contains("activa")) {
                resaltarElemento("#wsCallBtnColgar", { variant: "amber" });
            } else {
                resaltarElemento("#wsBtnLlamada");
            }
        }
    } else if (nivelActual === "enviar-foto") {
        if (!estaEnChat) {
            resaltarElemento("[data-chat-id='juan-nieto']");
        } else {
            const modalGaleria = $("#wsModalGaleria");
            if (modalGaleria && modalGaleria.classList.contains("activa")) {
                resaltarElemento(".ws-galeria-item");
            } else {
                resaltarElemento("#wsBtnAdjuntar");
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
            ? `<svg class="ws-msg-checkmark" viewBox="0 0 24 24" style="width: 15px; height: 15px; margin-right: 2px;"><path d="M0.293,12.293L1.707,10.88L6,15.17L18.293,2.88L19.707,4.293L6,18L0.293,12.293Z"/></svg>`
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
    console.log("DEBUG abrirConversacion chatId param=" + chatId + " listaIds=" + listaChatsData.map(c=>c.id).join(","));
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
            const avatarInitials = msg.sender === "recibida" ? chatSeleccionado.iniciales : "YO";
            const avatarClass = msg.sender === "recibida" ? chatSeleccionado.avatarClass : "ws-avatar-color-7";
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
                    <div style="position: relative; width: 26px; height: 26px;">
                        <div class="ws-avatar ${avatarClass}" style="width: 100%; height: 100%; font-size: 10px;">${avatarInitials}</div>
                        <svg viewBox="0 0 24 24" style="position: absolute; bottom:-4px; right:-4px; width: 14px; height: 14px; fill: #53bdeb;"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>
                    </div>
                </div>
            `;
        } else if (msg.type === "photo") {
            bubble.style.padding = "6px";
            bubble.style.borderRadius = "10px";
            bubble.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 6px; width: 200px;">
                    <div style="background-color: #b9e7b3; height: 120px; border-radius: 6px; display: grid; place-items: center; font-size: 40px;">
                        ${msg.photoEmoji || "📷"}
                    </div>
                    <span style="font-size: 13.5px; color: #466a41; font-weight: 700;">${msg.text}</span>
                </div>
                <div class="ws-msg-meta" style="margin-top: 4px; margin-right: 0;">
                    <span>${msg.time}</span>
                    ${msg.sender === "enviada" ? `<svg class="ws-msg-checkmark" viewBox="0 0 24 24"><path d="M0.293,12.293L1.707,10.88L6,15.17L18.293,2.88L19.707,4.293L6,18L0.293,12.293Z"/></svg>` : ""}
                </div>
            `;
        } else {
            const checkmarkHTML = msg.sender === "enviada"
                ? `<svg class="ws-msg-checkmark" viewBox="0 0 24 24"><path d="M0.293,12.293L1.707,10.88L6,15.17L18.293,2.88L19.707,4.293L6,18L0.293,12.293Z"/></svg>`
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
 * Simula y controla la reproducción de un mensaje de audio (Play / Pausa / Reanudar / Seek)
 */
function simularReproduccionAudio(btn, esEnviada, msg) {
    const bubble = btn.closest(".ws-msg-bubble");
    const progress = bubble.querySelector(".ws-audio-progress");
    const pin = bubble.querySelector(".ws-audio-pin");
    const timeline = bubble.querySelector(".ws-audio-timeline");
    const estado = btn.dataset.estado || "detenido";

    // Si hay otro audio en reproducción, detenerlo antes de reproducir este
    if (audioActivoMsg && audioActivoMsg !== msg) {
        const otroBtn = $("#wsChatBody").querySelector(`.ws-msg-bubble button.reproduciendo`);
        if (otroBtn) {
            otroBtn.dataset.estado = "detenido";
            otroBtn.classList.remove("reproduciendo");
            otroBtn.innerHTML = `<svg class="ws-audio-btn-icon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
            const otraBubble = otroBtn.closest(".ws-msg-bubble");
            const otroProgress = otraBubble.querySelector(".ws-audio-progress");
            const otroPin = otraBubble.querySelector(".ws-audio-pin");
            if (otroProgress) otroProgress.style.width = "0%";
            if (otroPin) otroPin.style.left = "0%";
        }
        if (audioActivo) {
            audioActivo.pause();
            audioActivo = null;
        }
        stopSpeech();
        audioActivoMsg = null;
    }

    if (estado === "reproduciendo") {
        // ACCIÓN: PAUSAR
        btn.dataset.estado = "pausado";
        btn.classList.remove("reproduciendo");
        btn.innerHTML = `<svg class="ws-audio-btn-icon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
        
        if (audioActivo) {
            audioActivo.pause();
        } else {
            window.speechSynthesis.pause();
        }
        return;
    }

    if (estado === "pausado") {
        // ACCIÓN: REANUDAR
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
            window.speechSynthesis.resume();
        }
        return;
    }

    // ACCIÓN: REPRODUCIR DESDE EL PRINCIPIO
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

    // Resetear seek anterior
    if (timeline) delete timeline.dataset.seekPercentage;

    if (esEnviada && msg && msg.audioUrl) {
        const audio = new Audio(msg.audioUrl);
        audioActivo = audio;
        playReal = true;

        audio.addEventListener("loadedmetadata", () => {
            duracion = audio.duration * 1000;
        });

        audio.play().catch(e => {
            console.warn("No se pudo iniciar la reproducción del audio real:", e);
            playReal = false;
        });

        audio.onended = () => {
            completarReproduccion();
        };
    } else {
        // Mensaje simulado directo
        const mensajeTexto = esEnviada 
            ? "Reproduciendo nota de voz." 
            : (msg && msg.textToSpeak ? msg.textToSpeak : "Hola abuelo, muchas gracias por tu mensaje, me alegro de que estés muy bien, te quiero mucho, te mando un gran abrazo.");

        speak(mensajeTexto);
        duracion = esEnviada ? 3000 : 7000;
    }

    const paso = 50;
    let timer = null;

    const completarReproduccion = () => {
        if (timer) clearInterval(timer);
        btn.dataset.estado = "detenido";
        btn.classList.remove("reproduciendo");
        btn.innerHTML = `
            <svg class="ws-audio-btn-icon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        `;
        if (progress) progress.style.width = "0%";
        if (pin) pin.style.left = "0%";
        if (timeline) delete timeline.dataset.seekPercentage;
        audioActivoMsg = null;

        avanzarNivel2DespuesDeAudio(esEnviada);
    };

    timer = setInterval(() => {
        const currentEstado = btn.dataset.estado;
        if (currentEstado === "pausado") {
            return;
        }
        if (currentEstado === "detenido") {
            clearInterval(timer);
            return;
        }

        // Si se hizo drag/seek en la barra progresiva
        if (timeline && timeline.dataset.seekPercentage !== undefined) {
            pct = parseFloat(timeline.dataset.seekPercentage);
            delete timeline.dataset.seekPercentage;
        }

        if (playReal && audioActivo) {
            pct = (audioActivo.currentTime / audioActivo.duration) * 100;
            if (pct >= 100) pct = 100;
            if (progress) progress.style.width = `${pct}%`;
            if (pin) pin.style.left = `${pct}%`;
        } else {
            const incremento = (paso / duracion) * 100;
            pct += incremento;
            if (pct >= 100) {
                pct = 100;
                clearInterval(timer);
                completarReproduccion();
                return;
            }
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

    if (esEnviada && subPasoNivel2 === 3) {
        // Escuchó el primer audio enviado
        subPasoNivel2 = 4;
        actualizarBarraInstrucciones(true); // "Espera a que Juan te responda..."

        // Simular escritura de Juan
        const statusEl = $("#wsChatConversation").querySelector(".ws-chat-contact-status");
        if (statusEl) statusEl.textContent = "escribiendo...";

        // Respuesta de Juan tras 6 segundos
        juanResponseTimeout = setTimeout(() => {
            const conversacionEl = $("#wsChatConversation");
            if (conversacionEl && conversacionEl.classList.contains("activa") && chatSeleccionado && chatSeleccionado.id === "juan-nieto" && subPasoNivel2 === 4) {
                if (statusEl) statusEl.textContent = "en línea";

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
        }, 6000);
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

/**
 * Configura los eventos del simulador
 */
function inicializarListeners() {
    const retornarANiveles = () => {
        limpiarTodosLosTimers();
        stopSpeech();

        const modalExito = $("#wsModalExito");
        if (modalExito) modalExito.classList.remove("activa");
        
        const modalLlamada = $("#wsModalLlamada");
        if (modalLlamada) modalLlamada.classList.remove("activa");
        
        const modalGaleria = $("#wsModalGaleria");
        if (modalGaleria) modalGaleria.classList.remove("activa");

        const simulador = $("#pantallaWhatsappSimulador");
        if (simulador) simulador.classList.remove("activa");
        
        limpiarResaltados();
        location.hash = "/modulo/WhatsApp";
    };

    // Salir del simulador
    const btnSalir = $("#wsSalirSimulador");
    if (btnSalir) btnSalir.onclick = retornarANiveles;

    // Volver de la conversación a la lista de chats
    const btnVolver = $("#wsVolverChats");
    if (btnVolver) {
        btnVolver.onclick = () => {
            // Detener cualquier audio en reproducción al salir de la conversación
            if (audioActivo) {
                audioActivo.pause();
                audioActivo = null;
            }
            audioActivoMsg = null;
            stopSpeech();
            
            // Detener progress/timer de reproducción activo
            const activeAudioBtns = $("#wsChatBody") ? $("#wsChatBody").querySelectorAll("button.reproduciendo") : [];
            activeAudioBtns.forEach(btn => {
                btn.dataset.estado = "detenido";
                btn.classList.remove("reproduciendo");
                btn.innerHTML = `<svg class="ws-audio-btn-icon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
            });

            $("#wsChatConversation").classList.remove("activa");
            $("#wsChatsList").classList.add("activa");
            renderizarListaChats();

            // Lógica de paso 2.7: Regresar a la lista y esperar mensaje de Dr. Martínez
            if (nivelActual === "grabar-audio" && subPasoNivel2 === 7) {
                subPasoNivel2 = 7.5;
                actualizarBarraInstrucciones(true); // Nico: "Espera a recibir un nuevo..."

                // Esperar 6 segundos y recibir mensaje del Doctor
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
                                duration: "0:06",
                                time: hora,
                                senderName: "Dr. Martínez",
                                textToSpeak: "Hola, le hablo del consultorio médico. Por favor confirme por nota de voz si asistirá a su consulta de mañana."
                            }
                        ];
                        drChat.preview = "Dr. Martínez: Nota de voz recibida (0:06)";
                        drChat.hora = hora;
                        drChat.unreadCount = 1;

                        moverChatAlTop("dr-martinez");
                        guardar(`gz_whatsapp_chats_${nivelActual}`, listaChatsData);
                        renderizarListaChats();

                        subPasoNivel2 = 8;
                        actualizarBarraInstrucciones(true); // Nico: "Toca el chat del doctor..."
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
    const nicoBtn = $("#wsInstructionsBar").querySelector(".ws-instructions-nico");
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

    // Detectar clicks en el cuerpo del chat para el reproductor de audio
    const chatBody = $("#wsChatBody");
    if (chatBody) {
        chatBody.onclick = (e) => {
            const btn = e.target.closest(".ws-audio-btn");
            if (!btn) return;

            const bubble = btn.closest(".ws-msg-bubble");
            if (!bubble) return;

            const index = bubble.dataset.msgIndex;
            const msg = chatSeleccionado.mensajes[index];
            const esEnviada = bubble.classList.contains("enviada");
            
            simularReproduccionAudio(btn, esEnviada, msg);
        };
    }

    // Funciones comunes para actualizar el seek del audio por arrastre o clic en barra
    const handleBarSeek = (clientX, timeline) => {
        const rect = timeline.getBoundingClientRect();
        const clickX = clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (clickX / rect.width) * 100));

        const progress = timeline.querySelector(".ws-audio-progress");
        const pin = timeline.querySelector(".ws-audio-pin");
        if (progress) progress.style.width = `${percentage}%`;
        if (pin) pin.style.left = `${percentage}%`;

        const bubble = timeline.closest(".ws-msg-bubble");
        const index = bubble.dataset.msgIndex;
        const msg = chatSeleccionado.mensajes[index];
        const esEnviada = bubble.classList.contains("enviada");

        if (audioActivo && audioActivoMsg === msg && esEnviada && msg.audioUrl) {
            audioActivo.currentTime = (percentage / 100) * audioActivo.duration;
        }
        timeline.dataset.seekPercentage = percentage;
    };

    // Soporte para Mouse Drag y Clic
    if (chatBody) {
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

        // Soporte para Mobile/Touch Drag y Clic
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

    // Detectar escritura
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

        // Enviar mensaje con Enter
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

    // Enviar mensaje al presionar botón verde circular o detener grabación
    const btnEnviar = $("#wsEnviarMensajeBtn");
    if (btnEnviar) {
        btnEnviar.onclick = () => {
            if (estaGrabandoAudio) {
                enviarMensajeVoz();
                return;
            }
            const texto = campoTexto.value.trim();
            if (texto.length > 0) {
                enviarMensajeTexto(texto);
            } else {
                enviarMensajeVoz();
            }
        };
    }

    // Llamadas
    const btnLlamada = $("#wsBtnLlamada");
    if (btnLlamada) {
        btnLlamada.onclick = () => {
            iniciarLlamadaSimulada(false);
        };
    }

    const btnVideoLlamada = $("#wsBtnVideoLlamada");
    if (btnVideoLlamada) {
        btnVideoLlamada.onclick = () => {
            iniciarLlamadaSimulada(true);
        };
    }

    const btnColgar = $("#wsCallBtnColgar");
    if (btnColgar) {
        btnColgar.onclick = () => {
            finalizarLlamadaSimulada();
        };
    }

    // Adjuntar / Cámara
    const openGaleria = () => {
        $("#wsModalGaleria").classList.add("activa");
        const textEl = $("#wsInstructionsText");
        if (textEl) {
            const texto = "Toca una de las fotos para seleccionarla y enviarla.";
            textEl.textContent = texto;
            ultimaInstruccionHablada = texto;
            speak(texto);
        }
        resaltarElemento(".ws-galeria-item");
    };

    const btnAdjuntar = $("#wsBtnAdjuntar");
    if (btnAdjuntar) btnAdjuntar.onclick = openGaleria;

    const btnCamara = $("#wsBtnCamara");
    if (btnCamara) btnCamara.onclick = openGaleria;

    const btnCerrarGaleria = $("#wsGaleriaBtnCerrar");
    if (btnCerrarGaleria) {
        btnCerrarGaleria.onclick = () => {
            $("#wsModalGaleria").classList.remove("activa");
            actualizarBarraInstrucciones(true);
        };
    }

    const galeriaGrid = $("#wsModalGaleria").querySelector(".ws-galeria-grid");
    if (galeriaGrid) {
        galeriaGrid.onclick = (e) => {
            const item = e.target.closest(".ws-galeria-item");
            if (!item) return;
            const photoName = item.dataset.photoName;
            const emoji = item.firstChild.textContent;
            enviarFotoSimulada(photoName, emoji);
            $("#wsModalGaleria").classList.remove("activa");
        };
    }

    // Botón continuar en modal éxito
    const btnContinuar = $("#wsSuccessBtnContinuar");
    if (btnContinuar) btnContinuar.onclick = retornarANiveles;
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

    $("#wsInputMensaje").value = "";
    $("#wsMicIcon").style.display = "block";
    $("#wsSendIcon").style.display = "none";
    renderizarMensajes();

    // Lógica del Nivel 1 (Enviar mensaje)
    if (nivelActual === "enviar-mensaje") {
        if (chatSeleccionado.id === "juan-nieto" && subPasoNivel1 === 1) {
            subPasoNivel1 = 2;
            actualizarBarraInstrucciones(true);

            const statusEl = $("#wsChatConversation").querySelector(".ws-chat-contact-status");
            if (statusEl) {
                statusEl.textContent = "escribiendo...";
            }

            // Simular respuesta de Juan tras 6 segundos
            juanResponseTimeout = setTimeout(() => {
                const conversacionEl = $("#wsChatConversation");
                if (conversacionEl && conversacionEl.classList.contains("activa") && chatSeleccionado && chatSeleccionado.id === "juan-nieto" && subPasoNivel1 === 2) {
                    
                    if (statusEl) {
                        statusEl.textContent = "en línea";
                    }

                    const horaResp = obtenerHoraActual();
                    chatSeleccionado.mensajes.push({
                        sender: "recibida",
                        text: "¡Hola abuelo! Qué bueno que me escribes. ¿Cómo has estado?",
                        time: horaResp
                    });
                    chatSeleccionado.preview = "¡Hola abuelo! Qué bueno que me escribes. ¿Cómo has estado?";
                    chatSeleccionado.hora = horaResp;

                    moverChatAlTop("juan-nieto");
                    guardar(`gz_whatsapp_chats_${nivelActual}`, listaChatsData);
                    renderizarMensajes();

                    subPasoNivel1 = 3;
                    actualizarBarraInstrucciones(true);
                }
            }, 6000);
        } else if (chatSeleccionado.id === "juan-nieto" && subPasoNivel1 === 3) {
            subPasoNivel1 = 4;
            actualizarBarraInstrucciones(true);
        } else if (chatSeleccionado.id === "familia-mendoza" && subPasoNivel1 === 6) {
            completarNivelActual("¡Has completado toda la conversación y confirmaste tu asistencia a la cena!");
        }
    } else {
        console.log(`Mensaje enviado en el chat ${chatSeleccionado.id}: "${texto}"`);
    }
}

/**
 * Envía una nota de voz real o simulada
 */
async function enviarMensajeVoz() {
    if (!chatSeleccionado) return;

    const sendBtn = $("#wsEnviarMensajeBtn");
    const inputField = $("#wsInputMensaje");

    if (!estaGrabandoAudio) {
        recordingStartTime = Date.now();
        estaGrabandoAudio = true;

        // Deshabilitar entrada de texto y arrancar temporizador visual
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

        if (exito) {
            speak("Grabando tu voz. Presiona el botón rojo de nuevo para detener y enviar.");
        } else {
            // Fallback si no hay micrófono
            speak("Simulando grabación de audio. Presiona el botón rojo de nuevo para enviar.");
        }
        
        // Refrescar barra para ocultar regresar
        actualizarBarraInstrucciones(false);
    } else {
        estaGrabandoAudio = false;
        sendBtn.style.backgroundColor = "";
        sendBtn.innerHTML = `
            <svg id="wsMicIcon" class="ws-action-circle-icon" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>
            <svg id="wsSendIcon" class="ws-action-circle-icon" viewBox="0 0 24 24" style="display: none; fill: white;"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        `;

        // Detener cronómetro y habilitar campo
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

        // Calcular duración real en segundos
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
        renderizarMensajes();

        // Control de pasos de Nivel 2
        if (nivelActual === "grabar-audio") {
            if (chatSeleccionado.id === "juan-nieto") {
                if (subPasoNivel2 === 1) {
                    subPasoNivel2 = 3;
                    actualizarBarraInstrucciones(true);
                } else if (subPasoNivel2 === 6) {
                    subPasoNivel2 = 7;
                    actualizarBarraInstrucciones(true);
                }
            } else if (chatSeleccionado.id === "dr-martinez") {
                if (subPasoNivel2 === 10) {
                    completarNivelActual("¡Has grabado, enviado y escuchado notas de voz reales y confirmaste tu consulta médica!");
                }
            }
        }
    }
}

/**
 * Envía una foto simulada
 */
function enviarFotoSimulada(photoName, emoji) {
    if (!chatSeleccionado) return;

    const hora = obtenerHoraActual();
    const nuevoMensaje = {
        sender: "enviada",
        type: "photo",
        text: photoName,
        photoEmoji: emoji,
        time: hora
    };

    chatSeleccionado.mensajes.push(nuevoMensaje);
    chatSeleccionado.preview = `📷 ${photoName}`;
    chatSeleccionado.hora = hora;

    moverChatAlTop(chatSeleccionado.id);
    guardar(`gz_whatsapp_chats_${nivelActual}`, listaChatsData);
    renderizarMensajes();

    if (nivelActual === "enviar-foto" && chatSeleccionado.id === "juan-nieto") {
        completarNivelActual("¡Has compartido una fotografía correctamente!");
    }
}

/**
 * Inicia una pantalla de llamada simulada
 */
function iniciarLlamadaSimulada(esVideo) {
    if (!chatSeleccionado) return;

    const modal = $("#wsModalLlamada");
    const avatar = $("#wsCallAvatar");
    const name = $("#wsCallName");
    const status = $("#wsCallStatus");

    avatar.textContent = chatSeleccionado.iniciales;
    avatar.className = `ws-avatar ws-call-avatar ${chatSeleccionado.avatarClass}`;
    name.textContent = chatSeleccionado.nombre;
    status.textContent = "Llamando...";

    modal.classList.add("activa");

    let textoVoz = "";
    let textoBarra = "";
    if (nivelActual === "hacer-llamada") {
        textoBarra = "Presiona el botón rojo para colgar y finalizar la llamada.";
        textoVoz = `Llamando a ${chatSeleccionado.nombre}. Cuando termines de hablar, presiona el botón rojo para colgar y finalizar la llamada.`;
    } else if (nivelActual === "llamada-grupal") {
        textoBarra = "Presiona el botón rojo para colgar y finalizar la llamada grupal.";
        textoVoz = `Iniciando llamada grupal con la ${chatSeleccionado.nombre}. Cuando termines de hablar, presiona el botón rojo para colgar.`;
    } else {
        textoBarra = "Presiona el botón rojo para colgar.";
        textoVoz = `Llamando a ${chatSeleccionado.nombre}. Presiona el botón rojo para colgar.`;
    }

    const textEl = $("#wsInstructionsText");
    if (textEl) {
        textEl.textContent = textoBarra;
        ultimaInstruccionHablada = textoBarra;
    }

    speak(textoVoz);

    let segundos = 0;
    setTimeout(() => {
        status.textContent = "Conectando...";
        setTimeout(() => {
            callTimerInterval = setInterval(() => {
                segundos++;
                const mins = Math.floor(segundos / 60).toString().padStart(2, "0");
                const secs = (segundos % 60).toString().padStart(2, "0");
                status.textContent = `${mins}:${secs}`;
            }, 1000);
        }, 1000);
    }, 1500);
}

/**
 * Finaliza la llamada simulada y valida el nivel
 */
function finalizarLlamadaSimulada() {
    if (callTimerInterval) {
        clearInterval(callTimerInterval);
        callTimerInterval = null;
    }

    $("#wsModalLlamada").classList.remove("activa");
    stopSpeech();

    if (nivelActual === "hacer-llamada" && chatSeleccionado.id === "juan-nieto") {
        completarNivelActual("¡Has realizado la llamada a tu nieto correctamente!");
    } else if (nivelActual === "llamada-grupal" && chatSeleccionado.id === "familia-mendoza") {
        completarNivelActual("¡Has realizado una llamada grupal correctamente!");
    }
}

/**
 * Marca el nivel actual como completado en el backend y muestra overlay
 */
function completarNivelActual(mensajeExito) {
    completarNivel("WhatsApp", nivelActual);

    $("#wsSuccessMessage").textContent = mensajeExito;
    $("#wsModalExito").classList.add("activa");

    const mensajeVoz = `¡Excelente trabajo! Nivel completado con éxito. Presiona continuar para regresar a la lista de niveles.`;
    speak(mensajeVoz);
}
