import { Router, Request, Response } from "express";
import POSTConfirmacionRegistro from "../controllers/POSTConfirmacionRegistro.controller";
import POSTRestablecerContrasena from "../controllers/POSTRestablecerContrasena.controller";
import POSTNotificacionOrden from "../controllers/POSTNotificacionOrden.controller";
import POSTNotificacionEnvio from "../controllers/POSTNotificacionEnvio.controller";
import POSTNotificacionEntrega from "../controllers/POSTNotificacionEntrega.controller";
import POSTNotificacionAdminNuevaOrden from "../controllers/POSTNotificacionAdminNuevaOrden.controller";

const router = Router();

router.get("/", (req: Request, res: Response) => {
    res.status(200).json("Servidor de Correos E-commerce Activo")
})

router.post("/confirmar-registro", POSTConfirmacionRegistro)
router.post("/restablecer-contrasena", POSTRestablecerContrasena)
router.post("/notificacion-orden", POSTNotificacionOrden)
router.post("/notificacion-envio", POSTNotificacionEnvio)
router.post("/notificacion-entrega", POSTNotificacionEntrega)
router.post("/notificacion-admin-nueva-orden", POSTNotificacionAdminNuevaOrden)

export default router;
