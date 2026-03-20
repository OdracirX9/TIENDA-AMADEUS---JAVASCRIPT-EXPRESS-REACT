import { Router, Request, Response } from "express";
const router = Router();

import { verificarOrigenGateway } from "../middlewares/verificarOrigenGateway";
router.use(verificarOrigenGateway);

//  IMPORTACION DE CONFIGURACIONES DE RUTAS
import { uploadMulter } from "../utils/configuracionMulter"

//  IMPORTACION DE POST PARA RUTAS
import POSTGuardarImagenes from "../controllers/POST/POSTGuardarImagenes.controller";
import POSTCrearProducto from "../controllers/POST/POSTCrearProducto.controller";
import POSTCrearElementoProducto from "../controllers/POST/POSTCrearElementoProducto.controller";
import POSTActualizarCacheGlobal from "../controllers/POST/POSTActualizarCacheGlobal.controller";

//  IMPORTACION DE PATCH PARA RUTAS
import PATCHActualizarProducto from "../controllers/PATCH/PATCHActualizarProducto.controller";
import PATCHCambiarEstadoProducto from "../controllers/PATCH/PATCHCambiarEstadoProducto.controller";
import PATCHActualizarElemento from "../controllers/PATCH/PATCHActualizarElemento.controller";

//  METODOS GET
import GETObtenerProductosAdmin from "../controllers/GET/GETObtenerProductosAdmin.controller";
import GETObtenerProductoPorIdAdmin from "../controllers/GET/GETObtenerProductoPorIdAdmin.controller";
import GETObtenerElementosAdmin from "../controllers/GET/GETObtenerElementosAdmin.controller";
import GETSesionAdmin from "../controllers/GET/GETSesionAdmin.controller";

//  METODOS GET
router.get("/test", (req: Request, res: Response) => {
    res.status(200).json("SERVIDOR-ADMINISTRAR-PRODUCTOS")
})
router.get("/admin/obtener-productos", GETObtenerProductosAdmin)
router.get("/admin/obtener-producto/:id", GETObtenerProductoPorIdAdmin)
router.get("/admin/obtener-elementos", GETObtenerElementosAdmin)

// Endpoint para validar que la sesion frontend de Admin siga viva
router.get("/admin/auth/sesion", GETSesionAdmin)


//  IMPORTACION DE MIDDLEWARES Y ESQUEMAS
import { validarBody } from "../middlewares/validacionZod"
import { POSTCrearProductoZI, POSTCrearElementoProductoZI, PATCHActualizarProductoZI, PATCHActualizarElementoProductoZI } from "../utils/esquemasZod"
import { comprobarSesionAdmin } from "../middlewares/comprobarSesionAdmin";

//  METODOS DE AUTENTICACION ADMIN
import POSTLoginAdmin from "../controllers/POST/POSTLoginAdmin.controller";
import POSTLogoutAdmin from "../controllers/POST/POSTLogoutAdmin.controller";

router.post("/admin/auth/login", POSTLoginAdmin);
router.post("/admin/auth/logout", POSTLogoutAdmin);


//  METODOS POST (Protegidos)
router.post("/guardar-imagenes", comprobarSesionAdmin, uploadMulter.array('imagenes', 8), POSTGuardarImagenes)
router.post("/crear-nuevo-producto", comprobarSesionAdmin, validarBody(POSTCrearProductoZI), POSTCrearProducto)
router.post("/crear-nuevo-elemento", comprobarSesionAdmin, validarBody(POSTCrearElementoProductoZI), POSTCrearElementoProducto)
router.post("/admin/actualizar-cache", comprobarSesionAdmin, POSTActualizarCacheGlobal)

//  METODOS PATCH (Protegidos)
router.patch("/modificar-producto", comprobarSesionAdmin, validarBody(PATCHActualizarProductoZI), PATCHActualizarProducto)
router.patch("/cambiar-estado-producto/:id", comprobarSesionAdmin, PATCHCambiarEstadoProducto)
router.patch("/actualizar-elemento", comprobarSesionAdmin, validarBody(PATCHActualizarElementoProductoZI), PATCHActualizarElemento)


//  IMPORTACION DE DELETE PARA RUTAS
import DELETEBorrarProducto from "../controllers/DELETE/DELETEBorrarProducto.controller";
import DELETEBorrarVariante from "../controllers/DELETE/DELETEBorrarVariante.controller";
import DELETEBorrarElemento from "../controllers/DELETE/DELETEBorrarElemento.controller";
import DELETEEliminarCacheGlobal from "../controllers/DELETE/DELETEEliminarCacheGlobal.controller";

//  METODOS DELETE (Protegidos)
router.delete("/borrar-producto/:id", comprobarSesionAdmin, DELETEBorrarProducto)
router.delete("/borrar-variante/:id", comprobarSesionAdmin, DELETEBorrarVariante)
router.delete("/borrar-elemento/:id", comprobarSesionAdmin, DELETEBorrarElemento)
router.delete("/admin/eliminar-cache", comprobarSesionAdmin, DELETEEliminarCacheGlobal)

// ─── ÓRDENES (migradas desde servidor-metodos-pagos) ──────────────────────────
import GETObtenerOrdenesAdmin from "../controllers/GET/GETObtenerOrdenesAdmin.controller";
import GETObtenerOrdenPorIdAdmin from "../controllers/GET/GETObtenerOrdenPorIdAdmin.controller";
import PATCHEstadoEnvioAdmin from "../controllers/PATCH/PATCHEstadoEnvioAdmin.controller";

router.get("/admin/obtener-ordenes", comprobarSesionAdmin, GETObtenerOrdenesAdmin)
router.get("/admin/obtener-orden/:id", comprobarSesionAdmin, GETObtenerOrdenPorIdAdmin)
router.patch("/admin/estado-envio/:id", comprobarSesionAdmin, PATCHEstadoEnvioAdmin)

// ─── CLIENTES ──────────────────────────────────────────────────────────
import GETObtenerClientesAdmin from "../controllers/GET/GETObtenerClientesAdmin.controller";
import DELETEBorrarCliente from "../controllers/DELETE/DELETEBorrarCliente.controller";

router.get("/admin/obtener-clientes", comprobarSesionAdmin, GETObtenerClientesAdmin)
router.delete("/admin/borrar-cliente/:id", comprobarSesionAdmin, DELETEBorrarCliente)

// ─── ESTADÍSTICAS DASHBOARD ────────────────────────────────────────────
import GETObtenerEstadisticasDashboard from "../controllers/GET/GETObtenerEstadisticasDashboard.controller";

router.get("/admin/obtener-estadisticas", comprobarSesionAdmin, GETObtenerEstadisticasDashboard)

// ─── TARIFAS DE ENVÍO ──────────────────────────────────────────────────
import POSTCrearTarifaEnvio from "../controllers/POST/POSTCrearTarifaEnvio.controller";
import GETObtenerTarifasEnvio from "../controllers/GET/GETObtenerTarifasEnvio.controller";
import DELETEBorrarTarifaEnvio from "../controllers/DELETE/DELETEBorrarTarifaEnvio.controller";

router.post("/admin/crear-tarifa-envio", comprobarSesionAdmin, POSTCrearTarifaEnvio)
router.get("/admin/obtener-tarifas-envio", comprobarSesionAdmin, GETObtenerTarifasEnvio)
router.delete("/admin/borrar-tarifa-envio/:id", comprobarSesionAdmin, DELETEBorrarTarifaEnvio)


// ─── CONTENIDO DINÁMICO DE LANDING PAGE ──────────────────────────────────
import POSTCrearLandingPage from "../controllers/POST/POSTCrearLandingPage.controller";
import GETObtenerLandingPage from "../controllers/GET/GETObtenerLandingPage.controller";
import PATCHActualizarLandingPage from "../controllers/PATCH/PATCHActualizarLandingPage.controller";
import DELETEBorrarLandingPage from "../controllers/DELETE/DELETEBorrarLandingPage.controller";
import { POSTCrearLandingPageZI, PATCHActualizarLandingPageZI } from "../utils/esquemasZod";

router.post("/admin/crear-landing-page", comprobarSesionAdmin, validarBody(POSTCrearLandingPageZI), POSTCrearLandingPage)
router.get("/admin/obtener-landing-page", comprobarSesionAdmin, GETObtenerLandingPage)
router.patch("/admin/actualizar-landing-page/:id", comprobarSesionAdmin, validarBody(PATCHActualizarLandingPageZI), PATCHActualizarLandingPage)
router.delete("/admin/borrar-landing-page/:id", comprobarSesionAdmin, DELETEBorrarLandingPage)


export default router
