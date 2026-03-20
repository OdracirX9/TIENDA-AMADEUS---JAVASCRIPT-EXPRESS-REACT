import { Request, Response } from "express"

//  IMPORTACION DE BASE DE DATOS
import poolPg from "../../database"
import ClienteRedis from "../../redisCache"

//  IMPORTACION DE DEPENDENCIAS
import MomentTime from 'moment-timezone'

//  IMPORTACION DE UTILIDADES 
import { consultarCacheProductos } from "../utils/actualizarCache"
import { consultarProductos } from "../utils/consultarProductos"



const GETProductos = async (req: Request, res: Response) => {

    try {
        //Conexion con la base de datos
        const pgActive = await poolPg.connect();

        try {
            //Obtencion de la zona horaria de bogota/colombia
            const horaZonaBogota = MomentTime().tz('America/Bogota');
            const creacionFecha = horaZonaBogota.format();



            //  INICIAR CONSULTA A LA BASE DE DATOS
            await pgActive.query("BEGIN")
            //*-------------------------------------------------------------------------------------------------------------- */

            const reqQuery = req.query as { search?: string, categoria?: string, marca?: string };
            const resQuery01 = await consultarCacheProductos(pgActive, 0, 50, reqQuery)


            //*-------------------------------------------------------------------------------------------------------------- */
            //  FINALIZAR CONSULTA A LA BASE DE DATOS
            await pgActive.query("COMMIT")

            res.status(200).json(resQuery01)

        } catch (error) {
            await pgActive.query('ROLLBACK');
            console.log(error)
            res.status(404).json(JSON.stringify(error))

        } finally {
            pgActive.release();
        }


    } catch (error) {
        res.status(404).json("Error conexion base de datos")
    }



}


export default GETProductos;