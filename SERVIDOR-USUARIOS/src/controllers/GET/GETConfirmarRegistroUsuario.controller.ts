import { Request, Response } from "express"
import jwt, { JwtPayload } from "jsonwebtoken"
import MomentTime from "moment-timezone"
import poolPg from "../../database"
import clienteRedis from "../../redisCache"

const GETConfirmarRegistroUsuario = async (req: Request, res: Response) => {
    try {
        // ─────────────────────────────────────────────────────────────────────
        //  1. OBTENER TOKEN DEL QUERY PARAM
        // ─────────────────────────────────────────────────────────────────────
        const { token } = req.query;

        if (!token || typeof token !== "string") {
            return res.status(400).json({ error: "Token de confirmación no proporcionado." });
        }

        // ─────────────────────────────────────────────────────────────────────
        //  2. VERIFICAR Y DECODIFICAR EL TOKEN JWT
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
        //  3. COMPARAR TOKEN CON EL ALMACENADO EN REDIS
        // ─────────────────────────────────────────────────────────────────────
        const claveRedis = `confirmacion_registro:${userId}`;
        const tokenEnRedis = await clienteRedis.get(claveRedis);

        if (!tokenEnRedis || tokenEnRedis !== token) {
            return res.status(404).json({ error: "Token de confirmación no encontrado o ya fue utilizado." });
        }

        // ─────────────────────────────────────────────────────────────────────
        //  4. ACTUALIZAR USUARIO EN LA BASE DE DATOS
        //     - Habilitacion → true
        //     - updated_at   → fecha actual (zona Bogotá)
        // ─────────────────────────────────────────────────────────────────────
        const pgActive = await poolPg.connect();
        try {
            const fechaActual = MomentTime().tz("America/Bogota").format();

            const resultado = await pgActive.query(
                `UPDATE public.usuario
                 SET habilitacion = true,
                     updated_at     = $1
                 WHERE id = $2
                 RETURNING id, nombre, correo`,
                [fechaActual, userId]
            );

            if (resultado.rowCount === 0) {
                return res.status(404).json({ error: "Usuario no encontrado en la base de datos." });
            }

            // ─────────────────────────────────────────────────────────────────────
            //  5. ELIMINAR TOKEN DE REDIS (ya fue consumido — uso único)
            // ─────────────────────────────────────────────────────────────────────
            await clienteRedis.del(claveRedis);

            return res.status(200).json({
                mensaje: "Cuenta confirmada exitosamente.",
                usuario: resultado.rows[0]
            });

        } finally {
            pgActive.release();
        }

    } catch (error) {
        console.error("Error en GETConfirmarRegistroUsuario:", error);
        return res.status(500).json({ error: "Error interno del servidor." });
    }
};

export default GETConfirmarRegistroUsuario;
