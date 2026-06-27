let selectedVoice = null;

function isNativeApp() {
    return window.Capacitor && window.Capacitor.isNativePlatform();
}

function getTextToSpeechPlugin() {
    if (
        window.Capacitor &&
        window.Capacitor.Plugins &&
        window.Capacitor.Plugins.TextToSpeech
    ) {
        return window.Capacitor.Plugins.TextToSpeech;
    }

    return null;
}

function loadSpanishMaleVoice() {
    if (!("speechSynthesis" in window)) {
        return;
    }

    const voices = speechSynthesis.getVoices();

    selectedVoice =
        voices.find(voice =>
            voice.lang.toLowerCase().startsWith("es") &&
            (
                voice.name.toLowerCase().includes("pablo") ||
                voice.name.toLowerCase().includes("jorge") ||
                voice.name.toLowerCase().includes("carlos") ||
                voice.name.toLowerCase().includes("miguel") ||
                voice.name.toLowerCase().includes("diego") ||
                voice.name.toLowerCase().includes("male") ||
                voice.name.toLowerCase().includes("hombre")
            )
        ) ||
        voices.find(voice =>
            voice.lang.toLowerCase().startsWith("es")
        ) ||
        null;
}

async function speakWithNativeTTS(text) {
    const TextToSpeech = getTextToSpeechPlugin();

    if (!TextToSpeech) {
        alert(text);
        return;
    }

    try {
        await TextToSpeech.stop();

        await TextToSpeech.speak({
            text: text,
            lang: "es-ES",
            rate: 1.1,
            pitch: 0.9,
            volume: 1.0,
            category: "ambient",
            queueStrategy: 1
        });
    } catch (error) {
        console.error("Error usando TextToSpeech nativo:", error);
        alert(text);
    }
}

function speakWithWebSpeech(text) {
    if (!("speechSynthesis" in window)) {
        alert(text);
        return;
    }

    speechSynthesis.cancel();

    loadSpanishMaleVoice();

    const voiceMessage = new SpeechSynthesisUtterance(text);

    voiceMessage.lang = "es-ES";
    voiceMessage.rate = 0.85;
    voiceMessage.pitch = 0.9;
    voiceMessage.volume = 1;

    if (selectedVoice) {
        voiceMessage.voice = selectedVoice;
        voiceMessage.lang = selectedVoice.lang;
    }

    speechSynthesis.speak(voiceMessage);
}

export async function speak(text) {
    if (isNativeApp()) {
        await speakWithNativeTTS(text);
        return;
    }

    speakWithWebSpeech(text);
}

export async function stopSpeech() {
    if (isNativeApp()) {
        const TextToSpeech = getTextToSpeechPlugin();

        if (TextToSpeech) {
            try {
                await TextToSpeech.stop();
            } catch (error) {
                console.error("Error deteniendo TextToSpeech nativo:", error);
            }
        }

        return;
    }

    if ("speechSynthesis" in window) {
        speechSynthesis.cancel();
    }
}

if ("speechSynthesis" in window) {
    loadSpanishMaleVoice();

    speechSynthesis.onvoiceschanged = function () {
        loadSpanishMaleVoice();
    };
}