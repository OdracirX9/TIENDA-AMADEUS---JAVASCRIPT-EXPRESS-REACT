import { Request, Response } from "express";
import poolPg from "../../database";

const GETObtenerLandingPage = async (req: Request, res: Response): Promise<void> => {
    try {
        // Asegurar que la tabla exista para no retornar error al iniciar
        await poolPg.query(`
            CREATE TABLE IF NOT EXISTS public.landing_page (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                titulo VARCHAR(255) NOT NULL,
                descripcion TEXT,
                array_variantes VARCHAR[],
                posicion INTEGER DEFAULT -1,
                visibilidad BOOLEAN DEFAULT false,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);

        const resultado = await poolPg.query(
            `SELECT * FROM public.landing_page ORDER BY posicion ASC`
        );

        res.status(200).json(resultado.rows || []);
    } catch (error) {
        console.error("Error al obtener elementos de Landing Page:", error);
        res.status(500).json({ mensaje: "Error interno del servidor al obtener elementos de Landing Page" });
    }
};

export default GETObtenerLandingPage;
