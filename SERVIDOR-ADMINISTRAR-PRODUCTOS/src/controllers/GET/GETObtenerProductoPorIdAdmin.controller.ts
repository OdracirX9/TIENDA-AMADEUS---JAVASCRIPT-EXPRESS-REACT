import { Request, Response } from "express"
import fs from "fs"

//  IMPORTACION DE BASE DE DATOS
import poolPg from "../../database"

const GETObtenerProductoPorIdAdmin = async (req: Request, res: Response) => {

    try {
        const pgActive = await poolPg.connect();

        try {
            const idProducto = req.params.id;
            if (!idProducto) {
                return res.status(400).json({ error: "Falta el ID del producto" });
            }

            //  Utilizamos la misma consulta que usa la caché (ObtenerProducto.sql)
            //  que devuelve el grupo con todas sus variantes estructuradas en JSON
            const consultaTexto01 = fs.readFileSync("./assets/databases/ObtenerProducto.sql", "utf8");
            const resQuery01 = await pgActive.query(consultaTexto01, [idProducto])

            if (resQuery01.rowCount === 0) {
                return res.status(404).json({ error: "Producto no encontrado" });
            }

            res.status(200).json(resQuery01.rows[0])

        } catch (error) {
            console.log(error)
            res.status(500).json({ error: "Error al obtener el producto" })

        } finally {
            pgActive.release();
        }

    } catch (error) {
        res.status(500).json({ error: "Error de conexión con la base de datos" })
    }

}

export default GETObtenerProductoPorIdAdmin;
