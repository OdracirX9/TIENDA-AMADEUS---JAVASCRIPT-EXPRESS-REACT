import { Request, Response } from "express"
import fs from "fs"
import poolPg from "../../database"

const POSTCrearTarifaEnvio = async (req: Request, res: Response) => {
    try {
        const { departamento, ciudad, precio, tiempo_estimado } = req.body;

        if (!departamento || !ciudad || precio === undefined) {
            return res.status(400).json({ error: "Faltan campos obligatorios: departamento, ciudad o precio." });
        }

        const pgActive = await poolPg.connect();

        try {
            const queryRaw = fs.readFileSync("./assets/databases/GestionTarifasEnvio.sql", "utf8");
            const upsertQuery = queryRaw.split(';')[0]; // Toma solo el primer bloque (INSERT... ON CONFLICT)

            await pgActive.query(upsertQuery, [
                departamento.toUpperCase().trim(),
                ciudad.toUpperCase().trim(),
                Number(precio),
                tiempo_estimado || null
            ]);

            res.status(200).json({ message: "Tarifa de envío guardada/actualizada exitosamente." });

        } catch (error: any) {
            console.error("Error al guardar tarifa de envío:", error);
            res.status(500).json({ error: "Ocurrió un error guardando la tarifa de envío." });
        } finally {
            pgActive.release();
        }

    } catch (error) {
        res.status(500).json({ error: "Error de conexión con la base de datos" });
    }
}

export default POSTCrearTarifaEnvio;
