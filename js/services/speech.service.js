let selectedVoice = null;
let currentAudio = null;

const MALE_KEYWORDS = [
    "alvaro", "jorge", "raul", "carlos", "miguel", "diego", "gonzalo",
    "mateo", "alonso", "julio", "arnau", "pablo", "tomas", "enrique",
    "manuel", "pedro", "javier", "luis", "male", "hombre"
];

const FEMALE_KEYWORDS = [
    "helena", "sabina", "laura", "monica", "paulina", "lucia", "elena",
    "maria", "sofia", "carmen", "female", "mujer", "rosa", "mia",
    "conchita", "penelope", "paola", "dalia", "elvira", "victoria",
    "lupe", "ximena", "juana", "marta", "silvia", "valeria", "esperanza",
    "hilda", "francisca", "camila", "ines", "soledad", "teresa", "zira"
];

function isFemaleVoice(voice) {
    if (!voice) return false;
    const name = (voice.name || "").toLowerCase();
    const uri = (voice.voiceURI || "").toLowerCase();
    return FEMALE_KEYWORDS.some(k => name.includes(k) || uri.includes(k));
}

function isMaleVoice(voice) {
    if (!voice) return false;
    const name = (voice.name || "").toLowerCase();
    const uri = (voice.voiceURI || "").toLowerCase();
    return !isFemaleVoice(voice) && MALE_KEYWORDS.some(k => name.includes(k) || uri.includes(k));
}

function loadSpanishMaleVoice() {
    if (!("speechSynthesis" in window)) return;
    const voices = speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return;

    const spanishVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith("es"));
    if (spanishVoices.length === 0) return;

    // 1. Si ya teníamos una guardada en localStorage que sea válida y no femenina, conservarla
    const savedVoiceURI = localStorage.getItem("gz_nico_voice_uri");
    if (savedVoiceURI) {
        const found = spanishVoices.find(v => (v.voiceURI === savedVoiceURI || v.name === savedVoiceURI) && !isFemaleVoice(v));
        if (found) {
            selectedVoice = found;
            return;
        }
    }

    // 2. Buscar voz española masculina Natural / Online / Premium / Enhanced
    let bestVoice = spanishVoices.find(v =>
        isMaleVoice(v) &&
        (v.name.toLowerCase().includes("natural") || v.name.toLowerCase().includes("premium") || v.name.toLowerCase().includes("enhanced") || v.name.toLowerCase().includes("online"))
    );

    // 3. Buscar cualquier voz española masculina conocida
    if (!bestVoice) {
        bestVoice = spanishVoices.find(v => isMaleVoice(v));
    }

    // 4. Buscar cualquier voz en español que NO esté en la lista negra de nombres femeninos
    if (!bestVoice) {
        bestVoice = spanishVoices.find(v => !isFemaleVoice(v));
    }

    // 5. Fallback final si el dispositivo solo tiene una voz
    if (!bestVoice) {
        bestVoice = spanishVoices[0];
    }

    if (bestVoice) {
        selectedVoice = bestVoice;
        try {
            localStorage.setItem("gz_nico_voice_uri", bestVoice.voiceURI || bestVoice.name);
        } catch (e) {}
    }
}

if ("speechSynthesis" in window) {
    loadSpanishMaleVoice();
    speechSynthesis.onvoiceschanged = () => {
        // Solo re-evaluar si aún no se ha seleccionado una voz masculina confirmada
        if (!selectedVoice || isFemaleVoice(selectedVoice)) {
            loadSpanishMaleVoice();
        }
    };
}

function speakWithWebSpeech(text, onEnd) {
    if (!("speechSynthesis" in window)) {
        if (typeof onEnd === "function") onEnd();
        return;
    }

    if (!selectedVoice || isFemaleVoice(selectedVoice)) {
        loadSpanishMaleVoice();
    }

    const voiceMessage = new SpeechSynthesisUtterance(text);
    voiceMessage.rate = 0.95;

    if (selectedVoice) {
        voiceMessage.voice = selectedVoice;
        voiceMessage.lang = selectedVoice.lang;
        voiceMessage.pitch = isFemaleVoice(selectedVoice) ? 0.8 : 1.0;
    } else {
        voiceMessage.lang = "es-ES";
        voiceMessage.pitch = 0.9;
    }

    let ended = false;
    let vigilante = null;
    let mantenerVivo = null;

    const triggerEnd = () => {
        if (ended) return;
        ended = true;

        if (vigilante) clearTimeout(vigilante);
        if (mantenerVivo) clearInterval(mantenerVivo);

        if (typeof onEnd === "function") onEnd();
    };

    voiceMessage.onend = triggerEnd;
    voiceMessage.onerror = triggerEnd;

    speechSynthesis.speak(voiceMessage);

    // Chrome corta las frases largas pasados unos segundos si no se le insiste
    mantenerVivo = setInterval(() => {
        if (ended || !speechSynthesis.speaking) return;
        speechSynthesis.pause();
        speechSynthesis.resume();
    }, 8000);

    // Red de seguridad: si el navegador nunca avisa de que terminó, la cola
    // no se puede quedar bloqueada. Se calcula por longitud del texto.
    const duracionEstimada = 2500 + text.length * 110;
    vigilante = setTimeout(triggerEnd, duracionEstimada);
}

/* ----------------------------------------------------------------------
   COLA DE VOZ
   Antes cada frase nueva cancelaba la anterior, así que Nico se cortaba a
   media frase cada vez que la guía avanzaba de paso. Ahora las frases se
   encolan y se dicen enteras, una detrás de otra.
   ---------------------------------------------------------------------- */
let colaVoz = [];
let hablando = false;

function procesarColaVoz() {
    if (colaVoz.length === 0) {
        hablando = false;
        return;
    }

    hablando = true;
    const item = colaVoz.shift();

    speakWithWebSpeech(item.text, () => {
        if (typeof item.onEnd === "function") item.onEnd();
        procesarColaVoz();
    });
}

/**
 * Encola una frase. Se dirá completa, después de las que ya estén esperando.
 */
export function speak(text, onEnd) {
    if (window.nicoVoiceEnabled === false || !text || !String(text).trim()) {
        if (typeof onEnd === "function") onEnd();
        return;
    }

    colaVoz.push({ text: String(text), onEnd });
    if (!hablando) procesarColaVoz();
}

/**
 * Corta lo que se esté diciendo y dice esta frase enseguida. Para avisos que
 * no pueden esperar, como "¡Nivel completado!".
 */
export function speakPrioritario(text, onEnd) {
    colaVoz = [];
    hablando = false;

    if ("speechSynthesis" in window) {
        speechSynthesis.cancel();
    }

    speak(text, onEnd);
}

export async function stopSpeech() {
    colaVoz = [];
    hablando = false;

    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }

    if ("speechSynthesis" in window) {
        speechSynthesis.cancel();
    }
}