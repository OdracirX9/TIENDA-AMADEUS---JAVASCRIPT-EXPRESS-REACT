import { Request, Response } from "express"
import { object, z } from "zod"

//  IMPORTACION DE DEPENDENCIAS
import MomentTime from 'moment-timezone'

//  IMPORTACION DE BASE DE DATOS
import poolPg from "../../database"

//  IMPORTACION DE UTILIDADES
import { consultarExistenciaUsuario, actualizarUsuario } from "../utils/consultasUsuario"
import { PATCHUsuario } from "../../utils/esquemasZod"


const PATCHActualizarDireccionEnvio = async (req: Request, res: Response) => {
    try {
        //Conexion con la base de datos
        const pgActive = await poolPg.connect();

        try {

            //Obtencion de la zona horaria de bogota/colombia
            const horaZonaBogota = MomentTime().tz('America/Bogota');
            const creacionFecha = horaZonaBogota.format();

            const reqBody: z.infer<typeof PATCHUsuario> = req.body

            if (req.session.usuario) {
                const usuarioRedis = req.session.usuario
                await pgActive.query("BEGIN")
                //*-------------------------------------------------------------------------------------------------------------- */




                //  COMPROBAR LA EXISTENCIA DE LA DIRECCION DE ENVIO
                const resQuery01 = await consultarExistenciaUsuario(pgActive, usuarioRedis.correo)
                if (!resQuery01) throw Error("No existe el usuario")

                //  ACTUALIZAR LOS DATOS DEL USUARIO
                const resQuery02 = await actualizarUsuario(pgActive, usuarioRedis.id, reqBody)


                //ACTAULIZAR SESION DE COOKIE
                Object.entries(reqBody).forEach(([key, value]) => {
                    if (req.session.usuario) {
                        req.session.usuario[key as keyof Required<z.infer<typeof PATCHUsuario>>] = value
                    }
                })
                console.log()

                req.session.save(err => {
                    if (err) throw Error("Ocurrio un error al actualizar la sesion en cache");
                });



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


export default PATCHActualizarDireccionEnvio;