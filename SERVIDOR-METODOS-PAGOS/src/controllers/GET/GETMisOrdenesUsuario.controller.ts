import { Request, Response } from "express"
import fs from "fs"

// IMPORTACION DE BASE DE DATOS
import poolPg from "../../database"

const GETMisOrdenesUsuario = async (req: Request, res: Response) => {

    try {
        if (!req.session.usuario) {
            return res.status(401).json({ error: "No autenticado" });
        }

        const idUsuario = req.session.usuario.id;
        const pgActive = await poolPg.connect();

        try {
            const consultaTexto01 = fs.readFileSync("./assets/databases/ObtenerMisOrdenesUsuario.sql", "utf8");
            const resQuery01 = await pgActive.query(consultaTexto01, [idUsuario])

            res.status(200).json(resQuery01.rows);

        } catch (error) {
            console.log(error)
            res.status(404).json({ error: "Error al obtener las órdenes del usuario" })

        } finally {
            pgActive.release();
        }

    } catch (error) {
        res.status(500).json({ error: "Error de conexión con la base de datos" })
    }
}

export default GETMisOrdenesUsuario;
