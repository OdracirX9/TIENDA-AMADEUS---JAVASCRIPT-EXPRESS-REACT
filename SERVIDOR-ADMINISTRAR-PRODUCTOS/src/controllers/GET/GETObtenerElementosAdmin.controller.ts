import { Request, Response } from "express"

//  IMPORTACION DE BASE DE DATOS
import poolPg from "../../database"

const GETObtenerElementosAdmin = async (req: Request, res: Response) => {
    try {
        const pgActive = await poolPg.connect();

        try {
            await pgActive.query("BEGIN")

            const consultaMarcas = "SELECT * FROM marcas_producto";
            const resMarcas = await pgActive.query(consultaMarcas);

            const consultaCategorias = "SELECT * FROM categorias_producto";
            const resCategorias = await pgActive.query(consultaCategorias);

            const arrayResultado = {
                marcas: resMarcas.rows,
                categorias: resCategorias.rows
            };

            await pgActive.query("COMMIT")

            res.status(200).json(arrayResultado)

        } catch (error) {
            await pgActive.query('ROLLBACK');
            console.log(error)
            res.status(500).json({ error: "Error al obtener elementos" })

        } finally {
            pgActive.release();
        }

    } catch (error) {
        res.status(500).json({ error: "Error conexion base de datos" })
    }
}

export default GETObtenerElementosAdmin;
