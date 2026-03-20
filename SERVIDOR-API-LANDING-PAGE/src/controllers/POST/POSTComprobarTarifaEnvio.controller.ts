import { Request, Response } from "express";

// IMPORTACION DE BASE DE DATOS
import poolPg from "../../database";

const POSTComprobarTarifaEnvio = async (req: Request, res: Response) => {
    try {
        const { departamento, ciudad } = req.body;

        if (!departamento || typeof departamento !== 'string') {
            return res.status(400).json({ error: "Debe proveer un departamento válido" });
        }

        if (!ciudad || typeof ciudad !== 'string') {
            return res.status(400).json({ error: "Debe proveer una ciudad válida" });
        }

        const pgActive = await poolPg.connect();

        try {
            let tarifaCentavos = 2000000; // Valor por defecto

            // 1. Buscar tarifa exacta (departamento + ciudad)
            const consultaExacta = "SELECT precio FROM tarifas_envio WHERE LOWER(departamento) = LOWER($1) AND LOWER(ciudad) = LOWER($2)";
            const resExacta = await pgActive.query(consultaExacta, [departamento, ciudad]);

            if (resExacta.rows.length > 0) {
                tarifaCentavos = Number(resExacta.rows[0].precio);
            } else {
                // 2. Buscar tarifa general (departamento + "TODO")
                const consultaTodo = "SELECT precio FROM tarifas_envio WHERE LOWER(departamento) = LOWER($1) AND ciudad = 'TODO'";
                const resTodo = await pgActive.query(consultaTodo, [departamento]);

                if (resTodo.rows.length > 0) {
                    tarifaCentavos = Number(resTodo.rows[0].precio);
                }
            }

            res.status(200).json({
                valido: true,
                tarifa: tarifaCentavos
            });

        } catch (error) {
            console.error("Error al consultar tarifa de envío:", error);
            res.status(500).json({ error: "Error interno al consultar tarifa de envío" });
        } finally {
            pgActive.release();
        }

    } catch (error) {
        console.error("Error BD", error);
        res.status(500).json({ error: "Error de conexión con la base de datos" });
    }
}

export default POSTComprobarTarifaEnvio;
