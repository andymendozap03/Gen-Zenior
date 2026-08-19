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

function speakWithWebSpeech(text) {
    if (!("speechSynthesis" in window)) {
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

    speechSynthesis.speak(voiceMessage);
}

export async function speak(text) {
    await stopSpeech();

    if (window.nicoVoiceEnabled === false) return;

    speakWithWebSpeech(text);
}

export async function stopSpeech() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }

    if ("speechSynthesis" in window) {
        speechSynthesis.cancel();
    }
}