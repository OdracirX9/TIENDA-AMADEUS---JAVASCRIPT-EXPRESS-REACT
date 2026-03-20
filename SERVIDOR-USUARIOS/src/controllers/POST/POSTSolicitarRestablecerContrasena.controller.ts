import { Request, Response } from "express"
import jwt from "jsonwebtoken"
import axios from "axios"
import poolPg from "../../database"
import clienteRedis from "../../redisCache"
import { consultarExistenciaUsuario } from "../utils/consultasUsuario"

const POSTSolicitarRestablecerContrasena = async (req: Request, res: Response) => {
    try {
        const { correo } = req.body;

        if (!correo || typeof correo !== "string") {
            return res.status(400).json({ error: "El campo 'correo' es obligatorio." });
        }

        // ─────────────────────────────────────────────────────────────────────
        //  1. BUSCAR USUARIO EN LA BASE DE DATOS POR CORREO
        // ─────────────────────────────────────────────────────────────────────
        const pgActive = await poolPg.connect();
        let usuario: { id: string; nombre: string; correo: string } | null = null;

        try {
            await pgActive.query("BEGIN")
            const resultado = await consultarExistenciaUsuario(pgActive, correo);
            await pgActive.query("COMMIT")

            if (!resultado) {
                // No revelar si el correo existe o no por seguridad — respuesta neutra
                return res.status(200).json({
                    mensaje: "Si el correo está registrado, recibirás un enlace de restablecimiento."
                });
            }

            usuario = resultado as { id: string; nombre: string; correo: string };

        } catch (error) {
            await pgActive.query("ROLLBACK");
            throw error;
        } finally {
            pgActive.release();
        }

        // ─────────────────────────────────────────────────────────────────────
        //  2. GENERAR TOKEN JWT (expira en 1 hora)
        // ─────────────────────────────────────────────────────────────────────
        const secretoSesion = process.env.SECRETO_SESION as string;
        const tokenRestablecimiento = jwt.sign(
            { id: usuario.id },
            secretoSesion,
            { expiresIn: "1h" }
        );

        // ─────────────────────────────────────────────────────────────────────
        //  3. GUARDAR TOKEN EN REDIS (TTL: 3600 segundos = 1 hora)
        //  Clave: restablecer_contrasena:{userId}
        // ─────────────────────────────────────────────────────────────────────
        const claveRedis = `restablecer_contrasena:${usuario.id}`;
        await clienteRedis.set(claveRedis, tokenRestablecimiento, { EX: 3600 });

        // ─────────────────────────────────────────────────────────────────────
        //  4. CONSTRUIR ENLACE DE RESTABLECIMIENTO (frontend + token)
        // ─────────────────────────────────────────────────────────────────────
        const linkFrontend = process.env.LINK_FRONTEND_PUBLICO_ECOMERCE;
        const enlaceRestablecimiento = `${linkFrontend}/confirmacion-restablecer-contrasena?token=${tokenRestablecimiento}`;

        // ─────────────────────────────────────────────────────────────────────
        //  5. ENVIAR CORREO DE RESTABLECIMIENTO VÍA SERVIDOR-CORREOS
        // ─────────────────────────────────────────────────────────────────────
        const linkServidorCorreos = process.env.LINK_SERVIDOR_CORREOS;
        try {
            await axios.post(`${linkServidorCorreos}/restablecer-contrasena`, {
                nombre: usuario.nombre,
                correo: usuario.correo,
                enlaceRestablecimiento
            });
            console.log(`✅ Correo de restablecimiento enviado a ${usuario.correo}`);
        } catch (errorCorreo) {
            console.error("⚠️ Error al enviar correo de restablecimiento:", errorCorreo);
        }

        return res.status(200).json({
            mensaje: "Si el correo está registrado, recibirás un enlace de restablecimiento."
        });

    } catch (error) {
        console.error("Error en POSTSolicitarRestablecerContrasena:", error);
        return res.status(500).json({ error: "Error interno del servidor." });
    }
};

export default POSTSolicitarRestablecerContrasena;
