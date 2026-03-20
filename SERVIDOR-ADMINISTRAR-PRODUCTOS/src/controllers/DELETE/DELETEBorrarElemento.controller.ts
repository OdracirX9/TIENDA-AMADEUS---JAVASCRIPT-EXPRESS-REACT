import { Request, Response } from "express"

//  IMPORTACION DE BASE DE DATOS
import poolPg from "../../database"

// IMPORTACION DE UTILIDADES
import { eliminarCacheElementoPorId } from "../utils/administracionCache"

const DELETEBorrarElemento = async (req: Request, res: Response) => {

    try {
        const pgActive = await poolPg.connect();

        try {
            const idElemento = req.params.id;
            const tipoElemento = req.query.tipo as string; // ej: "categorias_producto" o "marcas_producto"

            if (!idElemento || !tipoElemento) {
                return res.status(400).json({ error: "Faltan el ID del elemento o el tipo de elemento (?tipo=tabla)" });
            }

            // Tablas permitidas para evitar inyección SQL
            const tablasPermitidas = ["marcas_producto", "categorias_producto", "banner_producto"];
            if (!tablasPermitidas.includes(tipoElemento)) {
                return res.status(400).json({ error: "Tipo de elemento no válido" });
            }

            //  INICIAR CONSULTA
            await pgActive.query("BEGIN")

            // IMPORTANTE: Si el elemento (ej: categoria) tiene productos asignados, esto fallará 
            // si la DB restringe el borrado (lo cual es correcto para evitar datos huérfanos).
            const consultaTexto = `DELETE FROM ${tipoElemento} WHERE id = $1 RETURNING id;`;
            const result = await pgActive.query(consultaTexto, [idElemento]);

            if (result.rowCount === 0) {
                await pgActive.query("ROLLBACK");
                return res.status(404).json({ error: "Elemento no encontrado" });
            }

            // ACTUALIZAR EL CACHE (redis)
            await eliminarCacheElementoPorId(tipoElemento, idElemento);

            // FINALIZAR CONSULTA
            await pgActive.query("COMMIT")

            res.status(200).json({ mensaje: "Elemento eliminado correctamente" })

        } catch (error: any) {
            console.log(error)
            await pgActive.query('ROLLBACK');

            // Si el error es una violación de llave foránea de PostgreSQL (código '23503')
            if (error.code === '23503') {
                return res.status(409).json({ error: "No se puede eliminar este elemento porque hay productos que lo utilizan" });
            }

            res.status(500).json({ error: "Error al eliminar el elemento" })

        } finally {
            pgActive.release();
        }

    } catch (error) {
        res.status(500).json({ error: "Error de conexión con la base de datos" })
    }

}

export default DELETEBorrarElemento;
