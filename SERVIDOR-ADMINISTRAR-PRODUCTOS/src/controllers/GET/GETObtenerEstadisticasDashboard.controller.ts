import { Request, Response } from "express"
import fs from "fs"

//  IMPORTACION DE BASE DE DATOS
import poolPg from "../../database"

const GETObtenerEstadisticasDashboard = async (req: Request, res: Response) => {

    try {
        //Conexion con la base de datos
        const pgActive = await poolPg.connect();

        try {

            //  INICIAR CONSULTA A LA BASE DE DATOS
            const consultaTexto01 = fs.readFileSync("./assets/databases/ObtenerEstadisticasDashboard.sql", "utf8");
            const resQuery01 = await pgActive.query(consultaTexto01)

            res.status(200).json(resQuery01.rows[0])

        } catch (error) {
            console.log(error)
            res.status(404).json({ error: "Error al obtener las estadísticas" })

        } finally {
            pgActive.release();
        }

    } catch (error) {
        res.status(500).json({ error: "Error de conexión con la base de datos" })
    }

}

export default GETObtenerEstadisticasDashboard;
