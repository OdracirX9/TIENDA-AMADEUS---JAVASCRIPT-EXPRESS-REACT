import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';
dotenv.config();


const client: RedisClientType = createClient({
  url: process.env.REDIS_URL
});

client.on('error', (err) => console.error('❌ Error en Redis:', err));

client.connect().then(() => {
  console.log("Conexión de Caché establecida con Redis");
}).catch(err => {
  console.error("No se pudo conectar a Redis Caché:", err);
});

export default client;