import { Request, Response } from "express"
import fs from "fs"

// IMPORTACION DE BASE DE DATOS
import poolPg from "../../database"

const GETMiOrdenPorIdUsuario = async (req: Request, res: Response) => {

    try {
        if (!req.session.usuario) {
            return res.status(401).json({ error: "No autenticado" });
        }

        const { id } = req.params;
        const idUsuario = req.session.usuario.id;

        const pgActive = await poolPg.connect();

        try {
            const consultaTexto01 = fs.readFileSync("./assets/databases/ObtenerMiOrdenPorIdUsuario.sql", "utf8");
            const resQuery01 = await pgActive.query(consultaTexto01, [id, idUsuario])

            if (resQuery01.rows.length === 0) {
                return res.status(404).json({ error: "Orden no encontrada o no pertenece al usuario" });
            }

            res.status(200).json(resQuery01.rows[0]);

        } catch (error) {
            console.log(error)
            res.status(404).json({ error: "Error al obtener los detalles de la orden" })

        } finally {
            pgActive.release();
        }

    } catch (error) {
        res.status(500).json({ error: "Error de conexión con la base de datos" })
    }
}

export default GETMiOrdenPorIdUsuario;
