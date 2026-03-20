import { Pool } from "pg"

import dotenv from 'dotenv'
dotenv.config();


const poolPg: Pool = new Pool({
    user: process.env.USER_POSTGRESQL,
    host: process.env.HOST_POSTGRESQL,
    database: process.env.DB_POSTGRESQL,
    password: process.env.PASS_POSTGRESQL,
    port: parseInt(process.env.PORT_POSTGRESQL || "5432"),
    max: 10,               
    idleTimeoutMillis: 20000, // 30 segundos de inactividad para cerrar
    connectionTimeoutMillis: 2000, // 2 segundos para intentar conectar
    ssl: process.env.SSL_POSTGRESQL == "1"? true:false
})


//console.log(`HOST:${process.env.HOST_POSTGRESQL}`)


export default poolPg

