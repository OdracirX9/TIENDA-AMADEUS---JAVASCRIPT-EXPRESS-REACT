import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';
dotenv.config();

// ─────────────────────────────────────────────────────────────────────────────
//  CLIENTE REDIS — Servidor Usuarios
//  Usado como store de sesiones express-session vía connect-redis
// ─────────────────────────────────────────────────────────────────────────────

const clienteRedis: RedisClientType = createClient({
    url: process.env.REDIS_URL,
    socket: {
        reconnectStrategy: (retries) => {
            if (retries > 10) {
                console.error('❌ Redis: demasiados reintentos. Deteniendo reconexión automática.');
                return new Error('Demasiados reintentos de Redis');
            }
            const delay = Math.min(retries * 500, 5000);
            console.warn(`🔄 Redis: reintentando conexión en ${delay}ms (intento ${retries})`);
            return delay;
        },
    },
});

clienteRedis.on('error', (err) => console.error('❌ Error en Redis:', err.message ?? err));
clienteRedis.on('connect', () => console.log('✅ Redis: conectado'));
clienteRedis.on('reconnecting', () => console.warn('🔄 Redis: reconectando...'));
clienteRedis.on('ready', () => console.log('✅ Redis: listo para sesiones'));

export default clienteRedis;

// ─────────────────────────────────────────────────────────────────────────────
//  COMPROBAR CONEXION REDIS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifica si el cliente Redis responde correctamente.
 * Retorna true si está listo, false si no lo está.
 * NO lanza excepciones (seguro para usar en checkConexion).
 */
export const comprobarConexionRedis = async (): Promise<boolean> => {
    try {
        if (!clienteRedis.isOpen) return false;
        const pong = await clienteRedis.ping();
        return pong === 'PONG';
    } catch {
        return false;
    }
};
