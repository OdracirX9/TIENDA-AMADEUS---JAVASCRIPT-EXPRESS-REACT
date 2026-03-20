import { Request, Response } from "express"
import { z } from "zod"
import dotenv from "dotenv"
dotenv.config()

//  IMPORTACION DE BASE DE DATOS
import poolPg from "../database"

//  IMPORTACION DE DEPENDENCIAS
import MomentTime from 'moment-timezone'

//  IMPORTACION DE UTILIDADES 

import { POSTGenerarPagoI } from "../utils/esquemasZod"
import { isUsuario, isDireccion, isProducto } from "./utils/consultarExistencia"
import { crearOrdenGrupo, crearOrdenProductoSolo, consultarTarifaEnvio } from "./utils/consultaOrdenCompra"
import { crearPostWompiJSON, transaccionHTTPSWompi, crearTransaccionPg } from "./utils/consultaWompi"

const POSTGenerarPago = async (req: Request, res: Response) => {

    try {
        //Conexion con la base de datos
        const pgActive = await poolPg.connect();

        try {
            //Obtencion de la zona horaria de bogota/colombia
            const horaZonaBogota = MomentTime().tz('America/Bogota');
            const creacionFecha = horaZonaBogota.format();
            console.log("Acto 1 ")

            const reqBody: z.infer<typeof POSTGenerarPagoI> = req.body
            console.log("Acto 2")

            if (req.session.usuario) {
                const usuarioRedis = req.session.usuario
                await pgActive.query("BEGIN")

                //*-------------------------------------------------------------------------------------------------------------- */

                console.log("Acto 3")

                //  VERIFICAR LA EXISTENCIA DEL USUARIO Y SU DIRECCION
                const resQuery01 = await isUsuario(pgActive, usuarioRedis.id)
                const resQuery02 = await isDireccion(pgActive, usuarioRedis.id, reqBody.direccion_envio_id)
                console.log("Acto 4")

                //  VERIFICAR LA EXISTENCIA DE LOS PRODUCTOS A COMPRAR
                const idsProductos = reqBody.variantes.map(itm => itm.id)
                const resQuery03 = await isProducto(pgActive, idsProductos)
                console.log("Acto 5")

                // OBTENER LA TARIFA DE ENVIO BASADA EN LA UBICACION Y VERIFICAR QUE EXISTA
                const departamento = resQuery02[0].departamento;
                const ciudad = resQuery02[0].ciudad;
                const tarifaCentavos = await consultarTarifaEnvio(pgActive, departamento, ciudad);

                //  CREAR LA ORDEN DE COMPRA DE LOS PRODUCTOS
                const valoresDeOrden = [
                    usuarioRedis.id,
                    resQuery02[0].nombre_usuario, // ← Usando el nombre registrado en la direccion de envio
                    resQuery01[0].correo,
                    resQuery02[0].celular,        // ← Usando el celular registrado en la direccion de envio
                    resQuery02[0].direccion_envio,
                    ciudad,
                    departamento,
                    creacionFecha,
                    tarifaCentavos.toString()     // ← Añadiendo tarifa_envio guardada en BD
                ];
                const resQuery04 = await crearOrdenGrupo(pgActive, valoresDeOrden)
                console.log("Acto 6")

                //  CREAR LA SUB ORDEN DE CADA PRODUCTO
                const resQuery05 = await crearOrdenProductoSolo(pgActive, resQuery04[0].id, reqBody, resQuery03)
                console.log("Acto 7")

                const totalMontoProductos = resQuery05.reduce((acumulador, itm) => {
                    return acumulador + itm.sub_total
                }, 0);
                const totalValorCompra = totalMontoProductos + tarifaCentavos; // ← Sumando tarifa de envío

                const JSON_WOMPI = crearPostWompiJSON(totalValorCompra, resQuery04[0], creacionFecha, resQuery05, tarifaCentavos);
                console.log("Acto 8")

                //  CONSULTA A LA API DE WOMPI
                const resWompi01 = await transaccionHTTPSWompi(JSON_WOMPI)
                console.log("Acto 9")

                // GUARDADO DE RES-WOMPI EN LA BASE DE DATOS
                const resQuery06 = await crearTransaccionPg(pgActive, resWompi01.data, resQuery04[0].id, usuarioRedis.id)
                console.log("Acto 10")

                // VACIAR EL CARRITO SI LA ORDEN TIENE MÁS DE 1 VARIANTE
                if (reqBody.variantes.length > 1) {
                    await pgActive.query(
                        "DELETE FROM items_carrito WHERE id_carrito = (SELECT id FROM carrito WHERE id_usuario = $1)",
                        [usuarioRedis.id]
                    );
                    console.log("Acto 10.5 - Carrito vaciado");
                }

                //  JSON DE RESPUESTA PARA EL EMISOR
                const resJsonFinal = {
                    link_pago: process.env.LINK_PAGO_WOMPI + resWompi01.data.id
                }
                console.log("Acto 11")

                //  FINALIZAR CONSULTA A LA BASE DE DATOS
                await pgActive.query("COMMIT")
                console.log("Acto 12")

                res.status(200).json(resJsonFinal)
                console.log("Acto 13")




                //*-------------------------------------------------------------------------------------------------------------- */

            } else {
                throw Error("No se encontro ningun usuario")
            }

        } catch (error: any) {
            await pgActive.query('ROLLBACK');
            console.error("ERROR CATCH POSTGenerarPago:", error);
            res.status(404).json({ error: error.message ? error.message : "Error interno", fullError: error })

        } finally {
            pgActive.release();
        }


    } catch (error) {
        res.status(404).json("Error conexion base de datos")
    }



}


export default POSTGenerarPago;