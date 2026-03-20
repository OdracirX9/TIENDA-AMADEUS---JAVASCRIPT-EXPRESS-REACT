import { Request, Response } from "express"
import { z } from "zod"

//  IMPORTACION DE DEPENDENCIAS
import MomentTime from 'moment-timezone'

//  IMPORTACION DE BASE DE DATOS
import poolPg from "../../database"

//  IMPORTACION DE UTILIDADES
import { consultarExistenciaUsuario, eliminarDireccionEnvio } from "../utils/consultasUsuario"
import { PATCHDireccionEnvion } from "../../utils/esquemasZod"


const DELETEDireccionEnvio = async (req: Request, res: Response) => {
    try {
        //Conexion con la base de datos
        const pgActive = await poolPg.connect();

        try {

            //Obtencion de la zona horaria de bogota/colombia
            const horaZonaBogota = MomentTime().tz('America/Bogota');
            const creacionFecha = horaZonaBogota.format();

            const idDireccionReq = req.query.id as string

            if (req.session.usuario) {
                const usuarioRedis = req.session.usuario
                await pgActive.query("BEGIN")
                //*-------------------------------------------------------------------------------------------------------------- */



                if (idDireccionReq) {
                    //  COMPROBAR LA EXISTENCIA DE LA DIRECCION DE ENVIO
                    const resQuery01 = await consultarExistenciaUsuario(pgActive, usuarioRedis.correo)
                    if (!resQuery01) throw Error("No existe el usuario")

                    //  ELIMINAR LA DIRECCION DE ENVIO
                    const resQuery02 = await eliminarDireccionEnvio(pgActive, idDireccionReq, usuarioRedis.id)
                    if (!resQuery02) throw Error("No se pudo elimnar la direccion de envio")
                } else {
                    throw Error("No se envio ningun query params")
                }






                //*-------------------------------------------------------------------------------------------------------------- */
                //  FINALIZAR CONSULTA A LA BASE DE DATOS
                await pgActive.query("COMMIT")
                res.status(200).json()

            } else {
                throw Error("No se encontro ningun usuario")
            }

        } catch (error) {
            await pgActive.query("ROLLBACK");
            console.log(error)
            res.status(400).json(error instanceof Error ? error.message : "Error")
        } finally {
            pgActive.release()
        }

    } catch (error) {
        res.status(500).json("Error conexion base de datos")
    }
}


export default DELETEDireccionEnvio;