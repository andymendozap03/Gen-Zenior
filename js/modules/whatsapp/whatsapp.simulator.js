import { $ } from "../../utils/dom.js";

let simuladorInicializado = false;
let nivelActual = null;
let moduloOrigen = "WhatsApp";

/**
 * Inicia la interfaz del simulador de WhatsApp
 */
export function iniciarSimulador(idNivel) {
    nivelActual = idNivel;

    // Cambiar a la pantalla del simulador de WhatsApp
    const pantallas = document.querySelectorAll(".pantalla");
    pantallas.forEach(pantalla => pantalla.classList.remove("activa"));

    const simulador = $("#pantallaWhatsappSimulador");
    simulador.classList.add("activa");

    // Asegurar que abrimos en la lista de chats
    $("#wsChatsList").classList.add("activa");
    $("#wsChatConversation").classList.remove("activa");

    // Inicializar listeners si es la primera vez
    if (!simuladorInicializado) {
        inicializarListeners();
        simuladorInicializado = true;
    }

    console.log(`Simulador de WhatsApp iniciado para el nivel: ${idNivel}`);
}

/**
 * Configura los eventos del simulador
 */
function inicializarListeners() {
    // Salir del simulador de WhatsApp volver a Gen-Zénior
    $("#wsSalirSimulador").addEventListener("click", () => {
        const simulador = $("#pantallaWhatsappSimulador");
        simulador.classList.remove("activa");

        // Volver a la pantalla de niveles de Gen-Zénior
        $("#pantallaNiveles").classList.add("activa");
        
        // Disparar Resize para redibujar las líneas de conexión SVG correctamente
        window.dispatchEvent(new Event('resize'));
    });

    // Volver de la conversación a la lista de chats
    $("#wsVolverChats").addEventListener("click", () => {
        $("#wsChatConversation").classList.remove("activa");
        $("#wsChatsList").classList.add("activa");
    });

    // Entrar a una conversación desde la lista de chats
    const listaChats = $("#wsListaChats");
    listaChats.addEventListener("click", (evento) => {
        const itemChat = evento.target.closest(".ws-chat-item");
        if (!itemChat) return;

        const nombre = itemChat.dataset.chatName;
        const avatarClase = itemChat.dataset.chatAvatarClass;
        const iniciales = itemChat.dataset.chatInitials;

        abrirConversacion(nombre, avatarClase, iniciales);
    });

    // Detectar escritura para cambiar icono de Micrófono a Enviar
    const campoTexto = $("#wsInputMensaje");
    campoTexto.addEventListener("input", () => {
        const texto = campoTexto.value.trim();
        const micIcon = $("#wsMicIcon");
        const sendIcon = $("#wsSendIcon");

        if (texto.length > 0) {
            micIcon.style.display = "none";
            sendIcon.style.display = "block";
        } else {
            micIcon.style.display = "block";
            sendIcon.style.display = "none";
        }
    });

    // Enviar mensaje al hacer clic en el botón circular
    $("#wsEnviarMensajeBtn").addEventListener("click", () => {
        enviarMensaje();
    });

    // Enviar mensaje al presionar Enter
    campoTexto.addEventListener("keypress", (evento) => {
        if (evento.key === "Enter") {
            enviarMensaje();
        }
    });
}

/**
 * Abre la pantalla de conversación individual cargando los datos del contacto
 */
function abrirConversacion(nombre, avatarClase, iniciales) {
    $("#wsContactName").textContent = nombre;

    const contactAvatar = $("#wsContactAvatar");
    contactAvatar.textContent = iniciales;
    contactAvatar.className = `ws-avatar ws-chat-contact-avatar ${avatarClase}`;

    // Cambiar vistas
    $("#wsChatsList").classList.remove("activa");
    const conversacion = $("#wsChatConversation");
    conversacion.classList.add("activa");

    // Scroll al final del chat para ver los últimos mensajes
    const chatBody = $("#wsChatBody");
    setTimeout(() => {
        chatBody.scrollTop = chatBody.scrollHeight;
    }, 50);
}

/**
 * Agrega un mensaje enviado por el usuario a la conversación
 */
function enviarMensaje() {
    const input = $("#wsInputMensaje");
    const texto = input.value.trim();
    if (texto === "") return; // No enviar mensajes vacíos

    const ahora = new Date();
    const hora = ahora.getHours().toString().padStart(2, "0");
    const minutos = ahora.getMinutes().toString().padStart(2, "0");
    const horaFormateada = `${hora}:${minutos}`;

    // Crear burbuja de mensaje enviado
    const burbuja = document.createElement("div");
    burbuja.className = "ws-msg-bubble enviada";
    burbuja.innerHTML = `
        <span>${texto}</span>
        <div class="ws-msg-meta">
            <span>${horaFormateada}</span>
            <svg class="ws-msg-checkmark" viewBox="0 0 24 24"><path d="M0.293,12.293L1.707,10.88L6,15.17L18.293,2.88L19.707,4.293L6,18L0.293,12.293Z"/></svg>
        </div>
    `;

    const chatBody = $("#wsChatBody");
    chatBody.appendChild(burbuja);

    // Limpiar input y restaurar icono
    input.value = "";
    $("#wsMicIcon").style.display = "block";
    $("#wsSendIcon").style.display = "none";

    // Auto-scroll hacia abajo
    chatBody.scrollTop = chatBody.scrollHeight;

    console.log(`Mensaje enviado en el simulador: "${texto}"`);
}
