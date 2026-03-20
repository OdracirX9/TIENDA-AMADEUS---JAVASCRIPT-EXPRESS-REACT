import { Request, Response } from "express"

//  IMPORTACION DE BASE DE DATOS
import poolPg from "../../database"

//  IMPORTACION DE DEPENDENCIAS
import MomentTime from 'moment-timezone'

//  IMPORTACION DE UTILIDADES 
import { POSTCrearElementoProductoI } from "../../utils/Interfaces"
import { crearElementoProducto } from "../utils/crearElementoProducto"
import { actualizarTempoImagenes, limpiarNombreTempoSolo } from "../utils/minioFunciones"
import { crearCacheElemento } from "../utils/administracionCache"


const POSTCrearElementoProducto = async (req: Request, res: Response) => {

    try {
        //Conexion con la base de datos
        const pgActive = await poolPg.connect();

        try {
            //Obtencion de la zona horaria de bogota/colombia
            const horaZonaBogota = MomentTime().tz('America/Bogota');
            const creacionFecha = horaZonaBogota.format();

            const reqBody: POSTCrearElementoProductoI = req.body

            //  INICIAR CONSULTA A LA BASE DE DATOS
            await pgActive.query("BEGIN")
            //*-------------------------------------------------------------------------------------------------------------- */


            // PARA EL DB USAMOS EL NOMBRE LIMPIO, PERO MANTENEMOS EL ORIGINAL PARA MINIO
            const bodyParaBD = { ...reqBody };
            if (bodyParaBD.imagen) {
                bodyParaBD.imagen = limpiarNombreTempoSolo(bodyParaBD.imagen);
            }

            //  CREAR EL ELEMENTO DEL PRODUCTO EN POSTGRES
            const resQuery01 = await crearElementoProducto(pgActive, creacionFecha, bodyParaBD)

            //  CREAR CACHE DEL ELEMENTO
            await crearCacheElemento(resQuery01)

            //  ACTUALIZAR INVENTARIO DE LAS IMAGENES QUE SE GUARDARON PREVIAMENTE ANTES
            if (reqBody.imagen) {
                await actualizarTempoImagenes([reqBody.imagen], reqBody.carpetaImagenes)
            }



            //*-------------------------------------------------------------------------------------------------------------- */
            //  FINALIZAR CONSULTA A LA BASE DE DATOS
            await pgActive.query("COMMIT")

            res.status(200).json()

        } catch (error) {
            console.log(error)
            await pgActive.query('ROLLBACK');
            res.status(404).json(error)

        } finally {
            pgActive.release();
        }


    } catch (error) {
        res.status(404).json("Error conexion base de datos")
    }



}


export default POSTCrearElementoProducto;