import { Request, Response } from "express"
import poolPg from "../../database"

const GETObtenerTarifasEnvio = async (req: Request, res: Response) => {
    try {
        const pgActive = await poolPg.connect();

        try {
            const call = await pgActive.query(`
                SELECT id, departamento, ciudad, precio, tiempo_estimado, created_at 
                FROM public.tarifas_envio 
                ORDER BY departamento ASC, ciudad ASC
            `);

            res.status(200).json(call.rows);

        } catch (error: any) {
            console.error("Error al obtener tarifas de envío:", error);
            res.status(500).json({ error: "Ocurrió un error obteniendo las tarifas." });
        } finally {
            pgActive.release();
        }

    } catch (error) {
        res.status(500).json({ error: "Error de conexión con la base de datos" });
    }
}

export default GETObtenerTarifasEnvio;
