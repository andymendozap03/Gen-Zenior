import { prepararVoz } from "./speech.service.js";

/**
 * PRECARGA DE RECURSOS
 *
 * Deja preparado lo que hace falta para que el primer nivel no se sienta
 * lento: los iconos, las miniaturas, la ficha de cada video y la lista de
 * voces del sistema.
 *
 * Lo que NO se espera:
 *   - Los videos enteros (son 94 MB). Solo se pide su ficha, que son unos
 *     pocos kilobytes y basta para que arranquen al instante.
 *   - Las fotos grandes de Facebook (9,5 MB). Esas se bajan por detrás, ya
 *     con la aplicación en marcha, para no hacer esperar al usuario.
 */

// Iconos, logos y miniaturas: pesan poco y se ven desde el primer momento
const IMAGENES_ESENCIALES = [
    "./assets/img/Logo.webp",
    "./assets/img/WhatsApp.webp",
    "./assets/img/Facebook.webp",
    "./assets/img/Youtube.png",
    "./assets/img/Contactos.png",
    "./assets/img/creditos.png",

    "./assets/img/icons/voz.svg",
    "./assets/img/icons/trofeo.svg",
    "./assets/img/icons/ajustes.svg",
    "./assets/img/icons/flecha-derecha.svg",
    "./assets/img/icons/flecha-izquierda.svg",

    "./assets/img/levels/mensaje.png",
    "./assets/img/levels/microfono.png",
    "./assets/img/levels/llamada.png",
    "./assets/img/levels/llamar.png",
    "./assets/img/levels/foto.png",
    "./assets/img/levels/estado.png",
    "./assets/img/levels/reaccionar.png",
    "./assets/img/levels/comentar.png",
    "./assets/img/levels/agregar-amigo.png",
    "./assets/img/levels/reel.png",
    "./assets/img/levels/buscar.png",
    "./assets/img/levels/reproducir.png",
    "./assets/img/levels/suscribir.png",
    "./assets/img/levels/compartir-video.svg",
    "./assets/img/levels/guardar-video.svg",
    "./assets/img/levels/guardar-contacto.png",
    "./assets/img/levels/buscar-contacto.png",
    "./assets/img/levels/editar.png",
    "./assets/img/levels/eliminar-contacto.png",

    "./assets/img/youtube/sopa.jpg",
    "./assets/img/youtube/musica.jpg",
    "./assets/img/youtube/ejercicio.jpg",
    "./assets/img/youtube/plantas.jpg",
    "./assets/img/youtube/paisajes.jpg",
    "./assets/img/youtube/pan.jpg",

    "./assets/img/reels/piolin.jpg",
    "./assets/img/reels/panrico.jpg",
    "./assets/img/reels/nilastone.jpg",
    "./assets/img/reels/cascadas.jpg",
    "./assets/img/reels/panchocolate.jpg",
    "./assets/img/reels/plantas.jpg"
];

// De estos solo se pide la ficha (duración y formato), no el archivo entero
const VIDEOS = [
    "./assets/video/sopa.mp4",
    "./assets/video/musica.mp4",
    "./assets/video/ejercicio.mp4",
    "./assets/video/plantas.mp4",
    "./assets/video/paisajes.mp4",
    "./assets/video/pan.mp4",
    "./assets/video/piolin.mp4",
    "./assets/video/panrico.mp4",
    "./assets/video/nilastone.mp4",
    "./assets/video/cascadas.mp4",
    "./assets/video/panchocolate.mp4"
];

// Pesadas: se bajan por detrás, sin hacer esperar a nadie
const IMAGENES_EN_SEGUNDO_PLANO = [
    "./assets/img/facebook/user_profile.png",
    "./assets/img/facebook/maria_profile.png",
    "./assets/img/facebook/maria_post.png",
    "./assets/img/facebook/noticias_profile.png",
    "./assets/img/facebook/noticias_post.jpg",
    "./assets/img/facebook/recetas_profile.png",
    "./assets/img/facebook/recetas_post.png",
    "./assets/img/facebook/club_profile.png",
    "./assets/img/facebook/club_post.png"
];

// Nadie se queda esperando eternamente por un archivo que no llega
const ESPERA_MAXIMA_RECURSO = 6000;
const ESPERA_MAXIMA_TOTAL = 12000;

function conTiempoLimite(promesa, ms) {
    return Promise.race([
        promesa,
        new Promise(resolve => setTimeout(resolve, ms))
    ]);
}

function cargarImagen(ruta) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = resolve;   // si falta, no se bloquea el arranque
        img.src = ruta;
    });
}

/**
 * Pide solo la ficha del video. Como los archivos tienen el índice al
 * principio, con unos kilobytes basta para que después arranque al instante.
 */
function cargarFichaVideo(ruta) {
    return new Promise(resolve => {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.muted = true;

        const terminar = () => {
            video.onloadedmetadata = null;
            video.onerror = null;
            resolve();
        };

        video.onloadedmetadata = terminar;
        video.onerror = terminar;
        video.src = ruta;
    });
}

/**
 * Precarga lo esencial informando del avance.
 * @param {Function} alAvanzar recibe un número de 0 a 100
 */
export async function precargarRecursos(alAvanzar) {
    const tareas = [
        ...IMAGENES_ESENCIALES.map(r => () => cargarImagen(r)),
        ...VIDEOS.map(r => () => cargarFichaVideo(r)),
        () => prepararVoz()
    ];

    let hechas = 0;
    const avisar = () => {
        hechas++;
        if (typeof alAvanzar === "function") {
            alAvanzar(Math.round((hechas / tareas.length) * 100));
        }
    };

    const todas = Promise.all(
        tareas.map(tarea => conTiempoLimite(tarea(), ESPERA_MAXIMA_RECURSO).then(avisar))
    );

    await conTiempoLimite(todas, ESPERA_MAXIMA_TOTAL);

    if (typeof alAvanzar === "function") alAvanzar(100);
}

/**
 * Sigue bajando las fotos grandes cuando el usuario ya está dentro.
 */
export function precargarEnSegundoPlano() {
    IMAGENES_EN_SEGUNDO_PLANO.forEach(cargarImagen);
}
