import { Router, Request, Response } from "express";
import dotenv from "dotenv"

const router = Router();
dotenv.config()

//  IMPORTACION DE UTILIDADES
import { crearProxyConexion } from "../utils/configuracionProxy"

//  METODOS GET
router.get("/test", (req: Request, res: Response) => {
    res.status(200).json("SERVIDOR-API-GATEWAY")
})

//  Servidor-administrar-productos
router.use("/ecomerce-regenievex-administrar-productos", crearProxyConexion("/ecomerce-regenievex-administrar-productos", process.env.SERVIDOR_PROXY_01 || ""))

//  Servidor-metodos-pagos
router.use("/ecomerce-regenievex-metodos-pagos", crearProxyConexion("/ecomerce-regenievex-metodos-pagos", process.env.SERVIDOR_PROXY_02 || ""))

//  Servidor-api-landing-page
router.use("/ecomerce-regenievex", crearProxyConexion("/ecomerce-regenievex", process.env.SERVIDOR_PROXY_03 || ""))

// ── Servidor-usuarios ─────────────────────────────────────────────────────────

// Proxy general para TODO el microservicio de usuarios.
router.use("/ecomerce-regenievex-usuarios", crearProxyConexion("/ecomerce-regenievex-usuarios", process.env.SERVIDOR_PROXY_04 || ""));




export default router