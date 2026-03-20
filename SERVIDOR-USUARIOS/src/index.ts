import express from "express";
import morgan from "morgan";
import cors from "cors";
import session from "express-session";
import { RedisStore } from "connect-redis";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

//  IMPORTACION DE RECURSOS INTERNOS
import poolPg from "./database";
import clienteRedis, { comprobarConexionRedis } from "./redisCache";
import IndexRoute from "./routes/index.route";

dotenv.config();

// ─────────────────────────────────────────────────────────────────────────────
//  INICIALIZACIÓN DE EXPRESS
// ─────────────────────────────────────────────────────────────────────────────
const app = express();
const isLocal = process.env.ISLOCAL === '1' || process.env.ISLOCAL === 'true';

// ─────────────────────────────────────────────────────────────────────────────
//  RATE LIMITING
// ─────────────────────────────────────────────────────────────────────────────
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,          // 15 minutos
    max: isLocal ? 2000 : 100,          // Local: 2000 req | Prod: 100 req
    statusCode: 429,
    skip: (req) => req.method === 'OPTIONS',
    message: { status: 429, error: "USUARIOS-429" },
});

// ─────────────────────────────────────────────────────────────────────────────
//  CONFIGURACIÓN DEL SERVIDOR
// ─────────────────────────────────────────────────────────────────────────────
app.set('port', process.env.PORT || 4003);
app.set('trust proxy', 1);
app.disable('x-powered-by');

// ─────────────────────────────────────────────────────────────────────────────
//  CORS — Dominios permitidos por entorno
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
//  MIDDLEWARES GLOBALES
// ─────────────────────────────────────────────────────────────────────────────
app.use(morgan('dev'));
// Aplicar limiter solo en producción
if (!isLocal) {
    app.use(limiter);
}
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors({
    origin: true, // 🔓 Permite cualquier origen dinámicamente
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,  // Vital para cookies de sesión HTTP-Only vía Gateway
}));

// ─────────────────────────────────────────────────────────────────────────────
//  SESIONES CON REDIS COMO STORE
//  Las cookies de sesión se almacenan en Redis para persistencia
//  entre reinicios y múltiples instancias del servidor.
// ─────────────────────────────────────────────────────────────────────────────
app.use(session({
    store: new RedisStore({ client: clienteRedis }),
    name: "cliente_ecomerce_regenievex", // Nombre de cookie AISLADO para frontend público
    secret: process.env.SECRETO_SESION || "secreto-dev-sin-configurar",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: !isLocal,           // HTTPS en producción, HTTP en local
        httpOnly: true,             // No accesible desde JS del cliente
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 días de duración
        sameSite: isLocal ? 'lax' : 'none',
    },
}));

// ─────────────────────────────────────────────────────────────────────────────
//  VALIDAR TOKEN DE AUTORIZACION DEL GATEWAY
//  Solo acepta peticiones que vengan del API Gateway con el header JWT
// ─────────────────────────────────────────────────────────────────────────────
// NOTA: verificarOrigenGateway está definido como Router middleware,
//       se aplica en las rutas individuales. Aquí solo iniciamos el servidor.

// ─────────────────────────────────────────────────────────────────────────────
//  RUTAS PRINCIPALES
// ─────────────────────────────────────────────────────────────────────────────
app.use("/", IndexRoute);

// ─────────────────────────────────────────────────────────────────────────────
//  INICIO DEL SERVIDOR HTTP
// ─────────────────────────────────────────────────────────────────────────────
app.listen(app.get('port'), () => {
    console.log(`\n🚀 SERVIDOR-USUARIOS iniciado en el puerto: ${app.get('port')}`);
    console.log(`   Modo: ${isLocal ? '🟡 LOCAL (dev)' : '🟢 PRODUCCIÓN'}`);
});

// ─────────────────────────────────────────────────────────────────────────────
//  VERIFICACIÓN DE CONEXIONES AL ARRANCAR
//  Comprueba PostgreSQL y Redis. Si falla, reintenta cada 10 segundos.
// ─────────────────────────────────────────────────────────────────────────────

const checkConexion = async (): Promise<void> => {
    let timeReconect: ReturnType<typeof setTimeout> | undefined;
    let dbOk = false;
    let redisOk = false;

    // ── Comprobación de PostgreSQL ────────────────────────────────────────────
    try {
        const cliente = await poolPg.connect();
        console.log("✅ PostgreSQL: conexión establecida");
        cliente.release();
        dbOk = true;
    } catch (error) {
        console.error("❌ PostgreSQL: error de conexión", error);
    }

    // ── Comprobación de Redis ─────────────────────────────────────────────────
    try {
        if (!clienteRedis.isOpen) {
            await clienteRedis.connect();
        }
        const redisActivo = await comprobarConexionRedis();
        if (redisActivo) {
            console.log("✅ Redis: conexión establecida y respondiendo");
            redisOk = true;
        } else {
            console.warn("⚠️  Redis: conectado pero no responde al PING");
        }
    } catch (error) {
        console.error("❌ Redis: error de conexión", error);
    }

    // ── Si alguna conexión falló, reintentar en 10 segundos ──────────────────
    if (!dbOk || !redisOk) {
        console.log("\n⏳ Reconectando en 10 segundos...\n");
        timeReconect = setTimeout(() => {
            checkConexion();
        }, 10000);
    } else {
        console.log("\n✅ Todas las conexiones establecidas correctamente.\n");
    }
};

checkConexion();
