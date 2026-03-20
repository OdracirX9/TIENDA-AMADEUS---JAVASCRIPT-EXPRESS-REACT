import { Request, Response } from "express"
import path from "path"
import fs from "fs"
import poolPg from "../../database"
import { eliminarImagenes } from "../utils/minioFunciones"

const DELETEBorrarVariante = async (req: Request, res: Response) => {

    try {
        const pgActive = await poolPg.connect();

        try {
            const idVariante = req.params.id;
            if (!idVariante) {
                return res.status(400).json({ error: "Falta el ID de la variante" });
            }

            // 1. OBTENER LAS IMAGENES DE LA VARIANTE A ELIMINAR
            const queryImgPath = path.join(__dirname, "../../../assets/databases/ObtenerImagenesDeVariante.sql");
            const queryImgStr = fs.readFileSync(queryImgPath, 'utf8');
            const resultImg = await pgActive.query(queryImgStr, [idVariante]);

            //  INICIAR CONSULTA
            await pgActive.query("BEGIN")

            //  ELIMINAR LA VARIANTE
            const consultaTexto = "DELETE FROM variantes_producto WHERE id = $1 RETURNING id;";
            const result = await pgActive.query(consultaTexto, [idVariante]);

            if (result.rowCount === 0) {
                await pgActive.query("ROLLBACK");
                return res.status(404).json({ error: "Variante no encontrada" });
            }

            // 2. ELIMINAR LAS IMAGENES DEL BUCKET MINIO (Solo si se elimina la variable de la base de datos con exito)
            if (resultImg.rows.length > 0 && resultImg.rows[0].imagenes) {
                const arrayImagenes = resultImg.rows[0].imagenes;
                if (Array.isArray(arrayImagenes) && arrayImagenes.length > 0) {
                    await eliminarImagenes(arrayImagenes, "productos");
                }
            }

            // FINALIZAR CONSULTA
            await pgActive.query("COMMIT")

            res.status(200).json({ mensaje: "Variante eliminada correctamente" })

        } catch (error: any) {
            console.log(error)
            await pgActive.query('ROLLBACK');

            // Capturar la violación de llave foránea
            if (error.code === '23503') {
                return res.status(409).json({
                    error: "No se puede eliminar esta variante permanentemente porque existen registros asociados a ella. Se recomienda ocultar su visibilidad en el panel."
                });
            }

            res.status(500).json({ error: "Error al eliminar la variante" })

        } finally {
            pgActive.release();
        }

    } catch (error) {
        res.status(500).json({ error: "Error de conexión con la base de datos" })
    }

}

export default DELETEBorrarVariante;
