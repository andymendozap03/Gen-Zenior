import { $ } from "../utils/dom.js";
import { obtenerProgreso, obtenerTrofeosDesbloqueados } from "../services/progress.service.js";
import { LISTA_TROFEOS } from "../data/trophies.data.js";
import { datosModulos } from "../data/modules.data.js";
import { limpiarResaltados } from "../services/guide-highlight.service.js";

/**
 * Conecta los botones fijos de la pantalla de Trofeos (se llama una sola vez).
 */
export function inicializarTrofeos() {
    const btnVolver = $("#btnVolverTrofeos");
    if (btnVolver) {
        btnVolver.onclick = () => {
            limpiarResaltados();
            location.hash = "/";
        };
    }
}

/**
 * Repinta el contenido de la pantalla de Trofeos con el progreso actual.
 * Se llama cada vez que se entra a la pantalla, para reflejar los trofeos
 * y niveles ganados desde la última visita.
 */
export function renderizarTrofeos() {
    renderizarResumen();
    renderizarLogrosEspeciales();
    renderizarProgresoModulos();
}

function renderizarResumen() {
    const progreso = obtenerProgreso();
    const totalNiveles = Object.values(datosModulos).reduce((acc, m) => acc + m.niveles.length, 0);
    const totalCompletados = Object.values(progreso).reduce((acc, arr) => acc + arr.length, 0);

    const desbloqueados = obtenerTrofeosDesbloqueados();
    const totalLogros = LISTA_TROFEOS.length;
    const logrosGanados = Object.keys(desbloqueados).length;

    const elNiveles = $("#trofeosResumenNiveles");
    if (elNiveles) elNiveles.textContent = `${totalCompletados}/${totalNiveles}`;

    const elLogros = $("#trofeosResumenLogros");
    if (elLogros) elLogros.textContent = `${logrosGanados}/${totalLogros}`;
}

function renderizarLogrosEspeciales() {
    const contenedor = $("#trofeosLogrosContainer");
    if (!contenedor) return;

    const desbloqueados = obtenerTrofeosDesbloqueados();

    contenedor.innerHTML = LISTA_TROFEOS.map(trofeo => {
        const ganado = Boolean(desbloqueados[trofeo.id]);
        const fecha = ganado ? formatearFecha(desbloqueados[trofeo.id]) : "";
        const insigniaModulo = trofeo.moduloIcono
            ? `<img src="${trofeo.moduloIcono}" class="logro-insignia-modulo" alt="">`
            : "";

        return `
            <div class="logro-card ${ganado ? "ganado" : "bloqueado"}" style="--logro-color: ${trofeo.color}">
                <div class="logro-icono-wrap">
                    <img src="${trofeo.icono}" class="logro-icono" alt="">
                    ${insigniaModulo}
                    ${!ganado ? `<span class="logro-candado">🔒</span>` : ""}
                </div>
                <div class="logro-info">
                    <h3>${trofeo.titulo}</h3>
                    <p>${trofeo.descripcion}</p>
                    ${ganado ? `<span class="logro-fecha">Conseguido el ${fecha}</span>` : `<span class="logro-pendiente">Aún no conseguido</span>`}
                </div>
            </div>
        `;
    }).join("");
}

function renderizarProgresoModulos() {
    const contenedor = $("#trofeosProgresoContainer");
    if (!contenedor) return;

    const progreso = obtenerProgreso();

    contenedor.innerHTML = Object.entries(datosModulos).map(([idModulo, modulo]) => {
        const completados = progreso[idModulo] || [];

        const insignias = modulo.niveles.map((nivel, indice) => {
            const ganado = completados.includes(nivel.id);
            return `
                <div class="nivel-insignia-wrap">
                    <div class="nivel-insignia ${ganado ? "ganada" : "pendiente"}" style="--modulo-color: ${modulo.color}">
                        <img src="${nivel.imagen}" alt="">
                        ${ganado ? `<span class="nivel-insignia-check">✓</span>` : ""}
                    </div>
                    <span class="nivel-insignia-label">${nivel.titulo}</span>
                </div>
            `;
        }).join("");

        return `
            <div class="modulo-progreso-card">
                <div class="modulo-progreso-header" style="background: ${modulo.color}">
                    <span>${modulo.nombre}</span>
                    <span class="modulo-progreso-contador">${completados.length}/${modulo.niveles.length}</span>
                </div>
                <div class="modulo-progreso-insignias">${insignias}</div>
            </div>
        `;
    }).join("");
}

function formatearFecha(isoString) {
    try {
        const fecha = new Date(isoString);
        return fecha.toLocaleDateString("es-EC", { day: "numeric", month: "long", year: "numeric" });
    } catch (e) {
        return "";
    }
}
