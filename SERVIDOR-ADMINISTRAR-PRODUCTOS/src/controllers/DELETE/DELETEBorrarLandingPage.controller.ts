import { Request, Response } from "express";
import poolPg from "../../database";
import { crearCacheLandingPage } from "../utils/administracionCache";

const DELETEBorrarLandingPage = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const resultado = await poolPg.query(
            `DELETE FROM public.landing_page WHERE id = $1 RETURNING id`,
            [id]
        );

        if (resultado.rowCount === 0) {
            res.status(404).json({ mensaje: "Elemento de Landing Page no encontrado para eliminar" });
            return;
        }

        // Actualizar cache de Redis
        await crearCacheLandingPage();

        res.status(200).json({
            mensaje: "Elemento de Landing Page eliminado correctamente",
            id: resultado.rows[0].id
        });
    } catch (error) {
        console.error("Error al eliminar elemento de Landing Page:", error);
        res.status(500).json({ mensaje: "Error interno del servidor al eliminar elemento de Landing Page" });
    }
};

export default DELETEBorrarLandingPage;
