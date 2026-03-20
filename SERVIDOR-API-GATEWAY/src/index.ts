import express from "express";
import morgan from "morgan";
import dotenv from "dotenv"

//  IMPORTACION DE RUTAS DE CONFIGURACION
import IndexRoute from "./routes/index.route"

//  IMPORTACION DE MIDDLEWARES
import { limitarSitiosAutorizadosCORS } from "./middlewares/corsNode"

// IMPORTACION DE UTILIDADES
import { validarProxysIniciales } from "./utils/validarConexiones";

//  INICIALIZACION DE DEPENDENCIAS PARA APLICAR AL SERVIDOR
dotenv.config()
const app = express();

//  -------------------------------------------------------------------------------------



// APLICACION DE VARIABLES Y CONFIGURACIONES AL SERVIDOR
app.set('port', process.env.PORT || 4001);
app.set('trust proxy', 1); // 👈 Esencial para que express-rate-limit confíe en los headers que envía el proxy reverso (Nginx, ALB, etc.)


//  APLICACION DE MIDDLEWARES PARA EL SERVIDOR API GATEWAY
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Limitar todas las solicitudes a un máximo de 300 x 10 min por IP (Anti DDoS básico)
import { limitadorGlobal } from "./middlewares/limitadorTasa"
app.use(limitadorGlobal)

limitarSitiosAutorizadosCORS(app)
app.disable('x-powered-by');


// RUTAS ABOSLUTAS DEL SERVIDOR
app.use("/", IndexRoute);


//  INICIALIZACION DEL SERVIDOR
app.listen(app.get('port'), async () => {
    console.log(`Servidor API Gateway iniciado en el puerto: ${app.get('port')}`);
    await validarProxysIniciales();
})


