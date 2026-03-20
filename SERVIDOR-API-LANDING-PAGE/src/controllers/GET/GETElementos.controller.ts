import { Request, Response } from "express"

//  IMPORTACION DE BASE DE DATOS
import poolPg from "../../database"
import ClienteRedis from "../../redisCache"

//  IMPORTACION DE DEPENDENCIAS
import MomentTime from 'moment-timezone'

//  IMPORTACION DE UTILIDADES 
import { consultarCacheElementos } from "../utils/actualizarCache"
import { consultarProductos } from "../utils/consultarProductos"



const GETElementos = async (req: Request, res: Response) => {

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
            

            const resQuery01 = await consultarCacheElementos()

            


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


export default GETElementos;