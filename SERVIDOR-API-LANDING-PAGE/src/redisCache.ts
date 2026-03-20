import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';
dotenv.config();

// ─────────────────────────────────────────────────────────────────────────────
//  CLIENTE REDIS
// ─────────────────────────────────────────────────────────────────────────────

const client: RedisClientType = createClient({
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

client.on('error', (err) => console.error('❌ Error en Redis:', err.message ?? err));
client.on('connect', () => console.log('✅ Redis: conectado'));
client.on('reconnecting', () => console.warn('🔄 Redis: reconectando...'));
client.on('ready', () => console.log('✅ Redis: listo para recibir comandos'));


export default client;

// ─────────────────────────────────────────────────────────────────────────────
//  COMPROBACION DE ESTADO DE CONEXION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Comprueba si el cliente Redis está conectado y puede responder.
 * Retorna `true` si está listo, `false` en caso contrario.
 * NO lanza excepciones.
 */
export const comprobarConexionRedis = async (): Promise<boolean> => {
  try {
    if (!client.isOpen) return false;
    const pong = await client.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
};


// ─────────────────────────────────────────────────────────────────────────────
//  CREACION AUTOMATICA DE INDICES  (RediSearch / FT)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Crea los índices de RediSearch si no existen.
 * Usa FT.CREATE con manejo de error "Index already exists" para ser idempotente.
 * Se llama una sola vez al arrancar el servidor (desde index.ts).
 */
export const crearIndicesRedis = async (): Promise<void> => {

  const indices = [
    {
      nombre: 'idx:ecomerce:productos',
      schema: {
        '$.id': { type: 'TAG', AS: 'id' },
        '$.id_categoria': { type: 'TAG', AS: 'id_categoria' },
        '$.id_marca': { type: 'TAG', AS: 'id_marca' },
        '$.visibilidad': { type: 'TAG', AS: 'visibilidad' },
        '$.variantes[*].id': { type: 'TAG', AS: 'id_variante' },
        '$.variantes[*].nombre': { type: 'TEXT', AS: 'nombre' },
        '$.variantes[*].descripcion': { type: 'TEXT', AS: 'descripcion' },
        '$.variantes[*].stock': { type: 'NUMERIC', AS: 'stock' },
        '$.variantes[*].ventas': { type: 'NUMERIC', AS: 'ventas' },
      },
      opciones: { ON: 'JSON' as const, PREFIX: ['ecomerce:productos:'] },
    },
    {
      nombre: 'idx:ecomerce:marcas',
      schema: {
        '$.id': { type: 'TAG', AS: 'id' },
        '$.nombre': { type: 'TEXT', AS: 'nombre' },
      },
      opciones: { ON: 'JSON' as const, PREFIX: ['ecomerce:marcas:'] },
    },
    {
      nombre: 'idx:ecomerce:categorias',
      schema: {
        '$.id': { type: 'TAG', AS: 'id' },
        '$.nombre': { type: 'TEXT', AS: 'nombre' },
      },
      opciones: { ON: 'JSON' as const, PREFIX: ['ecomerce:categorias:'] },
    },
  ];

  for (const idx of indices) {
    try {
      // @ts-ignore – el tipado de schema de FT.CREATE varía según versión del cliente
      await client.ft.create(idx.nombre, idx.schema, idx.opciones);
      console.log(`✅ Redis: índice creado → ${idx.nombre}`);
    } catch (err: any) {
      // "Index already exists" es el mensaje esperado si el índice ya fue creado antes
      if (err?.message?.includes('Index already exists')) {
        console.log(`ℹ️  Redis: índice ya existe → ${idx.nombre}`);
      } else {
        console.error(`❌ Redis: error al crear índice ${idx.nombre}:`, err?.message ?? err);
      }
    }
  }
};
