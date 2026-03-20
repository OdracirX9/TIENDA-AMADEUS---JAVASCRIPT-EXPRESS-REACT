import { Request, Response } from "express";
import poolPg from "../../database";
import { crearCacheLandingPage } from "../utils/administracionCache";

const POSTCrearLandingPage = async (req: Request, res: Response): Promise<void> => {
    try {
        const { titulo, descripcion, array_variantes, posicion, visibilidad } = req.body;
        console.log("Creando Landing Page:", { titulo, descripcion, array_variantes, posicion, visibilidad });

        const resultado = await poolPg.query(
            `INSERT INTO public.landing_page (titulo, descripcion, array_variantes, posicion, visibilidad)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [titulo, descripcion, array_variantes, posicion, visibilidad]
        );

        // Actualizar cache de Redis
        await crearCacheLandingPage();

        res.status(201).json({
            mensaje: "Elemento de Landing Page creado correctamente",
            elemento: resultado.rows[0]
        });
    } catch (error) {
        console.error("Error al crear elemento de Landing Page:", error);
        res.status(500).json({ mensaje: "Error interno del servidor al crear elemento de Landing Page" });
    }
};

export default POSTCrearLandingPage;
