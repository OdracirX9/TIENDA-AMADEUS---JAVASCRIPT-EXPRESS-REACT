import { Request, Response } from "express";
import { formulacionCorreoYenvio } from "../utils/envioCorreos";

const POSTRestablecerContrasena = async (req: Request, res: Response) => {
    try {
        const { nombre, correo, enlaceRestablecimiento } = req.body;

        if (!nombre || !correo || !enlaceRestablecimiento) {
            return res.status(400).json({ error: "Faltan campos obligatorios (nombre, correo, enlaceRestablecimiento)" });
        }

        // Envío del correo de restablecimiento de contraseña
        await formulacionCorreoYenvio({
            assetHtml: "correoRestablecerContrasena.html",
            asuntoCorreo: "Restablece tu contraseña - RegeNievex Clínica Nieves",
            correoSender: { nombre: "RegeNievex Clínica Nieves", correo: "RegeNievex@notificaciones.clinicanieves.co" },
            correosDestinados: [{ nombre: String(nombre), correo: String(correo) }],
            varsHtml: {
                nombreUsuario: String(nombre),
                enlaceRestablecimiento: String(enlaceRestablecimiento)
            }
        });

        res.status(200).json({ message: "Correo de restablecimiento enviado exitosamente." });

    } catch (error) {
        console.error("Error al enviar correo de restablecimiento:", error);
        res.status(500).json({ error: "Error interno del servidor al enviar el correo." });
    }
}

export default POSTRestablecerContrasena;
