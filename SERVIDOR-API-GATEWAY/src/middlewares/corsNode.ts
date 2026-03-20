import { Express } from "express";
import cors, { CorsOptions } from "cors"
import dotenv from "dotenv"

dotenv.config()

// Obtener dominios desde .env, separados por coma si hubiese múltiples, o uno solo.
const dominiosStr = process.env.DOMINIOS_PERMITIDOS || process.env.DOMINIO_PERMITIDO_01 || "";
const listaPermitidaProduccion = dominiosStr.split(",").map(d => d.trim()).filter(d => d.length > 0);

// Forzar estricta validación en Produccion.
const corsOpcionesProduccion: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || listaPermitidaProduccion.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("No autorizado por CORS. Dominio no habilitado en Producción."));
    }
  },
  methods: ["GET", "POST", "PATCH", "DELETE", "PUT", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
};

const corsOpcionesLocal: CorsOptions = {
  origin: true,
  methods: ["GET", "POST", "PATCH", "OPTIONS", "DELETE", "PUT"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
};

export const limitarSitiosAutorizadosCORS = (appIndex: Express) => {
  const isLocal = process.env.ISLOCAL === 'true' || process.env.ISLOCAL === '1';

  if (isLocal) {
    console.warn("⚠️ ALERTA DE SEGURIDAD: CORS configurado en modo LOCAL (Abierto al público). No usar en producción.");
    appIndex.use(cors(corsOpcionesLocal));
  } else {
    console.log("🔒 CORS configurado en modo PRODUCCIÓN (Estricto).");
    appIndex.use(cors(corsOpcionesProduccion));
  }
}