import { Router, Request, Response } from "express";
const router = Router();

import { verificarOrigenGateway } from "../middlewares/verificarOrigenGateway";
router.use(verificarOrigenGateway);

//  IMPORTACION DE CONFIGURACIONES DE RUTAS
import { uploadMulter } from "../utils/configuracionMulter"



//  IMPORTACION DE GET PARA RUTAS
import GETProductos from "../controllers/GET/GETProductos.controller";
import GETElementos from "../controllers/GET/GETElementos.controller";
import GETProductoPorId from "../controllers/GET/GETProductoPorId.controller";
import GETLandingPageCompleta from "../controllers/GET/GETLandingPageCompleta.controller";


//  METODO GET 
router.get("/test", (req: Request, res: Response) => {
    res.status(200).json("SERVIDOR-API-LANDING-PAGE")
})
router.get("/conseguir-productos", GETProductos)
router.get("/conseguir-elementos", GETElementos)
router.get("/conseguir-producto/:id", GETProductoPorId)
router.get("/landing-page/full", GETLandingPageCompleta)

//  METODOS POST
import POSTComprobarProductos from "../controllers/POST/POSTComprobarProductos.controller";
import POSTComprobarTarifaEnvio from "../controllers/POST/POSTComprobarTarifaEnvio.controller";

router.post("/comprobar-productos-para-compra", POSTComprobarProductos)
router.post("/comprobar-tarifa-envio", POSTComprobarTarifaEnvio)



export default router