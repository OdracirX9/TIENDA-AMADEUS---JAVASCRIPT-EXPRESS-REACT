import { Request, Response } from "express"
import { z } from "zod"

// IMPORTACION DE BASE DE DATOS
import poolPg from "../../database"

// Esquema Zod para validación de datos
const PATCHEstadoEnvioZ = z.object({
    estado_envio: z.enum(["Pendiente", "Procesando", "Enviado", "Entregado"]),
    numero_guia: z.string().optional().nullable()
})

const PATCHEstadoEnvioAdmin = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const validacion = PATCHEstadoEnvioZ.safeParse(req.body);

        if (!validacion.success) {
            return res.status(400).json({ error: "Datos de envío inválidos", detalles: validacion.error.issues });
        }

        const pgActive = await poolPg.connect();

        try {
            await pgActive.query("BEGIN");

            const consultaTexto = `
                UPDATE orden_grupo 
                SET estado_envio = $1, numero_guia = $2 
                WHERE id = $3 
                RETURNING id, estado_envio, numero_guia;
            `;

            const reqBody = validacion.data;
            const resQuery = await pgActive.query(consultaTexto, [reqBody.estado_envio, reqBody.numero_guia || null, id]);

            if (resQuery.rows.length === 0) {
                await pgActive.query("ROLLBACK");
                return res.status(404).json({ error: "Orden no encontrada" });
            }

            await pgActive.query("COMMIT");
            res.status(200).json({
                mensaje: "Estado de envío actualizado correctamente",
                data: resQuery.rows[0]
            });

        } catch (error) {
            await pgActive.query('ROLLBACK');
            console.log(error);
            res.status(500).json({ error: "Error interno al actualizar la orden" });

        } finally {
            pgActive.release();
        }

    } catch (error) {
        res.status(500).json({ error: "Error de conexión con la base de datos" });
    }
}

export default PATCHEstadoEnvioAdmin;
