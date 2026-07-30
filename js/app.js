import { inicializarMenu } from "./controllers/menu.controller.js";
import { inicializarNiveles } from "./controllers/levels.controller.js";
import { inicializarRouter } from "./services/router.service.js";

document.addEventListener("DOMContentLoaded", () => {
    inicializarMenu();
    inicializarNiveles();
    inicializarRouter();
});