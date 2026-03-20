import { Router, Request, Response } from "express";
const router = Router();

//  IMPORTACION DE UTILIDADES
import { validarBody } from "../middleware/validacionZod"

//  IMPORTACION DE ESQUEMAS
import { POSTGenerarPagoI } from "../utils/esquemasZod"

import POSTGenerarPago from "../controllers/POSTGenerarPago.controller";




//  METODO POST
router.post("/", validarBody(POSTGenerarPagoI), POSTGenerarPago)



export default router