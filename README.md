# Gen-Zénior

**Una aplicación para que las personas mayores aprendan a usar el celular practicando, sin miedo a equivocarse.**

Gen-Zénior es un simulador guiado por voz. Dentro de la aplicación hay copias de **WhatsApp, Facebook, YouTube y los Contactos** del teléfono. Se ven y se manejan como las de verdad, pero nada de lo que pase ahí sale del teléfono: no se envía ningún mensaje, no se publica nada y no se llama a nadie. Un asistente llamado **Nico** va diciendo en voz alta qué hacer en cada paso y lo señala en la pantalla.

---

## La misión

Mucha gente mayor tiene un celular inteligente y no lo usa, no porque no pueda, sino porque **tiene miedo de romper algo o de mandar un mensaje sin querer**. Aprender apretando botones en la aplicación real es caro: un error se ve, se envía o se borra de verdad.

Gen-Zénior existe para quitar ese miedo. La idea es sencilla:

1. **Que se pueda equivocar sin consecuencias.** Todo es una copia. Se puede tocar cualquier cosa.
2. **Que no dependa de que un nieto esté al lado explicando.** Nico dice el paso en voz alta, lo escribe en la pantalla y lo señala con una mano y un aro de color.
3. **Que se practique la aplicación de verdad, no una versión "para mayores".** Los botones están donde están en WhatsApp o en YouTube, con el mismo aspecto, para que lo aprendido sirva al salir de aquí.
4. **Que se note el avance.** Cada práctica terminada da un trofeo. No es una competencia y no se pierden nunca.

Es un proyecto académico de la **Universidad Técnica Estatal de Quevedo (UTEQ)**, hecho por cuatro estudiantes, y está pensado para usarse en el celular de la propia persona o en un taller con varias personas a la vez.

---

## Qué se practica

Cuatro módulos, cinco niveles cada uno. Los niveles se van desbloqueando en orden.

| WhatsApp | Facebook | YouTube | Contactos |
|---|---|---|---|
| Enviar mensaje | Realizar publicación | Buscar y ver un video | Guardar contacto |
| Grabar audio | Reaccionar a una foto | Me gusta y suscribirse | Buscar contacto |
| Hacer llamada | Comentar publicación | Comentar un video | Llamar contacto |
| Videollamada | Agregar amigo | Compartir un video | Editar contacto |
| Enviar foto | Ver Reels | Guardar para después | Eliminar contacto |

Al terminar un módulo entero se gana su trofeo, y quien complete los cuatro consigue el de **Gran Zénior**.

Además de los pasos guiados, la aplicación enseña cosas que no están en la pantalla: subir el volumen con los botones del borde del teléfono, o girarlo de lado para ver un video en grande.

---

## Cómo usarlo desde GitHub

### Lo que hace falta

- [Node.js](https://nodejs.org) (versión 18 o más nueva) — solo para levantar el servidor de desarrollo.
- Un navegador moderno: Chrome, Edge o Safari.

> **Ojo con el tamaño:** el repositorio pesa alrededor de **115 MB** porque lleva los videos reales dentro (`assets/video/`). La primera clonación tarda un rato.

### Clonar y arrancar

```bash
git clone https://github.com/andymendozap03/Gen-Zenior.git
cd Gen-Zenior
npm install
npm run dev
```

Se abre solo en `http://localhost:3000`. Con `npm run dev` los cambios en los archivos se recargan solos en el navegador.

### Sin instalar nada

La aplicación no tiene compilación: son HTML, CSS y JavaScript sueltos. Cualquier servidor estático vale:

```bash
python -m http.server 3000     # con Python
npx serve .                    # con Node, sin instalar el proyecto
```

**No funciona abriendo `index.html` con doble clic.** El proyecto usa módulos de JavaScript (`import` / `export`), y el navegador los bloquea cuando la página se abre desde `file://`. Tiene que servirse por HTTP.

### Probarlo como en un celular

En Chrome o Edge: `F12` → el icono de teléfono/tableta → elegir un iPhone o un Android. La aplicación está diseñada para pantalla vertical de teléfono; en pantallas anchas se queda en una columna centrada de 480 px.

---

## Estructura de carpetas

```
Gen-Zenior/
│
├── index.html                  Toda la estructura de pantallas de la aplicación
├── package.json                Scripts y dependencias de desarrollo
│
├── css/
│   ├── main.css                Base, colores, modo oscuro, guía visual de Nico
│   ├── components.css          Menú principal (las cuatro aplicaciones)
│   ├── modules.css             Camino de niveles de un módulo
│   ├── accessibility.css       Vacío por ahora, reservado para ajustes visuales
│   ├── trophies.css            Pantalla de trofeos
│   ├── whatsapp.css            Aspecto de cada simulador
│   ├── facebook.css
│   ├── youtube.css
│   └── contacts.css
│
├── js/
│   ├── app.js                  Punto de entrada: arranca todo
│   │
│   ├── controllers/            Pantallas propias de Gen-Zénior
│   │   ├── onboarding.controller.js   Introducción de bienvenida (3 pasos)
│   │   ├── menu.controller.js         Menú de módulos
│   │   ├── levels.controller.js       Camino de niveles de un módulo
│   │   ├── trophies.controller.js     Trofeos
│   │   └── settings.controller.js     Ajustes y accesibilidad
│   │
│   ├── modules/                Los cuatro simuladores (uno por aplicación)
│   │   ├── whatsapp/whatsapp.simulator.js
│   │   ├── facebook/facebook.simulator.js
│   │   ├── youtube/youtube.simulator.js
│   │   └── contacts/contacts.simulator.js
│   │
│   ├── services/               Lo que comparten todos los módulos
│   │   ├── router.service.js          Navegación por # en la barra de direcciones
│   │   ├── speech.service.js          La voz de Nico
│   │   ├── guide-highlight.service.js El aro de color y la mano que señala
│   │   ├── progress.service.js        Niveles completados y trofeos
│   │   ├── settings.service.js        Voz, letra, modo oscuro, contraste
│   │   ├── storage.service.js         Guardado en el teléfono (localStorage)
│   │   └── preload.service.js         Carga previa de imágenes y videos
│   │
│   ├── data/                   Contenido, separado del código
│   │   ├── modules.data.js            Módulos y sus niveles
│   │   ├── trophies.data.js           Trofeos y cómo se ganan
│   │   ├── settings.data.js
│   │   └── voz.config.example.js      Plantilla para la voz de ElevenLabs
│   │
│   ├── utils/                  Ayudas cortas (selectores, formatos)
│   └── vendor/                 Puente de Capacitor para el APK de Android
│
└── assets/
    ├── img/
    │   ├── icons/              Iconos de la interfaz
    │   ├── levels/             Dibujos de cada nivel
    │   ├── credits/            Fotos del equipo
    │   ├── whatsapp/ facebook/ youtube/ reels/ contacts/
    │   │                       Fotos de perfil y contenido de cada simulador
    └── video/                  Videos reales que se reproducen sin internet
```

---

## Cómo está hecho por dentro

**JavaScript puro, sin framework y sin compilación.** No hay React, ni Vue, ni empaquetador. Se escogió así por dos motivos: es un proyecto de estudiantes que tiene que poder leerse y modificarse sin herramientas, y así funciona igual servido desde cualquier sitio.

Las piezas principales:

- **Router por hash.** La dirección manda: `#/modulo/YouTube/nivel/buscar-video` abre ese nivel. Cambiar el `#` cambia de pantalla, sin recargar la página.
- **Cada módulo es una máquina de pasos.** El simulador guarda en qué paso va y, según eso, sabe qué frase dice Nico, qué botón resalta y qué toque hace avanzar. Si la persona toca otra cosa, no se rompe: Nico repite el paso.
- **Guía visual compartida.** Un solo servicio dibuja el aro de color y la mano que señala, así los cuatro módulos guían igual.
- **El progreso vive en el teléfono.** Todo se guarda en `localStorage` con claves que empiezan por `gz_`. No hay servidor, no hay cuenta y no se envía nada a ninguna parte. Desde *Ajustes → Reiniciar progreso* se borra todo.

### La voz de Nico

Nico habla por tres caminos, según dónde se abra la aplicación:

1. **Voz del navegador** (Web Speech API) — es la normal. Funciona sin internet y sin costo.
2. **Voz nativa de Android** — dentro del APK, a través del plugin de Capacitor.
3. **ElevenLabs** (opcional) — voz más natural, para demostraciones.

Para usar ElevenLabs hay que copiar `js/data/voz.config.example.js` como `js/data/voz.config.js` y poner ahí la clave. Ese archivo **está en `.gitignore` y nunca debe subirse**: la clave queda dentro del navegador y cualquiera que abra la aplicación puede verla y gastar los créditos. Si el archivo no existe, Nico usa la voz del navegador y todo sigue funcionando igual.

### Accesibilidad

Todo esto se cambia desde la pantalla de Ajustes y se recuerda para la próxima vez:

- Encender o apagar la voz, y elegir si habla **lenta, normal o rápida**.
- **Tamaño de letra**: pequeño, mediano o grande — afecta a toda la aplicación, incluidos los simuladores.
- **Modo oscuro** y **alto contraste**.
- **Color del aro** que señala dónde tocar (dorado, amarillo, verde o azul), por si se confunde con los colores de algún módulo.
- Repetir la introducción del principio cuando se quiera.

---

## Android (APK)

El proyecto lleva el puente de **Capacitor** preparado (`js/vendor/`) y el plugin de voz nativa entre las dependencias, para poder empaquetarlo como aplicación de Android.

Aviso: en el repositorio **todavía no están** la carpeta `android/`, el `capacitor.config` ni el archivo `scripts/sync-www.js` al que llama `npm run build:android`. Ese script falla si se ejecuta tal cual. Para generar el APK hay que inicializar Capacitor primero (`npx cap init` y `npx cap add android`).

---

## Equipo

Proyecto de la **Universidad Técnica Estatal de Quevedo (UTEQ)**. Cada persona se encarga de un módulo:

| Integrante | Correo |
|---|---|
| Fuertes Arraes Edson Daniel | efuertesa2@uteq.edu.ec |
| Gutiérrez Ortega Génesis Adriana | ggutierrezo@uteq.edu.ec |
| Llerena Abril Angelina Julexy | allerenaa@uteq.edu.ec |
| Mendoza Párraga Andy Johel | amendozap9@uteq.edu.ec |

---

## Notas para quien siga el proyecto

- **Trabajar cada quien en su módulo.** Los simuladores están separados a propósito (`js/modules/<app>/`). Los cambios que afecten a todos van en `js/services/` o en `css/main.css`, y conviene avisar al resto antes de tocarlos.
- **Probar siempre en un servidor**, no abriendo el archivo directamente.
- **Probar en un teléfono de verdad**, no solo en el navegador. La voz se comporta distinto en iPhone (solo arranca desde un toque de la persona) y el giro de pantalla no se puede probar en el escritorio.
- **Antes de escribir un texto nuevo de Nico**, leerlo en voz alta. Si no se entiende escuchándolo una sola vez, hay que acortarlo.
- Hay cuatro videos en `assets/video/` que ya no usa ningún módulo (`cascada.mp4`, `minicake.mp4`, `monte.mp4`, `panes.mp4`) y ocupan unos 57 MB. Se pueden borrar para aligerar el repositorio.
- El bloque `dependencies` de `package.json` tiene listadas muchas librerías que en realidad son dependencias internas de `live-server`. Bastaría con dejar `live-server` y las de Capacitor.
