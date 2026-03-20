import { Request, Response } from "express";
import { formulacionCorreoYenvio } from "../utils/envioCorreos";

const POSTNotificacionEntrega = async (req: Request, res: Response) => {
    try {
        const { nombre, correo, descripcionProducto } = req.body;

        if (!nombre || !correo || !descripcionProducto) {
            return res.status(400).json({ error: "Faltan campos obligatorios para la notificación de entrega (nombre, correo, descripcionProducto)." });
        }

        // Envío del correo de notificación de entrega exitosa
        await formulacionCorreoYenvio({
            assetHtml: "correoNotificacionEntrega.html",
            asuntoCorreo: "¡Tu pedido ha sido entregado! - RegeNievex Clínica Nieves",
            correoSender: { nombre: "RegeNievex Clínica Nieves", correo: "RegeNievex@notificaciones.clinicanieves.co" },
            correosDestinados: [{ nombre: String(nombre), correo: String(correo) }],
            varsHtml: {
                nombreUsuario: String(nombre),
                descripcionProducto: String(descripcionProducto)
            }
        });

        res.status(200).json({ message: "Correo de notificación de entrega enviado exitosamente." });

    } catch (error) {
        console.error("Error al enviar correo de notificación de entrega:", error);
        res.status(500).json({ error: "Error interno del servidor al enviar el correo." });
    }
}

export default POSTNotificacionEntrega;
