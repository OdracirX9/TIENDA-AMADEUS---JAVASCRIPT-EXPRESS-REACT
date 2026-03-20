import express from "express";
import morgan from "morgan";
import cors from "cors";
import poolPg from "./database";
import dotenv from "dotenv"
import fs from "fs";
import rateLimit from "express-rate-limit";
import IndexRoute from "./routes/index.route"
import ClienteRedis from "./redisCache"

import { RedisStore } from "connect-redis";
import session from "express-session";

import { comprobarTokenAutorizado } from "./middleware/comprobarTokenNode";
import { comprobarConexionRedis } from "./redisCache";

dotenv.config()
// inicialization
const app = express();
const isLocal = process.env.ISLOCAL === '1' || process.env.ISLOCAL === 'true';

// settings
app.set('port', process.env.PORT || 4003);

//middlewares
app.set('trust proxy', 1);

app.use(morgan('dev'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json())
app.use(cors({
  origin: true, // 🔓 Permite cualquier origen dinámicamente
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

app.disable('x-powered-by');

//  VALIDAR TOKEN DE AUTORIZACION DEL GATEWAY
comprobarTokenAutorizado(app)


app.use(
  session({
    store: new RedisStore({ client: ClienteRedis }),
    name: "cliente_ecomerce_regenievex",
    secret: process.env.SECRETO_SESION || "secreto-dev-sin-configurar",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: !isLocal,
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 días de duración
      sameSite: isLocal ? 'lax' : 'none',
    },
  })
);



// RUTAS ABOSLUTAS DEL SERVIDOR
app.use("/", IndexRoute);


app.listen(app.get('port'), () => {
  console.log(`Servidor iniciado en el puerto: ${app.get('port')}`)
})



// COMPROBAR LA CONEXION CON LA BASE DE DATOS Y REDIS
const checkConexion = async () => {
  let timeReconect: ReturnType<typeof setTimeout> | undefined;
  let dbOk = false;
  let redisOk = false;

  // ── Comprobación de PostgreSQL ────────────────────────────────────────────
  try {
    const cliente = await poolPg.connect()
    console.log("✅ PostgreSQL: conexión establecida")

    // leer el archivo SQL
    const sql = fs.readFileSync("./assets/others/codePostgrest.sql", "utf8");
    const resValidacionSql = await cliente.query(sql)

    cliente.release()
    dbOk = true;
  } catch (error) {
    console.error("❌ PostgreSQL: error de conexión", error)
  }

  // ── Comprobación de Redis ─────────────────────────────────────────────────
  try {
    if (!ClienteRedis.isOpen) {
      await ClienteRedis.connect();
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
}
checkConexion();
