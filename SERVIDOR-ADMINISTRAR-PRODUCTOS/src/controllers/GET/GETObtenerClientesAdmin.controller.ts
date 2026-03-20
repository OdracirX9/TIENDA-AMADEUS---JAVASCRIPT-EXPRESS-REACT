import { Request, Response } from "express"
import fs from "fs"

//  IMPORTACION DE BASE DE DATOS
import poolPg from "../../database"

const GETObtenerClientesAdmin = async (req: Request, res: Response) => {

    try {
        //Conexion con la base de datos
        const pgActive = await poolPg.connect();

        try {
            const page = parseInt(req.query.page as string) || 1
            const limit = parseInt(req.query.limit as string) || 50
            const offset = (page - 1) * limit

            //  INICIAR CONSULTA A LA BASE DE DATOS
            const consultaTexto = fs.readFileSync("./assets/databases/ObtenerTodosLosUsuariosAdmin.sql", "utf8");
            const resQuery = await pgActive.query(consultaTexto, [offset, limit])

            res.status(200).json({
                page,
                limit,
                total: resQuery.rowCount,
                data: resQuery.rows
            })

        } catch (error) {
            console.log(error)
            res.status(404).json({ error: "Error al obtener clientes" })

        } finally {
            pgActive.release();
        }

    } catch (error) {
        res.status(500).json({ error: "Error de conexión con la base de datos" })
    }

}

export default GETObtenerClientesAdmin;
