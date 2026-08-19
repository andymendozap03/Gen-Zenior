import { $ } from "../../utils/dom.js";
import { speak, stopSpeech } from "../../services/speech.service.js";
import { resaltarElemento, limpiarResaltados } from "../../services/guide-highlight.service.js";

let simuladorInicializado = false;
let nivelActual = null;
let dialPadNumber = "";
let llamadaContacto = null;
let llamadaTimer = null;

// ---- DATOS ----
const FAVORITOS = [
    { nombre: "Sofía Castro",   iniciales: "S", color: "#9c27b0" },
    { nombre: "Pedro Pérez",   iniciales: "P", color: "#f4511e" },
];

const LLAMADAS_RECIENTES = [
    {
        id: 1, nombre: "Erick Delgado", iniciales: "E", color: "#f9ab00",
        tipo: "perdida", metaTexto: "Celular · Lun 18:07", carrier: "Claro", grupo: "Ayer"
    },
    {
        id: 2, nombre: "Sofía Castro", iniciales: "S", color: "#9c27b0",
        tipo: "saliente", metaTexto: "Celular · Sáb 18:24", carrier: "Tuenti", grupo: "Anterior"
    },
    {
        id: 3, nombre: "Samuel Medina", iniciales: "S", color: "#1a73e8",
        tipo: "saliente", metaTexto: "Celular · Sáb 17:12", carrier: "Tuenti", grupo: "Anterior"
    },
    {
        id: 4, nombre: "0994107983", iniciales: "?", color: "#9e9e9e",
        tipo: "bloqueada", metaTexto: "Ecuador · Sáb 09:22", carrier: "Claro", grupo: "Anterior",
        sinFoto: true
    },
    {
        id: 5, nombre: "Rosa Espinoza", iniciales: "R", color: "#e91e63",
        tipo: "entrante", metaTexto: "Celular · Vie 14:35", carrier: "Movistar", grupo: "Anterior"
    },
    {
        id: 6, nombre: "Pedro Pérez", iniciales: "P", color: "#f4511e",
        tipo: "saliente", metaTexto: "Celular · Vie 11:02", carrier: "Claro", grupo: "Anterior"
    },
];

const CONTACTOS = [
    // Favoritos
    { nombre: "Sofía Castro",    iniciales: "S", color: "#9c27b0",  telefono: "+593 993 907 785", fav: true },
    { nombre: "Pedro Pérez",    iniciales: "P", color: "#f4511e",  telefono: "+593 982 578 390", fav: true },
    // A
    { nombre: "Abigail López",    iniciales: "A", color: "#1e88e5",  telefono: "+593 97 904 6870" },
    { nombre: "Alberto Valenzuela",iniciales: "A", color: "#43a047",  telefono: "+593 980 909 090" },
    { nombre: "Adrián Aguilar",  iniciales: "A", color: "#00897b",  telefono: "+593 99 123 4567" },
    { nombre: "Adrián Cordero",   iniciales: "A", color: "#e57373",  telefono: "+593 98 765 4321" },
    { nombre: "Adriana Alarcón",         iniciales: "A", color: "#f48fb1",  telefono: "+593 99 876 5432" },
    { nombre: "Alonso Álvarez",       iniciales: "A", color: "#ce93d8",  telefono: "+593 98 234 5678" },
    { nombre: "Alejandro Cárdenas",iniciales: "A", color: "#80cbc4",  telefono: "+593 99 345 6789" },
    // C
    { nombre: "Carmen Rojas",     iniciales: "C", color: "#ff7043",  telefono: "+593 98 456 7890" },
    { nombre: "Carlos Miranda",   iniciales: "C", color: "#5c6bc0",  telefono: "+593 99 567 8901" },
    // D
    { nombre: "Dolores Palacios",   iniciales: "D", color: "#8bc34a",  telefono: "+593 98 678 9012" },
    // E
    { nombre: "Elena Vallejo",    iniciales: "E", color: "#7e57c2",  telefono: "+593 99 789 0123" },
    { nombre: "Ernesto Cabrera",  iniciales: "E", color: "#26a69a",  telefono: "+593 98 890 1234" },
    // G
    { nombre: "Gloria Calderón",   iniciales: "G", color: "#ab47bc",  telefono: "+593 99 901 2345" },
    // J
    { nombre: "José Maldonado",   iniciales: "J", color: "#2196f3",  telefono: "+593 98 012 3456" },
    // L
    { nombre: "Luis Guzmán",     iniciales: "L", color: "#ff9800",  telefono: "+593 99 123 4560" },
    // M
    { nombre: "Miguel Toledo",   iniciales: "M", color: "#f44336",  telefono: "+593 98 234 5670" },
    // N
    { nombre: "Erick Delgado",      iniciales: "E", color: "#f9ab00",  telefono: "+593 99 345 6780" },
    // P
    { nombre: "Patricia Muñoz",   iniciales: "P", color: "#ff9800",  telefono: "+593 98 456 7891" },
    { nombre: "Pedro Segura",   iniciales: "P", color: "#4caf50",  telefono: "+593 99 567 8902" },
    // R
    { nombre: "Ramón Fuentes",    iniciales: "R", color: "#00bcd4",  telefono: "+593 98 678 9013" },
    { nombre: "Roberto Suárez",   iniciales: "R", color: "#607d8b",  telefono: "+593 99 789 0124" },
    { nombre: "Rosa Espinoza",    iniciales: "R", color: "#e91e63",  telefono: "+593 98 890 1235" },
    // S
    { nombre: "Samuel Medina",   iniciales: "S", color: "#1a73e8",  telefono: "+593 99 901 2346" },
    { nombre: "Sandra Luna",    iniciales: "S", color: "#ff5722",  telefono: "+593 98 012 3467" },
    // T
    { nombre: "Tomás Hidalgo",   iniciales: "T", color: "#795548",  telefono: "+593 99 123 4568" },
];

// ---- ICONOS SVG DE LLAMADA ----
const SVG_PHONE = `<svg viewBox="0 0 24 24"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>`;
const SVG_ARROW_OUT = `<svg viewBox="0 0 24 24"><path d="M7 7h8.59L5 17.59 6.41 19 17 8.41V17h2V5H7v2z"/></svg>`;
const SVG_ARROW_IN  = `<svg viewBox="0 0 24 24"><path d="M19 7h-8.59L21 17.59 19.59 19 9 8.41V17H7V5h12v2z"/></svg>`;
const SVG_MISSED    = `<svg viewBox="0 0 24 24"><path d="M7 7h8.59L5 17.59 6.41 19 17 8.41V17h2V5H7v2z"/></svg>`;
const SVG_BLOCKED   = `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>`;

function iconoLlamada(tipo) {
    if (tipo === "perdida")   return `<span style="color:#d93025">${SVG_MISSED}</span>`;
    if (tipo === "bloqueada") return `<span style="color:#5f6368">${SVG_BLOCKED}</span>`;
    if (tipo === "entrante")  return `<span style="color:#5f6368">${SVG_ARROW_IN}</span>`;
    return `<span style="color:#5f6368">${SVG_ARROW_OUT}</span>`;
}

// ---- PLANTILLA HTML ----
function asegurarTemplateHTML() {
    const contenedor = $("#pantallaContactosSimulador");
    if (!contenedor || contenedor.children.length > 0) return;

    contenedor.innerHTML = `
        <!-- Barra de instrucciones (NICO Guía) -->
        <div id="ctInstructionsBar" class="ws-instructions-bar">
            <div class="ws-instructions-nico" style="cursor: pointer;" aria-label="Escuchar instrucción de Nico">
                <img src="./assets/img/icons/voz.svg" alt="Nico" class="ws-instructions-icono-nico">
                <small>NICO</small>
            </div>
            <div id="ctInstructionsText" class="ws-instructions-text">Cargando objetivo...</div>
        </div>

        <!-- ======= VISTA RECIENTES ======= -->
        <div id="ctViewRecientes" class="ct-view activa">
            <div class="ct-recent-header">
                <div class="ct-search-bar" id="ctSearchBarRecientes">
                    <button id="ctSalirBtn" class="ct-salir-btn" aria-label="Salir de Contactos">
                        <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                    </button>
                    <span id="ctSearchBarText" style="flex: 1;">Buscar contactos</span>
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
                <!-- Favoritos -->
                <div class="ct-section-label">
                    <span>Favoritos <span id="ctFavToggle">∧</span></span>
                    <button class="ct-ver-contactos-btn" id="ctVerContactosBtn">Ver contactos</button>
                </div>
                <div class="ct-favorites-row" id="ctFavoritesRow"></div>

                <!-- Llamadas -->
                <div id="ctCallsContent"></div>
            </div>
        </div>

        <!-- ======= VISTA CONTACTOS ======= -->
        <div id="ctViewContactos" class="ct-view">
            <div class="ct-contacts-header">
                <div class="ct-contacts-header-row">
                    <button class="ct-back-btn" id="ctContactosBack">
                        <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                    </button>
                    <input type="text" class="ct-contacts-search" placeholder="Buscar contactos" id="ctContactosSearch">
                    <button class="ct-profile-icon-btn">
                        <svg viewBox="0 0 24 24"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
                    </button>
                </div>
                <button class="ct-create-btn">
                    <svg viewBox="0 0 24 24"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                    Crear contacto
                </button>
            </div>
            <div id="ctContactsList" class="ct-contacts-list"></div>
        </div>

        <!-- ======= VISTA TECLADO ======= -->
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
                ${[
                    ["1","∞"], ["2","ABC"], ["3","DEF"],
                    ["4","GHI"], ["5","JKL"], ["6","MNO"],
                    ["7","PQRS"], ["8","TUV"], ["9","WXYZ"],
                    ["*",""], ["0","+"], ["#",""]
                ].map(([d,l]) => `
                    <button class="ct-dialpad-key" data-digit="${d}">
                        <span class="ct-dialpad-digit">${d}</span>
                        <span class="ct-dialpad-letters">${l}</span>
                    </button>
                `).join("")}
            </div>

            <div class="ct-dialpad-actions">
                <div class="ct-dialpad-placeholder"></div>
                <button class="ct-dialpad-call-btn" id="ctDialpadCallBtn">
                    ${SVG_PHONE}
                </button>
                <div class="ct-dialpad-placeholder"></div>
            </div>
        </div>

        <!-- ======= NAV INFERIOR ======= -->
        <nav class="ct-bottom-nav">
            <button class="ct-nav-tab activa" id="ctNavRecientes" data-view="ctViewRecientes">
                <div class="ct-nav-indicator"></div>
                <svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>
                <span>Recientes</span>
            </button>
            <button class="ct-nav-tab" id="ctNavTeclado" data-view="ctViewTeclado">
                <div class="ct-nav-indicator"></div>
                <svg viewBox="0 0 24 24"><path d="M12 19c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-9c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm4 5c0 1.1.9 2 2 2s2-.9 2-2-.9-2-2-2-2 .9-2 2zm0-9c0 1.1.9 2 2 2s2-.9 2-2-.9-2-2-2-2 .9-2 2zm0 4c0 1.1.9 2 2 2s2-.9 2-2-.9-2-2-2-2 .9-2 2zm-8 1c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2 2-.9 2-2zm0-4c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2 2-.9 2-2zm0 8c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2 2-.9 2-2z"/></svg>
                <span>Teclado</span>
            </button>
        </nav>

        <!-- ======= MODAL LLAMADA ACTIVA ======= -->
        <div id="ctCallModal" class="ct-call-modal">
            <div>
                <div class="ct-call-avatar-large" id="ctCallAvatarLarge" style="background:#1a73e8;">?</div>
                <div class="ct-call-name-label" id="ctCallNameLabel">—</div>
                <div class="ct-call-status-label" id="ctCallStatusLabel">Llamando...</div>
            </div>
            <div style="width:100%;">
                <div class="ct-call-btn-row" style="margin-bottom:24px;">
                    <button class="ct-call-ctrl-btn">
                        <svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
                    </button>
                    <button class="ct-call-ctrl-btn">
                        <svg viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
                    </button>
                    <button class="ct-call-ctrl-btn">
                        <svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/></svg>
                    </button>
                </div>
                <button class="ct-call-end-btn" id="ctCallEndBtn">
                    ${SVG_PHONE}
                </button>
            </div>
        </div>
    `;
}

// ---- RENDERIZAR LLAMADAS RECIENTES ----
function renderizarLlamadas() {
    const row = $("#ctFavoritesRow");
    if (row) {
        row.innerHTML = FAVORITOS.map(f => `
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
    LLAMADAS_RECIENTES.forEach(c => {
        if (c.grupo !== grupoActual) {
            grupoActual = c.grupo;
            html += `<div class="ct-date-label">${c.grupo}</div>`;
        }
        const avatarInner = c.sinFoto
            ? `<svg viewBox="0 0 24 24" style="width:26px;height:26px;fill:#ffffff;"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>`
            : c.iniciales;

        html += `
            <div class="ct-call-item" data-llamada-id="${c.id}">
                <div class="ct-call-avatar" style="background:${c.color};">${avatarInner}</div>
                <div class="ct-call-info">
                    <div class="ct-call-name">${c.nombre}</div>
                    <div class="ct-call-meta ${c.tipo === 'perdida' ? 'perdida' : ''}">
                        ${iconoLlamada(c.tipo)}
                        <span>${c.metaTexto}</span>
                    </div>
                    <div class="ct-call-carrier">${c.carrier}</div>
                </div>
                <button class="ct-call-phone-btn" data-nombre="${c.nombre}" data-color="${c.color}" data-iniciales="${c.sinFoto ? '?' : c.iniciales}" aria-label="Llamar a ${c.nombre}">
                    ${SVG_PHONE}
                </button>
            </div>
        `;
    });
    content.innerHTML = html;
}

// ---- RENDERIZAR CONTACTOS ----
function renderizarContactos(filtro = "") {
    const lista = $("#ctContactsList");
    if (!lista) return;

    const contactosFiltrados = CONTACTOS.filter(c =>
        c.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
        c.telefono.includes(filtro)
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

    // Favoritos
    const favs = contactosFiltrados.filter(c => c.fav);
    if (favs.length > 0) {
        html += `<div class="ct-fav-star-label"><svg viewBox="0 0 24 24"><path d="M11.99 2l-9 4v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V6l-9-4z"/></svg> Favoritos</div>`;
        favs.forEach((c, i) => {
            const isFirst = i === 0;
            const isLast = i === favs.length - 1;
            const cls = favs.length === 1 ? "solo" : isFirst ? "" : isLast ? "" : "";
            html += contactoHTML(c, isFirst, isLast, favs.length === 1);
        });
    }

    // Agrupar por letra
    const noFavs = contactosFiltrados.filter(c => !c.fav);
    const grupos = {};
    noFavs.forEach(c => {
        const letra = c.nombre[0].toUpperCase();
        if (!grupos[letra]) grupos[letra] = [];
        grupos[letra].push(c);
    });

    Object.keys(grupos).sort().forEach(letra => {
        html += `<div class="ct-alpha-label">${letra}</div>`;
        const grupo = grupos[letra];
        grupo.forEach((c, i) => {
            html += contactoHTML(c, i === 0, i === grupo.length - 1, grupo.length === 1);
        });
    });

    lista.innerHTML = html;
}

function contactoHTML(c, isFirst, isLast, isSolo) {
    let cls = "";
    if (isSolo) cls = "solo";
    else if (isFirst) cls = "";
    else if (isLast) cls = "";
    return `
        <div class="ct-contact-item ${cls}" data-nombre="${c.nombre}" data-color="${c.color}" data-iniciales="${c.iniciales}">
            <div class="ct-contact-avatar" style="background:${c.color};">${c.iniciales}</div>
            <div class="ct-contact-info">
                <div class="ct-contact-name">${c.nombre}</div>
                ${c.telefono ? `<div class="ct-contact-phone">Celular ${c.telefono}</div>` : ""}
            </div>
            <button class="ct-contact-call-btn" data-nombre="${c.nombre}" data-color="${c.color}" data-iniciales="${c.iniciales}" aria-label="Llamar a ${c.nombre}">
                ${SVG_PHONE}
            </button>
        </div>
    `;
}

// ---- NAVEGAR ENTRE VISTAS ----
function cambiarVista(viewId) {
    document.querySelectorAll("#pantallaContactosSimulador .ct-view").forEach(v => v.classList.remove("activa"));
    document.querySelectorAll("#pantallaContactosSimulador .ct-nav-tab").forEach(t => t.classList.remove("activa"));

    const view = $(`#${viewId}`);
    if (view) view.classList.add("activa");

    // Activar nav tab correspondiente
    const tab = document.querySelector(`[data-view="${viewId}"]`);
    if (tab) tab.classList.add("activa");
}

// ---- LLAMADA MODAL ----
function abrirLlamada(nombre, color, iniciales) {
    llamadaContacto = { nombre, color, iniciales };

    const modal = $("#ctCallModal");
    const avatarEl = $("#ctCallAvatarLarge");
    const nameEl = $("#ctCallNameLabel");
    const statusEl = $("#ctCallStatusLabel");

    if (avatarEl) { avatarEl.style.background = color; avatarEl.textContent = iniciales; }
    if (nameEl) nameEl.textContent = nombre;
    if (statusEl) statusEl.textContent = "Llamando...";
    if (modal) modal.classList.add("activa");

    // Simular que la llamada conecta
    if (llamadaTimer) clearTimeout(llamadaTimer);
    llamadaTimer = setTimeout(() => {
        if (statusEl) statusEl.textContent = "Llamada en curso...";
    }, 2000);
}

function cerrarLlamada() {
    const modal = $("#ctCallModal");
    if (modal) modal.classList.remove("activa");
    if (llamadaTimer) { clearTimeout(llamadaTimer); llamadaTimer = null; }
    llamadaContacto = null;
    dialPadNumber = "";
    actualizarDialpad();
}

// ---- TECLADO NUMÉRICO ----
function agregarDigito(digit) {
    if (dialPadNumber.length >= 15) return;
    dialPadNumber += digit;
    actualizarDialpad();
}

function borrarDigito() {
    dialPadNumber = dialPadNumber.slice(0, -1);
    actualizarDialpad();
}

function actualizarDialpad() {
    const numEl = $("#ctDialpadNumber");
    const delBtn = $("#ctDialpadDel");
    if (numEl) numEl.textContent = dialPadNumber || "\u200B";
    if (delBtn) {
        if (dialPadNumber.length > 0) delBtn.classList.remove("hidden");
        else delBtn.classList.add("hidden");
    }
}

// ---- LISTENERS ----
function inicializarListeners() {
    // Clic en la insignia Nico para repetir instrucción
    const nicoBtn = $("#ctInstructionsBar")?.querySelector(".ws-instructions-nico");
    if (nicoBtn) {
        nicoBtn.onclick = (e) => {
            e.stopPropagation();
            const textEl = $("#ctInstructionsText");
            if (textEl) {
                speak(textEl.textContent);
            }
        };
    }

    // Salir del simulador
    const btnSalir = $("#ctSalirBtn");
    if (btnSalir) {
        btnSalir.onclick = salir;
    }

    const searchBarText = $("#ctSearchBarText");
    if (searchBarText) {
        searchBarText.onclick = () => {
            cambiarVista("ctViewContactos");
            renderizarContactos();
            const input = $("#ctContactosSearch");
            if (input) input.focus();
        };
    }

    // Nav tabs
    document.querySelectorAll("#pantallaContactosSimulador .ct-nav-tab").forEach(tab => {
        tab.addEventListener("click", () => {
            const viewId = tab.dataset.view;
            if (viewId) cambiarVista(viewId);
            if (viewId === "ctViewTeclado") {
                actualizarDialpad();
            }
        });
    });

    // Ver contactos (botón en recientes)
    const verContactosBtn = $("#ctVerContactosBtn");
    if (verContactosBtn) {
        verContactosBtn.onclick = () => {
            cambiarVista("ctViewContactos");
            renderizarContactos();
        };
    }

    // Favorito → llamar
    const favsRow = $("#ctFavoritesRow");
    if (favsRow) {
        favsRow.addEventListener("click", e => {
            const item = e.target.closest(".ct-fav-item[data-fav-nombre]");
            if (item) {
                const nombre = item.dataset.favNombre;
                const fav = FAVORITOS.find(f => f.nombre === nombre);
                if (fav) abrirLlamada(fav.nombre, fav.color, fav.iniciales);
            }
        });
    }

    // Lista de llamadas recientes — botón teléfono
    const callsList = $("#ctCallsList");
    if (callsList) {
        callsList.addEventListener("click", e => {
            const btn = e.target.closest(".ct-call-phone-btn");
            if (btn) {
                abrirLlamada(btn.dataset.nombre, btn.dataset.color, btn.dataset.iniciales);
                return;
            }
        });
    }

    // Back de vista contactos
    const backBtn = $("#ctContactosBack");
    if (backBtn) backBtn.onclick = () => cambiarVista("ctViewRecientes");

    // Búsqueda en contactos
    const searchInput = $("#ctContactosSearch");
    if (searchInput) {
        searchInput.addEventListener("input", () => renderizarContactos(searchInput.value));
    }

    // Lista contactos → llamar
    const contactsList = $("#ctContactsList");
    if (contactsList) {
        contactsList.addEventListener("click", e => {
            const btn = e.target.closest(".ct-contact-call-btn");
            if (btn) {
                abrirLlamada(btn.dataset.nombre, btn.dataset.color, btn.dataset.iniciales);
            }
        });
    }

    // Teclado numérico
    const grid = document.querySelector("#pantallaContactosSimulador .ct-dialpad-grid");
    if (grid) {
        grid.addEventListener("click", e => {
            const key = e.target.closest(".ct-dialpad-key");
            if (key) agregarDigito(key.dataset.digit);
        });
    }

    // Borrar dígito
    const delBtn = $("#ctDialpadDel");
    if (delBtn) {
        delBtn.addEventListener("click", borrarDigito);
        // Long press → borrar todo
        let holdTimer = null;
        delBtn.addEventListener("mousedown", () => {
            holdTimer = setTimeout(() => { dialPadNumber = ""; actualizarDialpad(); }, 700);
        });
        delBtn.addEventListener("mouseup", () => clearTimeout(holdTimer));
        delBtn.addEventListener("touchstart", () => {
            holdTimer = setTimeout(() => { dialPadNumber = ""; actualizarDialpad(); }, 700);
        }, { passive: true });
        delBtn.addEventListener("touchend", () => clearTimeout(holdTimer), { passive: true });
    }

    // Llamar desde teclado
    const callBtn = $("#ctDialpadCallBtn");
    if (callBtn) {
        callBtn.onclick = () => {
            const num = dialPadNumber.trim();
            if (!num) return;
            abrirLlamada(num, "#34a853", num[0].toUpperCase());
        };
    }

    // Colgar llamada
    const endBtn = $("#ctCallEndBtn");
    if (endBtn) endBtn.onclick = cerrarLlamada;

    // Filtros de tabs en recientes
    document.querySelectorAll("#pantallaContactosSimulador .ct-filter-tab").forEach(tab => {
        tab.addEventListener("click", () => {
            document.querySelectorAll("#pantallaContactosSimulador .ct-filter-tab")
                .forEach(t => t.classList.remove("activa"));
            tab.classList.add("activa");
        });
    });
}

// ---- SALIR AL MÓDULO ----
function salir() {
    limpiarResaltados();
    cerrarLlamada();
    location.hash = "/modulo/Contactos";
}

const INSTRUCCIONES_CONTACTOS = {
    "buscar-contacto": "Usa la barra de búsqueda para encontrar un contacto.",
    "marcar-numero": "Toca la pestaña de Teclado y marca un número de teléfono.",
    "crear-contacto": "Toca la pestaña de Contactos y luego en Crear contacto.",
    "llamar-favorito": "Toca a uno de tus contactos favoritos para llamarlo.",
};

function actualizarGuiaVisualContactos(idNivel) {
    if (!idNivel) idNivel = nivelActual;
    if (idNivel === "buscar-contacto") {
        resaltarElemento("#ctSearchBarRecientes");
    } else if (idNivel === "marcar-numero") {
        resaltarElemento("#ctNavTeclado");
    } else if (idNivel === "crear-contacto") {
        resaltarElemento("#ctNavContactos");
    } else if (idNivel === "llamar-favorito") {
        resaltarElemento("#ctFavoritesRow");
    }
}

// ---- PUNTO DE ENTRADA ----
export function iniciarSimulador(idNivel) {
    nivelActual = idNivel;
    dialPadNumber = "";
    llamadaContacto = null;

    asegurarTemplateHTML();

    document.querySelectorAll(".pantalla").forEach(p => p.classList.remove("activa"));
    const sim = $("#pantallaContactosSimulador");
    if (sim) sim.classList.add("activa");

    // Resetear a vista inicial
    cambiarVista("ctViewRecientes");
    renderizarLlamadas();

    const msg = INSTRUCCIONES_CONTACTOS[idNivel] || "Explora tus contactos y llamadas.";
    const textEl = $("#ctInstructionsText");
    if (textEl) textEl.textContent = msg;

    speak(msg);
    actualizarGuiaVisualContactos(idNivel);

    if (!simuladorInicializado) {
        inicializarListeners();
        simuladorInicializado = true;
    }
}
