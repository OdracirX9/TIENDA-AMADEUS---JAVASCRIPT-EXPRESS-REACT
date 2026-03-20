import { PoolClient } from "pg"
import { CrearVarianteProductoI } from "../../utils/Interfaces"


export const crearGrupoProductos = async (pgConexion: PoolClient, valoresQuery: any[]) => {

    try {
        const consultaTexto01 = "insert into grupos_producto (id_categoria, id_marca, visibilidad, created_at, updated_at) values ($1, $2, $3, $4, $5) returning *;"
        const resQuery01 = await pgConexion.query(consultaTexto01, valoresQuery)

        if (resQuery01.rows.length != 0) return resQuery01.rows
        else throw Error("Error en la creacion del grupo del producto")

    } catch (error) {
        throw Error(`Error en crearGrupoProductos : [[[ ${JSON.stringify(error)} ]]]`)
    }

}



export const crearVarianteProductos = async (pgConexion: PoolClient, idGrupoProducto: string, fechaCreacion: string, reqVariantes: CrearVarianteProductoI[]) => {

    try {
        const consultaArray01 = ["insert into variantes_producto (id_grupo, nombre, descripcion, caracteristicas, imagenes, stock, posicion, visibilidad, created_at, updated_at) VALUES"]
        const valoresDeOrden: any[] = []


        const placeHolders: any[] = []

        reqVariantes.forEach((itm, idx) => {


            const itmTempo = [idGrupoProducto, itm.nombre, itm.descripcion, itm.caracteristicas, itm.imagenes, itm.stock, itm.posicion, itm.visibilidad, fechaCreacion, fechaCreacion]
            valoresDeOrden.push(...itmTempo)

            const offset = idx * 10;
            placeHolders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10})`)
        })

        consultaArray01.push(placeHolders.join(","))
        consultaArray01.push("RETURNING *;")
        const consultaTexto01 = consultaArray01.join(" ")

        const resQuery01 = await pgConexion.query(consultaTexto01, valoresDeOrden)

        if (resQuery01.rows.length != 0) return resQuery01.rows
        else throw Error("Error en la creacion de las variantes producto")

    } catch (error) {
        throw Error(`Error en crearVarianteProductos : [[[ ${JSON.stringify(error)} ]]]`)
    }


}



export const crearHistorialProductos = async (pgConexion: PoolClient, fechaCreacion: string, resVariantes: { [key: string]: any }[], reqVariantes: CrearVarianteProductoI[]) => {

    try {
        const consultaArray01 = ["INSERT INTO historial_precios (id_variante, precio, created_at) VALUES"]
        const valoresDeOrden: any[] = []

        const placeHolders: any[] = []

        resVariantes.forEach((itm, idx) => {


            const itmTempo = [itm.id, reqVariantes[idx].precio, fechaCreacion]
            valoresDeOrden.push(...itmTempo)

            const offset = idx * 3;
            placeHolders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3})`)
        })

        consultaArray01.push(placeHolders.join(","))
        consultaArray01.push("RETURNING id AS id_precio_historia, id_variante, precio, created_at AS updated_at;")
        const consultaTexto01 = consultaArray01.join(" ")

        const resQuery01 = await pgConexion.query(consultaTexto01, valoresDeOrden)

        if (resQuery01.rows.length != 0) return resQuery01.rows
        else throw Error("Error en la creacion del historial del producto")

    } catch (error) {
        throw Error(`Error en crearHistorialProductos : [[[ ${JSON.stringify(error)} ]]]`)
    }

}



export const crearActualPrecioProductos = async (pgConexion: PoolClient, fechaCreacion: string, resHistorialPrecio: { [key: string]: any }[]) => {

    try {
        const consultaArray01 = ["INSERT INTO actual_precio_producto (id_precio_historia, id_variante, precio, updated_at) VALUES"]
        const valoresDeOrden: any[] = []

        const placeHolders: any[] = []

        resHistorialPrecio.forEach((itm, idx) => {

            const itmTempo = [itm.id_precio_historia, itm.id_variante, itm.precio, fechaCreacion]
            valoresDeOrden.push(...itmTempo)

            const offset = idx * 4;
            placeHolders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`)
        })

        consultaArray01.push(placeHolders.join(","))
        consultaArray01.push("RETURNING *;")
        const consultaTexto01 = consultaArray01.join(" ")

        const resQuery01 = await pgConexion.query(consultaTexto01, valoresDeOrden)

        if (resQuery01.rows.length != 0) return resQuery01.rows
        else throw Error("Error en la creacion del actual precio del producto")

    } catch (error) {
        throw Error(`Error en crearActualPrecioProductos : [[[ ${JSON.stringify(error)} ]]]`)
    }

}