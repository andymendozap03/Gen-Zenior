let selectedVoice = null;
let currentAudio = null;

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


function speakWithWebSpeech(text) {
    if (!("speechSynthesis" in window)) {
        alert(text);
        return;
    }

    if (!selectedVoice) loadSpanishMaleVoice();

    const voiceMessage = new SpeechSynthesisUtterance(text);
    voiceMessage.lang = "es-ES";
    voiceMessage.rate = 1;
    voiceMessage.pitch = 1;

    if (selectedVoice) {
        voiceMessage.voice = selectedVoice;
        voiceMessage.lang = selectedVoice.lang;
    }

    speechSynthesis.speak(voiceMessage);
}


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