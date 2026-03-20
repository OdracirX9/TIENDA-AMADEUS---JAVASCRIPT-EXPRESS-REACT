import { Request, Response } from "express";
import { formulacionCorreoYenvio } from "../utils/envioCorreos";

const POSTNotificacionEnvio = async (req: Request, res: Response) => {
    try {
        const {
            nombre,
            correo,
            descripcionProductos,
            direccion,
            ciudad,
            departamento,
            descripcionUbicacion
        } = req.body;

        if (!nombre || !correo || !descripcionProductos || !direccion || !ciudad || !departamento) {
            return res.status(400).json({ error: "Faltan campos obligatorios para la notificación de envío." });
        }

        // Envío del correo de notificación de envío
        await formulacionCorreoYenvio({
            assetHtml: "correoNotificacionEnvio.html",
            asuntoCorreo: "Tu pedido va en camino - RegeNievex Clínica Nieves",
            correoSender: { nombre: "RegeNievex Clínica Nieves", correo: "RegeNievex@notificaciones.clinicanieves.co" },
            correosDestinados: [{ nombre: String(nombre), correo: String(correo) }],
            varsHtml: {
                nombreUsuario: String(nombre),
                descripcionProductos: String(descripcionProductos),
                direccion: String(direccion),
                ciudad: String(ciudad),
                departamento: String(departamento),
                descripcionUbicacion: descripcionUbicacion ? String(descripcionUbicacion) : "No especificada"
            }
        });

        res.status(200).json({ message: "Correo de notificación de envío enviado exitosamente." });

    } catch (error) {
        console.error("Error al enviar correo de notificación de envío:", error);
        res.status(500).json({ error: "Error interno del servidor al enviar el correo." });
    }
}

export default POSTNotificacionEnvio;
