import { inicializarMenu } from "./controllers/menu.controller.js";
import { inicializarNiveles } from "./controllers/levels.controller.js";

document.addEventListener("DOMContentLoaded", () => {
    inicializarMenu();
    inicializarNiveles();
});