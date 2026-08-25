import { $ } from "../utils/dom.js";
import { cargarAjustes, obtenerAjustes, guardarAjuste } from "../services/settings.service.js";
import { speak, stopSpeech } from "../services/speech.service.js";
import { limpiarProgresoTotal } from "../services/progress.service.js";

export function inicializarAjustes() {
    cargarAjustes();
    renderizarValoresAjustes();
    conectarEventosAjustes();
}

/**
 * Actualiza los elementos del DOM de ajustes con los valores almacenados
 */
export function renderizarValoresAjustes() {
    const s = obtenerAjustes();

    // 1. Voz de Nico
    const switchVoz = $("#switchVozNico");
    const containerVelocidad = $("#containerVelocidadVoz");
    if (switchVoz) {
        switchVoz.checked = Boolean(s.voiceEnabled);
    }
    if (containerVelocidad) {
        if (s.voiceEnabled) {
            containerVelocidad.classList.remove("deshabilitado");
        } else {
            containerVelocidad.classList.add("deshabilitado");
        }
    }

    // 2. Velocidad de voz activa
    const btnsVelocidad = document.querySelectorAll(".btn-ajuste-velocidad");
    btnsVelocidad.forEach(btn => {
        if (btn.dataset.speed === s.voiceSpeed) {
            btn.classList.add("activo");
        } else {
            btn.classList.remove("activo");
        }
    });

    // 3. Tamaño de fuente
    const btnsFuente = document.querySelectorAll(".btn-ajuste-fuente");
    btnsFuente.forEach(btn => {
        if (btn.dataset.fontSize === s.fontSize) {
            btn.classList.add("activo");
        } else {
            btn.classList.remove("activo");
        }
    });

    // 4. Modo Oscuro
    const switchDarkMode = $("#switchModoOscuro");
    if (switchDarkMode) {
        switchDarkMode.checked = Boolean(s.darkMode);
    }

    // 5. Alto Contraste
    const switchContraste = $("#switchAltoContraste");
    if (switchContraste) {
        switchContraste.checked = Boolean(s.highContrast);
    }

    // 6. Color de Resaltado Guía
    const btnsColor = document.querySelectorAll(".btn-ajuste-color");
    btnsColor.forEach(btn => {
        if (btn.dataset.color === s.highlightColor) {
            btn.classList.add("activo");
        } else {
            btn.classList.remove("activo");
        }
    });
}

/**
 * Conecta todos los eventos de interacción en la pantalla de ajustes
 */
function conectarEventosAjustes() {
    // 1. Switch de Voz de Nico
    const switchVoz = $("#switchVozNico");
    const containerVelocidad = $("#containerVelocidadVoz");
    if (switchVoz) {
        switchVoz.onchange = () => {
            const activo = switchVoz.checked;
            guardarAjuste("voiceEnabled", activo);
            if (containerVelocidad) {
                if (activo) {
                    containerVelocidad.classList.remove("deshabilitado");
                } else {
                    containerVelocidad.classList.add("deshabilitado");
                }
            }
            if (!activo) {
                stopSpeech();
            }
        };
    }

    // 2. Botones de Velocidad de Voz
    const btnsVelocidad = document.querySelectorAll(".btn-ajuste-velocidad");
    btnsVelocidad.forEach(btn => {
        btn.onclick = () => {
            const s = obtenerAjustes();
            if (!s.voiceEnabled) return; // Bloqueado si la voz está apagada

            const speed = btn.dataset.speed;
            guardarAjuste("voiceSpeed", speed);
            btnsVelocidad.forEach(b => b.classList.toggle("activo", b === btn));

            stopSpeech();
            const demo = speed === "lenta" 
                ? "Velocidad lenta activada. Hablo más despacio y con calma."
                : (speed === "rapida" ? "Velocidad rápida activada. Hablo de forma más ágil." : "Velocidad normal activada. Hablo a ritmo regular.");
            speak(demo);
        };
    });

    // 3. Botón de Probar Voz
    const btnProbarVoz = $("#btnProbarVozNico");
    if (btnProbarVoz) {
        btnProbarVoz.onclick = () => {
            const s = obtenerAjustes();
            if (!s.voiceEnabled) return;

            stopSpeech();
            const speed = s.voiceSpeed || "normal";
            const demo = speed === "lenta"
                ? "Hola, soy Nico. Estoy hablando a velocidad lenta para que me entiendas con tranquilidad."
                : (speed === "rapida" ? "Hola, soy Nico. Estoy hablando a velocidad rápida." : "Hola, soy Nico, tu asistente de voz en Gen-Zénior. Esta es mi velocidad normal.");
            speak(demo);
        };
    }

    // 4. Botones de Tamaño de Fuente
    const btnsFuente = document.querySelectorAll(".btn-ajuste-fuente");
    btnsFuente.forEach(btn => {
        btn.onclick = () => {
            const size = btn.dataset.fontSize;
            guardarAjuste("fontSize", size);
            btnsFuente.forEach(b => b.classList.toggle("activo", b === btn));
        };
    });

    // 5. Switch Modo Oscuro
    const switchDarkMode = $("#switchModoOscuro");
    if (switchDarkMode) {
        switchDarkMode.onchange = () => {
            guardarAjuste("darkMode", switchDarkMode.checked);
        };
    }

    // 6. Switch Alto Contraste
    const switchContraste = $("#switchAltoContraste");
    if (switchContraste) {
        switchContraste.onchange = () => {
            guardarAjuste("highContrast", switchContraste.checked);
        };
    }

    // 7. Botones de Color de Resaltado
    const btnsColor = document.querySelectorAll(".btn-ajuste-color");
    btnsColor.forEach(btn => {
        btn.onclick = () => {
            const color = btn.dataset.color;
            guardarAjuste("highlightColor", color);
            btnsColor.forEach(b => b.classList.toggle("activo", b === btn));
        };
    });

    // 8. Botón Reiniciar Progreso y Modal de Advertencia
    const btnReiniciarProgreso = $("#btnReiniciarProgreso");
    const modalConfirmarReinicio = $("#modalConfirmarReinicio");
    const btnCancelarReinicio = $("#btnCancelarReinicio");
    const btnConfirmarReinicio = $("#btnConfirmarReinicio");

    if (btnReiniciarProgreso && modalConfirmarReinicio) {
        btnReiniciarProgreso.onclick = () => {
            modalConfirmarReinicio.classList.add("activa");
        };
    }

    if (btnCancelarReinicio && modalConfirmarReinicio) {
        btnCancelarReinicio.onclick = () => {
            modalConfirmarReinicio.classList.remove("activa");
        };
    }

    if (btnConfirmarReinicio && modalConfirmarReinicio) {
        btnConfirmarReinicio.onclick = () => {
            limpiarProgresoTotal();
            modalConfirmarReinicio.classList.remove("activa");

            stopSpeech();
            speak("Tu progreso ha sido reiniciado con éxito. Ya puedes volver a practicar todos los niveles.");

            // Mostrar toast breve de confirmación
            mostrarAvisoReinicioExitoso();
        };
    }
}

function mostrarAvisoReinicioExitoso() {
    let toast = $("#toastAjustes");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toastAjustes";
        toast.className = "toast-ajustes-exito";
        document.body.appendChild(toast);
    }
    toast.textContent = "✓ Progreso de niveles reiniciado correctamente";
    toast.classList.add("mostrar");
    setTimeout(() => {
        toast.classList.remove("mostrar");
    }, 3500);
}
