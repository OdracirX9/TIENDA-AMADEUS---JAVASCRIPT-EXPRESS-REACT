import express from "express";
import morgan from "morgan";
import cors from 'cors';
import poolPg from "./database";
import dotenv from "dotenv"
import fs from "fs";
import ClienteRedis from "./redisCache"
import rateLimit from "express-rate-limit";
import IndexRoute from "./routes/index.route"

import { comprobarTokenAutorizado } from "./middlewares/comprobarTokenNode"


dotenv.config()
// inicialization
const app = express();



const isLocal = process.env.ISLOCAL === '1' || process.env.ISLOCAL === 'true';

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: isLocal ? 2000 : 80, // Local: 2000 req / 15 min | Prod: 80 req / 15 min
    statusCode: 429,
    skip: (req) => req.method === 'OPTIONS',
    message: {
        status: 429,
        error: "CNS-429"
    }
})



// settings
app.set('port', process.env.PORT || 4004);

//middlewares
app.set('trust proxy', 1);
app.use(limiter);



app.use(morgan('dev'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json())
app.use(cors({
    origin: "*", // 🔓 Permite todos los dominios
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Métodos permitidos
    allowedHeaders: ["Content-Type", "Authorization"], // Headers permitidos
}));

app.disable('x-powered-by');

//  VALIDAR TOKEN DE AUTORIZACION DEL GATEWAY
comprobarTokenAutorizado(app)


// RUTAS ABOSLUTAS DEL SERVIDOR
app.use("/", IndexRoute);


app.listen(app.get('port'), () => {
    console.log(`Servidor iniciado en el puerto: ${app.get('port')}`)
})



import { crearIndicesRedis } from "./redisCache"

// COMPROBAR LA CONEXION CON LA BASE DE DATOS Y REDIS
const checkConexion = async () => {

    let timeReconect;
    try {
        const cliente = await poolPg.connect()
        console.log("Conexion establecida con la base de datos")

        // Conectar Redis solo si no está abierto (evitar colision de sesión)
        if (!ClienteRedis.isOpen) {
            await ClienteRedis.connect()
        }

        // Crear los índices de RediSearch si no existen
        await crearIndicesRedis()

        cliente.release()
    } catch (error) {
        console.log("Error en la conexion de la base de datos")
        console.log(error)
        console.log("");
        console.log("INICIANDO RECONEXION CON LA BASE DE DATOS DE PRODUCTOS EN 10 SEGUNDOS")
        timeReconect = setTimeout(() => {
            checkConexion();
        }, 10000)
    }
}
checkConexion()


