import crypto from "crypto"
import dotenv from "dotenv"
dotenv.config()

const CLAVE_JWT_PASSWORD = process.env.CLAVE_JWT_PASSWORD || "clave-secreta-sin-configurar"

/**
 * Genera un hash HMAC-SHA256 de la contraseña usando la clave secreta JWT.
 * Es determinístico: misma contraseña + misma clave = mismo hash.
 */
export const hashPassword = (password: string): string => {
    return crypto
        .createHmac("sha256", CLAVE_JWT_PASSWORD)
        .update(password)
        .digest("hex")
}

/**
 * Compara una contraseña en texto plano con su hash almacenado.
 */
export const verificarPassword = (password: string, hash: string): boolean => {
    const hashGenerado = hashPassword(password)
    return crypto.timingSafeEqual(
        Buffer.from(hashGenerado, "hex"),
        Buffer.from(hash, "hex")
    )
}
