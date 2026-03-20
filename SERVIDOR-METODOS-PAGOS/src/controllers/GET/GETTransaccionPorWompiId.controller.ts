import { Request, Response } from "express"
import dotenv from "dotenv"
dotenv.config()

import poolPg from "../../database"

const GETTransaccionPorWompiId = async (req: Request, res: Response) => {
    try {
        const idWompi = req.params.id;

        if (!idWompi) {
            return res.status(400).json({ mensaje: "El ID de la transacción es requerido" });
        }

        const pgActive = await poolPg.connect();

        try {
            // Obtenemos la transacción junto con su orden asociada
            const querySelect = `
                SELECT 
                    t.id_wompi,
                    t.estado as estado_pago,
                    t.compra_total,
                    t.created_at as fecha_pago,
                    t.metodo_pago,
                    o.id as id_orden,
                    o.estado_envio
                FROM public.transaccion t
                LEFT JOIN public.orden_grupo o ON t.id_orden = o.id
                WHERE t.id_wompi = $1
            `;

            const resSelect = await pgActive.query(querySelect, [idWompi]);

            if (resSelect.rowCount === 0) {
                return res.status(404).json({ mensaje: "No se encontró ninguna transacción con ese ID" });
            }

            res.status(200).json(resSelect.rows[0]);

        } catch (error) {
            console.error("Error consultando transacción:", error);
            res.status(500).json({ mensaje: "Error al consultar la transacción" });
        } finally {
            pgActive.release();
        }

    } catch (error) {
        console.error("Error de base de datos:", error);
        res.status(500).json({ mensaje: "Error conexión base de datos" });
    }
}

export default GETTransaccionPorWompiId;
