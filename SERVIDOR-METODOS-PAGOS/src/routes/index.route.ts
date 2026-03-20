import { Router, Request, Response } from "express";
const router = Router();

import { verificarOrigenGateway } from "../middlewares/verificarOrigenGateway";
router.use(verificarOrigenGateway);

//  IMPORTACION DE RUTAS ALTERNAS
import GenerarPagos from "./pagos.route"

//  IMPORTACION DE UTILIDADES
import { comprobarSesion } from "../middleware/comprobarSesionActiva"


import POSTWebHookWompi from "../controllers/POSTwebHookWompi.controller";

//  IMPORTACION DE GET PARA RUTAS
import GETTransaccionPorWompiId from "../controllers/GET/GETTransaccionPorWompiId.controller";


//  METODO GET
router.get("/test", (req: Request, res: Response) => {
    res.status(200).json("SERVIDOR-METODOS-PAGOS")
})
router.get("/usuario/transaccion-wompi/:id", comprobarSesion, GETTransaccionPorWompiId)

//  METODOS USE
router.use("/generar-pago", comprobarSesion, GenerarPagos)

//  METODOS POST
router.post("/remitente-webhook-wompi", POSTWebHookWompi)

export default router
