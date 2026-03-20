import { Request, Response } from "express"
import fs from "fs"

// IMPORTACION DE BASE DE DATOS
import poolPg from "../../database"

interface ProductoCarritoBodyI {
    id_variante: string;
    cantidad: number;
}

const POSTComprobarProductos = async (req: Request, res: Response) => {

    try {
        const carrito: ProductoCarritoBodyI[] = req.body;

        if (!Array.isArray(carrito) || carrito.length === 0) {
            return res.status(400).json({ error: "El carrito está vacío o tiene formato inválido" });
        }

        const pgActive = await poolPg.connect();

        try {
            const consultaTexto01 = fs.readFileSync("./assets/databases/ObtenerPrecioVariantePorId.sql", "utf8");

            let totalGeneralCarrito = 0;
            const itemsValidados = [];

            for (const item of carrito) {
                if (item.cantidad <= 0) {
                    return res.status(400).json({ error: "Cantidades inválidas detectadas" });
                }

                const resQuery01 = await pgActive.query(consultaTexto01, [item.id_variante]);

                if (resQuery01.rows.length === 0) {
                    return res.status(404).json({ error: `La variante ${item.id_variante} no existe` });
                }

                const dbProduct = resQuery01.rows[0];

                if (!dbProduct.grupo_visible || !dbProduct.variante_visible) {
                    return res.status(400).json({ error: `El producto ${dbProduct.nombre} ya no está disponible` });
                }

                if (dbProduct.stock < item.cantidad) {
                    return res.status(400).json({ error: `Stock insuficiente para ${dbProduct.nombre}. Quedan ${dbProduct.stock}` });
                }

                const subTotalItem = dbProduct.precio * item.cantidad;
                totalGeneralCarrito += subTotalItem;

                const imagenUrl = dbProduct.imagenes && dbProduct.imagenes.length > 0 ? dbProduct.imagenes[0] : "";

                itemsValidados.push({
                    id_variante: dbProduct.id_variante,
                    nombre: dbProduct.nombre,
                    precio_unitario: dbProduct.precio,
                    cantidad: item.cantidad,
                    sub_total: subTotalItem,
                    imagen: imagenUrl
                });
            }

            res.status(200).json({
                valido: true,
                total: totalGeneralCarrito,
                items: itemsValidados
            });

        } catch (error) {
            console.log(error)
            res.status(500).json({ error: "Error interno al validar el carrito" })

        } finally {
            pgActive.release();
        }

    } catch (error) {
        res.status(500).json({ error: "Error de conexión con la base de datos" })
    }

}

export default POSTComprobarProductos;
