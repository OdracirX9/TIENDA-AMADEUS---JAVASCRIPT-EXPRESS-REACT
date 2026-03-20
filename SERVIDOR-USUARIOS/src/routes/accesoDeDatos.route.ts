import { Router, Request, Response } from "express";
const router = Router();

//  IMPORTACION DE SCHEMAS
import { PATCHDireccionEnvion, PATCHUsuario, POSTDireccionEnvioI } from "../utils/esquemasZod"

//  IMPORTACION DE MIDDLEWARES
import { validarBody } from "../middleware/validacionZod"

//  IMPORTACION DE GET PARA RUTAS
import GETUsuarioInformacion from "../controllers/GET/GETUsuarioInformacion.controller";
import GETCarritoUsuario from "../controllers/GET/GETCarritoUsuario.controller";

//  IMPORTACION DE PATCH PARA RUTAS
import PATCHActualizarDireccionEnvio from "../controllers/PATCH/PATCHActualizarDireccionEnvio.controller";
import PATCHActualizarUsuario from "../controllers/PATCH/PATCHActualizarUsuario.controller"
import PATCHActualizarCantidadCarrito from "../controllers/PATCH/PATCHActualizarCantidadCarrito.controller";

//  IMPORTACION DE DELETE PARA RUTAS
import DELETEDireccionEnvio from "../controllers/DELETE/DELETEDireccionEnvio.controller";
import DELETEEliminarItemCarrito from "../controllers/DELETE/DELETEEliminarItemCarrito.controller";
import DELETEVaciarCarrito from "../controllers/DELETE/DELETEVaciarCarrito.controller";

//  IMPORTACION DE POST PARA RUTAS
import POSTDireccionEnvio from "../controllers/POST/POSTDireccionDeEnvio.controller";
import POSTAgregarItemCarrito from "../controllers/POST/POSTAgregarItemCarrito.controller";




// ═══════════════════════════════════════════════════════
// METODOS GET
// ═══════════════════════════════════════════════════════
router.get("/", GETUsuarioInformacion) //   Conseguir la informacion de usuario, direcciones de envio y transacciones
router.get("/carrito", GETCarritoUsuario) //    Obtener el carrito del usuario actual

// ═══════════════════════════════════════════════════════
//  METODOS PATCH
// ═══════════════════════════════════════════════════════
router.patch("/", validarBody(PATCHUsuario), PATCHActualizarUsuario)                                            // Actualizar la informacion de usuario
router.patch("/actualizar-direccion-envio", validarBody(PATCHDireccionEnvion), PATCHActualizarDireccionEnvio)  // Actualizar la informacion de la direccion de envio
router.patch("/carrito/:id_variante", PATCHActualizarCantidadCarrito)                                           // Actualizar cantidad de un item del carrito

// ═══════════════════════════════════════════════════════
//  METODO DELETE
// ═══════════════════════════════════════════════════════
router.delete("/actualizar-direccion-envio", DELETEDireccionEnvio)
router.delete("/carrito", DELETEVaciarCarrito)                  //  Vaciar todo el carrito
router.delete("/carrito/:id_variante", DELETEEliminarItemCarrito) //  Eliminar un item específico del carrito

// ═══════════════════════════════════════════════════════
//  METODO POST
// ═══════════════════════════════════════════════════════
router.post("/actualizar-direccion-envio", validarBody(POSTDireccionEnvioI), POSTDireccionEnvio)
router.post("/carrito", POSTAgregarItemCarrito)  //  Agregar item al carrito (upsert)

// ═══════════════════════════════════════════════════════
//  ÓRDENES DE USUARIO (migradas desde servidor-metodos-pagos)
// ═══════════════════════════════════════════════════════
import GETMisOrdenesUsuario from "../controllers/GET/GETMisOrdenesUsuario.controller";
import GETMiOrdenPorIdUsuario from "../controllers/GET/GETMiOrdenPorIdUsuario.controller";

router.get("/mis-ordenes", GETMisOrdenesUsuario)       //  Listar órdenes del usuario
router.get("/mi-orden/:id", GETMiOrdenPorIdUsuario)    //  Obtener detalle de una orden


export default router

