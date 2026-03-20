import { Request, Response } from "express"
import fs from "fs"

// IMPORTACION DE BASE DE DATOS
import poolPg from "../../database"
import ClienteRedis from "../../redisCache"

// Tolera boolean true, string "true", o number 1 (pg/redis serialization differences)
const esVisible = (v: any): boolean => v === true || v === 1 || v === 'true';

const GETProductoPorId = async (req: Request, res: Response) => {

    try {
        const { id } = req.params;

        // Intentar obtener de Redis Primero
        try {
            // 1. Directo por ID de Grupo
            let productoCache = await ClienteRedis.json.get(`ecomerce:productos:${id}`);

            // 2. Si no es grupo, buscar por ID de Variante usando RediSearch
            if (!productoCache) {
                const searchRes = await ClienteRedis.ft.search('idx:ecomerce:productos', `@id_variante:{${id.replace(/-/g, '\\-')}}`, { LIMIT: { from: 0, size: 1 } });
                if (searchRes.total > 0) {
                    productoCache = searchRes.documents[0].value as any;
                }
            }

            if (productoCache) {
                const grupoRed: any = productoCache;
                if (!esVisible(grupoRed.visibilidad)) {
                    return res.status(404).json({ error: "Producto no encontrado o inactivo" });
                }
                const varVisibles = (grupoRed.variantes || []).filter((v: any) => esVisible(v.visibilidad));
                if (varVisibles.length === 0) {
                    return res.status(404).json({ error: "Producto no disponible" });
                }
                grupoRed.variantes = varVisibles;
                return res.status(200).json(grupoRed);
            }
        } catch (redisError) {
            console.warn("Fallo Redis al obtener producto por ID, usando DB", (redisError as any)?.message);
        }

        // Conexion con la base de datos (Fallback)
        const pgActive = await poolPg.connect();

        try {
            const consultaTexto01 = fs.readFileSync("./assets/databases/ObtenerProductoPorId.sql", "utf8");
            const resQuery01 = await pgActive.query(consultaTexto01, [id])

            if (resQuery01.rows.length === 0) {
                return res.status(404).json({ error: "Producto no encontrado" });
            }

            const dbProduct = resQuery01.rows[0];

            if (!esVisible(dbProduct.visibilidad)) return res.status(404).json({ error: "Producto inactivo" });

            const visVariants = (dbProduct.variantes || []).filter((v: any) => esVisible(v.visibilidad));
            if (visVariants.length === 0) return res.status(404).json({ error: "Producto no disponible" });

            dbProduct.variantes = visVariants;

            res.status(200).json(dbProduct);

        } catch (error) {
            console.log(error)
            res.status(500).json({ error: "Error interno al obtener el producto" })

        } finally {
            pgActive.release();
        }

    } catch (error) {
        res.status(500).json({ error: "Error de conexión con la base de datos" })
    }

}


export default GETProductoPorId;
