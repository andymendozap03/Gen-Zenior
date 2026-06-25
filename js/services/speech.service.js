let selectedVoice = null;

function loadSpanishMaleVoice() {
    const voices = speechSynthesis.getVoices();

   
    selectedVoice =
        voices.find(voice =>
            voice.lang.toLowerCase().includes("es") &&
            (
                voice.name.toLowerCase().includes("pablo") ||
                voice.name.toLowerCase().includes("jorge") ||
                voice.name.toLowerCase().includes("carlos") ||
                voice.name.toLowerCase().includes("miguel") ||
                voice.name.toLowerCase().includes("male") ||
                voice.name.toLowerCase().includes("hombre")
            )
        ) ||

   
        voices.find(voice =>
            voice.lang.toLowerCase().includes("es") &&
            voice.name.toLowerCase().includes("microsoft")
        ) ||

        voices.find(voice =>
            voice.lang.toLowerCase().includes("es") &&
            voice.name.toLowerCase().includes("google")
        ) ||


        voices.find(voice =>
            voice.lang.toLowerCase().includes("es")
        ) ||

        null;
}

export function speak(text) {
    if (!("speechSynthesis" in window)) {
        alert(text);
        return;
    }

    speechSynthesis.cancel();

    loadSpanishMaleVoice();

    const voiceMessage = new SpeechSynthesisUtterance(text);

    voiceMessage.lang = "es-ES";

    voiceMessage.rate = 1;    
    voiceMessage.pitch = 0.9;    
    voiceMessage.volume = 1;     

    if (selectedVoice) {
        voiceMessage.voice = selectedVoice;
    }

    speechSynthesis.speak(voiceMessage);
}

export function stopSpeech() {
    if ("speechSynthesis" in window) {
        speechSynthesis.cancel();
    }
}

if ("speechSynthesis" in window) {
    speechSynthesis.onvoiceschanged = loadSpanishMaleVoice;
}