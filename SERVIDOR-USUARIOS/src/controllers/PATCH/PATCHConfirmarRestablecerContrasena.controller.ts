import { Request, Response } from "express"
import jwt, { JwtPayload } from "jsonwebtoken"
import MomentTime from "moment-timezone"
import poolPg from "../../database"
import clienteRedis from "../../redisCache"
import { hashPassword } from "../../utils/hashPassword"

const PATCHConfirmarRestablecerContrasena = async (req: Request, res: Response) => {
    try {
        const { token, nuevaContrasena } = req.body;

        if (!token || typeof token !== "string") {
            return res.status(400).json({ error: "El campo 'token' es obligatorio." });
        }

        if (!nuevaContrasena || typeof nuevaContrasena !== "string" || nuevaContrasena.length < 6) {
            return res.status(400).json({ error: "La nueva contraseña debe tener al menos 6 caracteres." });
        }

        // ─────────────────────────────────────────────────────────────────────
        //  1. VERIFICAR Y DECODIFICAR EL TOKEN JWT
        // ─────────────────────────────────────────────────────────────────────
        let payload: JwtPayload;
        try {
            const secreto = process.env.SECRETO_SESION as string;
            payload = jwt.verify(token, secreto) as JwtPayload;
        } catch {
            return res.status(404).json({ error: "Token inválido o expirado." });
        }

        const userId: string = payload.id;

        if (!userId) {
            return res.status(404).json({ error: "El token no contiene información de usuario válida." });
        }

        // ─────────────────────────────────────────────────────────────────────
        //  2. COMPARAR TOKEN CON EL ALMACENADO EN REDIS
        //  Clave: restablecer_contrasena:{userId}
        // ─────────────────────────────────────────────────────────────────────
        const claveRedis = `restablecer_contrasena:${userId}`;
        const tokenEnRedis = await clienteRedis.get(claveRedis);

        if (!tokenEnRedis || tokenEnRedis !== token) {
            return res.status(404).json({ error: "Token de restablecimiento no encontrado o ya fue utilizado." });
        }

        // ─────────────────────────────────────────────────────────────────────
        //  3. HASHEAR LA NUEVA CONTRASEÑA
        // ─────────────────────────────────────────────────────────────────────
        const passwordHash = hashPassword(nuevaContrasena);

        // ─────────────────────────────────────────────────────────────────────
        //  4. ACTUALIZAR CONTRASEÑA EN LA BASE DE DATOS
        //     También actualiza updated_at con la fecha actual (zona Bogotá)
        // ─────────────────────────────────────────────────────────────────────
        const pgActive = await poolPg.connect();
        try {
            const fechaActual = MomentTime().tz("America/Bogota").format();

            const resultado = await pgActive.query(
                `UPDATE public.usuario
                 SET password   = $1,
                     updated_at = $2
                 WHERE id = $3
                 RETURNING id, nombre, correo`,
                [passwordHash, fechaActual, userId]
            );

            if (resultado.rowCount === 0) {
                return res.status(404).json({ error: "Usuario no encontrado en la base de datos." });
            }

            // ─────────────────────────────────────────────────────────────────────
            //  5. ELIMINAR TOKEN DE REDIS (uso único — ya fue consumido)
            // ─────────────────────────────────────────────────────────────────────
            await clienteRedis.del(claveRedis);

            return res.status(200).json({
                mensaje: "Contraseña actualizada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña."
            });

        } finally {
            pgActive.release();
        }

    } catch (error) {
        console.error("Error en PATCHConfirmarRestablecerContrasena:", error);
        return res.status(500).json({ error: "Error interno del servidor." });
    }
};

export default PATCHConfirmarRestablecerContrasena;
