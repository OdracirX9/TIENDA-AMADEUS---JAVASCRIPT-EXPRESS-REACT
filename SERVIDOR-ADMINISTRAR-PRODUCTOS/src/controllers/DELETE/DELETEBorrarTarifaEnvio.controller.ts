import { Request, Response } from "express"
import poolPg from "../../database"

const DELETEBorrarTarifaEnvio = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: "Falta el ID de la tarifa a eliminar." });
        }

        const pgActive = await poolPg.connect();

        try {
            await pgActive.query(`DELETE FROM public.tarifas_envio WHERE id = $1`, [id]);
            res.status(200).json({ message: "Tarifa eliminada exitosamente." });

        } catch (error: any) {
            console.error("Error al eliminar tarifa de envío:", error);
            res.status(500).json({ error: "Ocurrió un error al eliminar la tarifa." });
        } finally {
            pgActive.release();
        }

    } catch (error) {
        res.status(500).json({ error: "Error de conexión con la base de datos" });
    }
}

export default DELETEBorrarTarifaEnvio;
