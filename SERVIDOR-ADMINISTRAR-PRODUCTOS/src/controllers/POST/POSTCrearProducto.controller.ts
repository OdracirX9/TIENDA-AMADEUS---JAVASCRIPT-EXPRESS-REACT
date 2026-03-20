import { Request, Response } from "express"

//  IMPORTACION DE BASE DE DATOS
import poolPg from "../../database"

//  IMPORTACION DE DEPENDENCIAS
import MomentTime from 'moment-timezone'

//  IMPORTACION DE UTILIDADES 
import { POSTCrearProductoI } from "../../utils/Interfaces"
import { crearGrupoProductos, crearVarianteProductos, crearHistorialProductos, crearActualPrecioProductos } from "../utils/crearProductoFunciones"
import { actualizarTempoImagenes, limpiarNombreTempoArray } from "../utils/minioFunciones"
import { crearCacheProductoMemoria } from "../utils/administracionCache"


const POSTCrearProducto = async (req: Request, res: Response) => {

    try {
        //Conexion con la base de datos
        const pgActive = await poolPg.connect();

        try {
            //Obtencion de la zona horaria de bogota/colombia
            const horaZonaBogota = MomentTime().tz('America/Bogota');
            const creacionFecha = horaZonaBogota.format();

            const reqBody: POSTCrearProductoI = req.body

            //  INICIAR CONSULTA A LA BASE DE DATOS
            await pgActive.query("BEGIN")
            //*-------------------------------------------------------------------------------------------------------------- */



            // CREAR EL GRUPO DE PRODUCTOS
            const valoresDeOrden01 = [reqBody.id_categoria, reqBody.id_marca, reqBody.visibilidad, creacionFecha, creacionFecha]
            const resQuery01 = await crearGrupoProductos(pgActive, valoresDeOrden01)

            // Limpiamos los nombres de las imágenes para que a la BD vayan sin prefijo "tempo-"
            const variantesParaBD = reqBody.variantes.map(v => ({
                ...v,
                imagenes: limpiarNombreTempoArray(v.imagenes)
            }))

            //CREAR LAS VARIANTES DEL PRODUCTO
            const resQuery02 = await crearVarianteProductos(pgActive, String(resQuery01[0].id), creacionFecha, variantesParaBD)

            // CREAR EL HISTORIAL DE LAS VARIANTES
            const resQuery03 = await crearHistorialProductos(pgActive, creacionFecha, resQuery02, variantesParaBD)

            //  CREAR EL ACTUAL PRECIO DE LAS VARIANTES 
            const resQuery04 = await crearActualPrecioProductos(pgActive, creacionFecha, resQuery03)

            //  CREAR UN NUEVO DATO EN REDIS EN MEMORIA
            await crearCacheProductoMemoria(resQuery01[0], resQuery02, resQuery04)

            //  ACTUALIZAR INVENTARIO DE LAS IMAGENES QUE SE GUARDARON PREVIAMENTE ANTES
            for (const itm of reqBody.variantes) {
                if (itm.imagenes.length > 0) {
                    await actualizarTempoImagenes(itm.imagenes, reqBody.carpetaImagenes)
                }
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


export default POSTCrearProducto;