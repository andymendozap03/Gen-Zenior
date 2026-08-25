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
        } catch (e) { }
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

/**
 * @param {Function} sigueVigente devuelve false si el usuario ya avanzó y esta
 *        frase quedó obsoleta mientras esperaba su turno para sonar.
 */
function speakWithWebSpeech(text, onEnd, sigueVigente) {
    if (!("speechSynthesis" in window)) {
        if (typeof onEnd === "function") onEnd();
        return;
    }

    if (!selectedVoice) {
        loadSpanishMaleVoice();
    }

    let ended = false;
    let comenzo = false;
    let vigilante = null;
    let mantenerVivo = null;

    // Se calcula antes de crear la frase: así el vigilante puede reiniciarse
    // en cuanto arranque de verdad, sin depender del orden de declaración.
    const duracionEstimada = 3000 + text.length * 110;

    const triggerEnd = () => {
        if (ended) return;
        ended = true;
        if (comenzo) yaSonoAlguna = true;

        if (vigilante) clearTimeout(vigilante);
        if (mantenerVivo) clearInterval(mantenerVivo);

        if (typeof onEnd === "function") onEnd();
    };

    // Se crea una frase nueva en cada intento: algunos motores no aceptan
    // reutilizar el mismo objeto después de descartarlo.
    const crearFrase = () => {
        const frase = new SpeechSynthesisUtterance(text);
        
        let speechRate = 0.95;
        if (window.nicoVoiceSpeed === "lenta") {
            speechRate = 0.65;
        } else if (window.nicoVoiceSpeed === "rapida") {
            speechRate = 1.4;
        }
        frase.rate = speechRate;

        if (selectedVoice) {
            frase.voice = selectedVoice;
            frase.lang = selectedVoice.lang;
            frase.pitch = isFemaleVoice(selectedVoice) ? 0.8 : 1.0;
        } else {
            frase.lang = "es-ES";
            frase.pitch = 0.9;
        }

        frase.onstart = () => {
            comenzo = true;
            yaSonoAlguna = true;
            // El margen de seguridad debe contar desde que el motor empieza
            // a sonar de verdad: en móvil puede tardar 1-3 s en arrancar, y
            // si no se reinicia aquí, la frase se corta antes de terminar
            // porque el tiempo se gastó esperando a que empezara.
            if (vigilante) clearTimeout(vigilante);
            vigilante = setTimeout(triggerEnd, duracionEstimada);
        };
        frase.onend = triggerEnd;
        frase.onerror = triggerEnd;
        return frase;
    };

    const lanzar = (esReintento) => {
        // El usuario ya avanzó mientras esperábamos: esta frase ya no toca
        if (typeof sigueVigente === "function" && !sigueVigente()) {
            triggerEnd();
            return;
        }

        try {
            // resume() saca al motor de un estado pausado, en el que a veces
            // se queda tras un cancel()
            speechSynthesis.resume();
        } catch (e) { /* no todos los motores lo permiten */ }

        // Mientras no se haya oído ninguna frase, se quema un turno antes de
        // cada intento: si el navegador va a descartar una, que descarte el cebo.
        if (!yaSonoAlguna && !esReintento) cebarMotor();

        try {
            speechSynthesis.speak(crearFrase());
        } catch (e) {
            triggerEnd();
            return;
        }

        if (esReintento) return;

        // Chrome y Safari se tragan la primera frase de la sesión: si a los
        // 600 ms no ha empezado a sonar, se vuelve a pedir una vez. Es
        // exactamente el caso de "la primera no suena, la segunda sí". El
        // margen es algo mayor que antes porque en móvil el motor puede
        // tardar un poco en arrancar sin que eso signifique que se perdió.
        setTimeout(() => {
            if (ended || comenzo || speechSynthesis.speaking) return;
            // Por si quedó algo a medio encolar que nunca llegó a sonar: se
            // limpia antes de reintentar para no acabar con dos frases a la vez.
            try { speechSynthesis.cancel(); } catch (e) { }
            lanzar(true);
        }, 600);
    };

    // Se lanza AHORA, sin esperar: si se retrasa, iOS ya no lo considera parte
    // del toque del usuario y no deja sonar la primera frase.
    lanzar(false);

    // Chrome corta las frases largas pasados unos segundos si no se le insiste
    mantenerVivo = setInterval(() => {
        if (ended || !speechSynthesis.speaking) return;
        speechSynthesis.pause();
        speechSynthesis.resume();
    }, 8000);

    // Red de seguridad: si el navegador nunca avisa de que terminó (ni de que
    // empezó), la guía no se puede quedar bloqueada. Se reinicia con la
    // misma duración en cuanto la frase arranca de verdad (ver onstart).
    vigilante = setTimeout(triggerEnd, duracionEstimada);
}

/* ----------------------------------------------------------------------
   ARRANQUE DE LA VOZ

   Dos motivos por los que Nico se quedaba mudo al entrar al primer nivel:

   1. Safari en iOS (y Chrome en móvil) solo permiten que el motor de voz
      arranque desde un toque directo del usuario. La primera frase de un nivel
      no sale del toque, sino un instante después, así que la bloqueaban.
      Se resuelve "despertando" el motor con una frase vacía en el primer
      toque que el usuario haga en cualquier parte de la aplicación.

   2. La lista de voces del sistema se carga aparte y tarda un poco. Si se
      habla antes, sale sin voz elegida.
   ---------------------------------------------------------------------- */
let vozDespierta = false;

// Se pone a true en cuanto una frase empieza a sonar de verdad
let yaSonoAlguna = false;

/**
 * "Quema" el primer turno del motor de voz.
 *
 * Chrome y Safari descartan la primera frase que reciben, sin avisar: por eso
 * la primera instrucción de Nico no se oía y la segunda sí. Una frase en
 * blanco no sirve, porque el navegador ni la cuenta. Tiene que ser una frase
 * de verdad, pero a volumen cero para que nadie la oiga: así la que se traga
 * es esta y la siguiente, la que importa, suena.
 */
// despertarVoz(), prepararVoz() y la primera frase real pueden llamar a esto
// por caminos distintos: sin este candado se encolaban varios "Hola" seguidos
// y Nico tardaba de más en arrancar, porque el motor los dice uno detrás de
// otro antes de llegar a la frase de verdad. Con uno solo por sesión basta.
let cebado = false;

function cebarMotor() {
    if (cebado || !("speechSynthesis" in window)) return;
    cebado = true;

    try {
        const cebo = new SpeechSynthesisUtterance("Hola");
        cebo.volume = 0;
        cebo.rate = 2;
        cebo.lang = "es-ES";
        if (selectedVoice) cebo.voice = selectedVoice;
        speechSynthesis.speak(cebo);
    } catch (e) {
        // Si el navegador no lo permite, se reintenta la próxima vez
        cebado = false;
    }
}

function despertarVoz() {
    if (vozDespierta || !("speechSynthesis" in window)) return;
    vozDespierta = true;

    cebarMotor();

    // Aprovechamos el toque para pedir la lista de voces
    loadSpanishMaleVoice();
}

if (typeof document !== "undefined") {
    ["pointerdown", "touchstart", "mousedown", "keydown"].forEach(evento => {
        document.addEventListener(evento, despertarVoz, { capture: true, once: true });
    });
}

/**
 * Espera a que el navegador tenga lista la lista de voces, sin quedarse
 * colgado si nunca llega.
 */
let promesaVoces = null;

function vocesListas() {
    // Se espera UNA sola vez por sesión: si no, cada frase pagaría la espera
    if (promesaVoces) return promesaVoces;

    promesaVoces = new Promise(resolve => {
        if (!("speechSynthesis" in window)) return resolve();
        if (speechSynthesis.getVoices().length > 0) return resolve();

        let resuelto = false;
        const terminar = () => {
            if (resuelto) return;
            resuelto = true;
            loadSpanishMaleVoice();
            resolve();
        };

        if (typeof speechSynthesis.addEventListener === "function") {
            speechSynthesis.addEventListener("voiceschanged", terminar, { once: true });
        } else {
            // Navegadores antiguos solo ofrecen la propiedad
            const anterior = speechSynthesis.onvoiceschanged;
            speechSynthesis.onvoiceschanged = () => {
                if (typeof anterior === "function") anterior();
                terminar();
            };
        }

        setTimeout(terminar, 900);
    });

    return promesaVoces;
}

/**
 * Precarga que usa la pantalla de carga: deja las voces listas antes de que
 * el usuario llegue al primer nivel.
 */
export function prepararVoz() {
    return vocesListas().then(() => {
        // Se ceba ya durante la pantalla de carga: así, cuando el usuario
        // llegue al primer nivel, el turno descartado ya está gastado.
        cebarMotor();
    });
}

/* ----------------------------------------------------------------------
   VOZ DE NICO

   Comportamiento normal: cada frase nueva reemplaza a la anterior. Si el
   usuario se adelanta, Nico deja de decir lo viejo y pasa a lo nuevo.

   Excepción: las frases protegidas (por ejemplo "¡Nivel completado!") se
   dicen enteras; mientras suenan se descarta cualquier otra.

   Si existe js/data/voz.config.js con una clave de ElevenLabs, se usa esa voz.
   Si no existe, falla o no hay internet, se usa la voz del navegador.
   ---------------------------------------------------------------------- */
let fraseProtegida = false;

// Cada frase nueva sube el turno: lo que llegue tarde (audio descargado
// después de que el usuario ya avanzó) se descarta.
let turnoVoz = 0;

// ---------- ELEVENLABS (opcional) ----------
let configEleven;                 // undefined = sin comprobar, null = no disponible
const audiosEleven = new Map();   // frase -> URL del audio ya descargado

async function obtenerConfigEleven() {
    if (configEleven !== undefined) return configEleven;

    try {
        const mod = await import("../data/voz.config.js");
        const cfg = mod.VOZ_ELEVENLABS || mod.default;

        // Las claves buenas de ElevenLabs empiezan por "sk_". El identificador
        // de la clave (que es otra cosa) no sirve para autenticarse.
        configEleven = (cfg && typeof cfg.apiKey === "string" && cfg.apiKey.startsWith("sk_") && cfg.voiceId)
            ? cfg
            : null;

        if (cfg && configEleven === null) {
            console.warn("Voz de ElevenLabs desactivada: la clave debe empezar por 'sk_'. Se usa la voz del navegador.");
        }
    } catch (e) {
        configEleven = null; // no hay archivo de configuración: voz del navegador
    }

    return configEleven;
}

async function obtenerAudioEleven(texto, cfg) {
    if (audiosEleven.has(texto)) return audiosEleven.get(texto);

    const respuesta = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${cfg.voiceId}`, {
        method: "POST",
        headers: {
            "xi-api-key": cfg.apiKey,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg"
        },
        body: JSON.stringify({
            text: texto,
            model_id: cfg.modelId || "eleven_multilingual_v2",
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.8,
                speed: cfg.velocidad || 0.9
            }
        })
    });

    if (!respuesta.ok) throw new Error("ElevenLabs respondió " + respuesta.status);

    // Se guarda la frase ya descargada: la guía repite mucho las mismas y así
    // no se gastan créditos ni se espera dos veces por lo mismo.
    const url = URL.createObjectURL(await respuesta.blob());
    audiosEleven.set(texto, url);
    return url;
}

function reproducirAudio(url, texto, onEnd, miTurno) {
    const audio = new Audio(url);
    currentAudio = audio;

    if (window.nicoVoiceSpeed === "lenta") {
        audio.playbackRate = 0.75;
    } else if (window.nicoVoiceSpeed === "rapida") {
        audio.playbackRate = 1.35;
    } else {
        audio.playbackRate = 1.0;
    }

    let terminado = false;
    const terminar = () => {
        if (terminado) return;
        terminado = true;
        if (currentAudio === audio) currentAudio = null;
        if (typeof onEnd === "function") onEnd();
    };

    audio.onended = terminar;
    audio.onerror = terminar;

    audio.play().catch(() => {
        // El navegador bloqueó el audio (suele pasar si aún no ha habido
        // ningún toque en la página): se recurre a la voz del sistema
        if (currentAudio === audio) currentAudio = null;
        if (turnoVoz === miTurno) {
            speakWithWebSpeech(texto, onEnd, () => turnoVoz === miTurno);
        } else {
            terminar();
        }
        terminado = true;
    });
}

/**
 * Dice una frase con la mejor voz disponible. Corta la que estuviera sonando.
 */
export function speak(text, onEnd) {
    if (fraseProtegida) {
        if (typeof onEnd === "function") onEnd();
        return;
    }
    decir(String(text || ""), onEnd, false);
}

/**
 * Dice una frase que no se puede cortar: hasta que termine se descarta el
 * resto de avisos. Para el mensaje de nivel completado.
 */
export function speakPrioritario(text, onEnd) {
    fraseProtegida = false;
    decir(String(text || ""), () => {
        fraseProtegida = false;
        if (typeof onEnd === "function") onEnd();
    }, true);
}

function decir(texto, onEnd, protegida) {
    if (window.nicoVoiceEnabled === false || !texto.trim()) {
        if (typeof onEnd === "function") onEnd();
        return;
    }

    callar();
    const miTurno = ++turnoVoz;
    if (protegida) fraseProtegida = true;
    const vigente = () => turnoVoz === miTurno;

    // Por si el motor sigue dormido (primera frase de la sesión)
    despertarVoz();

    /* IMPORTANTE: aquí NO se puede esperar a ninguna promesa.
       Safari en iOS solo deja arrancar la voz si speechSynthesis.speak() se
       llama dentro del mismo toque del usuario. Antes se esperaba a la lista
       de voces y a la configuración de ElevenLabs, y para cuando se hablaba el
       toque ya había pasado: por eso la primera frase nunca se oía y la
       segunda sí (el intento fallido desbloqueaba el motor). */
    if (configEleven === undefined) {
        // Todavía no sabemos si hay ElevenLabs configurado. No se espera: se
        // habla ya con la voz del navegador y se averigua para las siguientes.
        obtenerConfigEleven();
        speakWithWebSpeech(texto, onEnd, vigente);
        return;
    }

    if (!configEleven) {
        // Caso normal: voz del navegador, dicha en el acto
        speakWithWebSpeech(texto, onEnd, vigente);
        return;
    }

    // Con ElevenLabs sí hay que esperar a que baje el audio
    obtenerAudioEleven(texto, configEleven)
        .then(url => {
            if (turnoVoz !== miTurno) return;
            reproducirAudio(url, texto, onEnd, miTurno);
        })
        .catch(err => {
            console.warn("ElevenLabs no disponible, se usa la voz del navegador:", err.message);
            if (turnoVoz === miTurno) speakWithWebSpeech(texto, onEnd, vigente);
        });
}

function callar() {
    if (currentAudio) {
        currentAudio.onended = null;
        currentAudio.onerror = null;
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }

    // Solo se cancela si hay algo sonando o en cola: pedir cancel() y speak()
    // seguidos hace que Chrome descarte la frase nueva.
    if ("speechSynthesis" in window && (speechSynthesis.speaking || speechSynthesis.pending)) {
        speechSynthesis.cancel();
    }
}

export async function stopSpeech() {
    // Salir de la pantalla o pulsar a Nico siempre puede callarlo
    fraseProtegida = false;
    turnoVoz++;
    callar();
}
