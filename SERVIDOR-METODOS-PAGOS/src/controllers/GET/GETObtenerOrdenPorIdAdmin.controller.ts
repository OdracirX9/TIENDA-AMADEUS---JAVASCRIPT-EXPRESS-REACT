import { Request, Response } from "express"
import fs from "fs"

//  IMPORTACION DE BASE DE DATOS
import poolPg from "../../database"

const GETObtenerOrdenPorIdAdmin = async (req: Request, res: Response) => {

    try {
        const { id } = req.params;

        //Conexion con la base de datos
        const pgActive = await poolPg.connect();

        try {

            //  INICIAR CONSULTA A LA BASE DE DATOS
            const consultaTexto01 = fs.readFileSync("./assets/databases/ObtenerOrdenPorIdAdmin.sql", "utf8");
            const resQuery01 = await pgActive.query(consultaTexto01, [id])

            if (resQuery01.rows.length === 0) {
                return res.status(404).json({ error: "Orden no encontrada" });
            }

            res.status(200).json(resQuery01.rows[0]);

        } catch (error) {
            console.log(error)
            res.status(404).json({ error: "Error al obtener la orden" })

        } finally {
            pgActive.release();
        }

    } catch (error) {
        res.status(500).json({ error: "Error de conexión con la base de datos" })
    }

}

export default GETObtenerOrdenPorIdAdmin;
