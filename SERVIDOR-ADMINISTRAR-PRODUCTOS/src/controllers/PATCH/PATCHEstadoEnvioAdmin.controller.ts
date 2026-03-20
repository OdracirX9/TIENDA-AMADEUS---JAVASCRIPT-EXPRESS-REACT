import { Request, Response } from "express"
import { z } from "zod"
import axios from "axios"

// IMPORTACION DE BASE DE DATOS
import poolPg from "../../database"

// Esquema Zod para validación de datos
const PATCHEstadoEnvioZ = z.object({
    estado_envio: z.enum(["Pendiente", "Procesando", "Enviado", "Entregado"]),
    numero_guia: z.string().optional().nullable()
})


// ─────────────────────────────────────────────────────────────────────────────
//  HELPER: Obtener productos de la orden para armar descripción
// ─────────────────────────────────────────────────────────────────────────────
const obtenerDescripcionProductos = async (pgConexion: any, idOrden: string): Promise<string> => {
    try {
        const res = await pgConexion.query(
            `SELECT nombre, cantidad FROM orden_producto WHERE id_orden = $1`,
            [idOrden]
        );
        if (!res.rows.length) return "Productos de tu orden";
        return res.rows.map((p: any) => `${p.cantidad}x ${p.nombre}`).join(", ");
    } catch {
        return "Productos de tu orden";
    }
};


// ─────────────────────────────────────────────────────────────────────────────
//  HELPER: Enviar correo de notificación según el nuevo estado de envío
// ─────────────────────────────────────────────────────────────────────────────
const enviarCorreoEstadoEnvio = async (
    pgConexion: any,
    orden: {
        id: string;
        nombre_usuario: string;
        correo: string;
        direccion_envio: string;
        ciudad: string;
        departamento: string;
    },
    nuevoEstado: string
): Promise<void> => {
    const linkCorreos = process.env.LINK_SERVIDOR_CORREOS;
    if (!linkCorreos) {
        console.error("⚠️ LINK_SERVIDOR_CORREOS no está configurado");
        return;
    }

    const descripcionProductos = await obtenerDescripcionProductos(pgConexion, orden.id);

    if (nuevoEstado === "Enviado") {
        // ── Correo: Tu pedido va en camino ────────────────────────────────
        try {
            await axios.post(`${linkCorreos}/notificacion-envio`, {
                nombre: orden.nombre_usuario,
                correo: orden.correo,
                descripcionProductos: descripcionProductos,
                direccion: orden.direccion_envio,
                ciudad: orden.ciudad,
                departamento: orden.departamento,
                descripcionUbicacion: "Informacion Oculta"
            });
            console.log(`✅ Correo de envío enviado a ${orden.correo}`);
        } catch (err) {
            console.error("⚠️ Error al enviar correo de notificación de envío:", err);
        }

    } else if (nuevoEstado === "Entregado") {
        // ── Correo: Tu pedido ha sido entregado ───────────────────────────
        try {
            await axios.post(`${linkCorreos}/notificacion-entrega`, {
                nombre: orden.nombre_usuario,
                correo: orden.correo,
                descripcionProducto: descripcionProductos
            });
            console.log(`✅ Correo de entrega enviado a ${orden.correo}`);
        } catch (err) {
            console.error("⚠️ Error al enviar correo de notificación de entrega:", err);
        }
    }
};


// ─────────────────────────────────────────────────────────────────────────────
//  CONTROLADOR PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
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

            // Actualizar estado y obtener datos completos del cliente para el correo
            const consultaTexto = `
                UPDATE orden_grupo 
                SET estado_envio = $1, numero_guia = $2 
                WHERE id = $3 
                RETURNING id, estado_envio, numero_guia,
                          nombre_usuario, correo, direccion_envio,
                          ciudad, departamento;
            `;

            const reqBody = validacion.data;
            const resQuery = await pgActive.query(consultaTexto, [reqBody.estado_envio, reqBody.numero_guia || null, id]);

            if (resQuery.rows.length === 0) {
                await pgActive.query("ROLLBACK");
                return res.status(404).json({ error: "Orden no encontrada" });
            }

            await pgActive.query("COMMIT");

            const ordenActualizada = resQuery.rows[0];

            res.status(200).json({
                mensaje: "Estado de envío actualizado correctamente",
                data: {
                    id: ordenActualizada.id,
                    estado_envio: ordenActualizada.estado_envio,
                    numero_guia: ordenActualizada.numero_guia
                }
            });

            // ── Enviar correo según el nuevo estado (async, sin bloquear respuesta) ──
            const nuevoEstado: string = reqBody.estado_envio;
            if (nuevoEstado === "Enviado" || nuevoEstado === "Entregado") {
                enviarCorreoEstadoEnvio(pgActive, {
                    id: ordenActualizada.id,
                    nombre_usuario: ordenActualizada.nombre_usuario,
                    correo: ordenActualizada.correo,
                    direccion_envio: ordenActualizada.direccion_envio,
                    ciudad: ordenActualizada.ciudad,
                    departamento: ordenActualizada.departamento
                }, nuevoEstado).catch(err =>
                    console.error("Error en envío de correo de estado envío:", err)
                );
            }

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
