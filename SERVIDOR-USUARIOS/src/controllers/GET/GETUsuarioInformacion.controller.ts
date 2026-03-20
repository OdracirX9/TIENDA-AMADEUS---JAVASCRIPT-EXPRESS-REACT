import { Request, Response } from "express"

//  IMPORTACION DE DEPENDENCIAS
import MomentTime from 'moment-timezone'

//  IMPORTACION DE BASE DE DATOS
import poolPg from "../../database"

//  IMPORTACION DE UTILIDADES
import { consultarTransaccionesUsuario, consultarDireccionesEnvio } from "../utils/consultasUsuario"


const GETUsuarioInformacion = async (req: Request, res: Response) => {
    try {
        //Conexion con la base de datos
        const pgActive = await poolPg.connect();



        try {

            //Obtencion de la zona horaria de bogota/colombia
            const horaZonaBogota = MomentTime().tz('America/Bogota');
            const creacionFecha = horaZonaBogota.format();

            const usuarioReq = req.query.usuario
            const direccionReq = req.query.direccion
            const transaccionesReq = req.query.transaccion

            //*-------------------------------------------------------------------------------------------------------------- */
            const resUsuarioInfo: {
                usuario?: Record<string, any>,
                transacciones?: Record<string, any>[],
                direcciones?: Record<string, any>[],
            } = {}


            if (req.session.usuario) {
                if (usuarioReq === "true") {
                    resUsuarioInfo.usuario = req.session.usuario
                }
                if (direccionReq === "true") {
                    const resQuery01 = await consultarDireccionesEnvio(pgActive, req.session.usuario.id)
                    resUsuarioInfo.direcciones = resQuery01
                }
                if (transaccionesReq === "true") {
                    const resQuery02 = await consultarTransaccionesUsuario(pgActive, req.session.usuario.id)
                    resUsuarioInfo.transacciones = resQuery02
                }
            } else {
                throw Error("No se encontro ningun usuario")
            }


            //*-------------------------------------------------------------------------------------------------------------- */


            res.status(200).json(resUsuarioInfo)

        } catch (error) {
            console.log(error)
            res.status(400).json(error instanceof Error ? error.message : "Error")
        } finally {
            pgActive.release()
        }

    } catch (error) {
        res.status(500).json("Error conexion base de datos")
    }
}


export default GETUsuarioInformacion;