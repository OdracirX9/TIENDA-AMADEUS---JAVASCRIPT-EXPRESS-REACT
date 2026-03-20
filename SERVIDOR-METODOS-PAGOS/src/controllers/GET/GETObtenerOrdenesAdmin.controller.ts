import { Request, Response } from "express"
import fs from "fs"

//  IMPORTACION DE BASE DE DATOS
import poolPg from "../../database"

const GETObtenerOrdenesAdmin = async (req: Request, res: Response) => {

    try {
        //Conexion con la base de datos
        const pgActive = await poolPg.connect();

        try {
            const page = parseInt(req.query.page as string) || 1
            const limit = parseInt(req.query.limit as string) || 50
            const offset = (page - 1) * limit

            //  INICIAR CONSULTA A LA BASE DE DATOS
            const consultaTexto01 = fs.readFileSync("./assets/databases/ObtenerTodasLasOrdenesAdmin.sql", "utf8");
            const resQuery01 = await pgActive.query(consultaTexto01, [offset, limit])


            //  FINALIZAR CONSULTA A LA BASE DE DATOS

            res.status(200).json({
                page,
                limit,
                total: resQuery01.rowCount,
                data: resQuery01.rows
            })

        } catch (error) {
            console.log(error)
            res.status(404).json({ error: "Error al obtener ordenes" })

        } finally {
            pgActive.release();
        }


    } catch (error) {
        res.status(500).json({ error: "Error de conexión con la base de datos" })
    }

}

export default GETObtenerOrdenesAdmin;
