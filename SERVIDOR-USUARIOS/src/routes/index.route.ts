import { Router, Request, Response } from "express";
const router = Router();

import { verificarOrigenGateway } from "../middlewares/verificarOrigenGateway";
router.use(verificarOrigenGateway);

//  IMPORTACION DE RUTAS ALTERNAS
import SesionUsuario from "./accesoDeDatos.route"

//  IMPORTACION DE UTILIDADES
import { comprobarSesion } from "../middleware/comprobarSesionActiva"


//  IMPORTACION DE GET PARA RUTAS
import GETSesionGoogle from "../controllers/GET/GETSesionPlataforma.controller"
import GETAuthConfirmacion from "../controllers/GET/GETEndpointAuth.controller"
import GETConfirmarRegistroUsuario from "../controllers/GET/GETConfirmarRegistroUsuario.controller"

//  IMPORTACION DE POST PARA RUTAS
import POSTRegistroUsuario from "../controllers/POST/POSTRegistroUsuario.controller"
import POSTLoginUsuario from "../controllers/POST/POSTLoginUsuario.controller"
import POSTLogoutUsuario from "../controllers/POST/POSTLogoutUsuario.controller"
import POSTSolicitarRestablecerContrasena from "../controllers/POST/POSTSolicitarRestablecerContrasena.controller"

//  IMPORTACION DE PATCH PARA RUTAS
import PATCHConfirmarRestablecerContrasena from "../controllers/PATCH/PATCHConfirmarRestablecerContrasena.controller"



// METODOS GET
router.get("/test", (req: Request, res: Response) => {
    res.status(200).json("SERVIDOR-USUARIOS")
})

//  RUTAS DE AUTENTICACION TRADICIONAL (CORREO/PASSWORD)
router.get("/auth/confirmar-registro", GETConfirmarRegistroUsuario)
router.post("/auth/registro", POSTRegistroUsuario)
router.post("/auth/login", POSTLoginUsuario)
router.post("/auth/logout", POSTLogoutUsuario)
router.post("/auth/restablecer-contrasena", POSTSolicitarRestablecerContrasena)
router.patch("/auth/restablecer-contrasena", PATCHConfirmarRestablecerContrasena)

//  RUTAS DE AUTENTICACION OAUTH (DESACTIVADAS TEMPORALMENTE)
// router.get("/habilitar-sesion-plataforma", GETSesionGoogle)
// router.get("/auth-confirmacion-sesion/:plataforma", GETAuthConfirmacion)


//  METODOS USE
router.use("/sesion-usuario", comprobarSesion, SesionUsuario)// Ruta protegida con sesion de cookie


export default router
