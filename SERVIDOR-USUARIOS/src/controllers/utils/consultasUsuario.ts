import { PoolClient } from "pg"
import fs from "fs"
import { z } from "zod"

//  IMPORTACION DE ESQUEMAS
import { PATCHDireccionEnvion, PATCHUsuario } from "../../utils/esquemasZod"



export const consultarExistenciaUsuario = async (pgConexion: PoolClient, correo: string) => {
    try {
        const consultaTexto01 = "SELECT * FROM usuario WHERE correo = $1;"
        const resQuery01 = await pgConexion.query(consultaTexto01, [correo])

        if (resQuery01.rows.length != 0) return resQuery01.rows[0]
        else false

    } catch (error) {
        throw Error(`Error en consultarExistenciaUsuario : [[[ ${JSON.stringify(error)} ]]]`)
    }
}




export const crearUsuario = async (pgConexion: PoolClient, valoresQuery: any[]) => {

    try {
        const consultaTexto01 = "INSERT INTO usuario (nombre, correo, created_at) values ($1, $2, $3) returning *;"
        const resQuery01 = await pgConexion.query(consultaTexto01, valoresQuery)

        if (resQuery01.rows.length != 0) return resQuery01.rows[0]
        else throw Error("Error en la creacion del usuario")

    } catch (error) {
        throw Error(`Error en crearUsuario : [[[ ${JSON.stringify(error)} ]]]`)
    }

}

export const crearUsuarioPassword = async (pgConexion: PoolClient, valoresQuery: any[]) => {

    try {
        const consultaTexto01 = "INSERT INTO usuario (nombre, correo, password, created_at) values ($1, $2, $3, $4) returning *;"
        const resQuery01 = await pgConexion.query(consultaTexto01, valoresQuery)

        if (resQuery01.rows.length != 0) return resQuery01.rows[0]
        else throw Error("Error en la creacion del usuario con password")

    } catch (error) {
        throw Error(`Error en crearUsuarioPassword : [[[ ${JSON.stringify(error)} ]]]`)
    }

}

export const crearDireccionEnvio = async (pgConexion: PoolClient, valoresQuery: any[]) => {
    try {
        const consultaTexto01 = "INSERT INTO direcciones_envio (id_usuario, nombre_usuario, celular, direccion_envio, ciudad, departamento, descripcion, created_at) values ($1, $2, $3, $4, $5, $6, $7, $8) returning *;"
        const resQuery01 = await pgConexion.query(consultaTexto01, valoresQuery)

        if (resQuery01.rows.length != 0) return resQuery01.rows[0]
        else throw Error("Error en la creacion de LA direccion")

    } catch (error) {
        throw Error(`Error en crearDireccionEnvio : [[[ ${JSON.stringify(error)} ]]]`)
    }
}


export const consultarTransaccionesUsuario = async (pgConexion: PoolClient, idUsuario: string) => {
    try {
        const consultaTexto01 = fs.readFileSync("./assets/databases/ObtenerTransaccion.sql", "utf8");
        const resQuery01 = await pgConexion.query(consultaTexto01, [idUsuario])

        if (resQuery01.rows.length != 0) return resQuery01.rows
        else false

    } catch (error) {
        throw Error(`Error en consultarTransaccionesUsuario : [[[ ${JSON.stringify(error)} ]]]`)
    }
}


export const consultarDireccionesEnvio = async (pgConexion: PoolClient, idUsuario: string) => {
    try {
        const consultaTexto01 = "SELECT * FROM direcciones_envio WHERE id_usuario = $1"
        const resQuery01 = await pgConexion.query(consultaTexto01, [idUsuario])

        if (resQuery01.rows.length != 0) return resQuery01.rows
        else false

    } catch (error) {
        throw Error(`Error en consultarDireccionesEnvio : [[[ ${JSON.stringify(error)} ]]]`)
    }
}


export const comprobarDireccionEnvio = async (pgConexion: PoolClient, idDireccion: string, idUsuario: string) => {
    try {
        const consultaTexto01 = "SELECT * FROM direcciones_envio WHERE id = $1 AND id_usuario = $2"
        const resQuery01 = await pgConexion.query(consultaTexto01, [idDireccion, idUsuario])

        if (resQuery01.rows.length != 0) return resQuery01.rows
        else false

    } catch (error) {
        throw Error(`Error en comprobarDireccionEnvio : [[[ ${JSON.stringify(error)} ]]]`)
    }
}


export const actualizarDireccionEnvio = async (pgConexion: PoolClient, reqDireccion: z.infer<typeof PATCHDireccionEnvion>) => {
    try {

        const { id: idFiltrado, ...reqFiltrado } = reqDireccion

        // Eliminar valores undefined o null antes de construir el query
        const reqFiltradoLimpio = Object.fromEntries(
            Object.entries(reqFiltrado).filter(([_, v]) => v !== undefined && v !== null && v !== "")
        );

        const clavesQuery = Object.keys(reqFiltradoLimpio)
        if (clavesQuery.length === 0) return true; // No hay nada que actualizar

        const valoresQuery = Object.values(reqFiltradoLimpio)
        valoresQuery.push(idFiltrado)

        const setClaves = clavesQuery.map((itm, idx) => `${itm} = $${idx + 1}`).join(", ");

        const consultaTexto01 = `UPDATE direcciones_envio SET ${setClaves} WHERE id = $${clavesQuery.length + 1}`
        const resQuery01 = await pgConexion.query(consultaTexto01, [...valoresQuery])

        return true

    } catch (error) {
        throw Error(`Error en actualizarDireccionEnvio : [[[ ${JSON.stringify(error)} ]]]`)
    }
}


export const actualizarUsuario = async (pgConexion: PoolClient, idUsuario: string, reqUsuario: z.infer<typeof PATCHUsuario>) => {
    try {

        // Eliminar valores undefined o null antes de construir el query
        const reqFiltradoLimpio = Object.fromEntries(
            Object.entries(reqUsuario).filter(([_, v]) => v !== undefined && v !== null && v !== "")
        );

        const clavesQuery = Object.keys(reqFiltradoLimpio)
        if (clavesQuery.length === 0) return true; // No hay nada que actualizar

        const valoresQuery = Object.values(reqFiltradoLimpio)
        valoresQuery.push(idUsuario)

        const setClaves = clavesQuery.map((itm, idx) => `${itm} = $${idx + 1}`).join(", ");

        const consultaTexto01 = `UPDATE usuario SET ${setClaves} WHERE id = $${clavesQuery.length + 1}`
        const resQuery01 = await pgConexion.query(consultaTexto01, [...valoresQuery])

        return true

    } catch (error) {
        throw Error(`Error en actualizarDireccionEnvio : [[[ ${JSON.stringify(error)} ]]]`)
    }
}


export const eliminarDireccionEnvio = async (pgConexion: PoolClient, idDireccion: string, idUsuario: string) => {
    try {
        const consultaTexto01 = "DELETE FROM direcciones_envio WHERE id = $1 AND id_usuario = $2"
        const resQuery01 = await pgConexion.query(consultaTexto01, [idDireccion, idUsuario])

        if (resQuery01.rowCount && resQuery01.rowCount > 0) return true
        else false

    } catch (error) {
        throw Error(`Error en comprobarDireccionEnvio : [[[ ${JSON.stringify(error)} ]]]`)
    }
}