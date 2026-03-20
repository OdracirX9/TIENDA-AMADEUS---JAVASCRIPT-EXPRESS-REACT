import { Request, Response } from "express";
import { formatearCacheRedis } from "../../utils/cacheManager";

const DELETEEliminarCacheGlobal = async (req: Request, res: Response): Promise<void> => {
    try {
        await formatearCacheRedis();
        res.status(200).json({ message: "La caché global ha sido formateada y vaciada exitosamente." });
    } catch (error) {
        console.error("Error al formatear la caché global desde el endpoint:", error);
        res.status(500).json({ error: "Ocurrió un error interno al intentar limpiar la caché global." });
    }
};

export default DELETEEliminarCacheGlobal;
