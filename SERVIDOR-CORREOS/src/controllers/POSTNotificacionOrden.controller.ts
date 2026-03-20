import { Request, Response } from "express";
import { formulacionCorreoYenvio } from "../utils/envioCorreos";

const POSTNotificacionOrden = async (req: Request, res: Response) => {
    try {
        const { nombre, correo, descripcionCompra, subtotal, envio } = req.body;

        if (!nombre || !correo || !descripcionCompra || subtotal === undefined || envio === undefined) {
            return res.status(400).json({ error: "Faltan campos obligatorios (nombre, correo, descripcionCompra, subtotal, envio)" });
        }

        // Ensuring they are numbers for calculation and display
        const numSubtotal = Number(subtotal);
        const numEnvio = Number(envio);

        if (isNaN(numSubtotal) || isNaN(numEnvio)) {
            return res.status(400).json({ error: "Los valores de subtotal y envío deben ser numéricos" });
        }

        const numTotalPrecio = numSubtotal + numEnvio;

        // Formatting currency for the email template (assuming COP based on regular Clinica Nieves operations, adjust if needed)
        const formatCurrency = (amount: number) => {
            return amount.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
        }

        // Envio de correo de notificacion de orden
        await formulacionCorreoYenvio({
            assetHtml: "correoNotificacionOrden.html",
            asuntoCorreo: "Confirmación de tu Orden - RegeNievex Clínica Nieves",
            correoSender: { nombre: "RegeNievex Clínica Nieves", correo: "RegeNievex@notificaciones.clinicanieves.co" },
            correosDestinados: [{ nombre: String(nombre), correo: String(correo) }],
            varsHtml: {
                nombreUsuario: String(nombre),
                descripcionCompra: String(descripcionCompra),
                subtotal: formatCurrency(numSubtotal),
                envio: formatCurrency(numEnvio),
                totalPrecio: formatCurrency(numTotalPrecio)
            }
        });

        res.status(200).json({ message: "Correo de notificación de orden enviado exitosamente." });

    } catch (error) {
        console.error("Error al enviar correo de notificación:", error);
        res.status(500).json({ error: "Error interno del servidor al enviar el correo." });
    }
}

export default POSTNotificacionOrden;
