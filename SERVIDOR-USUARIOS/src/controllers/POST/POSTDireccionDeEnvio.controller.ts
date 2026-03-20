import { Request, Response } from "express"
import { z } from "zod"

//  IMPORTACION DE DEPENDENCIAS
import MomentTime from 'moment-timezone'

//  IMPORTACION DE BASE DE DATOS
import poolPg from "../../database"

//  IMPORTACION DE UTILIDADES
import { consultarExistenciaUsuario, crearDireccionEnvio } from "../utils/consultasUsuario"
import { POSTDireccionEnvioI } from "../../utils/esquemasZod"


const POSTDireccionEnvio = async (req: Request, res: Response) => {
    try {
        //Conexion con la base de datos
        const pgActive = await poolPg.connect();

        try {

            //Obtencion de la zona horaria de bogota/colombia
            const horaZonaBogota = MomentTime().tz('America/Bogota');
            const creacionFecha = horaZonaBogota.format();

            const reqBody: z.infer<typeof POSTDireccionEnvioI> = req.body


            if (req.session.usuario) {
                const usuarioRedis = req.session.usuario
                await pgActive.query("BEGIN")
                //*-------------------------------------------------------------------------------------------------------------- */




                //  COMPROBAR LA EXISTENCIA DE LA DIRECCION DE ENVIO
                const resQuery01 = await consultarExistenciaUsuario(pgActive, usuarioRedis.correo)
                if (!resQuery01) throw Error("No existe el usuario")

                //  CREAR LA DIRECCION DE ENVIO
                const valoresDeOrden = [usuarioRedis.id, reqBody.nombre_usuario, reqBody.celular, reqBody.direccion_envio, reqBody.ciudad, reqBody.departamento, reqBody.descripcion, creacionFecha]
                const resQuery02 = await crearDireccionEnvio(pgActive, valoresDeOrden)







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


export default POSTDireccionEnvio;