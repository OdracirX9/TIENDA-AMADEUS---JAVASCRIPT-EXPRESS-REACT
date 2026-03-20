import { PoolClient } from "pg"
import fs from "fs"


// ─── OBTENER O CREAR EL CARRITO DEL USUARIO ──────────────────────────────────

export const obtenerOCrearCarrito = async (pgConexion: PoolClient, idUsuario: string): Promise<string> => {
    try {
        // Busca carrito existente
        const res1 = await pgConexion.query(
            "SELECT id FROM public.carrito WHERE id_usuario = $1",
            [idUsuario]
        )
        if (res1.rows.length > 0) return res1.rows[0].id

        // Si no existe, lo crea
        const res2 = await pgConexion.query(
            "INSERT INTO public.carrito (id_usuario) VALUES ($1) RETURNING id",
            [idUsuario]
        )
        return res2.rows[0].id

    } catch (error) {
        throw Error(`Error en obtenerOCrearCarrito : [[[ ${JSON.stringify(error)} ]]]`)
    }
}


// ─── OBTENER ITEMS DEL CARRITO ────────────────────────────────────────────────

export const obtenerItemsCarrito = async (pgConexion: PoolClient, idUsuario: string) => {
    try {
        const consultaTexto = fs.readFileSync("./assets/databases/ObtenerCarritoUsuario.sql", "utf8")
        const res = await pgConexion.query(consultaTexto, [idUsuario])
        return res.rows

    } catch (error) {
        throw Error(`Error en obtenerItemsCarrito : [[[ ${JSON.stringify(error)} ]]]`)
    }
}


// ─── AGREGAR O ACTUALIZAR (UPSERT) ITEM EN EL CARRITO ────────────────────────
// Si la variante ya existe en el carrito, suma la cantidad; si no, la inserta.

export const upsertItemCarrito = async (
    pgConexion: PoolClient,
    idCarrito: string,
    idVariante: string,
    cantidad: number
) => {
    try {
        // Verifica que la variante tenga stock y esté visible
        const resVariante = await pgConexion.query(
            "SELECT id, stock, visibilidad FROM public.variantes_producto WHERE id = $1",
            [idVariante]
        )
        if (resVariante.rows.length === 0) throw Error("Variante no encontrada")
        const variante = resVariante.rows[0]
        if (!variante.visibilidad) throw Error("La variante no está disponible")
        if (variante.stock === 0) throw Error("La variante no tiene stock disponible")
        if (cantidad > variante.stock) throw Error(`Stock insuficiente. Disponible: ${variante.stock}`)

        // Upsert: inserta o actualiza la cantidad
        const consultaTexto = `
            INSERT INTO public.items_carrito (id_carrito, id_variante, cantidad, updated_at)
            VALUES ($1, $2, $3, now())
            ON CONFLICT ON CONSTRAINT uq_carrito_variante
            DO UPDATE SET
                cantidad   = EXCLUDED.cantidad,
                updated_at = now()
            RETURNING *
        `
        const res = await pgConexion.query(consultaTexto, [idCarrito, idVariante, cantidad])
        return res.rows[0]

    } catch (error) {
        throw Error(`Error en upsertItemCarrito : [[[ ${JSON.stringify(error)} ]]]`)
    }
}


// ─── ACTUALIZAR CANTIDAD DE UN ITEM ──────────────────────────────────────────

export const actualizarCantidadItem = async (
    pgConexion: PoolClient,
    idCarrito: string,
    idVariante: string,
    cantidad: number
) => {
    try {
        // Verificar stock
        const resVariante = await pgConexion.query(
            "SELECT stock FROM public.variantes_producto WHERE id = $1",
            [idVariante]
        )
        if (resVariante.rows.length === 0) throw Error("Variante no encontrada")
        if (cantidad > resVariante.rows[0].stock) throw Error(`Stock insuficiente. Disponible: ${resVariante.rows[0].stock}`)

        const res = await pgConexion.query(
            `UPDATE public.items_carrito
             SET cantidad = $1, updated_at = now()
             WHERE id_carrito = $2 AND id_variante = $3
             RETURNING *`,
            [cantidad, idCarrito, idVariante]
        )
        if (res.rows.length === 0) throw Error("Item no encontrado en el carrito")
        return res.rows[0]

    } catch (error) {
        throw Error(`Error en actualizarCantidadItem : [[[ ${JSON.stringify(error)} ]]]`)
    }
}


// ─── ELIMINAR UN ITEM DEL CARRITO ─────────────────────────────────────────────

export const eliminarItemCarrito = async (
    pgConexion: PoolClient,
    idCarrito: string,
    idVariante: string
) => {
    try {
        const res = await pgConexion.query(
            "DELETE FROM public.items_carrito WHERE id_carrito = $1 AND id_variante = $2 RETURNING id",
            [idCarrito, idVariante]
        )
        if (res.rows.length === 0) throw Error("Item no encontrado en el carrito")
        return true

    } catch (error) {
        throw Error(`Error en eliminarItemCarrito : [[[ ${JSON.stringify(error)} ]]]`)
    }
}


// ─── VACIAR TODO EL CARRITO ───────────────────────────────────────────────────

export const vaciarCarrito = async (pgConexion: PoolClient, idCarrito: string) => {
    try {
        await pgConexion.query(
            "DELETE FROM public.items_carrito WHERE id_carrito = $1",
            [idCarrito]
        )
        return true

    } catch (error) {
        throw Error(`Error en vaciarCarrito : [[[ ${JSON.stringify(error)} ]]]`)
    }
}
