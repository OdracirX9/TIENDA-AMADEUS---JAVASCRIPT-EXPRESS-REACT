import { Request, Response } from "express";
import poolPg from "../../database";
import { crearCacheLandingPage } from "../utils/administracionCache";

const PATCHActualizarLandingPage = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const datosBody = req.body;
        console.log(`Actualizando Landing Page ${id}:`, datosBody);

        if (Object.keys(datosBody).length === 0) {
            res.status(400).json({ mensaje: "No hay datos para actualizar" });
            return;
        }

        // Construcción dinámica del query
        let queryStr = `UPDATE public.landing_page SET `;
        const valores: any[] = [];
        let index = 1;

        for (const [key, value] of Object.entries(datosBody)) {
            // Se ignora el ID si viene en el body, ya que se toma de los params
            if (key !== "id") {
                queryStr += `${key} = $${index}, `;
                valores.push(value);
                index++;
            }
        }

        // Remover la última coma y espacio
        queryStr = queryStr.slice(0, -2);
        queryStr += ` WHERE id = $${index} RETURNING *`;
        valores.push(id);

        const resultado = await poolPg.query(queryStr, valores);

        if (resultado.rowCount === 0) {
            res.status(404).json({ mensaje: "Elemento de Landing Page no encontrado" });
            return;
        }

        // Actualizar cache de Redis
        await crearCacheLandingPage();

        res.status(200).json({
            mensaje: "Elemento de Landing Page actualizado correctamente",
            elemento: resultado.rows[0]
        });
    } catch (error) {
        console.error("Error al actualizar elemento de Landing Page:", error);
        res.status(500).json({ mensaje: "Error interno del servidor al actualizar elemento de Landing Page" });
    }
};

export default PATCHActualizarLandingPage;
