import { Request, Response } from "express"

//  IMPORTACION DE BASE DE DATOS
import poolPg from "../../database"

// IMPORTACION DE UTILIDADES
import { crearCacheProducto } from "../utils/administracionCache"

const PATCHCambiarEstadoProducto = async (req: Request, res: Response) => {

    try {
        const pgActive = await poolPg.connect();

        try {
            const idProducto = req.params.id;
            const visibilidad = req.body.visibilidad; // boolean

            if (!idProducto) {
                return res.status(400).json({ error: "Falta el ID del producto" });
            }
            if (typeof visibilidad !== "boolean") {
                return res.status(400).json({ error: "El campo 'visibilidad' es requerido y debe ser booleano" });
            }

            //  INICIAR CONSULTA
            await pgActive.query("BEGIN")


            const consultaTexto = "UPDATE grupos_producto SET visibilidad = $1 WHERE id = $2 RETURNING id;";
            const result = await pgActive.query(consultaTexto, [visibilidad, idProducto]);

            if (result.rowCount === 0) {
                await pgActive.query("ROLLBACK");
                return res.status(404).json({ error: "Producto no encontrado" });
            }

            // ACTUALIZAR EL CACHE (redis)
            await crearCacheProducto(pgActive, idProducto);

            // FINALIZAR CONSULTA
            await pgActive.query("COMMIT")

            res.status(200).json({ mensaje: `Visibilidad del producto actualizada a: ${visibilidad}` })

        } catch (error) {
            console.log(error)
            await pgActive.query('ROLLBACK');
            res.status(500).json({ error: "Error al cambiar estado del producto" })

        } finally {
            pgActive.release();
        }

    } catch (error) {
        res.status(500).json({ error: "Error de conexión con la base de datos" })
    }

}

export default PATCHCambiarEstadoProducto;
