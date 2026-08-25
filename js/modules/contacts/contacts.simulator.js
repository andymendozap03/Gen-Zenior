import { $ } from "../../utils/dom.js";
import { speak, stopSpeech } from "../../services/speech.service.js";
import { resaltarElemento, limpiarResaltados } from "../../services/guide-highlight.service.js";
import { completarNivel } from "../../services/progress.service.js";

let simuladorInicializado = false;
let nivelActual = null;

// Fase actual: "practica", "repaso" o "reto-final"
let faseNivel = "practica";
let modoSinAyuda = false; // Modo experto sin resaltados
let rondaActualNivel = 1;
const TOTAL_RONDAS = 3;

// Sub-pasos internos por nivel
let subPaso = 1;

let dialPadNumber = "";
let llamadaContacto = null;
let llamadaTimer = null;
let llamadaSegundosInterval = null;
let llamadaSegundos = 0;
let toastTimer = null;
let toastBlockedTimer = null;

let isSpeakerOn = false;
let isMicMuted = false;

let contactoEnDetalle = null;
let modoEdicion = false;
let contactoEditandoOriginal = null;

// Callbacks para los botones del modal
let modalAccionPrincipal = null;
let modalAccionSecundaria = null;
let modalAccionTerciaria = null;

// ---- HELPER PARA FORMATEAR TELÉFONOS EN FORMATO ECUADOR (+593 XX XXX XXXX) ----
export function formatearTelefonoEcuador(num) {
    if (!num) return "+593 99 123 4567";
    let limpio = String(num).replace(/\D/g, "");
    if (limpio.startsWith("593")) limpio = limpio.slice(3);
    if (limpio.startsWith("0")) limpio = limpio.slice(1);
    if (limpio.length >= 9) {
        return `+593 ${limpio.slice(0, 2)} ${limpio.slice(2, 5)} ${limpio.slice(5, 9)}`;
    } else if (limpio.length > 0) {
        return `+593 ${limpio}`;
    }
    return "+593 99 123 4567";
}

// ---- DATOS MAESTROS INICIALES ----
const FAVORITOS_DEFECTO = [
    { nombre: "Valentina Vera", iniciales: "V", color: "#e91e63", telefono: "+593 99 390 7785" },
    { nombre: "Pedro Pérez", iniciales: "P", color: "#f4511e", telefono: "+593 98 257 8390" },
];

const LLAMADAS_RECIENTES_DEFECTO = [
    { id: 1, nombre: "Erick Delgado", iniciales: "E", color: "#f97800", tipo: "perdida", metaTexto: "Celular · Lun 18:07", carrier: "Claro", grupo: "Ayer", telefono: "+593 99 345 6780" },
    { id: 2, nombre: "Valentina Vera", iniciales: "V", color: "#e91e63", tipo: "saliente", metaTexto: "Celular · Sáb 18:24", carrier: "Tuenti", grupo: "Anterior", telefono: "+593 99 390 7785" },
    { id: 3, nombre: "Samuel Medina", iniciales: "S", color: "#1a73e8", tipo: "saliente", metaTexto: "Celular · Sáb 17:12", carrier: "Tuenti", grupo: "Anterior", telefono: "+593 99 901 2346" },
    { id: 4, nombre: "0994107983", iniciales: "?", color: "#9e9e9e", tipo: "bloqueada", metaTexto: "Ecuador · Sáb 09:22", carrier: "Claro", grupo: "Anterior", sinFoto: true, telefono: "+593 99 410 7983" },
    { id: 5, nombre: "Rosa Espinoza", iniciales: "R", color: "#e91e63", tipo: "entrante", metaTexto: "Celular · Vie 14:35", carrier: "Movistar", grupo: "Anterior", telefono: "+593 98 890 1235" },
    { id: 6, nombre: "Pedro Pérez", iniciales: "P", color: "#f4511e", tipo: "saliente", metaTexto: "Celular · Vie 11:02", carrier: "Claro", grupo: "Anterior", telefono: "+593 98 257 8390" },
];

const CONTACTOS_LISTA_BASE = [
    { nombre: "Valentina Vera", iniciales: "V", color: "#e91e63", telefono: "+593 99 390 7785", fav: true },
    { nombre: "Pedro Pérez", iniciales: "P", color: "#f4511e", telefono: "+593 98 257 8390", fav: true },
    { nombre: "Abigail López", iniciales: "A", color: "#1e88e5", telefono: "+593 97 904 6870" },
    { nombre: "Alberto Valenzuela", iniciales: "A", color: "#43a047", telefono: "+593 98 090 9090" },
    { nombre: "Adrián Aguilar", iniciales: "A", color: "#00897b", telefono: "+593 99 123 4567" },
    { nombre: "Adrián Cordero", iniciales: "A", color: "#e57373", telefono: "+593 98 765 4321" },
    { nombre: "Adriana Alarcón", iniciales: "A", color: "#f48fb1", telefono: "+593 99 876 5432" },
    { nombre: "Alonso Álvarez", iniciales: "A", color: "#ce93d8", telefono: "+593 98 234 5678" },
    { nombre: "Alejandro Cárdenas", iniciales: "A", color: "#80cbc4", telefono: "+593 99 345 6789" },
    { nombre: "Carmen Rojas", iniciales: "C", color: "#ff7043", telefono: "+593 98 456 7890" },
    { nombre: "Carlos Miranda", iniciales: "C", color: "#5c6bc0", telefono: "+593 99 567 8901" },
    { nombre: "Dolores Palacios", iniciales: "D", color: "#8bc34a", telefono: "+593 98 678 9012" },
    { nombre: "Elena Vallejo", iniciales: "E", color: "#7e57c2", telefono: "+593 99 789 0123" },
    { nombre: "Erick Delgado", iniciales: "E", color: "#f9ab00", telefono: "+593 99 345 6780" },
    { nombre: "Ernesto Cabrera", iniciales: "E", color: "#26a69a", telefono: "+593 98 890 1234" },
    { nombre: "Gloria Calderón", iniciales: "G", color: "#ab47bc", telefono: "+593 99 901 2345" },
    { nombre: "José Maldonado", iniciales: "J", color: "#2196f3", telefono: "+593 98 012 3456" },
    { nombre: "Luis Guzmán", iniciales: "L", color: "#ff9800", telefono: "+593 99 123 4560" },
    { nombre: "Maholy Herrera", iniciales: "M", color: "#ab47bc", telefono: "+593 98 765 4321" },
    { nombre: "Miguel Toledo", iniciales: "M", color: "#f44336", telefono: "+593 98 234 5670" },
    { nombre: "Patricia Muñoz", iniciales: "P", color: "#ff9800", telefono: "+593 98 456 7891" },
    { nombre: "Pedro Segura", iniciales: "P", color: "#4caf50", telefono: "+593 99 567 8902" },
    { nombre: "Ramón Fuentes", iniciales: "R", color: "#00bcd4", telefono: "+593 98 678 9013" },
    { nombre: "Roberto Suárez", iniciales: "R", color: "#607d8b", telefono: "+593 99 789 0124" },
    { nombre: "Rosa Espinoza", iniciales: "R", color: "#e91e63", telefono: "+593 98 890 1235" },
    { nombre: "Samuel Medina", iniciales: "S", color: "#1a73e8", telefono: "+593 99 901 2346" },
    { nombre: "Sandra Luna", iniciales: "S", color: "#ff5722", telefono: "+593 98 012 3467" },
    { nombre: "Tomás Hidalgo", iniciales: "T", color: "#795548", telefono: "+593 99 123 4568" },
];

let CONTACTOS = JSON.parse(JSON.stringify(CONTACTOS_LISTA_BASE));

function reiniciarContactos() {
    CONTACTOS = JSON.parse(JSON.stringify(CONTACTOS_LISTA_BASE));
}

// ---- DATOS DE PRÁCTICAS ----
const PRACTICAS_GUARDAR = [
    { nombre: "Dra. Carmen Gómez", telefono: "099 876 5432" },
    { nombre: "Maholy Herrera", telefono: "098 765 4321" },
    { nombre: "Farmacia San José", telefono: "097 123 9876" },
];
const PRACTICAS_BUSCAR = [
    { termino: "Pedro", nombreCompleto: "Pedro Pérez" },
    { termino: "Rosa", nombreCompleto: "Rosa Espinoza" },
    { termino: "Alberto", nombreCompleto: "Alberto Valenzuela" },
];
const PRACTICAS_LLAMAR = [
    { nombre: "Valentina Vera", tipo: "favorito", saludo: "¡Hola! Qué gusto saludarte." },
    { nombre: "Erick Delgado", tipo: "reciente", saludo: "¡Hola! Gracias por llamar, todo bien por acá." },
    { nombre: "Pedro Pérez", tipo: "contacto", saludo: "¡Hola! Qué bueno escucharte." },
];
const PRACTICAS_EDITAR = [
    { nombre: "Rosa Espinoza", nuevoTel: "098 111 2233" },
    { nombre: "Carlos Miranda", nuevoTel: "099 555 4433" },
    { nombre: "Abigail López", nuevoTel: "097 999 8877" },
];
const PRACTICAS_ELIMINAR = [
    { nombre: "Tomás Hidalgo" },
    { nombre: "Sandra Luna" },
    { nombre: "Roberto Suárez" },
];

// Datos de repasos interactivos
const REPASO_NIVEL_3 = [
    { paso: "guardar", nombre: "Tía Mariana", telefono: "099 123 4567" },
    { paso: "buscar", termino: "Valentina", nombreCompleto: "Valentina Vera" },
    { paso: "llamar", nombre: "Valentina Vera", saludo: "¡Hola! Muy bien hecho, ya sabes cómo llamarme." }
];

const REPASO_NIVEL_5 = [
    { paso: "editar", nombre: "Patricia Muñoz", nuevoTel: "098 777 6655" },
    { paso: "eliminar", nombre: "Ernesto Cabrera" }
];

// Datos del Reto Final (Examen Práctico Integral)
const RETO_FINAL_DATA = [
    { tipo: "guardar", nombre: "Hermano Fernando", telefono: "099 444 3322" },
    { tipo: "buscar", termino: "Carlos", nombreCompleto: "Carlos Miranda" },
    { tipo: "llamar", nombre: "Carlos Miranda", saludo: "¡Hola! Qué gusto que me llames." },
    { tipo: "editar", nombre: "Elena Vallejo", nuevoTel: "099 777 8899" },
    { tipo: "eliminar", nombre: "Ramón Fuentes" } // Ramón Fuentes garantizado en la agenda
];

// ---- ICONOS SVG ----
const SVG_PHONE = `<svg viewBox="0 0 24 24"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>`;
const SVG_ARROW_OUT = `<svg viewBox="0 0 24 24"><path d="M7 7h8.59L5 17.59 6.41 19 17 8.41V17h2V5H7v2z"/></svg>`;
const SVG_ARROW_IN = `<svg viewBox="0 0 24 24"><path d="M19 7h-8.59L21 17.59 19.59 19 9 8.41V17H7V5h12v2z"/></svg>`;
const SVG_MISSED = `<svg viewBox="0 0 24 24"><path d="M7 7h8.59L5 17.59 6.41 19 17 8.41V17h2V5H7v2z"/></svg>`;
const SVG_BLOCKED = `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>`;

function iconoLlamada(tipo) {
    if (tipo === "perdida") return `<span style="color:#d93025">${SVG_MISSED}</span>`;
    if (tipo === "bloqueada") return `<span style="color:#5f6368">${SVG_BLOCKED}</span>`;
    if (tipo === "entrante") return `<span style="color:#5f6368">${SVG_ARROW_IN}</span>`;
    return `<span style="color:#5f6368">${SVG_ARROW_OUT}</span>`;
}

// ---- HELPER PARA RESALTAR CON CONTROL DE MODO SIN AYUDA ----
function aplicarResaltado(selector) {
    if (modoSinAyuda) {
        limpiarResaltados();
        return;
    }
    resaltarElemento(selector);
}

// ---- FUNCIÓN CENTRAL: REPETIR GUÍA ACTUAL CON VOZ Y RESALTADO ----
function repetirGuiaActual() {
    stopSpeech();
    limpiarResaltados();
    if (faseNivel === "reto-final") {
        actualizarGuiaRetoFinal(true);
    } else if (nivelActual === "guardar-contacto") {
        actualizarGuiaNivel1(true);
    } else if (nivelActual === "buscar-contacto") {
        actualizarGuiaNivel2(true);
    } else if (nivelActual === "llamar-contacto") {
        actualizarGuiaNivel3(true);
    } else if (nivelActual === "editar-contacto") {
        actualizarGuiaNivel4(true);
    } else if (nivelActual === "eliminar-contacto") {
        actualizarGuiaNivel5(true);
    }
}

// ---- PLANTILLA HTML ----
function asegurarTemplateHTML() {
    const contenedor = $("#pantallaContactosSimulador");
    if (!contenedor || contenedor.children.length > 0) return;

    contenedor.innerHTML = `
        <div id="ctInstructionsBar" class="ws-instructions-bar">
            <div class="ws-instructions-nico" id="ctNicoBtn" style="cursor:pointer;" aria-label="Escuchar instrucción de Nico">
                <img src="./assets/img/icons/voz.svg" alt="Nico" class="ws-instructions-icono-nico">
                <small>NICO</small>
            </div>
            <div id="ctInstructionsText" class="ws-instructions-text">Cargando objetivo...</div>
        </div>

        <!-- VISTA RECIENTES -->
        <div id="ctViewRecientes" class="ct-view activa">
            <div class="ct-recent-header">
                <div class="ct-search-bar" id="ctSearchBarRecientes">
                    <button id="ctSalirBtn" class="ct-salir-btn" aria-label="Salir">
                        <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                    </button>
                    <input type="text" class="ct-recientes-search-input" id="ctRecientesSearchInput" placeholder="Buscar contactos" autocomplete="off">
                    <svg class="ct-search-mic" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/></svg>
                </div>
                <div class="ct-filter-tabs">
                    <button class="ct-filter-tab activa" id="ctFilterTodas">Todas</button>
                    <button class="ct-filter-tab" id="ctFilterPerdidas">Perdidas</button>
                    <button class="ct-filter-tab" id="ctFilterContactos">Contactos</button>
                    <button class="ct-filter-tab" id="ctFilterNoSpam">No es spam</button>
                </div>
            </div>
            <div id="ctCallsList" class="ct-calls-list">
                <div class="ct-section-label">
                    <span>Favoritos <span id="ctFavToggle">∧</span></span>
                    <button class="ct-ver-contactos-btn" id="ctVerContactosBtn">Ver contactos</button>
                </div>
                <div class="ct-favorites-row" id="ctFavoritesRow"></div>
                <div id="ctCallsContent"></div>
            </div>
        </div>

        <!-- VISTA CONTACTOS -->
        <div id="ctViewContactos" class="ct-view">
            <div class="ct-contacts-header">
                <div class="ct-contacts-header-row">
                    <button class="ct-back-btn" id="ctContactosBack" aria-label="Volver">
                        <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                    </button>
                    <input type="text" class="ct-contacts-search" placeholder="Buscar contactos" id="ctContactosSearch">
                    <button class="ct-profile-icon-btn" aria-label="Mi perfil">
                        <svg viewBox="0 0 24 24"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
                    </button>
                </div>
                <!-- Sugerencia rápida de búsqueda -->
                <div id="ctSearchSuggestContainer" style="display:none; margin-bottom:8px;">
                    <button type="button" class="ct-quick-suggest-btn" id="ctSugerirBusqueda">
                        💡 Toca para buscar "Pedro"
                    </button>
                </div>
                <button class="ct-create-btn" id="ctCreateBtn">
                    <svg viewBox="0 0 24 24"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                    Crear contacto
                </button>
            </div>
            <div id="ctContactsList" class="ct-contacts-list"></div>
        </div>

        <!-- VISTA DETALLE CONTACTO -->
        <div id="ctViewDetalleContacto" class="ct-view">
            <header class="ct-detalle-header">
                <button class="ct-back-btn" id="ctBtnVolverDetalle" aria-label="Volver">
                    <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                </button>
                <button class="ct-btn-editar-header" id="ctBtnEditarDetalle">
                    <svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                    Editar
                </button>
            </header>
            <div class="ct-detalle-body">
                <div class="ct-detalle-avatar-large" id="ctDetalleAvatarLarge" style="background:#7b4b24;">P</div>
                <h2 class="ct-detalle-nombre" id="ctDetalleNombre">Pedro Pérez</h2>
                <div class="ct-detalle-quick-actions">
                    <button class="ct-quick-action-btn" id="ctDetalleBtnLlamar">
                        <div class="ct-quick-action-icon">${SVG_PHONE}</div>
                        <span class="ct-quick-action-label">Llamar</span>
                    </button>
                    <button class="ct-quick-action-btn" id="ctDetalleBtnMensaje">
                        <div class="ct-quick-action-icon">
                            <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                        </div>
                        <span class="ct-quick-action-label">Mensaje</span>
                    </button>
                </div>
                <div class="ct-detalle-card">
                    <div class="ct-detalle-info-row">
                        <div class="ct-detalle-info-left">
                            <svg viewBox="0 0 24 24"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>
                            <div class="ct-detalle-info-text">
                                <span class="ct-detalle-info-val" id="ctDetalleTelefono">+593 98 257 8390</span>
                                <span class="ct-detalle-info-sub">Celular</span>
                            </div>
                        </div>
                    </div>
                </div>
                <button class="ct-btn-eliminar-contacto" id="ctBtnEliminarDetalle">
                    <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                    Eliminar contacto
                </button>
            </div>
        </div>

        <!-- VISTA FORMULARIO CREAR / EDITAR -->
        <div id="ctViewCrearContacto" class="ct-view">
            <header class="ct-form-header">
                <div class="ct-form-header-left">
                    <button class="ct-back-btn" id="ctBtnCancelarCrear" aria-label="Cancelar">
                        <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                    </button>
                    <h2 class="ct-form-title" id="ctFormularioTitulo">Crear contacto</h2>
                </div>
                <button class="ct-btn-guardar" id="ctBtnGuardarContacto">Guardar</button>
            </header>
            <div class="ct-form-body">
                <div class="ct-form-avatar-section">
                    <div class="ct-form-avatar-circle" id="ctAvatarCircle">
                        <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                    </div>
                    <span class="ct-form-avatar-label">Agregar foto (opcional)</span>
                </div>
                <div class="ct-form-card">
                    <div class="ct-form-field">
                        <label class="ct-field-label" for="ctInputNombre">
                            <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                            Nombre
                        </label>
                        <input type="text" id="ctInputNombre" class="ct-field-input" placeholder="Escribe el nombre del contacto" autocomplete="off">
                        <button type="button" class="ct-quick-suggest-btn" id="ctSugerirNombre">💡 Toca para escribir</button>
                    </div>
                    <div class="ct-form-field">
                        <label class="ct-field-label" for="ctInputTelefono">
                            <svg viewBox="0 0 24 24"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>
                            Teléfono
                        </label>
                        <input type="tel" id="ctInputTelefono" class="ct-field-input" placeholder="Ej: 099 876 5432" autocomplete="off">
                        <button type="button" class="ct-quick-suggest-btn" id="ctSugerirTelefono">💡 Toca para escribir</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- VISTA TECLADO -->
        <div id="ctViewTeclado" class="ct-view">
            <div class="ct-dialpad-contacts-preview" id="ctDialpadPreview"></div>
            <div class="ct-dialpad-number-display">
                <button class="ct-dialpad-options-btn">⋮</button>
                <div class="ct-dialpad-number" id="ctDialpadNumber">&#8203;</div>
                <button class="ct-dialpad-del-btn hidden" id="ctDialpadDel">
                    <svg viewBox="0 0 24 24"><path d="M22 3H7c-.69 0-1.23.35-1.59.88L0 12l5.41 8.11c.36.53.9.89 1.59.89h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-3 12.59L17.59 17 14 13.41 10.41 17 9 15.59 12.59 12 9 8.41 10.41 7 14 10.59 17.59 7 19 8.41 15.41 12 19 15.59z"/></svg>
                </button>
            </div>
            <div class="ct-dialpad-grid">
                ${[["1", "∞"], ["2", "ABC"], ["3", "DEF"], ["4", "GHI"], ["5", "JKL"], ["6", "MNO"], ["7", "PQRS"], ["8", "TUV"], ["9", "WXYZ"], ["*", ""], ["0", "+"], ["#", ""]].map(([d, l]) => `
                <button class="ct-dialpad-key" data-digit="${d}"><span class="ct-dialpad-digit">${d}</span><span class="ct-dialpad-letters">${l}</span></button>`).join("")}
            </div>
            <div class="ct-dialpad-actions">
                <div class="ct-dialpad-placeholder"></div>
                <button class="ct-dialpad-call-btn" id="ctDialpadCallBtn">${SVG_PHONE}</button>
                <div class="ct-dialpad-placeholder"></div>
            </div>
        </div>

        <!-- NAV INFERIOR -->
        <nav class="ct-bottom-nav">
            <button class="ct-nav-tab activa" id="ctNavRecientes" data-view="ctViewRecientes">
                <div class="ct-nav-indicator"></div>
                <svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>
                <span>Recientes</span>
            </button>
            <button class="ct-nav-tab" id="ctNavContactos" data-view="ctViewContactos">
                <div class="ct-nav-indicator"></div>
                <svg viewBox="0 0 24 24"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
                <span>Contactos</span>
            </button>
            <button class="ct-nav-tab" id="ctNavTeclado" data-view="ctViewTeclado">
                <div class="ct-nav-indicator"></div>
                <svg viewBox="0 0 24 24"><path d="M12 19c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-9c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm4 5c0 1.1.9 2 2 2s2-.9 2-2-.9-2-2-2-2 .9-2 2zm0-9c0 1.1.9 2 2 2s2-.9 2-2-.9-2-2-2-2 .9-2 2zm0 4c0 1.1.9 2 2 2s2-.9 2-2-.9-2-2-2-2 .9-2 2zm-8 1c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2 2-.9 2-2zm0-4c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2 2-.9 2-2zm0 8c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2 2-.9 2-2z"/></svg>
                <span>Teclado</span>
            </button>
        </nav>

        <!-- TOAST FLOTANTE -->
        <div id="ctToast" class="ct-toast">
            <svg class="ct-toast-icon" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            <span id="ctToastText">Contacto guardado</span>
        </div>

        <!-- TOAST BLOQUEADO -->
        <div id="ctToastBlocked" class="ct-toast-blocked"></div>

        <!-- MODAL CONFIRMAR ELIMINAR -->
        <div id="ctModalConfirmarEliminar" class="ct-modal-confirmar">
            <div class="ct-confirmar-card">
                <h3 id="ctConfirmarTitulo">¿Eliminar contacto?</h3>
                <p id="ctConfirmarMensaje">Este contacto se borrará permanentemente.</p>
                <div class="ct-confirmar-actions">
                    <button class="ct-btn-cancelar-modal" id="ctBtnCancelarEliminar">Cancelar</button>
                    <button class="ct-btn-confirmar-eliminar" id="ctBtnConfirmarEliminar">Eliminar</button>
                </div>
            </div>
        </div>

        <!-- MODAL LLAMADA ACTIVA -->
        <div id="ctCallModal" class="ct-call-modal">
            <!-- Mensaje de instrucción de Nico visible dentro de la llamada -->
            <div class="ct-call-instructions-box" id="ctCallInstructionsBox">
                <img src="./assets/img/icons/voz.svg" alt="Nico" class="ct-call-nico-icon">
                <div class="ct-call-instructions-text" id="ctCallInstructionsText">Llamando...</div>
            </div>

            <div>
                <div class="ct-call-avatar-large" id="ctCallAvatarLarge" style="background:#1a73e8;">?</div>
                <div class="ct-call-name-label" id="ctCallNameLabel">—</div>
                <div class="ct-call-status-label" id="ctCallStatusLabel">Llamando...</div>
            </div>

            <div style="width:100%;">
                <div class="ct-call-btn-row" style="margin-bottom:24px;">
                    <button class="ct-call-ctrl-btn" id="ctCallBtnSilenciar" aria-label="Silenciar">
                        <svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
                        <span style="font-size:11px; margin-top:2px;">Silenciar</span>
                    </button>
                    <button class="ct-call-ctrl-btn" id="ctCallBtnAltavoz" aria-label="Altavoz">
                        <svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
                        <span style="font-size:11px; margin-top:2px;">Altavoz</span>
                    </button>
                    <button class="ct-call-ctrl-btn" id="ctCallBtnVideo" aria-label="Video">
                        <svg viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
                        <span style="font-size:11px; margin-top:2px;">Video</span>
                    </button>
                </div>
                <button class="ct-call-end-btn" id="ctCallEndBtn" aria-label="Colgar">${SVG_PHONE}</button>
            </div>
        </div>

        <!-- MODAL ÉXITO / OPCIONES DEL RETO FINAL -->
        <div id="ctModalExito" class="ct-modal-exito">
            <div class="ct-success-container">
                <img src="./assets/img/icons/trofeo.svg" alt="Trofeo" class="ct-success-trophy">
                <h2 id="ctSuccessTitle">¡Nivel completado!</h2>
                <p id="ctSuccessMessage">¡Has realizado la acción con éxito!</p>
                <div id="ctSuccessButtonsContainer" style="display:flex; flex-direction:column; gap:10px; width:100%; margin-top:10px;">
                    <button id="ctSuccessBtnContinuar" class="ct-success-btn-continuar">Continuar</button>
                    <button id="ctSuccessBtnSecundario" class="ct-success-btn-secundario" style="display:none;"></button>
                    <button id="ctSuccessBtnTerciario" class="ct-success-btn-terciario" style="display:none;"></button>
                </div>
            </div>
        </div>

        <!-- MODAL DE CONFIRMACIÓN AL SALIR DEL NIVEL -->
        <div id="ctModalConfirmarSalida" class="modal-confirmar-reinicio">
            <div class="modal-confirmar-card">
                <img src="./assets/img/icons/advertencia.svg" alt="" style="width: 48px; height: 48px; margin-bottom: 8px;">
                <h2>¿Seguro que quieres salir?</h2>
                <p>Si sales ahora, perderás el progreso de este nivel y tendrás que empezar de nuevo.</p>
                <div class="modal-confirmar-acciones">
                    <button id="ctBtnCancelarSalida" class="btn-modal-cancelar">Cancelar</button>
                    <button id="ctBtnConfirmarSalida" class="btn-modal-peligro">Sí, salir</button>
                </div>
            </div>
        </div>
    `;
}

// ---- AVISO DE ACCIÓN BLOQUEADA ----
function mostrarAvisoBloqueado(msg = "Sigue la indicación de Nico.") {
    const toast = $("#ctToastBlocked");
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("mostrar");
    if (toastBlockedTimer) clearTimeout(toastBlockedTimer);
    toastBlockedTimer = setTimeout(() => toast.classList.remove("mostrar"), 2800);
}

// ---- RENDERIZADO DE VISTAS ----
function renderizarLlamadas(filtro = "") {
    const row = $("#ctFavoritesRow");
    if (row) {
        const favsFiltrados = FAVORITOS_DEFECTO.filter(f => f.nombre.toLowerCase().includes(filtro.toLowerCase()));
        row.innerHTML = favsFiltrados.map(f => `
            <div class="ct-fav-item" data-fav-nombre="${f.nombre}">
                <div class="ct-fav-avatar" style="background:${f.color};">${f.iniciales}</div>
                <span class="ct-fav-name">${f.nombre}</span>
            </div>
        `).join("") + `
            <div class="ct-fav-item" id="ctFavAgregar">
                <div class="ct-fav-add">
                    <svg viewBox="0 0 24 24"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                </div>
                <span class="ct-fav-name">Agregar</span>
            </div>
        `;
    }

    const content = $("#ctCallsContent");
    if (!content) return;
    let html = "";
    let grupoActual = null;
    const llamadasFiltradas = LLAMADAS_RECIENTES_DEFECTO.filter(c =>
        c.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
        (c.telefono && c.telefono.includes(filtro))
    );

    if (llamadasFiltradas.length === 0) {
        content.innerHTML = `<div style="text-align:center; padding:24px; color:#5f6368; font-size:14px;">No se encontraron llamadas recientes</div>`;
        return;
    }

    llamadasFiltradas.forEach(c => {
        if (c.grupo !== grupoActual) {
            grupoActual = c.grupo;
            html += `<div class="ct-date-label">${c.grupo}</div>`;
        }
        const avatarInner = c.sinFoto
            ? `<svg viewBox="0 0 24 24" style="width:26px;height:26px;fill:#fff;"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>`
            : c.iniciales;
        html += `
            <div class="ct-call-item" data-llamada-id="${c.id}" data-nombre="${c.nombre}">
                <div class="ct-call-avatar" style="background:${c.color};">${avatarInner}</div>
                <div class="ct-call-info">
                    <div class="ct-call-name">${c.nombre}</div>
                    <div class="ct-call-meta ${c.tipo === 'perdida' ? 'perdida' : ''}">${iconoLlamada(c.tipo)}<span>${c.metaTexto}</span></div>
                    <div class="ct-call-carrier">${c.carrier}</div>
                </div>
                <button class="ct-call-phone-btn" data-nombre="${c.nombre}" data-color="${c.color}" data-iniciales="${c.sinFoto ? '?' : c.iniciales}" aria-label="Llamar a ${c.nombre}">${SVG_PHONE}</button>
            </div>
        `;
    });
    content.innerHTML = html;
}

function renderizarContactos(filtro = "", nuevoNombreDestacado = null) {
    const lista = $("#ctContactsList");
    if (!lista) return;
    const cf = CONTACTOS.filter(c =>
        c.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
        (c.telefono && c.telefono.includes(filtro))
    );
    let html = `
        <div class="ct-my-info-item">
            <div class="ct-my-info-avatar">A</div>
            <div class="ct-my-info-text">
                <div class="ct-my-info-label">Tu información</div>
                <div class="ct-my-info-name">USUARIO GEN-ZÉNIOR</div>
            </div>
            <button class="ct-share-btn" aria-label="Compartir">
                <svg viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92z"/></svg>
            </button>
        </div>
    `;
    const favs = cf.filter(c => c.fav);
    if (favs.length > 0) {
        html += `<div class="ct-fav-star-label"><svg viewBox="0 0 24 24"><path d="M11.99 2l-9 4v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V6l-9-4z"/></svg> Favoritos</div>`;
        favs.forEach((c, i) => { html += contactoHTML(c, i === 0, i === favs.length - 1, favs.length === 1, nuevoNombreDestacado === c.nombre); });
    }
    const noFavs = cf.filter(c => !c.fav);
    const grupos = {};
    noFavs.forEach(c => { const l = c.nombre[0].toUpperCase(); if (!grupos[l]) grupos[l] = []; grupos[l].push(c); });
    Object.keys(grupos).sort().forEach(letra => {
        html += `<div class="ct-alpha-label">${letra}</div>`;
        grupos[letra].forEach((c, i) => { html += contactoHTML(c, i === 0, i === grupos[letra].length - 1, grupos[letra].length === 1, nuevoNombreDestacado === c.nombre); });
    });
    lista.innerHTML = html;
}

function contactoHTML(c, isFirst, isLast, isSolo, esNuevo = false) {
    const telFormateado = formatearTelefonoEcuador(c.telefono);
    return `
        <div class="ct-contact-item" data-nombre="${c.nombre}" data-color="${c.color}" data-iniciales="${c.iniciales}">
            <div class="ct-contact-avatar" style="background:${c.color};">${c.iniciales}</div>
            <div class="ct-contact-info">
                <div class="ct-contact-name">${c.nombre}${esNuevo ? `<span class="ct-nuevo-badge">¡Nuevo!</span>` : ""}</div>
                ${c.telefono ? `<div class="ct-contact-phone">Celular ${telFormateado}</div>` : ""}
            </div>
            <button class="ct-contact-call-btn" data-nombre="${c.nombre}" data-color="${c.color}" data-iniciales="${c.iniciales}" aria-label="Llamar a ${c.nombre}">${SVG_PHONE}</button>
        </div>
    `;
}

// ---- NAVEGACIÓN ENTRE VISTAS ----
function cambiarVista(viewId) {
    document.querySelectorAll("#pantallaContactosSimulador .ct-view").forEach(v => v.classList.remove("activa"));
    document.querySelectorAll("#pantallaContactosSimulador .ct-nav-tab").forEach(t => t.classList.remove("activa"));
    const view = $(`#${viewId}`);
    if (view) view.classList.add("activa");
    const tab = document.querySelector(`[data-view="${viewId}"]`);
    if (tab) tab.classList.add("activa");
}

// ---- ABRIR DETALLE DE CONTACTO ----
function abrirDetalleContacto(nombre) {
    if (faseNivel === "reto-final") {
        if (rondaActualNivel === 2 && nombre !== "Carlos Miranda") {
            mostrarAvisoBloqueado(`Debes seleccionar a "Carlos Miranda".`); return;
        } else if (rondaActualNivel === 4 && nombre !== "Elena Vallejo") {
            mostrarAvisoBloqueado(`Debes seleccionar a "Elena Vallejo".`); return;
        } else if (rondaActualNivel === 5 && nombre !== "Ramón Fuentes") {
            mostrarAvisoBloqueado(`Debes seleccionar a "Ramón Fuentes".`); return;
        }
    } else if (nivelActual === "editar-contacto") {
        const meta = PRACTICAS_EDITAR[rondaActualNivel - 1];
        if (meta && nombre !== meta.nombre) { mostrarAvisoBloqueado(`Debes seleccionar a "${meta.nombre}".`); return; }
    } else if (nivelActual === "eliminar-contacto") {
        if (faseNivel === "practica") {
            const meta = PRACTICAS_ELIMINAR[rondaActualNivel - 1];
            if (meta && nombre !== meta.nombre) { mostrarAvisoBloqueado(`Debes seleccionar a "${meta.nombre}".`); return; }
        } else {
            const meta = REPASO_NIVEL_5[rondaActualNivel - 1];
            if (meta && nombre !== meta.nombre) { mostrarAvisoBloqueado(`Debes seleccionar a "${meta.nombre}".`); return; }
        }
    } else if (nivelActual === "buscar-contacto" && subPaso === 3) {
        const meta = PRACTICAS_BUSCAR[rondaActualNivel - 1];
        if (meta && nombre !== meta.nombreCompleto) { mostrarAvisoBloqueado(`Debes tocar a "${meta.nombreCompleto}".`); return; }
    } else if (nivelActual === "llamar-contacto" && faseNivel === "repaso" && rondaActualNivel === 2) {
        if (nombre !== "Valentina Vera") { mostrarAvisoBloqueado(`Debes tocar a "Valentina Vera".`); return; }
    }

    const contacto = CONTACTOS.find(c => c.nombre === nombre);
    if (!contacto) return;
    contactoEnDetalle = contacto;
    cambiarVista("ctViewDetalleContacto");

    const avatarEl = $("#ctDetalleAvatarLarge");
    const nombreEl = $("#ctDetalleNombre");
    const telEl = $("#ctDetalleTelefono");
    if (avatarEl) { avatarEl.style.background = contacto.color; avatarEl.textContent = contacto.iniciales; }
    if (nombreEl) nombreEl.textContent = contacto.nombre;
    if (telEl) telEl.textContent = formatearTelefonoEcuador(contacto.telefono);

    if (faseNivel === "reto-final") {
        if (rondaActualNivel === 2) {
            mostrarToast(`✓ Reto 2 completado: ${nombre} encontrado`);
            rondaActualNivel = 3; // Pasar a llamar a Carlos Miranda
            subPaso = 1;
            setTimeout(() => actualizarGuiaRetoFinal(true), 600);
        } else if (rondaActualNivel === 4 && subPaso === 1) {
            subPaso = 2;
            actualizarGuiaRetoFinal(true);
        } else if (rondaActualNivel === 5 && subPaso === 1) {
            subPaso = 2;
            actualizarGuiaRetoFinal(true);
        }
    } else if (nivelActual === "buscar-contacto" && subPaso === 3) {
        const meta = PRACTICAS_BUSCAR[rondaActualNivel - 1];
        if (nombre === meta.nombreCompleto) {
            mostrarToast(`✓ Práctica ${rondaActualNivel} completada: ${nombre} encontrado`);
            if (rondaActualNivel < TOTAL_RONDAS) {
                subPaso = 4;
                setTimeout(() => {
                    const texto = `¡Muy bien! Has encontrado a ${nombre}. Ahora toca la flecha arriba a la izquierda para buscar al siguiente contacto.`;
                    actualizarInstruccionesTexto(texto, rondaActualNivel, TOTAL_RONDAS, false);
                    speak(texto);
                    aplicarResaltado("#ctBtnVolverDetalle");
                }, 600);
            } else {
                limpiarResaltados();
                setTimeout(() => completarNivelActual("¡Has aprendido a buscar y encontrar contactos en tu agenda!"), 800);
            }
        }
    } else if (nivelActual === "llamar-contacto" && faseNivel === "repaso" && rondaActualNivel === 2) {
        mostrarToast(`✓ Repaso 2 completado: Valentina Vera encontrada`);
        rondaActualNivel = 3;
        subPaso = 1;
        setTimeout(() => actualizarGuiaNivel3(true), 600);
    } else if (nivelActual === "editar-contacto") {
        if (faseNivel === "practica") {
            const meta = PRACTICAS_EDITAR[rondaActualNivel - 1];
            if (nombre === meta.nombre && subPaso === 1) {
                subPaso = 2;
                actualizarGuiaNivel4(true);
            }
        } else {
            const meta = REPASO_NIVEL_5[rondaActualNivel - 1];
            if (nombre === meta.nombre && subPaso === 1) {
                subPaso = 2;
                actualizarGuiaNivel5(true);
            }
        }
    } else if (nivelActual === "eliminar-contacto") {
        if (faseNivel === "practica") {
            const meta = PRACTICAS_ELIMINAR[rondaActualNivel - 1];
            if (nombre === meta.nombre && subPaso === 1) {
                subPaso = 2;
                actualizarGuiaNivel5(true);
            }
        } else {
            const meta = REPASO_NIVEL_5[rondaActualNivel - 1];
            if (nombre === meta.nombre && subPaso === 1) {
                subPaso = 2;
                actualizarGuiaNivel5(true);
            }
        }
    }
}

// ---- FORMULARIO CREAR / EDITAR ----
function abrirFormularioCrearContacto(contactoParaEditar = null) {
    const permitido = nivelActual === "guardar-contacto" ||
        (nivelActual === "llamar-contacto" && faseNivel === "repaso") ||
        faseNivel === "reto-final" ||
        contactoParaEditar;

    if (!permitido) {
        mostrarAvisoBloqueado("La creación de contactos está bloqueada para este nivel.");
        return;
    }

    cambiarVista("ctViewCrearContacto");
    const inputNombre = $("#ctInputNombre");
    const inputTel = $("#ctInputTelefono");
    const tituloEl = $("#ctFormularioTitulo");
    const btnSugerirNom = $("#ctSugerirNombre");
    const btnSugerirTel = $("#ctSugerirTelefono");

    if (contactoParaEditar) {
        modoEdicion = true;
        contactoEditandoOriginal = contactoParaEditar;
        let nuevoTelMeta = "098 111 2233";
        if (faseNivel === "reto-final") {
            nuevoTelMeta = RETO_FINAL_DATA[3].nuevoTel;
        } else if (nivelActual === "editar-contacto") {
            nuevoTelMeta = PRACTICAS_EDITAR[rondaActualNivel - 1]?.nuevoTel || "098 111 2233";
        } else if (nivelActual === "eliminar-contacto" && faseNivel === "repaso") {
            nuevoTelMeta = REPASO_NIVEL_5[0].nuevoTel;
        }

        if (tituloEl) tituloEl.textContent = "Editar contacto";
        if (inputNombre) inputNombre.value = contactoParaEditar.nombre;
        if (inputTel) inputTel.value = contactoParaEditar.telefono || "";
        if (btnSugerirNom) btnSugerirNom.style.display = "none";
        if (btnSugerirTel) {
            btnSugerirTel.style.display = "inline-flex";
            btnSugerirTel.textContent = `💡 Toca para cambiar a "${nuevoTelMeta}"`;
        }
    } else {
        modoEdicion = false;
        contactoEditandoOriginal = null;
        let metaNom = "Dra. Carmen Gómez";
        let metaTel = "099 876 5432";

        if (faseNivel === "reto-final") {
            metaNom = RETO_FINAL_DATA[0].nombre;
            metaTel = RETO_FINAL_DATA[0].telefono;
        } else if (nivelActual === "guardar-contacto") {
            const meta = PRACTICAS_GUARDAR[rondaActualNivel - 1] || PRACTICAS_GUARDAR[0];
            metaNom = meta.nombre;
            metaTel = meta.telefono;
        } else if (nivelActual === "llamar-contacto" && faseNivel === "repaso") {
            metaNom = REPASO_NIVEL_3[0].nombre;
            metaTel = REPASO_NIVEL_3[0].telefono;
        }

        if (tituloEl) tituloEl.textContent = "Crear contacto";
        if (inputNombre) inputNombre.value = "";
        if (inputTel) inputTel.value = "";
        if (btnSugerirNom) {
            btnSugerirNom.style.display = "inline-flex";
            btnSugerirNom.textContent = `💡 Toca para escribir "${metaNom}"`;
        }
        if (btnSugerirTel) {
            btnSugerirTel.style.display = "inline-flex";
            btnSugerirTel.textContent = `💡 Toca para escribir "${metaTel}"`;
        }
    }

    if (faseNivel === "reto-final") {
        subPaso = 3;
        actualizarGuiaRetoFinal(true);
    } else if (nivelActual === "guardar-contacto" || (nivelActual === "llamar-contacto" && faseNivel === "repaso")) {
        subPaso = 3;
        if (nivelActual === "guardar-contacto") actualizarGuiaNivel1(true);
        else actualizarGuiaNivel3(true);
    } else if (nivelActual === "editar-contacto" || (nivelActual === "eliminar-contacto" && faseNivel === "repaso")) {
        subPaso = 3;
        if (nivelActual === "editar-contacto") actualizarGuiaNivel4(true);
        else actualizarGuiaNivel5(true);
    }
}

function guardarFormularioContacto() {
    const inputNombre = $("#ctInputNombre");
    const inputTel = $("#ctInputTelefono");
    let nombre = inputNombre ? inputNombre.value.trim() : "";
    let telefono = inputTel ? inputTel.value.trim() : "";

    if (modoEdicion && contactoEditandoOriginal) {
        let nuevoTelMeta = "098 111 2233";
        if (faseNivel === "reto-final") nuevoTelMeta = RETO_FINAL_DATA[3].nuevoTel;
        else if (nivelActual === "editar-contacto") nuevoTelMeta = PRACTICAS_EDITAR[rondaActualNivel - 1]?.nuevoTel || "098 111 2233";
        else if (nivelActual === "eliminar-contacto" && faseNivel === "repaso") nuevoTelMeta = REPASO_NIVEL_5[0].nuevoTel;

        if (!telefono) telefono = nuevoTelMeta;
        if (!nombre) nombre = contactoEditandoOriginal.nombre;
        telefono = formatearTelefonoEcuador(telefono);
        contactoEditandoOriginal.nombre = nombre;
        contactoEditandoOriginal.telefono = telefono;

        const contacto = CONTACTOS.find(c => c === contactoEditandoOriginal);
        if (contacto) {
            cambiarVista("ctViewDetalleContacto");
            const avatarEl = $("#ctDetalleAvatarLarge"); const nombreEl = $("#ctDetalleNombre"); const telEl = $("#ctDetalleTelefono");
            if (avatarEl) { avatarEl.style.background = contacto.color; avatarEl.textContent = contacto.iniciales; }
            if (nombreEl) nombreEl.textContent = contacto.nombre;
            if (telEl) telEl.textContent = formatearTelefonoEcuador(contacto.telefono);
        }

        if (faseNivel === "reto-final") {
            mostrarToast(`✓ Reto 4 completado: ${nombre} actualizado`);
            subPaso = 5;
            setTimeout(() => {
                const texto = `¡Genial! Has editado a ${nombre}. Ahora toca la flecha arriba a la izquierda para continuar con el último paso del reto.`;
                actualizarInstruccionesTexto(texto, 4, 5, "Reto Final");
                speak(texto);
                aplicarResaltado("#ctBtnVolverDetalle");
            }, 600);
        } else if (nivelActual === "editar-contacto") {
            mostrarToast(`✓ Práctica ${rondaActualNivel} completada: ${nombre} actualizado`);
            if (rondaActualNivel < TOTAL_RONDAS) {
                subPaso = 5;
                setTimeout(() => {
                    const texto = `¡Genial! Has actualizado a ${nombre}. Toca la flecha arriba a la izquierda para volver y editar el siguiente contacto.`;
                    actualizarInstruccionesTexto(texto, rondaActualNivel, TOTAL_RONDAS, false);
                    speak(texto);
                    aplicarResaltado("#ctBtnVolverDetalle");
                }, 600);
            } else {
                limpiarResaltados();
                setTimeout(() => completarNivelActual("¡Has aprendido a editar y actualizar la información de tus contactos!"), 800);
            }
        } else if (nivelActual === "eliminar-contacto" && faseNivel === "repaso") {
            mostrarToast(`✓ Repaso 1 completado: ${nombre} actualizado`);
            subPaso = 5;
            setTimeout(() => {
                const texto = `¡Genial! Has editado a ${nombre}. Ahora toca la flecha arriba a la izquierda para continuar con el último repaso.`;
                actualizarInstruccionesTexto(texto, 1, 2, true);
                speak(texto);
                aplicarResaltado("#ctBtnVolverDetalle");
            }, 600);
        }
    } else {
        let metaNom = "Dra. Carmen Gómez";
        let metaTel = "099 876 5432";
        if (faseNivel === "reto-final") {
            metaNom = RETO_FINAL_DATA[0].nombre; metaTel = RETO_FINAL_DATA[0].telefono;
        } else if (nivelActual === "guardar-contacto") {
            const meta = PRACTICAS_GUARDAR[rondaActualNivel - 1] || PRACTICAS_GUARDAR[0];
            metaNom = meta.nombre; metaTel = meta.telefono;
        } else if (nivelActual === "llamar-contacto" && faseNivel === "repaso") {
            metaNom = REPASO_NIVEL_3[0].nombre; metaTel = REPASO_NIVEL_3[0].telefono;
        }

        if (!nombre) nombre = metaNom;
        if (!telefono) telefono = metaTel;
        telefono = formatearTelefonoEcuador(telefono);
        const iniciales = nombre.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "C";
        const colores = ["#7b4b24", "#2e7d32", "#1565c0", "#6a1b9a", "#c2185b", "#ef6c00"];
        CONTACTOS.unshift({ nombre, iniciales, color: colores[Math.floor(Math.random() * colores.length)], telefono, fav: false });

        cambiarVista("ctViewContactos");
        renderizarContactos("", nombre);

        if (faseNivel === "reto-final") {
            mostrarToast(`✓ Reto 1 completado: ${nombre} guardado`);
            rondaActualNivel = 2; // Pasar a buscar Carlos Miranda
            subPaso = 1;
            setTimeout(() => actualizarGuiaRetoFinal(true), 1200);
        } else if (nivelActual === "guardar-contacto") {
            mostrarToast(`✓ Práctica ${rondaActualNivel} completada: ${nombre} guardado`);
            if (rondaActualNivel < TOTAL_RONDAS) {
                rondaActualNivel++;
                subPaso = 1;
                setTimeout(() => actualizarGuiaNivel1(true), 1200);
            } else {
                limpiarResaltados();
                setTimeout(() => completarNivelActual("¡Has aprendido a crear y guardar nuevos contactos en tu teléfono!"), 1000);
            }
        } else if (nivelActual === "llamar-contacto" && faseNivel === "repaso") {
            mostrarToast(`✓ Repaso 1 completado: ${nombre} guardada`);
            rondaActualNivel = 2; // Pasar a buscar Valentina Vera
            subPaso = 1;
            setTimeout(() => actualizarGuiaNivel3(true), 1200);
        }
    }
}

// ---- ELIMINAR CONTACTO ----
function mostrarModalEliminar(nombre) {
    const modal = $("#ctModalConfirmarEliminar");
    const tit = $("#ctConfirmarTitulo");
    const msg = $("#ctConfirmarMensaje");
    if (tit) tit.textContent = `¿Eliminar a ${nombre}?`;
    if (msg) msg.textContent = `El contacto "${nombre}" se borrará de tu teléfono.`;
    if (modal) modal.classList.add("activa");
    subPaso = 3;

    if (faseNivel === "reto-final") actualizarGuiaRetoFinal(true);
    else actualizarGuiaNivel5(true);
}

function cerrarModalEliminar() { $("#ctModalConfirmarEliminar")?.classList.remove("activa"); }

function ejecutarEliminacion() {
    cerrarModalEliminar();
    if (!contactoEnDetalle) return;
    const nombreBorrado = contactoEnDetalle.nombre;
    CONTACTOS = CONTACTOS.filter(c => c.nombre !== nombreBorrado);
    cambiarVista("ctViewContactos");
    renderizarContactos();

    if (faseNivel === "reto-final") {
        mostrarToast(`✓ Reto 5 completado: ${nombreBorrado} eliminado`);
        limpiarResaltados();
        setTimeout(() => {
            // Mark level as completed and offer repeat option
            completarNivel("Contactos", "reto-final");
            mostrarModalOpciones({
                titulo: "¡Reto final completado! 🏆",
                mensaje: "Has demostrado un dominio completo de todas las funciones de tu teléfono y contactos.",
                textoPrincipal: "Volver al menú de niveles",
                onPrincipal: () => salir(),
                textoSecundario: "Repetir reto final",
                onSecundario: () => iniciarRetoFinal(false)
            });
        }, 800);
    } else if (faseNivel === "practica") {
        mostrarToast(`✓ Práctica ${rondaActualNivel} completada: ${nombreBorrado} eliminado`);
        if (rondaActualNivel < TOTAL_RONDAS) {
            rondaActualNivel++;
            subPaso = 1;
            setTimeout(() => actualizarGuiaNivel5(true), 1200);
        } else {
            // Mostrar modal de transición al Repaso Final
            limpiarResaltados();
            mostrarModalOpciones({
                titulo: "¡Prácticas de eliminación completadas!",
                mensaje: "¡Excelente! Has aprendido a eliminar contactos. Ahora realizaremos el repaso final de todo el módulo (Editar y Eliminar).",
                textoPrincipal: "Comenzar repaso final",
                onPrincipal: () => {
                    faseNivel = "repaso";
                    rondaActualNivel = 1;
                    subPaso = 1;
                    actualizarGuiaNivel5(true);
                }
            });
        }
    } else {
        // Fin del repaso 2 de Nivel 5
        mostrarToast(`✓ Repaso 2 completado: ${nombreBorrado} eliminado`);
        limpiarResaltados();

        setTimeout(() => {
            completarNivel("Contactos", "eliminar-contacto");

            mostrarModalOpciones({
                titulo: "¡Módulo de contactos completado! 🌟",
                mensaje: "¡Felicitaciones! Has dominado todas las funciones principales. Elige cómo deseas continuar:",
                textoPrincipal: "Realizar reto final (Con ayuda) 🏆",
                onPrincipal: () => iniciarRetoFinal(false),
                textoSecundario: "Realizar reto experto (Sin ayuda) 🌟",
                onSecundario: () => iniciarRetoFinal(true),
                textoTerciario: "Seguir repasando niveles",
                onTerciario: () => salir()
            });
        }, 800);
    }
}

// ---- LLAMADA ----
function abrirLlamada(nombre, color, iniciales) {
    const permitido = nivelActual === "llamar-contacto" || faseNivel === "reto-final";
    if (!permitido) {
        mostrarAvisoBloqueado("Las llamadas están bloqueadas para este nivel.");
        return;
    }

    let metaNombre = "";
    if (faseNivel === "reto-final") {
        metaNombre = RETO_FINAL_DATA[2].nombre;
    } else if (faseNivel === "practica") {
        metaNombre = PRACTICAS_LLAMAR[rondaActualNivel - 1]?.nombre;
    } else {
        metaNombre = REPASO_NIVEL_3[2].nombre;
    }

    if (metaNombre && nombre !== metaNombre) {
        mostrarAvisoBloqueado(`Para este paso debes llamar a "${metaNombre}".`);
        return;
    }

    llamadaContacto = { nombre, color, iniciales };
    llamadaSegundos = 0;
    isSpeakerOn = false;
    isMicMuted = false;

    const modal = $("#ctCallModal");
    const avatarEl = $("#ctCallAvatarLarge");
    const nameEl = $("#ctCallNameLabel");
    const statusEl = $("#ctCallStatusLabel");
    const textCallNico = $("#ctCallInstructionsText");
    const btnAltavoz = $("#ctCallBtnAltavoz");
    const btnSilenciar = $("#ctCallBtnSilenciar");

    if (btnAltavoz) btnAltavoz.classList.remove("activo");
    if (btnSilenciar) btnSilenciar.classList.remove("activo");

    if (avatarEl) { avatarEl.style.background = color; avatarEl.textContent = iniciales; }
    if (nameEl) nameEl.textContent = nombre;
    if (statusEl) statusEl.textContent = "Llamando...";
    if (textCallNico) textCallNico.textContent = `Llamando a ${nombre}... Espera un momento a que conteste.`;
    if (modal) modal.classList.add("activa");

    const badgeTipo = faseNivel === "reto-final" ? "Reto Final" : (faseNivel === "repaso" ? true : false);
    actualizarInstruccionesTexto(`Llamando a ${nombre}... Espera que conteste.`, rondaActualNivel, TOTAL_RONDAS, badgeTipo);

    if (llamadaTimer) clearTimeout(llamadaTimer);
    if (llamadaSegundosInterval) clearInterval(llamadaSegundosInterval);

    llamadaTimer = setTimeout(() => {
        if (statusEl) statusEl.textContent = "00:01 En llamada";
        llamadaSegundos = 1;
        llamadaSegundosInterval = setInterval(() => {
            llamadaSegundos++;
            const s = llamadaSegundos < 10 ? `0${llamadaSegundos}` : `${llamadaSegundos}`;
            if (statusEl) statusEl.textContent = `00:${s} En llamada`;
        }, 1000);

        subPaso = 2;
        let saludo = "¡Hola! Qué gusto saludarte.";
        if (faseNivel === "reto-final") saludo = RETO_FINAL_DATA[2].saludo;
        else if (faseNivel === "practica") saludo = PRACTICAS_LLAMAR[rondaActualNivel - 1]?.saludo || saludo;
        else saludo = REPASO_NIVEL_3[2].saludo;

        if (textCallNico) textCallNico.textContent = `${nombre} dice: "${saludo}"`;

        speak(saludo, () => {
            setTimeout(() => {
                if (subPaso === 2) {
                    if (faseNivel === "reto-final") {
                        subPaso = 2.5;
                        const msgAltavoz = "Toca el botón de 'Altavoz' en el centro para escuchar la llamada más fuerte.";
                        actualizarInstruccionesTexto(msgAltavoz, 3, 5, "Reto Final");
                        if (textCallNico) textCallNico.textContent = msgAltavoz;
                        speak(msgAltavoz);
                        aplicarResaltado("#ctCallBtnAltavoz");
                    } else if (faseNivel === "practica") {
                        if (rondaActualNivel === 1) {
                            subPaso = 3;
                            const msgColgar = "Cuando termines de hablar, presiona el botón rojo de abajo para colgar la llamada.";
                            actualizarInstruccionesTexto(msgColgar, rondaActualNivel, TOTAL_RONDAS, false);
                            if (textCallNico) textCallNico.textContent = msgColgar;
                            speak(msgColgar);
                            aplicarResaltado("#ctCallEndBtn");
                        } else if (rondaActualNivel === 2) {
                            subPaso = 2.5;
                            const msgAltavoz = "Toca el botón de 'Altavoz' en el centro para escuchar la llamada más fuerte.";
                            actualizarInstruccionesTexto(msgAltavoz, rondaActualNivel, TOTAL_RONDAS, false);
                            if (textCallNico) textCallNico.textContent = msgAltavoz;
                            speak(msgAltavoz);
                            aplicarResaltado("#ctCallBtnAltavoz");
                        } else if (rondaActualNivel === 3) {
                            subPaso = 2.4;
                            const msgAltavoz = "Toca el botón de 'Altavoz' en el centro para escuchar la llamada con altavoz.";
                            actualizarInstruccionesTexto(msgAltavoz, rondaActualNivel, TOTAL_RONDAS, false);
                            if (textCallNico) textCallNico.textContent = msgAltavoz;
                            speak(msgAltavoz);
                            aplicarResaltado("#ctCallBtnAltavoz");
                        }
                    } else {
                        subPaso = 3;
                        const msgColgar = "Cuando termines de hablar, presiona el botón rojo de abajo para colgar la llamada.";
                        actualizarInstruccionesTexto(msgColgar, 3, 3, true);
                        if (textCallNico) textCallNico.textContent = msgColgar;
                        speak(msgColgar);
                        aplicarResaltado("#ctCallEndBtn");
                    }
                }
            }, 1200);
        });
    }, 1500);
}

function cerrarLlamada() {
    const modal = $("#ctCallModal");
    if (modal) modal.classList.remove("activa");
    if (llamadaTimer) { clearTimeout(llamadaTimer); llamadaTimer = null; }
    if (llamadaSegundosInterval) { clearInterval(llamadaSegundosInterval); llamadaSegundosInterval = null; }
    stopSpeech();
    llamadaContacto = null;
    dialPadNumber = "";
    actualizarDialpad();

    if (faseNivel === "reto-final") {
        mostrarToast(`✓ Reto 3 completado: Llamada realizada`);
        rondaActualNivel = 4; // Pasar a editar Elena Vallejo
        subPaso = 1;
        setTimeout(() => actualizarGuiaRetoFinal(true), 1000);
    } else if (nivelActual === "llamar-contacto") {
        if (faseNivel === "practica") {
            mostrarToast(`✓ Práctica ${rondaActualNivel} completada: Llamada finalizada`);
            if (rondaActualNivel < TOTAL_RONDAS) {
                rondaActualNivel++;
                subPaso = 1;
                setTimeout(() => actualizarGuiaNivel3(true), 1200);
            } else {
                // Mostrar modal de transición al Repaso Interactivo de Nivel 3
                limpiarResaltados();
                mostrarModalOpciones({
                    titulo: "¡Prácticas de llamada completadas!",
                    mensaje: "¡Excelente! Has aprendido a realizar llamadas, usar altavoz y silenciar. Ahora realizaremos un breve repaso práctico de lo aprendido (Guardar, Buscar y Llamar).",
                    textoPrincipal: "Comenzar repaso",
                    onPrincipal: () => {
                        faseNivel = "repaso";
                        rondaActualNivel = 1;
                        subPaso = 1;
                        actualizarGuiaNivel3(true);
                    }
                });
            }
        } else {
            // Fin del repaso 3 de Nivel 3 -> Completar Nivel 3
            mostrarToast(`✓ Repaso 3 completado: Repaso de llamadas finalizado`);
            limpiarResaltados();
            setTimeout(() => {
                completarNivelActual("¡Has repasado y dominado cómo guardar, buscar y llamar contactos con éxito!", "¡Repaso completado!");
            }, 800);
        }
    }
}

// ---- TECLADO ----
function agregarDigito(digit) { if (dialPadNumber.length < 15) { dialPadNumber += digit; actualizarDialpad(); } }
function borrarDigito() { dialPadNumber = dialPadNumber.slice(0, -1); actualizarDialpad(); }
function actualizarDialpad() {
    const numEl = $("#ctDialpadNumber"); const delBtn = $("#ctDialpadDel");
    if (numEl) numEl.textContent = dialPadNumber || "\u200B";
    if (delBtn) { if (dialPadNumber.length > 0) delBtn.classList.remove("hidden"); else delBtn.classList.add("hidden"); }
}

// ---- TOAST ----
function mostrarToast(mensaje) {
    const toast = $("#ctToast"); const textEl = $("#ctToastText");
    if (!toast || !textEl) return;
    textEl.textContent = mensaje;
    toast.classList.add("mostrar");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("mostrar"), 2800);
}

// ---- ACTUALIZAR INSTRUCCIONES ----
function actualizarInstruccionesTexto(texto, ronda = rondaActualNivel, total = TOTAL_RONDAS, esRepaso = false) {
    const textEl = $("#ctInstructionsText");
    if (textEl) {
        textEl.textContent = texto;
    }
}

// ---- GUÍAS DE NIVEL ----

// Nivel 1: Guardar contactos
function actualizarGuiaNivel1(forzarVoz = false) {
    limpiarResaltados();
    const meta = PRACTICAS_GUARDAR[rondaActualNivel - 1];
    let texto = "";

    const viewActiva = document.querySelector("#pantallaContactosSimulador .ct-view.activa")?.id;

    if (viewActiva === "ctViewRecientes") {
        subPaso = 1;
        texto = `Presiona en 'Contactos' abajo o en 'Ver contactos' para ir a la lista.`;
        aplicarResaltado("#ctNavContactos, #ctVerContactosBtn");
    } else if (viewActiva === "ctViewContactos") {
        subPaso = 2;
        texto = `Presiona el botón '+ Crear contacto' arriba en la lista para agregar a ${meta.nombre}.`;
        aplicarResaltado("#ctCreateBtn");
    } else if (viewActiva === "ctViewCrearContacto") {
        const inputNombre = $("#ctInputNombre");
        const inputTel = $("#ctInputTelefono");
        if (!inputNombre || inputNombre.value.trim().length < 3) {
            subPaso = 3;
            texto = `Escribe el nombre '${meta.nombre}'. Puedes tocar la sugerencia de abajo.`;
            aplicarResaltado("#ctSugerirNombre, #ctInputNombre");
        } else if (!inputTel || inputTel.value.trim().length < 6) {
            subPaso = 4;
            texto = `Ahora escribe el teléfono '${meta.telefono}'. Puedes tocar la sugerencia de abajo.`;
            aplicarResaltado("#ctSugerirTelefono, #ctInputTelefono");
        } else {
            subPaso = 5;
            texto = `¡Muy bien! Ahora presiona el botón 'Guardar' arriba a la derecha.`;
            aplicarResaltado("#ctBtnGuardarContacto");
        }
    } else {
        texto = `Toca 'Contactos' abajo para continuar guardando a ${meta.nombre}.`;
        aplicarResaltado("#ctNavContactos");
    }

    actualizarInstruccionesTexto(texto);
    if (forzarVoz && texto) speak(texto);
}

// Nivel 2: Buscar contactos
function actualizarGuiaNivel2(forzarVoz = false) {
    limpiarResaltados();
    const meta = PRACTICAS_BUSCAR[rondaActualNivel - 1];
    let texto = "";

    const btnSugerir = $("#ctSugerirBusqueda");
    if (btnSugerir) btnSugerir.textContent = `💡 Toca para buscar "${meta.termino}"`;

    const viewActiva = document.querySelector("#pantallaContactosSimulador .ct-view.activa")?.id;

    if (viewActiva === "ctViewRecientes") {
        subPaso = 1;
        texto = `Toca el botón 'Contactos' en la parte de abajo para abrir la lista.`;
        aplicarResaltado("#ctNavContactos, #ctVerContactosBtn");
    } else if (viewActiva === "ctViewContactos") {
        const searchInput = $("#ctContactosSearch");
        if (!searchInput || !searchInput.value.toLowerCase().includes(meta.termino.toLowerCase())) {
            subPaso = 2;
            texto = `Escribe '${meta.termino}' en la barra de búsqueda o toca la sugerencia de abajo.`;
            const searchSuggest = $("#ctSearchSuggestContainer");
            if (searchSuggest) searchSuggest.style.display = "block";
            aplicarResaltado("#ctContactosSearch, #ctSugerirBusqueda");
        } else {
            subPaso = 3;
            texto = `¡Muy bien! Ahora toca sobre '${meta.nombreCompleto}' en la lista para ver su información.`;
            aplicarResaltado(`.ct-contact-item[data-nombre="${meta.nombreCompleto}"]`);
        }
    } else if (viewActiva === "ctViewDetalleContacto") {
        subPaso = 4;
        texto = `¡Excelente! Has encontrado a ${meta.nombreCompleto}. Toca la flecha arriba a la izquierda para buscar el siguiente contacto.`;
        aplicarResaltado("#ctBtnVolverDetalle");
    } else {
        texto = `Ve a 'Contactos' para buscar a ${meta.nombreCompleto}.`;
        aplicarResaltado("#ctNavContactos");
    }

    actualizarInstruccionesTexto(texto);
    if (forzarVoz && texto) speak(texto);
}

// Nivel 3: Llamar contactos (incluye Altavoz, Silenciar y Repaso Interactivo)
function actualizarGuiaNivel3(forzarVoz = false) {
    limpiarResaltados();
    let texto = "";
    const viewActiva = document.querySelector("#pantallaContactosSimulador .ct-view.activa")?.id;
    const modalLlamada = $("#ctCallModal");
    const textCallNico = $("#ctCallInstructionsText");

    if (modalLlamada && modalLlamada.classList.contains("activa")) {
        const nombreActual = llamadaContacto ? llamadaContacto.nombre : "tu contacto";
        if (subPaso === 2.4) {
            texto = `Toca el botón de 'Altavoz' en el centro para escuchar la llamada con altavoz.`;
            if (textCallNico) textCallNico.textContent = texto;
            aplicarResaltado("#ctCallBtnAltavoz");
        } else if (subPaso === 2.5) {
            texto = `Toca el botón de 'Altavoz' en el centro para escuchar la llamada más fuerte.`;
            if (textCallNico) textCallNico.textContent = texto;
            aplicarResaltado("#ctCallBtnAltavoz");
        } else if (subPaso === 2.6) {
            texto = `Ahora toca el botón de 'Silenciar' a la izquierda para apagar tu micrófono mientras escuchas.`;
            if (textCallNico) textCallNico.textContent = texto;
            aplicarResaltado("#ctCallBtnSilenciar");
        } else if (subPaso === 3) {
            texto = `Presiona el botón rojo de abajo para colgar la llamada con ${nombreActual}.`;
            if (textCallNico) textCallNico.textContent = texto;
            aplicarResaltado("#ctCallEndBtn");
        } else {
            texto = `Llamada en curso con ${nombreActual}. Escucha la conversación...`;
            if (textCallNico) textCallNico.textContent = texto;
        }
    } else if (faseNivel === "practica") {
        const meta = PRACTICAS_LLAMAR[rondaActualNivel - 1];
        if (rondaActualNivel === 1) {
            if (viewActiva !== "ctViewRecientes") {
                cambiarVista("ctViewRecientes");
                renderizarLlamadas();
            }
            subPaso = 1;
            texto = `Práctica 1: Toca a '${meta.nombre}' en tus Favoritos arriba para llamarla.`;
            aplicarResaltado(`.ct-fav-item[data-fav-nombre="${meta.nombre}"]`);
        } else if (rondaActualNivel === 2) {
            if (viewActiva !== "ctViewRecientes") {
                cambiarVista("ctViewRecientes");
                renderizarLlamadas();
            }
            subPaso = 1;
            texto = `Práctica 2: Toca el botón de teléfono junto a '${meta.nombre}'.`;
            aplicarResaltado(`.ct-call-phone-btn[data-nombre="${meta.nombre}"]`);
        } else if (rondaActualNivel === 3) {
            if (viewActiva === "ctViewRecientes") {
                subPaso = 1;
                texto = `Práctica 3: Ve a 'Contactos' abajo para llamar a '${meta.nombre}'.`;
                aplicarResaltado("#ctNavContactos, #ctVerContactosBtn");
            } else if (viewActiva === "ctViewContactos") {
                subPaso = 2;
                texto = `Toca el botón de teléfono junto a '${meta.nombre}' para llamarlo.`;
                aplicarResaltado(`.ct-contact-call-btn[data-nombre="${meta.nombre}"]`);
            } else {
                texto = `Ve a 'Contactos' para llamar a '${meta.nombre}'.`;
                aplicarResaltado("#ctNavContactos");
            }
        }
    } else {
        // FASE DE REPASO DE NIVEL 3 (Guardar -> Buscar -> Llamar)
        if (rondaActualNivel === 1) {
            const meta = REPASO_NIVEL_3[0];
            if (viewActiva === "ctViewRecientes") {
                subPaso = 1;
                texto = `Repaso 1: Vamos a guardar un contacto. Toca 'Contactos' abajo para ir a la lista.`;
                aplicarResaltado("#ctNavContactos, #ctVerContactosBtn");
            } else if (viewActiva === "ctViewContactos") {
                subPaso = 2;
                texto = (subPaso === 2)
                    ? `Repaso 1: Toca el botón '+ Crear contacto' arriba para registrar a '${meta.nombre}'.`
                    : `Toca el botón '+ Crear contacto' arriba para registrar a '${meta.nombre}'.`;
                aplicarResaltado("#ctCreateBtn");
            } else if (viewActiva === "ctViewCrearContacto") {
                const inputNombre = $("#ctInputNombre");
                const inputTel = $("#ctInputTelefono");
                if (!inputNombre || inputNombre.value.trim().length < 3) {
                    subPaso = 3;
                    texto = `Escribe el nombre '${meta.nombre}'. Puedes tocar la sugerencia de abajo.`;
                    aplicarResaltado("#ctSugerirNombre, #ctInputNombre");
                } else if (!inputTel || inputTel.value.trim().length < 6) {
                    subPaso = 4;
                    texto = `Ahora escribe el teléfono '${meta.telefono}'. Puedes tocar la sugerencia de abajo.`;
                    aplicarResaltado("#ctSugerirTelefono, #ctInputTelefono");
                } else {
                    subPaso = 5;
                    texto = `Presiona el botón 'Guardar' arriba a la derecha.`;
                    aplicarResaltado("#ctBtnGuardarContacto");
                }
            }
        } else if (rondaActualNivel === 2) {
            const meta = REPASO_NIVEL_3[1];
            if (viewActiva !== "ctViewContactos") {
                cambiarVista("ctViewContactos");
                renderizarContactos();
            }
            const btnSugerir = $("#ctSugerirBusqueda");
            if (btnSugerir) btnSugerir.textContent = `💡 Toca para buscar "${meta.termino}"`;

            const searchInput = $("#ctContactosSearch");
            if (!searchInput || !searchInput.value.toLowerCase().includes(meta.termino.toLowerCase())) {
                subPaso = 2;
                texto = `Repaso 2: Ahora busca a '${meta.nombreCompleto}' en la barra de búsqueda o toca la sugerencia de abajo.`;
                const searchSuggest = $("#ctSearchSuggestContainer");
                if (searchSuggest) searchSuggest.style.display = "block";
                aplicarResaltado("#ctContactosSearch, #ctSugerirBusqueda");
            } else {
                subPaso = 3;
                texto = `Toca sobre '${meta.nombreCompleto}' en la lista para abrir su información.`;
                aplicarResaltado(`.ct-contact-item[data-nombre="${meta.nombreCompleto}"]`);
            }
        } else if (rondaActualNivel === 3) {
            const meta = REPASO_NIVEL_3[2];
            if (viewActiva === "ctViewDetalleContacto") {
                subPaso = 1;
                texto = `Repaso 3: Presiona el botón de 'Llamar' para comunicarte con ${meta.nombre}.`;
                aplicarResaltado("#ctDetalleBtnLlamar");
            } else if (viewActiva === "ctViewContactos") {
                subPaso = 1;
                texto = `Repaso 3: Toca el botón de teléfono junto a '${meta.nombre}'.`;
                aplicarResaltado(`.ct-contact-call-btn[data-nombre="${meta.nombre}"]`);
            }
        }
    }

    actualizarInstruccionesTexto(texto, rondaActualNivel, TOTAL_RONDAS, faseNivel === "repaso");
    if (forzarVoz && texto) speak(texto);
}

// Nivel 4: Editar contactos
function actualizarGuiaNivel4(forzarVoz = false) {
    limpiarResaltados();
    const meta = PRACTICAS_EDITAR[rondaActualNivel - 1];
    let texto = "";

    const viewActiva = document.querySelector("#pantallaContactosSimulador .ct-view.activa")?.id;

    if (viewActiva === "ctViewRecientes") {
        subPaso = 1;
        texto = `Ve a 'Contactos' abajo para buscar a '${meta.nombre}'.`;
        aplicarResaltado("#ctNavContactos, #ctVerContactosBtn");
    } else if (viewActiva === "ctViewContactos") {
        subPaso = 1;
        texto = `Toca sobre '${meta.nombre}' en la lista para abrir su información.`;
        aplicarResaltado(`.ct-contact-item[data-nombre="${meta.nombre}"]`);
    } else if (viewActiva === "ctViewDetalleContacto") {
        if (subPaso === 5) {
            texto = `¡Genial! Has actualizado a ${meta.nombre}. Toca la flecha arriba a la izquierda para volver y editar el siguiente contacto.`;
            aplicarResaltado("#ctBtnVolverDetalle");
        } else {
            subPaso = 2;
            texto = `Presiona el botón 'Editar' arriba a la derecha para cambiar los datos de ${meta.nombre}.`;
            aplicarResaltado("#ctBtnEditarDetalle");
        }
    } else if (viewActiva === "ctViewCrearContacto") {
        const inputTel = $("#ctInputTelefono");
        if (!inputTel || inputTel.value.trim() !== meta.nuevoTel) {
            subPaso = 3;
            texto = `Cambia el teléfono a '${meta.nuevoTel}'. Puedes tocar la sugerencia de abajo.`;
            aplicarResaltado("#ctSugerirTelefono, #ctInputTelefono");
        } else {
            subPaso = 4;
            texto = `¡Listo! Presiona el botón 'Guardar' arriba a la derecha.`;
            aplicarResaltado("#ctBtnGuardarContacto");
        }
    } else {
        texto = `Ve a 'Contactos' para editar a ${meta.nombre}.`;
        aplicarResaltado("#ctNavContactos");
    }

    actualizarInstruccionesTexto(texto);
    if (forzarVoz && texto) speak(texto);
}

// Nivel 5: Eliminar contactos
function actualizarGuiaNivel5(forzarVoz = false) {
    limpiarResaltados();
    let texto = "";
    const viewActiva = document.querySelector("#pantallaContactosSimulador .ct-view.activa")?.id;
    const modalConfirmar = $("#ctModalConfirmarEliminar");

    if (faseNivel === "practica") {
        const meta = PRACTICAS_ELIMINAR[rondaActualNivel - 1];
        if (modalConfirmar && modalConfirmar.classList.contains("activa")) {
            subPaso = 3;
            texto = `El teléfono pide confirmación. Presiona el botón rojo 'Eliminar' para confirmar.`;
            aplicarResaltado("#ctBtnConfirmarEliminar");
        } else if (viewActiva === "ctViewRecientes") {
            subPaso = 1;
            texto = `Ve a 'Contactos' abajo para buscar a '${meta.nombre}'.`;
            aplicarResaltado("#ctNavContactos, #ctVerContactosBtn");
        } else if (viewActiva === "ctViewContactos") {
            subPaso = 1;
            texto = `Toca sobre '${meta.nombre}' en la lista.`;
            aplicarResaltado(`.ct-contact-item[data-nombre="${meta.nombre}"]`);
        } else if (viewActiva === "ctViewDetalleContacto") {
            subPaso = 2;
            texto = `Presiona el botón 'Eliminar contacto' que está en la parte de abajo.`;
            aplicarResaltado("#ctBtnEliminarDetalle");
        } else {
            texto = `Ve a 'Contactos' para eliminar a ${meta.nombre}.`;
            aplicarResaltado("#ctNavContactos");
        }
        actualizarInstruccionesTexto(texto, rondaActualNivel, TOTAL_RONDAS, false);
    } else {
        // FASE DE REPASO FINAL (1 = Editar Patricia Muñoz, 2 = Eliminar Ernesto Cabrera)
        if (rondaActualNivel === 1) {
            const meta = REPASO_NIVEL_5[0];
            if (viewActiva === "ctViewRecientes") {
                subPaso = 1;
                texto = `Repaso 1: Ve a 'Contactos' abajo para buscar a '${meta.nombre}'.`;
                aplicarResaltado("#ctNavContactos, #ctVerContactosBtn");
            } else if (viewActiva === "ctViewContactos") {
                subPaso = 1;
                texto = (subPaso === 1)
                    ? `Repaso 1: Toca sobre '${meta.nombre}' en la lista para editar su teléfono.`
                    : `Toca sobre '${meta.nombre}' en la lista para editar su teléfono.`;
                aplicarResaltado(`.ct-contact-item[data-nombre="${meta.nombre}"]`);
            } else if (viewActiva === "ctViewDetalleContacto") {
                if (subPaso === 5) {
                    texto = `¡Genial! Has editado a ${meta.nombre}. Ahora toca la flecha arriba a la izquierda para continuar con el último repaso.`;
                    aplicarResaltado("#ctBtnVolverDetalle");
                } else {
                    subPaso = 2;
                    texto = `Presiona el botón 'Editar' arriba a la derecha.`;
                    aplicarResaltado("#ctBtnEditarDetalle");
                }
            } else if (viewActiva === "ctViewCrearContacto") {
                const inputTel = $("#ctInputTelefono");
                if (!inputTel || inputTel.value.trim() !== meta.nuevoTel) {
                    subPaso = 3;
                    texto = `Cambia el teléfono a '${meta.nuevoTel}' tocando la sugerencia de abajo.`;
                    aplicarResaltado("#ctSugerirTelefono, #ctInputTelefono");
                } else {
                    subPaso = 4;
                    texto = `Presiona el botón 'Guardar' arriba a la derecha.`;
                    aplicarResaltado("#ctBtnGuardarContacto");
                }
            }
        } else if (rondaActualNivel === 2) {
            const meta = REPASO_NIVEL_5[1];
            if (modalConfirmar && modalConfirmar.classList.contains("activa")) {
                subPaso = 3;
                texto = `Confirma presionando el botón rojo 'Eliminar'.`;
                aplicarResaltado("#ctBtnConfirmarEliminar");
            } else if (viewActiva === "ctViewContactos") {
                subPaso = 1;
                texto = `Repaso 2: Toca sobre '${meta.nombre}' en la lista para eliminarlo.`;
                aplicarResaltado(`.ct-contact-item[data-nombre="${meta.nombre}"]`);
            } else if (viewActiva === "ctViewDetalleContacto") {
                subPaso = 2;
                texto = `Presiona el botón 'Eliminar contacto' abajo.`;
                aplicarResaltado("#ctBtnEliminarDetalle");
            }
        }
        actualizarInstruccionesTexto(texto, rondaActualNivel, 2, true);
    }

    if (forzarVoz && texto) speak(texto);
}

// ---- GUÍA DEL RETO FINAL (EVALUACIÓN PRÁCTICA) ----
function actualizarGuiaRetoFinal(forzarVoz = false) {
    limpiarResaltados();
    let texto = "";
    const viewActiva = document.querySelector("#pantallaContactosSimulador .ct-view.activa")?.id;
    const modalLlamada = $("#ctCallModal");
    const modalConfirmar = $("#ctModalConfirmarEliminar");
    const textCallNico = $("#ctCallInstructionsText");

    if (rondaActualNivel === 1) {
        // RETO 1: Guardar "Hermano Fernando", "099 444 3322"
        const meta = RETO_FINAL_DATA[0];
        if (viewActiva === "ctViewRecientes") {
            texto = `Reto 1: Agrega y guarda a '${meta.nombre}' con el número '${meta.telefono}'. Toca 'Contactos' abajo.`;
            aplicarResaltado("#ctNavContactos, #ctVerContactosBtn");
        } else if (viewActiva === "ctViewContactos") {
            texto = `Reto 1: Presiona el botón '+ Crear contacto' arriba en la lista.`;
            aplicarResaltado("#ctCreateBtn");
        } else if (viewActiva === "ctViewCrearContacto") {
            const inputNombre = $("#ctInputNombre");
            const inputTel = $("#ctInputTelefono");
            if (!inputNombre || inputNombre.value.trim().length < 3) {
                texto = `Escribe '${meta.nombre}'. Puedes tocar la sugerencia de abajo.`;
                aplicarResaltado("#ctSugerirNombre, #ctInputNombre");
            } else if (!inputTel || inputTel.value.trim().length < 6) {
                texto = `Escribe el teléfono '${meta.telefono}'. Puedes tocar la sugerencia de abajo.`;
                aplicarResaltado("#ctSugerirTelefono, #ctInputTelefono");
            } else {
                texto = `Presiona el botón 'Guardar' arriba a la derecha.`;
                aplicarResaltado("#ctBtnGuardarContacto");
            }
        }
    } else if (rondaActualNivel === 2) {
        // RETO 2: Buscar "Carlos Miranda"
        const meta = RETO_FINAL_DATA[1];
        if (viewActiva !== "ctViewContactos") {
            cambiarVista("ctViewContactos");
            renderizarContactos();
        }
        const btnSugerir = $("#ctSugerirBusqueda");
        if (btnSugerir) btnSugerir.textContent = `💡 Toca para buscar "${meta.termino}"`;

        const searchInput = $("#ctContactosSearch");
        if (!searchInput || !searchInput.value.toLowerCase().includes(meta.termino.toLowerCase())) {
            texto = `Reto 2: Busca a '${meta.nombreCompleto}' en la barra de búsqueda o toca la sugerencia de abajo.`;
            const searchSuggest = $("#ctSearchSuggestContainer");
            if (searchSuggest) searchSuggest.style.display = "block";
            aplicarResaltado("#ctContactosSearch, #ctSugerirBusqueda");
        } else {
            texto = `Toca sobre '${meta.nombreCompleto}' en la lista para abrir su información.`;
            aplicarResaltado(`.ct-contact-item[data-nombre="${meta.nombreCompleto}"]`);
        }
    } else if (rondaActualNivel === 3) {
        // RETO 3: Llamar a Carlos Miranda con Altavoz y colgar
        const meta = RETO_FINAL_DATA[2];
        if (modalLlamada && modalLlamada.classList.contains("activa")) {
            if (subPaso === 2.5) {
                texto = `Toca el botón de 'Altavoz' en el centro para escuchar la llamada más fuerte.`;
                if (textCallNico) textCallNico.textContent = texto;
                aplicarResaltado("#ctCallBtnAltavoz");
            } else if (subPaso === 3) {
                texto = `Presiona el botón rojo de abajo para colgar la llamada con ${meta.nombre}.`;
                if (textCallNico) textCallNico.textContent = texto;
                aplicarResaltado("#ctCallEndBtn");
            }
        } else if (viewActiva === "ctViewDetalleContacto") {
            texto = `Reto 3: Presiona el botón de 'Llamar' para comunicarte con ${meta.nombre}.`;
            aplicarResaltado("#ctDetalleBtnLlamar");
        } else if (viewActiva === "ctViewContactos") {
            texto = `Reto 3: Toca el botón de teléfono junto a '${meta.nombre}'.`;
            aplicarResaltado(`.ct-contact-call-btn[data-nombre="${meta.nombre}"]`);
        }
    } else if (rondaActualNivel === 4) {
        // RETO 4: Editar Elena Vallejo a 099 777 8899
        const meta = RETO_FINAL_DATA[3];
        if (viewActiva === "ctViewRecientes") {
            texto = `Reto 4: Ve a 'Contactos' abajo para buscar a '${meta.nombre}'.`;
            aplicarResaltado("#ctNavContactos, #ctVerContactosBtn");
        } else if (viewActiva === "ctViewContactos") {
            texto = `Reto 4: Toca sobre '${meta.nombre}' en la lista para editar su información.`;
            aplicarResaltado(`.ct-contact-item[data-nombre="${meta.nombre}"]`);
        } else if (viewActiva === "ctViewDetalleContacto") {
            if (subPaso === 5) {
                texto = `¡Genial! Has editado a ${meta.nombre}. Toca la flecha arriba a la izquierda para el último paso del reto.`;
                aplicarResaltado("#ctBtnVolverDetalle");
            } else {
                texto = `Presiona el botón 'Editar' arriba a la derecha.`;
                aplicarResaltado("#ctBtnEditarDetalle");
            }
        } else if (viewActiva === "ctViewCrearContacto") {
            const inputTel = $("#ctInputTelefono");
            if (!inputTel || inputTel.value.trim() !== meta.nuevoTel) {
                texto = `Cambia el teléfono a '${meta.nuevoTel}' tocando la sugerencia de abajo.`;
                aplicarResaltado("#ctSugerirTelefono, #ctInputTelefono");
            } else {
                texto = `Presiona el botón 'Guardar' arriba a la derecha.`;
                aplicarResaltado("#ctBtnGuardarContacto");
            }
        }
    } else if (rondaActualNivel === 5) {
        // RETO 5: Eliminar Ramón Fuentes
        const meta = RETO_FINAL_DATA[4];
        if (modalConfirmar && modalConfirmar.classList.contains("activa")) {
            texto = `Confirma presionando el botón rojo 'Eliminar'.`;
            aplicarResaltado("#ctBtnConfirmarEliminar");
        } else if (viewActiva === "ctViewContactos") {
            texto = `Reto 5: Toca sobre '${meta.nombre}' en la lista para eliminarlo.`;
            aplicarResaltado(`.ct-contact-item[data-nombre="${meta.nombre}"]`);
        } else if (viewActiva === "ctViewDetalleContacto") {
            texto = `Presiona el botón 'Eliminar contacto' en la parte inferior.`;
            aplicarResaltado("#ctBtnEliminarDetalle");
        }
    }

    actualizarInstruccionesTexto(texto, rondaActualNivel, 5, "Reto Final");
    if (forzarVoz && texto) speak(texto);
}

// Iniciar Reto Final (con o sin ayuda visual)
function iniciarRetoFinal(sinAyuda = false) {
    faseNivel = "reto-final";
    modoSinAyuda = sinAyuda;
    rondaActualNivel = 1;
    subPaso = 1;
    reiniciarContactos();
    cambiarVista("ctViewRecientes");
    renderizarLlamadas();
    renderizarContactos();
    actualizarGuiaRetoFinal(true);
}

// ---- MOSTRAR MODAL CON OPCIONES DINÁMICAS ----
function mostrarModalOpciones({ titulo, mensaje, textoPrincipal, onPrincipal, textoSecundario, onSecundario, textoTerciario, onTerciario }) {
    const titleEl = $("#ctSuccessTitle");
    const msgEl = $("#ctSuccessMessage");
    const btnPrincipal = $("#ctSuccessBtnContinuar");
    const btnSecundario = $("#ctSuccessBtnSecundario");
    const btnTerciario = $("#ctSuccessBtnTerciario");

    if (titleEl) titleEl.textContent = titulo;
    if (msgEl) msgEl.textContent = mensaje;

    if (btnPrincipal) {
        btnPrincipal.textContent = textoPrincipal || "Continuar";
        btnPrincipal.style.display = "inline-block";
    }

    if (btnSecundario) {
        if (textoSecundario) {
            btnSecundario.textContent = textoSecundario;
            btnSecundario.style.display = "inline-block";
        } else {
            btnSecundario.style.display = "none";
        }
    }

    if (btnTerciario) {
        if (textoTerciario) {
            btnTerciario.textContent = textoTerciario;
            btnTerciario.style.display = "inline-block";
        } else {
            btnTerciario.style.display = "none";
        }
    }

    modalAccionPrincipal = onPrincipal || null;
    modalAccionSecundaria = onSecundario || null;
    modalAccionTerciaria = onTerciario || null;

    $("#ctModalExito")?.classList.add("activa");
    speak(`${titulo}. ${mensaje}`);
}

// ---- COMPLETAR NIVEL ----
function completarNivelActual(mensajeExito, tituloModal = "¡Nivel completado!") {
    completarNivel("Contactos", nivelActual);

    mostrarModalOpciones({
        titulo: tituloModal,
        mensaje: mensajeExito,
        textoPrincipal: "Continuar",
        onPrincipal: () => salir()
    });
}

// ---- INICIALIZAR LISTENERS ----
function inicializarListeners() {
    // Nico: repetir guía actual con voz y resaltado
    const nicoBtn = $("#ctNicoBtn");
    if (nicoBtn) {
        nicoBtn.onclick = (e) => {
            e.stopPropagation();
            repetirGuiaActual();
        };
    }

    // Salir del simulador: pide confirmación antes de perder el progreso del nivel
    const btnSalir = $("#ctSalirBtn");
    const modalConfirmarSalida = $("#ctModalConfirmarSalida");
    if (btnSalir) {
        btnSalir.onclick = () => {
            if (modalConfirmarSalida) {
                modalConfirmarSalida.classList.add("activa");
            } else {
                salir();
            }
        };
    }

    const btnCancelarSalida = $("#ctBtnCancelarSalida");
    if (btnCancelarSalida) {
        btnCancelarSalida.onclick = () => modalConfirmarSalida?.classList.remove("activa");
    }

    const btnConfirmarSalida = $("#ctBtnConfirmarSalida");
    if (btnConfirmarSalida) btnConfirmarSalida.onclick = salir;

    // Buscador en Recientes — filtra llamadas sin cambiar de pantalla
    const searchInputRecientes = $("#ctRecientesSearchInput");
    if (searchInputRecientes) {
        searchInputRecientes.addEventListener("input", () => {
            renderizarLlamadas(searchInputRecientes.value);
        });
    }

    // Botones de control en llamada (Altavoz, Silenciar)
    const btnAltavoz = $("#ctCallBtnAltavoz");
    if (btnAltavoz) {
        btnAltavoz.onclick = () => {
            isSpeakerOn = !isSpeakerOn;
            btnAltavoz.classList.toggle("activo", isSpeakerOn);
            mostrarToast(isSpeakerOn ? "Altavoz activado 🔊" : "Altavoz desactivado");

            if (subPaso === 2.4 || subPaso === 2.5) {
                if (rondaActualNivel === 3 && faseNivel === "practica") {
                    subPaso = 2.6; // Pasar a pedir silenciar
                    actualizarGuiaNivel3(true);
                } else {
                    subPaso = 3; // Pasar a colgar
                    if (faseNivel === "reto-final") actualizarGuiaRetoFinal(true);
                    else actualizarGuiaNivel3(true);
                }
            }
        };
    }

    const btnSilenciar = $("#ctCallBtnSilenciar");
    if (btnSilenciar) {
        btnSilenciar.onclick = () => {
            isMicMuted = !isMicMuted;
            btnSilenciar.classList.toggle("activo", isMicMuted);
            mostrarToast(isMicMuted ? "Micrófono silenciado 🔇" : "Micrófono activado 🎙️");

            if (subPaso === 2.6) {
                subPaso = 3; // Pasar a colgar
                actualizarGuiaNivel3(true);
            }
        };
    }

    // Nav tabs inferiores
    document.querySelectorAll("#pantallaContactosSimulador .ct-nav-tab").forEach(tab => {
        tab.addEventListener("click", () => {
            const viewId = tab.dataset.view;
            if (viewId === "ctViewTeclado") {
                mostrarAvisoBloqueado("El teclado está bloqueado para este nivel.");
                return;
            }
            if (viewId === "ctViewContactos") {
                cambiarVista("ctViewContactos");
                renderizarContactos();

                if (faseNivel === "reto-final") {
                    actualizarGuiaRetoFinal(true);
                } else if (nivelActual === "guardar-contacto") {
                    actualizarGuiaNivel1(true);
                } else if (nivelActual === "buscar-contacto") {
                    const si = $("#ctContactosSearch");
                    if (si && subPaso === 1) si.value = "";
                    renderizarContactos();
                    actualizarGuiaNivel2(true);
                } else if (nivelActual === "llamar-contacto") {
                    actualizarGuiaNivel3(true);
                } else if (nivelActual === "editar-contacto") {
                    actualizarGuiaNivel4(true);
                } else if (nivelActual === "eliminar-contacto") {
                    actualizarGuiaNivel5(true);
                } else {
                    repetirGuiaActual();
                }
            } else if (viewId === "ctViewRecientes") {
                cambiarVista("ctViewRecientes");
                renderizarLlamadas();
                repetirGuiaActual();
            }
        });
    });

    // Ver contactos (botón en Recientes)
    const verContactosBtn = $("#ctVerContactosBtn");
    if (verContactosBtn) {
        verContactosBtn.onclick = () => {
            cambiarVista("ctViewContactos");
            renderizarContactos();
            if (faseNivel === "reto-final") {
                actualizarGuiaRetoFinal(true);
            } else if (nivelActual === "guardar-contacto") {
                actualizarGuiaNivel1(true);
            } else if (nivelActual === "buscar-contacto") {
                const si = $("#ctContactosSearch");
                if (si && subPaso === 1) si.value = "";
                renderizarContactos();
                actualizarGuiaNivel2(true);
            } else if (nivelActual === "llamar-contacto") {
                actualizarGuiaNivel3(true);
            } else if (nivelActual === "editar-contacto") {
                actualizarGuiaNivel4(true);
            } else if (nivelActual === "eliminar-contacto") {
                actualizarGuiaNivel5(true);
            } else {
                repetirGuiaActual();
            }
        };
    }

    // Botón "+ Crear contacto"
    const btnCrear = $("#ctCreateBtn");
    if (btnCrear) {
        btnCrear.onclick = () => {
            const permitido = nivelActual === "guardar-contacto" ||
                (nivelActual === "llamar-contacto" && faseNivel === "repaso") ||
                (faseNivel === "reto-final" && rondaActualNivel === 1);

            if (!permitido) {
                mostrarAvisoBloqueado("Crear contactos está bloqueado en este momento.");
                return;
            }
            abrirFormularioCrearContacto();
        };
    }

    // Cancelar en formulario
    const btnCancelarCrear = $("#ctBtnCancelarCrear");
    if (btnCancelarCrear) {
        btnCancelarCrear.onclick = () => {
            if (modoEdicion && contactoEditandoOriginal) {
                const c = contactoEditandoOriginal;
                contactoEnDetalle = c;
                cambiarVista("ctViewDetalleContacto");
                const avatarEl = $("#ctDetalleAvatarLarge"); const nombreEl = $("#ctDetalleNombre"); const telEl = $("#ctDetalleTelefono");
                if (avatarEl) { avatarEl.style.background = c.color; avatarEl.textContent = c.iniciales; }
                if (nombreEl) nombreEl.textContent = c.nombre;
                if (telEl) telEl.textContent = formatearTelefonoEcuador(c.telefono);
                if (faseNivel === "reto-final") { subPaso = 2; actualizarGuiaRetoFinal(true); }
                else if (nivelActual === "editar-contacto") { subPaso = 2; actualizarGuiaNivel4(true); }
                else if (nivelActual === "eliminar-contacto") { subPaso = 2; actualizarGuiaNivel5(true); }
            } else {
                cambiarVista("ctViewContactos");
                renderizarContactos();
                if (faseNivel === "reto-final") { subPaso = 2; actualizarGuiaRetoFinal(true); }
                else if (nivelActual === "guardar-contacto") { subPaso = 2; actualizarGuiaNivel1(true); }
                else if (nivelActual === "llamar-contacto") { subPaso = 2; actualizarGuiaNivel3(true); }
            }
        };
    }

    // Volver de Ficha Detalle a Contactos
    const btnVolverDetalle = $("#ctBtnVolverDetalle");
    if (btnVolverDetalle) {
        btnVolverDetalle.onclick = () => {
            cambiarVista("ctViewContactos");
            const si = $("#ctContactosSearch");
            if (si) si.value = "";
            renderizarContactos();
            contactoEnDetalle = null;

            if (faseNivel === "reto-final") {
                if (subPaso === 5 && rondaActualNivel === 4) {
                    rondaActualNivel = 5; // Pasar a Reto 5: Eliminar Ramón Fuentes
                    subPaso = 1;
                    actualizarGuiaRetoFinal(true);
                } else {
                    repetirGuiaActual();
                }
            } else if (nivelActual === "buscar-contacto") {
                if (subPaso === 4 && rondaActualNivel < TOTAL_RONDAS) {
                    rondaActualNivel++;
                    subPaso = 2;
                    actualizarGuiaNivel2(true);
                } else {
                    repetirGuiaActual();
                }
            } else if (nivelActual === "editar-contacto") {
                if (subPaso === 5 && rondaActualNivel < TOTAL_RONDAS) {
                    rondaActualNivel++;
                    subPaso = 1;
                    actualizarGuiaNivel4(true);
                } else {
                    repetirGuiaActual();
                }
            } else if (nivelActual === "eliminar-contacto" && faseNivel === "repaso" && subPaso === 5) {
                rondaActualNivel = 2;
                subPaso = 1;
                actualizarGuiaNivel5(true);
            } else {
                repetirGuiaActual();
            }
        };
    }

    // Botón Editar en Detalle
    const btnEditarDetalle = $("#ctBtnEditarDetalle");
    if (btnEditarDetalle) {
        btnEditarDetalle.onclick = () => {
            const permitido = nivelActual === "editar-contacto" ||
                (nivelActual === "eliminar-contacto" && faseNivel === "repaso") ||
                (faseNivel === "reto-final" && rondaActualNivel === 4);

            if (!permitido) {
                mostrarAvisoBloqueado("La edición está bloqueada en este nivel.");
                return;
            }
            if (contactoEnDetalle) abrirFormularioCrearContacto(contactoEnDetalle);
        };
    }

    // Botón Eliminar en Detalle
    const btnEliminarDetalle = $("#ctBtnEliminarDetalle");
    if (btnEliminarDetalle) {
        btnEliminarDetalle.onclick = () => {
            const permitido = nivelActual === "eliminar-contacto" ||
                (faseNivel === "reto-final" && rondaActualNivel === 5);

            if (!permitido) {
                mostrarAvisoBloqueado("La eliminación está bloqueada en este nivel.");
                return;
            }
            if (contactoEnDetalle) mostrarModalEliminar(contactoEnDetalle.nombre);
        };
    }

    // Modal Eliminar
    const btnCancelarEliminar = $("#ctBtnCancelarEliminar");
    if (btnCancelarEliminar) btnCancelarEliminar.onclick = cerrarModalEliminar;
    const btnConfirmarEliminar = $("#ctBtnConfirmarEliminar");
    if (btnConfirmarEliminar) btnConfirmarEliminar.onclick = ejecutarEliminacion;

    // Sugerencia búsqueda
    const btnSugerirBusqueda = $("#ctSugerirBusqueda");
    if (btnSugerirBusqueda) {
        btnSugerirBusqueda.onclick = () => {
            let termino = "Pedro";
            if (faseNivel === "reto-final") {
                termino = RETO_FINAL_DATA[1].termino;
            } else if (nivelActual === "buscar-contacto") {
                termino = PRACTICAS_BUSCAR[rondaActualNivel - 1]?.termino || "Pedro";
            } else if (nivelActual === "llamar-contacto" && faseNivel === "repaso") {
                termino = REPASO_NIVEL_3[1].termino;
            }

            const input = $("#ctContactosSearch");
            if (input) {
                input.value = termino;
                renderizarContactos(termino);
            }
            if (faseNivel === "reto-final") {
                subPaso = 3;
                actualizarGuiaRetoFinal(true);
            } else if (nivelActual === "buscar-contacto" && subPaso === 2) {
                subPaso = 3;
                actualizarGuiaNivel2(true);
            } else if (nivelActual === "llamar-contacto" && faseNivel === "repaso" && subPaso === 2) {
                subPaso = 3;
                actualizarGuiaNivel3(true);
            }
        };
    }

    // Sugerencia nombre
    const btnSugerirNombre = $("#ctSugerirNombre");
    if (btnSugerirNombre) {
        btnSugerirNombre.onclick = () => {
            let nom = "Dra. Carmen Gómez";
            if (faseNivel === "reto-final") {
                nom = RETO_FINAL_DATA[0].nombre;
            } else if (nivelActual === "guardar-contacto") {
                nom = PRACTICAS_GUARDAR[rondaActualNivel - 1]?.nombre || nom;
            } else if (nivelActual === "llamar-contacto" && faseNivel === "repaso") {
                nom = REPASO_NIVEL_3[0].nombre;
            }

            const inputNombre = $("#ctInputNombre");
            if (inputNombre) inputNombre.value = nom;
            if (faseNivel === "reto-final") {
                subPaso = 4;
                actualizarGuiaRetoFinal(true);
            } else if (nivelActual === "guardar-contacto") {
                subPaso = 4;
                actualizarGuiaNivel1(true);
            } else if (nivelActual === "llamar-contacto" && faseNivel === "repaso") {
                subPaso = 4;
                actualizarGuiaNivel3(true);
            }
        };
    }

    // Sugerencia teléfono
    const btnSugerirTelefono = $("#ctSugerirTelefono");
    if (btnSugerirTelefono) {
        btnSugerirTelefono.onclick = () => {
            const inputTel = $("#ctInputTelefono");
            if (modoEdicion) {
                let tel = "098 111 2233";
                if (faseNivel === "reto-final") {
                    tel = RETO_FINAL_DATA[3].nuevoTel;
                } else if (nivelActual === "editar-contacto") {
                    tel = PRACTICAS_EDITAR[rondaActualNivel - 1]?.nuevoTel || tel;
                } else if (nivelActual === "eliminar-contacto" && faseNivel === "repaso") {
                    tel = REPASO_NIVEL_5[0].nuevoTel;
                }
                if (inputTel) inputTel.value = tel;
                if (faseNivel === "reto-final") {
                    subPaso = 4;
                    actualizarGuiaRetoFinal(true);
                } else if (nivelActual === "editar-contacto") {
                    subPaso = 4;
                    actualizarGuiaNivel4(true);
                } else if (nivelActual === "eliminar-contacto" && faseNivel === "repaso") {
                    subPaso = 4;
                    actualizarGuiaNivel5(true);
                }
            } else {
                let tel = "099 876 5432";
                if (faseNivel === "reto-final") {
                    tel = RETO_FINAL_DATA[0].telefono;
                } else if (nivelActual === "guardar-contacto") {
                    tel = PRACTICAS_GUARDAR[rondaActualNivel - 1]?.telefono || tel;
                } else if (nivelActual === "llamar-contacto" && faseNivel === "repaso") {
                    tel = REPASO_NIVEL_3[0].telefono;
                }
                if (inputTel) inputTel.value = tel;
                if (faseNivel === "reto-final") {
                    subPaso = 5;
                    actualizarGuiaRetoFinal(true);
                } else if (nivelActual === "guardar-contacto") {
                    subPaso = 5;
                    actualizarGuiaNivel1(true);
                } else if (nivelActual === "llamar-contacto" && faseNivel === "repaso") {
                    subPaso = 5;
                    actualizarGuiaNivel3(true);
                }
            }
        };
    }

    // Inputs: detección de escritura manual
    const inputNombre = $("#ctInputNombre");
    if (inputNombre) {
        inputNombre.addEventListener("input", () => {
            if (inputNombre.value.trim().length >= 3) {
                if (faseNivel === "reto-final" && subPaso === 3) {
                    subPaso = 4;
                    actualizarGuiaRetoFinal(true);
                } else if (nivelActual === "guardar-contacto" && subPaso === 3) {
                    subPaso = 4;
                    actualizarGuiaNivel1(true);
                } else if (nivelActual === "llamar-contacto" && faseNivel === "repaso" && subPaso === 3) {
                    subPaso = 4;
                    actualizarGuiaNivel3(true);
                }
            }
        });
    }
    const inputTel = $("#ctInputTelefono");
    if (inputTel) {
        inputTel.addEventListener("input", () => {
            if (inputTel.value.trim().length >= 6) {
                if (faseNivel === "reto-final") {
                    if (rondaActualNivel === 1 && subPaso === 4) { subPaso = 5; actualizarGuiaRetoFinal(true); }
                    else if (rondaActualNivel === 4 && subPaso === 3) { subPaso = 4; actualizarGuiaRetoFinal(true); }
                } else if (nivelActual === "guardar-contacto" && subPaso === 4) {
                    subPaso = 5;
                    actualizarGuiaNivel1(true);
                } else if (nivelActual === "editar-contacto" && subPaso === 3) {
                    subPaso = 4;
                    actualizarGuiaNivel4(true);
                } else if (nivelActual === "llamar-contacto" && faseNivel === "repaso" && subPaso === 4) {
                    subPaso = 5;
                    actualizarGuiaNivel3(true);
                } else if (nivelActual === "eliminar-contacto" && faseNivel === "repaso" && subPaso === 3) {
                    subPaso = 4;
                    actualizarGuiaNivel5(true);
                }
            }
        });
    }

    // Guardar formulario
    const btnGuardar = $("#ctBtnGuardarContacto");
    if (btnGuardar) btnGuardar.onclick = () => guardarFormularioContacto();

    // Botones del Modal de Éxito / Opciones
    const btnPrincipal = $("#ctSuccessBtnContinuar");
    if (btnPrincipal) {
        btnPrincipal.onclick = () => {
            $("#ctModalExito")?.classList.remove("activa");
            stopSpeech();
            limpiarResaltados();

            if (typeof modalAccionPrincipal === "function") {
                const action = modalAccionPrincipal;
                modalAccionPrincipal = null;
                action();
            } else {
                salir();
            }
        };
    }

    const btnSecundario = $("#ctSuccessBtnSecundario");
    if (btnSecundario) {
        btnSecundario.onclick = () => {
            $("#ctModalExito")?.classList.remove("activa");
            stopSpeech();
            limpiarResaltados();

            if (typeof modalAccionSecundaria === "function") {
                const action = modalAccionSecundaria;
                modalAccionSecundaria = null;
                action();
            }
        };
    }

    const btnTerciario = $("#ctSuccessBtnTerciario");
    if (btnTerciario) {
        btnTerciario.onclick = () => {
            $("#ctModalExito")?.classList.remove("activa");
            stopSpeech();
            limpiarResaltados();

            if (typeof modalAccionTerciaria === "function") {
                const action = modalAccionTerciaria;
                modalAccionTerciaria = null;
                action();
            } else {
                salir();
            }
        };
    }

    // Favoritos: click
    const favsRow = $("#ctFavoritesRow");
    if (favsRow) {
        favsRow.addEventListener("click", e => {
            const item = e.target.closest(".ct-fav-item[data-fav-nombre]");
            if (!item) return;
            const nombre = item.dataset.favNombre;
            if (nivelActual === "llamar-contacto" && faseNivel === "practica" && rondaActualNivel === 1 && nombre === "Valentina Vera") {
                const fav = FAVORITOS_DEFECTO.find(f => f.nombre === nombre);
                if (fav) abrirLlamada(fav.nombre, fav.color, fav.iniciales);
            } else {
                mostrarAvisoBloqueado("Sigue la indicación de Nico para este paso.");
            }
        });
    }

    // Botones de llamada en Recientes
    const callsList = $("#ctCallsList");
    if (callsList) {
        callsList.addEventListener("click", e => {
            const btn = e.target.closest(".ct-call-phone-btn");
            if (btn) {
                const nombre = btn.dataset.nombre;
                if (nivelActual === "llamar-contacto" && faseNivel === "practica" && rondaActualNivel === 2 && nombre === "Erick Delgado") {
                    abrirLlamada(btn.dataset.nombre, btn.dataset.color, btn.dataset.iniciales);
                } else {
                    mostrarAvisoBloqueado("Sigue la indicación de Nico.");
                }
                return;
            }
            const item = e.target.closest(".ct-call-item");
            if (item && item.dataset.nombre) {
                mostrarAvisoBloqueado("Sigue la indicación de Nico.");
            }
        });
    }

    // Volver de Contactos a Recientes
    const backBtn = $("#ctContactosBack");
    if (backBtn) {
        backBtn.onclick = () => {
            cambiarVista("ctViewRecientes");
            renderizarLlamadas();
            repetirGuiaActual();
        };
    }

    // Buscador en Contactos — filtra en la misma lista sin saltar de pantalla
    const searchInput = $("#ctContactosSearch");
    if (searchInput) {
        searchInput.addEventListener("input", () => {
            renderizarContactos(searchInput.value);
            if (faseNivel === "reto-final" && rondaActualNivel === 2) {
                const meta = RETO_FINAL_DATA[1];
                if (meta && searchInput.value.toLowerCase().includes(meta.termino.toLowerCase())) {
                    subPaso = 3;
                    actualizarGuiaRetoFinal(true);
                    // Hide quick suggestion after successful term
                    const searchSuggest = $("#ctSearchSuggestContainer");
                    if (searchSuggest) searchSuggest.style.display = "none";
                }
            } else if (nivelActual === "buscar-contacto" && subPaso === 2) {
                const meta = PRACTICAS_BUSCAR[rondaActualNivel - 1];
                if (meta && searchInput.value.toLowerCase().includes(meta.termino.toLowerCase())) {
                    subPaso = 3;
                    actualizarGuiaNivel2(true);
                }
            } else if (nivelActual === "llamar-contacto" && faseNivel === "repaso" && subPaso === 2) {
                const meta = REPASO_NIVEL_3[1];
                if (meta && searchInput.value.toLowerCase().includes(meta.termino.toLowerCase())) {
                    subPaso = 3;
                    actualizarGuiaNivel3(true);
                }
            }
        });
    }

    // Click en lista de Contactos
    const contactsList = $("#ctContactsList");
    if (contactsList) {
        contactsList.addEventListener("click", e => {
            const btnCall = e.target.closest(".ct-contact-call-btn");
            if (btnCall) {
                const nombre = btnCall.dataset.nombre;
                if (faseNivel === "reto-final" && rondaActualNivel === 3 && nombre === "Carlos Miranda") {
                    abrirLlamada(btnCall.dataset.nombre, btnCall.dataset.color, btnCall.dataset.iniciales);
                } else if (nivelActual === "llamar-contacto" && faseNivel === "practica" && rondaActualNivel === 3 && nombre === "Pedro Pérez") {
                    abrirLlamada(btnCall.dataset.nombre, btnCall.dataset.color, btnCall.dataset.iniciales);
                } else if (nivelActual === "llamar-contacto" && faseNivel === "repaso" && rondaActualNivel === 3 && nombre === "Valentina Vera") {
                    abrirLlamada(btnCall.dataset.nombre, btnCall.dataset.color, btnCall.dataset.iniciales);
                } else {
                    mostrarAvisoBloqueado("Sigue la indicación de Nico.");
                }
                return;
            }
            const item = e.target.closest(".ct-contact-item");
            if (item && item.dataset.nombre) {
                abrirDetalleContacto(item.dataset.nombre);
            }
        });
    }

    // Llamar desde Detalle
    const btnLlamarDetalle = $("#ctDetalleBtnLlamar");
    if (btnLlamarDetalle) {
        btnLlamarDetalle.onclick = () => {
            if (contactoEnDetalle && (nivelActual === "llamar-contacto" || (faseNivel === "reto-final" && rondaActualNivel === 3))) {
                abrirLlamada(contactoEnDetalle.nombre, contactoEnDetalle.color, contactoEnDetalle.iniciales);
            } else {
                mostrarAvisoBloqueado("Las llamadas están bloqueadas para este nivel.");
            }
        };
    }

    // Mensaje desde Detalle
    const btnMensajeDetalle = $("#ctDetalleBtnMensaje");
    if (btnMensajeDetalle) {
        btnMensajeDetalle.onclick = () => mostrarAvisoBloqueado("El envío de mensajes está bloqueado para este nivel.");
    }

    // Teclado numérico
    const grid = document.querySelector("#pantallaContactosSimulador .ct-dialpad-grid");
    if (grid) grid.addEventListener("click", () => mostrarAvisoBloqueado("El teclado está bloqueado para este nivel."));

    // Colgar llamada
    const endBtn = $("#ctCallEndBtn");
    if (endBtn) endBtn.onclick = cerrarLlamada;

    // Filtros de tabs
    document.querySelectorAll("#pantallaContactosSimulador .ct-filter-tab").forEach(tab => {
        tab.addEventListener("click", () => {
            document.querySelectorAll("#pantallaContactosSimulador .ct-filter-tab").forEach(t => t.classList.remove("activa"));
            tab.classList.add("activa");
        });
    });
}

// ---- SALIR ----
function salir() {
    limpiarResaltados();
    cerrarLlamada();
    cerrarModalEliminar();
    $("#ctModalExito")?.classList.remove("activa");
    $("#ctModalConfirmarSalida")?.classList.remove("activa");
    stopSpeech();

    const pantallaSim = $("#pantallaContactosSimulador");
    if (pantallaSim) pantallaSim.classList.remove("activa");

    location.hash = "/modulo/Contactos";
}

// ---- PUNTO DE ENTRADA ----
export function iniciarSimulador(idNivel) {
    nivelActual = idNivel;
    faseNivel = "practica";
    modoSinAyuda = false;
    dialPadNumber = "";
    llamadaContacto = null;
    contactoEnDetalle = null;
    modoEdicion = false;
    rondaActualNivel = 1;
    subPaso = 1;
    modalAccionPrincipal = null;
    modalAccionSecundaria = null;
    modalAccionTerciaria = null;
    isSpeakerOn = false;
    isMicMuted = false;

    reiniciarContactos();
    asegurarTemplateHTML();

    document.querySelectorAll(".pantalla").forEach(p => p.classList.remove("activa"));
    const sim = $("#pantallaContactosSimulador");
    if (sim) sim.classList.add("activa");

    $("#ctModalExito")?.classList.remove("activa");
    cerrarModalEliminar();

    const searchInput = $("#ctContactosSearch");
    if (searchInput) searchInput.value = "";

    const searchInputRec = $("#ctRecientesSearchInput");
    if (searchInputRec) searchInputRec.value = "";

    const searchSuggest = $("#ctSearchSuggestContainer");
    if (searchSuggest) searchSuggest.style.display = "none";

    cambiarVista("ctViewRecientes");
    renderizarLlamadas();
    renderizarContactos();

    if (!simuladorInicializado) {
        inicializarListeners();
        simuladorInicializado = true;
    }

    // Iniciar guía del nivel con voz y resaltado
    if (idNivel === "guardar-contacto") actualizarGuiaNivel1(true);
    else if (idNivel === "buscar-contacto") actualizarGuiaNivel2(true);
    else if (idNivel === "llamar-contacto") actualizarGuiaNivel3(true);
    else if (idNivel === "editar-contacto") actualizarGuiaNivel4(true);
    else if (idNivel === "eliminar-contacto") actualizarGuiaNivel5(true);
}
