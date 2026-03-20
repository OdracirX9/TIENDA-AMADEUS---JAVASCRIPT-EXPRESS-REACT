import express from "express";
import morgan from "morgan";
import cors from 'cors';
import poolPg from "./database";
import dotenv from "dotenv"
import fs from "fs";
import rateLimit from "express-rate-limit";
import IndexRoute from "./routes/index.route"
import session from "express-session";
import { RedisStore } from "connect-redis";
import { createClient } from "redis";

import { comprobarTokenAutorizado } from "./middlewares/comprobarTokenNode"

dotenv.config()
// inicialization
const app = express();


// CONFIGURACION DE REDIS PARA SESIONES ADMIN
export const ClienteRedis = createClient({ url: process.env.REDIS_URL || "redis://127.0.0.1:6379" })
ClienteRedis.on('error', err => console.error('Redis Client Error:', err));
ClienteRedis.connect().then(() => {
    console.log("Conexión establecida con Redis");
}).catch(console.error)

const redisStore = new RedisStore({
    client: ClienteRedis,
    prefix: "admin_ecomerce:"
})

app.use(session({
    store: redisStore,
    name: "admin_ecomerce_regenievex", // Nombre de cookie AISLADO para admin
    secret: process.env.TOKEN_AUTORIZACION_ECOMCERCE || 'clave-secreta-por-defecto',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.ISLOCAL === "0" || process.env.ISLOCAL === "false", // Solo HTTPS en producción
        httpOnly: true,
        sameSite: process.env.ISLOCAL === "0" || process.env.ISLOCAL === "false" ? 'none' : 'lax', // Permite enviar cookies cross-site en prod
        maxAge: 1000 * 60 * 60 * 24 * 7 // 1 semana
    }
}))

export const pgActive = poolPg;



const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 150, // Límite de 150 peticiones por IP cada 15 minutos
    statusCode: 429,
    skip: (req) => req.method === 'OPTIONS',
    message: {
        status: 429,
        error: "CNS-429"
    }
})



// settings
app.set('port', process.env.PORT || 4002);

//middlewares
app.set('trust proxy', 1);
app.use(limiter);



app.use(morgan('dev'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json())
app.use(cors({
    origin: true, // 🔓 Permite el origen exacto del cliente
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"], // Métodos permitidos
    allowedHeaders: ["Content-Type", "Authorization"], // Headers permitidos
    credentials: true // Vital para recibir cookies HTTP-Only de sesión via Gateway
}));

app.disable('x-powered-by');

//  VALIDAR TOKEN DE AUTORIZACION DEL GATEWAY
comprobarTokenAutorizado(app)


// RUTAS ABOSLUTAS DEL SERVIDOR
app.use("/", IndexRoute);


app.listen(app.get('port'), () => {
    console.log(`Servidor iniciado en el puerto: ${app.get('port')}`)
})



// COMPROBAR LA CONEXION CON LA BASE DE DATOS Y SERVICIOS
import minioClient from "./minIo";

const checkConexionServicios = async () => {
    // Check PostgreSQL
    try {
        const cliente = await poolPg.connect()
        console.log("Conexión establecida con la base de datos PostgreSQL")
        cliente.release()
    } catch (error) {
        console.log("Error en la conexión a la base de datos PostgreSQL")
        console.error(error)
        console.log("INICIANDO RECONEXION CON LA BASE DE DATOS EN 10 SEGUNDOS")
        setTimeout(checkConexionServicios, 10000)
        return; // Detener chequeos subsiguientes si falla BD
    }

    // Check MinIO
    try {
        await minioClient.listBuckets();
        console.log("Conexión establecida con MinIO");
    } catch (error) {
        console.log("Error en la conexión a MinIO");
        console.error(error);
        console.log("Por favor verifica que MinIO esté ejecutándose correctamente.");
        // No forzamos reconexión aislada, pero se notifica en el log
    }
}
checkConexionServicios()
