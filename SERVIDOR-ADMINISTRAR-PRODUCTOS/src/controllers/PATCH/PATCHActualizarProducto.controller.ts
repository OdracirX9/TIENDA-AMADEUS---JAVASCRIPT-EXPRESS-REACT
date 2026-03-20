import { Request, Response } from "express"

//  IMPORTACION DE BASE DE DATOS
import poolPg from "../../database"

//  IMPORTACION DE DEPENDENCIAS
import MomentTime from 'moment-timezone'

//  IMPORTACION DE UTILIDADES 
import { PATCHActualizarProductoI, ActualizarVarianteProductoI } from "../../utils/Interfaces"
import { actualizarGrupoProducto, actualizarOCrearVariantesProducto } from "../utils/actualizarProductoFunciones"
import { actualizarTempoImagenes, eliminarImagenes, limpiarNombreTempoArray } from "../utils/minioFunciones"
import { crearCacheProducto } from "../utils/administracionCache"

const POSTCrearProducto = async (req: Request, res: Response) => {

    try {
        //Conexion con la base de datos
        const pgActive = await poolPg.connect();

        try {
            //Obtencion de la zona horaria de bogota/colombia
            const horaZonaBogota = MomentTime().tz('America/Bogota');
            const creacionFecha = horaZonaBogota.format();

            const { carpetaImagenes: carpetaImagenesMinio, ...reqBody } = req.body as PATCHActualizarProductoI;

            //  VERIFICAR SI EXISTEN CAMPOS POR ACTUALIZAR
            if (!Object.keys(reqBody).length) {
                return res.status(400).json({ error: "No se enviaron campos para actualizar" });
            }

            //  INICIAR CONSULTA A LA BASE DE DATOS
            await pgActive.query("BEGIN")
            //*-------------------------------------------------------------------------------------------------------------- */



            //  ACTUALIZAR EL GRUPO DEL PRODUCTO 
            const resQuery01 = await actualizarGrupoProducto(pgActive, creacionFecha, reqBody)

            // ACTUALIZAR LAS VARIANTES QUE ESTAN DISPONIBLES Y QUE COINCIDAN CON EL GRUPO
            const resFuncion01 = await actualizarOCrearVariantesProducto(pgActive, creacionFecha, reqBody.id as string, reqBody.variantes as ActualizarVarianteProductoI[])

            //  CREAR UN NUEVO DATO EN REDIS
            await crearCacheProducto(pgActive, reqBody.id as string)


            // ACTUALIZAR EL BANCO DE IMAGENES, DEPENDIENDO SI TOCA ELIMINAR O SUBIR
            if (resFuncion01.subir.length > 0) {
                await actualizarTempoImagenes(resFuncion01.subir, carpetaImagenesMinio as string)
            }
            if (resFuncion01.eliminar.length > 0) {
                await eliminarImagenes(resFuncion01.eliminar, carpetaImagenesMinio as string)
            }

            //*-------------------------------------------------------------------------------------------------------------- */
            //  FINALIZAR CONSULTA A LA BASE DE DATOS
            await pgActive.query("COMMIT")

            res.status(200).json()

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


export default POSTCrearProducto;