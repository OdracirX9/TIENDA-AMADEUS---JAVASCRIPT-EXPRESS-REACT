import { PoolClient } from "pg"

import { z } from "zod"
import { POSTGenerarPagoI } from "../../utils/esquemasZod"


export const crearOrdenGrupo = async (pgConexion: PoolClient, valoresQuery: string[]) => {

    try {
        const consultaTexto01 = "INSERT INTO orden_grupo(id_usuario, nombre_usuario, correo, celular, direccion_envio, ciudad, departamento, created_at, precio_envio) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *"
        const resQuery01 = await pgConexion.query(consultaTexto01, valoresQuery)

        if (resQuery01.rows.length != 0) return resQuery01.rows
        else throw Error("Error en la creacion del grupo de la orden de compra")

    } catch (error) {
        throw Error(`Error en crearOrdenGrupo : [[[ ${JSON.stringify(error)} ]]]`)
    }

}


export const crearOrdenProductoSolo = async (pgConexion: PoolClient, idOrden: string, reqVariantes: z.infer<typeof POSTGenerarPagoI>, resQueryVariante: { [key: string]: any }[]) => {

    try {
        const consultaArray01 = ["INSERT INTO orden_producto(id_orden, id_producto, nombre, marca, categoria, imagen, cantidad, id_precio, precio, descuento, sub_total) VALUES"]
        const valoresDeOrden: any[] = []

        const placeHolders: any[] = []
        resQueryVariante.forEach((itm, idx) => {
            const productoFiltradoReq = reqVariantes.variantes.find(itm2 => itm2.id === itm.id)

            if (!productoFiltradoReq) throw Error("Error al encontrar coincidencias entre el req y la resQuery")
            if (productoFiltradoReq.cantidad > itm.cantidad) throw Error("Error, la cantidad solicitada es mayor a la disponible")

            const sumaSubtotal = itm.precio * productoFiltradoReq.cantidad;

            // Asegurar fallbacks correctos en caso de que sea null por los LEFT JOINs
            const marcaVal = itm.marca || "Sin marca";
            const categoriaVal = itm.categoria || "Sin categoría";
            const imagenVal = (itm.imagenes && itm.imagenes.length > 0) ? itm.imagenes[0] : "";

            const itmTempo = [idOrden, itm.id, itm.nombre, marcaVal, categoriaVal, imagenVal, productoFiltradoReq.cantidad, itm.id_precio, itm.precio, 0, sumaSubtotal]
            valoresDeOrden.push(...itmTempo)

            const offset = idx * 11;
            placeHolders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11})`)
        })

        consultaArray01.push(placeHolders.join(","))
        consultaArray01.push("RETURNING *;")
        const consultaTexto01 = consultaArray01.join(" ")

        const resQuery01 = await pgConexion.query(consultaTexto01, valoresDeOrden)

        if (resQuery01.rows.length != 0) return resQuery01.rows
        else throw Error("Error en la creacion de la orden del producto esperado")

    } catch (error) {
        throw Error(`Error en crearOrdenProductoSolo : [[[ ${JSON.stringify(error)} ]]]`)
    }

}

export const consultarTarifaEnvio = async (pgConexion: PoolClient, departamento: string, ciudad: string): Promise<number> => {
    try {
        // Primera consulta: buscar por ciudad exacta (y departamento)
        const consultaExacta = "SELECT precio FROM tarifas_envio WHERE LOWER(departamento) = LOWER($1) AND LOWER(ciudad) = LOWER($2)";
        const resExacta = await pgConexion.query(consultaExacta, [departamento, ciudad]);

        if (resExacta.rows.length > 0) {
            return Number(resExacta.rows[0].precio);
        }

        // Segunda consulta: buscar departamento con ciudad 'TODO'
        const consultaTodo = "SELECT precio FROM tarifas_envio WHERE LOWER(departamento) = LOWER($1) AND ciudad = 'TODO'";
        const resTodo = await pgConexion.query(consultaTodo, [departamento]);

        if (resTodo.rows.length > 0) {
            return Number(resTodo.rows[0].precio);
        }

        // Si no hay tarifa, retornar 2000000 centavos
        return 2000000;
    } catch (error) {
        console.error("Error al consultar tarifa de envío:", error);
        return 2000000; // Fallback
    }
}