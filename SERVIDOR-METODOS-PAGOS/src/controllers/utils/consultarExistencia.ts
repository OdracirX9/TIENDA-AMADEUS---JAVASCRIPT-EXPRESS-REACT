import { PoolClient } from "pg"


export const isUsuario = async( pgConexion:PoolClient, idUsuario:string )=>{

    try {
        const consultaTexto01 = "SELECT * FROM usuario WHERE id = $1"
        const resQuery01 = await pgConexion.query(consultaTexto01, [idUsuario]);

        if (resQuery01.rows.length != 0) return resQuery01.rows
        else throw Error("No existe ningun usuario")

    } catch (error) {
        throw Error(`Error en isUsuario : [[[ ${JSON.stringify(error)} ]]]`)
    }
}


export const isDireccion = async( pgConexion:PoolClient, idUsuario:string, idDireccion:string )=>{

    try {
        const consultaTexto01 = "SELECT * FROM direcciones_envio WHERE id_usuario = $1 and id = $2"
        const resQuery01 = await pgConexion.query(consultaTexto01, [idUsuario, idDireccion]);

        if (resQuery01.rows.length != 0) return resQuery01.rows
        else throw Error("No existe ninguna direccion")

    } catch (error) {
        throw Error(`Error en isDireccion : [[[ ${JSON.stringify(error)} ]]]`)
    }

}


export const isProducto = async(pgConexion:PoolClient, productosVerificar:string[])=>{

    try {
        const consultaTexto01 = `SELECT vp.*, mp.nombre AS marca, cp.nombre AS categoria, ap.id_precio_historia AS id_precio, ap.precio AS precio FROM      variantes_producto vp 
        JOIN actual_precio_producto ap ON vp.id = ap.id_variante 
        LEFT JOIN grupos_producto gp ON vp.id_grupo = gp.id
        LEFT JOIN marcas_producto mp ON gp.id_marca = mp.id
        LEFT JOIN categorias_producto cp ON gp.id_categoria = cp.id
        WHERE vp.id = ANY($1::uuid[]);`;
        const resQuery01 = await pgConexion.query(consultaTexto01, [productosVerificar]);

        if (resQuery01.rows.length === productosVerificar.length) return resQuery01.rows
        else throw Error("La cantidad de productos no coincide con la actual en la base de datos")

    } catch (error) {
        throw Error(`Error en isProducto : [[[ ${JSON.stringify(error)} ]]]`)
    }

}