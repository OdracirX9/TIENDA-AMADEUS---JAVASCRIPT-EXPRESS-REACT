import { Request, Response } from "express";
import { formulacionCorreoYenvio } from "../utils/envioCorreos";

const POSTConfirmacionRegistro = async (req: Request, res: Response) => {
    try {
        const { nombre, correo, enlaceConfirmacion } = req.body;

        if (!nombre || !correo || !enlaceConfirmacion) {
            return res.status(400).json({ error: "Faltan campos obligatorios (nombre, correo, enlaceConfirmacion)" });
        }

        // Envio de correo de confirmacion
        await formulacionCorreoYenvio({
            assetHtml: "correoConfirmacionRegistro.html",
            asuntoCorreo: "Confirma tu registro en RegeNievex Clínica Nieves",
            correoSender: { nombre: "RegeNievex Clínica Nieves", correo: "RegeNievex@notificaciones.clinicanieves.co" }, // Adjust sender email if needed
            correosDestinados: [{ nombre: String(nombre), correo: String(correo) }],
            varsHtml: {
                nombreUsuario: String(nombre),
                enlaceConfirmacion: String(enlaceConfirmacion)
            }
        });

        res.status(200).json({ message: "Correo de confirmación enviado exitosamente." });

    } catch (error) {
        console.error("Error al enviar correo de confirmación:", error);
        res.status(500).json({ error: "Error interno del servidor al enviar el correo." });
    }
}

export default POSTConfirmacionRegistro;
