import { PoolClient } from "pg"
import fs from "fs"


export const consultarProductos = async (pgConexion: PoolClient, _desde = 0): Promise<any[]> => {

    try {
        const consultaTexto01 = fs.readFileSync("./assets/databases/ObtenerTodosLosProductos.sql", "utf8");
        const resQuery01 = await pgConexion.query(consultaTexto01, [_desde])

        // Retornar array vacío si no hay productos (en lugar de lanzar error)
        return resQuery01.rows ?? []

    } catch (error) {
        throw Error(`Error en crearGrupoProductos : [[[ ${JSON.stringify(error)} ]]]`)
    }

}

