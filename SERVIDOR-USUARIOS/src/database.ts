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



const checkConexion = async()=>{
    let timeReconect;
    try {
        const cliente = await poolPg.connect()
        console.log("Conexion establecida con la base de datos")

        //  VERIFICAR Y CREAR COLUMNA PASSWORD SI NO EXISTE
        try {
            await cliente.query("ALTER TABLE usuario ADD COLUMN IF NOT EXISTS password TEXT;")
            console.log("Verificado: Columna 'password' en tabla 'usuario'")
        } catch (error) {
            console.log("Error verificando columna password", error)
        }

        cliente.release()
    } catch (error) {
        console.log("Error en la conexion de la base de datos")
        console.log(error)
        console.log("");
        console.log("INICIANDO RECONEXION CON LA BASE DE DATOS DE PRODUCTOS EN 10 SEGUNDOS")
        timeReconect = setTimeout(()=>{
            checkConexion();
        }, 10000)
    }
}
checkConexion()

export default poolPg

