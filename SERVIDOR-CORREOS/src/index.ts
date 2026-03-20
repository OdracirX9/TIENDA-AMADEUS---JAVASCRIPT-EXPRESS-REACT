import express, { Request, Response } from "express";
import morgan from "morgan";
import cors from 'cors';
import dotenv from "dotenv"
import IndexRoute from "./routes/index.route"

dotenv.config()

// incialization
const app = express();

// settings
app.set('port', process.env.PORT || 4003);

//middlewares
app.set('trust proxy', 1);

const allowedOriginsLocal = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173"
];

const allowedOriginsDeploy = [
    "https://clinicanieves.co",
    "https://laserlab.clinicanieves.co",
    "https://titans.clinicanieves.co",
    "https://cells.clinicanieves.co",
    "https://ecommerce.clinicanieves.co" // Just in case
];

const isUseOrigin = () => { return process.env.ISLOCAL == "1" ? allowedOriginsLocal : allowedOriginsDeploy }

app.use(morgan('dev'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json())
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || isUseOrigin().includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("No permitido por CORS"));
        }
    },
    methods: ['POST', 'OPTIONS'],
    credentials: false
}));
app.disable('x-powered-by');

// RUTAS ABSOLUTAS DEL SERVIDOR
app.use("/", IndexRoute);

app.listen(app.get('port'), () => {
    console.log(`Servidor de Correos E-commerce iniciado en el puerto: ${app.get('port')}`)
})
