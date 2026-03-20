import { Request, Response } from "express";
import { formulacionCorreoYenvio } from "../utils/envioCorreos";
import dotenv from 'dotenv'

dotenv.config();

const POSTNotificacionAdminNuevaOrden = async (req: Request, res: Response) => {
    try {
        const { nombreCliente, descripcionCompra } = req.body;

        if (!nombreCliente || !descripcionCompra) {
            return res.status(400).json({ error: "Faltan campos obligatorios para la notificación al administrador (nombreCliente, descripcionCompra)." });
        }

        // Correo del administrador hardcodeado directamente en el controlador
        const correoAdmin = process.env.CORREO_ADMIN_A_NOTIFICAR || "sistemas@clinicanieves.co"; // Replace with the actual admin email if different
        const nombreAdmin = "Administrador RegeNievex";

        // Envío del correo de notificación al administrador
        await formulacionCorreoYenvio({
            assetHtml: "correoNotificacionAdminNuevaOrden.html",
            asuntoCorreo: "⚠️ NUEVA VENTA REGISTRADA - RegeNievex",
            correoSender: { nombre: "Sistema RegeNievex", correo: "RegeNievex@notificaciones.clinicanieves.co" },
            correosDestinados: [{ nombre: nombreAdmin, correo: correoAdmin }],
            varsHtml: {
                nombreCliente: String(nombreCliente),
                descripcionCompra: String(descripcionCompra)
            }
        });

        res.status(200).json({ message: "Correo de notificación al administrador enviado exitosamente." });

    } catch (error) {
        console.error("Error al enviar correo de notificación al administrador:", error);
        res.status(500).json({ error: "Error interno del servidor al enviar el correo." });
    }
}

export default POSTNotificacionAdminNuevaOrden;
