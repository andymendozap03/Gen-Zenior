// ==========================================
// CONFIGURACIÓN DE NICO
// ==========================================

// INTERRUPTOR: true = Usa ElevenLabs | false = Usa el navegador (WebSpeech) para depurar gratis




// ==========================================
// VARIABLES DE CONTROL GLOBAL
// ==========================================
let currentAudio = null;   // Controla el audio de ElevenLabs
let selectedVoice = null;  // Controla la voz del navegador

// ==========================================
// CARGA PREVIA DE VOCES DEL NAVEGADOR (FALLBACK)
// ==========================================
function loadSpanishMaleVoice() {
    if (!("speechSynthesis" in window)) return;
    const voices = speechSynthesis.getVoices();
    const maleNames = ["pablo", "jorge", "carlos", "miguel", "diego", "alvaro", "tomas"];

    selectedVoice = voices.find(voice => 
        voice.lang.toLowerCase().startsWith("es") &&
        (voice.name.toLowerCase().includes("premium") || voice.name.toLowerCase().includes("enhanced")) &&
        (voice.name.toLowerCase().includes("male") || voice.name.toLowerCase().includes("hombre") || maleNames.some(name => voice.name.toLowerCase().includes(name)))
    ) || voices.find(voice =>
        voice.lang.toLowerCase().startsWith("es") &&
        (voice.name.toLowerCase().includes("male") || voice.name.toLowerCase().includes("hombre") || maleNames.some(name => voice.name.toLowerCase().includes(name)))
    ) || voices.find(voice => voice.lang.toLowerCase().startsWith("es")) || null;
}

if ("speechSynthesis" in window) {
    loadSpanishMaleVoice();
    speechSynthesis.onvoiceschanged = loadSpanishMaleVoice;
}

// ==========================================
// MOTORES DE AUDIO
// ==========================================


// Motor 2: WebSpeech (Navegador configurado para sonar juvenil)
function speakWithWebSpeech(text) {
    if (!("speechSynthesis" in window)) {
        alert(text);
        return;
    }

    if (!selectedVoice) loadSpanishMaleVoice(); 

    const voiceMessage = new SpeechSynthesisUtterance(text);
    voiceMessage.lang = "es-ES"; 
    voiceMessage.rate = 1; // Fluido
    voiceMessage.pitch = 1;  // Tono de 16 años suave

    if (selectedVoice) {
        voiceMessage.voice = selectedVoice;
        voiceMessage.lang = selectedVoice.lang;
    }

    speechSynthesis.speak(voiceMessage);
}

// ==========================================
// CONTROLADORES PRINCIPALES (EXPORTABLES)
// ==========================================

export async function speak(text) {
    await stopSpeech();

    
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