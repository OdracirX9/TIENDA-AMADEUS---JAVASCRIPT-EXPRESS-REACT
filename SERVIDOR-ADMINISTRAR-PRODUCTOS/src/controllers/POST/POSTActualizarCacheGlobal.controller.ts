import { Request, Response } from "express";
import { actualizarCacheGlobal } from "../../utils/cacheManager";

const POSTActualizarCacheGlobal = async (req: Request, res: Response): Promise<void> => {
    try {
        await actualizarCacheGlobal();
        res.status(200).json({ message: "La caché global ha sido actualizada exitosamente." });
    } catch (error) {
        console.error("Error al actualizar la caché global desde el endpoint:", error);
        res.status(500).json({ error: "Ocurrió un error interno al intentar actualizar la caché global." });
    }
};

export default POSTActualizarCacheGlobal;
