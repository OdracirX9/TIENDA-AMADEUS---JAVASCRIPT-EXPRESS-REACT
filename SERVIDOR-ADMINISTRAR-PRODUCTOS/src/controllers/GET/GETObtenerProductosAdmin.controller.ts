import { Request, Response } from "express"
import fs from "fs"

//  IMPORTACION DE BASE DE DATOS
import poolPg from "../../database"

const GETObtenerProductosAdmin = async (req: Request, res: Response) => {

    try {
        //Conexion con la base de datos
        const pgActive = await poolPg.connect();

        try {
            const page = parseInt(req.query.page as string) || 1
            const limit = parseInt(req.query.limit as string) || 50
            const offset = (page - 1) * limit

            const search = req.query.search ? `%${req.query.search}%` : null;
            const idCategoria = req.query.categoria || null;
            const idMarca = req.query.marca || null;

            //  INICIAR CONSULTA A LA BASE DE DATOS
            const consultaTexto01 = fs.readFileSync("./assets/databases/ObtenerTodosLosProductosAdmin.sql", "utf8");

            // Pasamos los nuevos parametros al SQL (offset, limit, search, categoria, marca)
            const resQuery01 = await pgActive.query(consultaTexto01, [offset, limit, search, idCategoria, idMarca])


            //  FINALIZAR CONSULTA A LA BASE DE DATOS

            /* 
               En este caso no usamos transacciones complejas (BEGIN/COMMIT) porque es solo lectura,
               pero liberar el cliente es obligatorio.
            */

            res.status(200).json({
                page,
                limit,
                total: resQuery01.rowCount, // Total devuelto en esta página
                data: resQuery01.rows
            })

        } catch (error) {
            console.log(error)
            res.status(404).json({ error: "Error al obtener productos" })

        } finally {
            pgActive.release();
        }


    } catch (error) {
        res.status(500).json({ error: "Error de conexión con la base de datos" })
    }

}

export default GETObtenerProductosAdmin;
