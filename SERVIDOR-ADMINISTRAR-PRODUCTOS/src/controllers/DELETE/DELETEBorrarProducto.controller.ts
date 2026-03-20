import { Request, Response } from "express"
import path from "path"
import fs from "fs"

//  IMPORTACION DE BASE DE DATOS
import poolPg from "../../database"
import { eliminarCacheProducto } from "../utils/administracionCache"
import { eliminarImagenes } from "../utils/minioFunciones"

const DELETEBorrarProducto = async (req: Request, res: Response) => {

    try {
        const pgActive = await poolPg.connect();

        try {
            const idProducto = req.params.id;
            if (!idProducto) {
                return res.status(400).json({ error: "Falta el ID del producto" });
            }

            // 1. OBTENER LAS IMAGENES DE TODAS LAS VARIANTES DEL PRODUCTO
            const queryImgPath = path.join(__dirname, "../../../assets/databases/ObtenerImagenesVariantesPorGrupo.sql");
            const queryImgStr = fs.readFileSync(queryImgPath, 'utf8');
            const resultImg = await pgActive.query(queryImgStr, [idProducto]);

            //  INICIAR CONSULTA
            await pgActive.query("BEGIN")

            //  ELIMINAR GRUPO DE PRODUCTO (CASCADA ELIMINARÁ VARIANTES, HISTORIAL Y PRECIO)
            //  *Asumiendo que la base de datos tiene ON DELETE CASCADE configurado. 
            //  *Si no lo tiene, fallará por llave foránea, pero es la forma correcta.
            const consultaTexto = "DELETE FROM grupos_producto WHERE id = $1 RETURNING id;";
            const result = await pgActive.query(consultaTexto, [idProducto]);

            if (result.rowCount === 0) {
                await pgActive.query("ROLLBACK");
                return res.status(404).json({ error: "Producto no encontrado" });
            }

            // 2. ELIMINAR LAS IMAGENES DEL BUCKET MINIO
            if (resultImg.rows.length > 0) {
                const todasLasImagenes = resultImg.rows.flatMap(row => row.imagenes || []);
                if (todasLasImagenes.length > 0) {
                    await eliminarImagenes(todasLasImagenes, "productos");
                }
            }

            // ELIMINAR DE CACHE
            await eliminarCacheProducto(pgActive, idProducto);

            // FINALIZAR CONSULTA
            await pgActive.query("COMMIT")

            res.status(200).json({ mensaje: "Producto eliminado correctamente" })

        } catch (error: any) {
            console.log(error)
            await pgActive.query('ROLLBACK');

            // Capturar la violación de llave foránea de PostgreSQL (El producto ya fue comprado, existe en orden_producto)
            if (error.code === '23503') {
                return res.status(409).json({
                    error: "No se puede eliminar este producto permanentemente porque existen facturas y órdenes de compra asociadas a él. Se recomienda ocultar su visibilidad en el panel."
                });
            }

            res.status(500).json({ error: "Error al eliminar producto" })

        } finally {
            pgActive.release();
        }

    } catch (error) {
        res.status(500).json({ error: "Error de conexión con la base de datos" })
    }

}

export default DELETEBorrarProducto;
