import { Request, Response } from "express";
import poolPg from "../../database";
import ClienteRedis, { comprobarConexionRedis } from "../../redisCache";
import fs from "fs";

// ─────────────────────────────────────────────────────────────────────────────
//  CONSTANTES Y HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const REDIS_KEY_LANDING = 'ecomerce:landing_page:full';

// Tolera boolean true, string "true", o number 1
const esVisible = (v: any): boolean => v === true || v === 1 || v === 'true';

/**
 * Busca un producto completo por el ID de una de sus variantes.
 * Intenta primero en Redis y luego en PostgreSQL.
 */
async function obtenerProductoPorVarianteId(idVariante: string): Promise<any | null> {
    const redisActivo = await comprobarConexionRedis();

    // 1. Intentar en Redis usando RediSearch (tag id_variante)
    if (redisActivo) {
        try {
            const resRedis = await ClienteRedis.ft.search('idx:ecomerce:productos', `@id_variante:{${idVariante.replace(/-/g, '\\-')}}`);
            if (resRedis.total > 0) {
                const producto = resRedis.documents[0].value as any;
                if (esVisible(producto.visibilidad)) {
                    // Aislamos la variante específica requerida
                    producto.variantes = (producto.variantes || []).filter((v: any) => v.id === idVariante && esVisible(v.visibilidad));
                    if (producto.variantes.length > 0) return producto;
                }
            }
        } catch (err) {
            console.warn(`⚠️ Redis ft.search falló para variante ${idVariante}:`, (err as any)?.message);
        }
    }

    // 2. Fallback: PostgreSQL
    try {
        const pgActive = await poolPg.connect();
        try {
            // Usamos un query que encuentre el grupo/producto de la variante
            const sql = `
                SELECT 
                    gp.*,
                    c.nombre AS nombre_categoria,
                    m.nombre AS nombre_marca,
                    (
                        SELECT json_agg(json_build_object(
                            'id', vp.id,
                            'nombre', vp.nombre,
                            'descripcion', vp.descripcion,
                            'imagenes', vp.imagenes,
                            'stock', vp.stock,
                            'ventas', vp.ventas,
                            'visibilidad', vp.visibilidad,
                            'precio', (SELECT precio FROM public.actual_precio_producto WHERE id_variante = vp.id LIMIT 1),
                            'precio_descuento', NULL -- Ajustar si existe lógica de descuento
                        ) ORDER BY vp.posicion ASC)
                        FROM public.variantes_producto vp
                        WHERE vp.id_grupo = gp.id AND vp.id = $1 -- Filtramos por la variante específica aquí también
                    ) AS variantes
                FROM public.grupos_producto gp
                JOIN public.categorias_producto c ON gp.id_categoria = c.id
                JOIN public.marcas_producto m ON gp.id_marca = m.id
                WHERE gp.id = (SELECT id_grupo FROM public.variantes_producto WHERE id = $1 LIMIT 1)
            `;
            const res = await pgActive.query(sql, [idVariante]);
            if (res.rows.length > 0) {
                const producto = res.rows[0];
                if (esVisible(producto.visibilidad)) {
                    // Doble check de visibilidad de la variante (aunque ya filtrada en subquery)
                    producto.variantes = (producto.variantes || []).filter((v: any) => esVisible(v.visibilidad));
                    if (producto.variantes.length > 0) return producto;
                }
            }
        } finally {
            pgActive.release();
        }
    } catch (err) {
        console.error(`❌ Error DB al buscar producto por variante ${idVariante}:`, err);
    }

    return null;
}

// ─────────────────────────────────────────────────────────────────────────────
//  CONTROLADOR PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

const GETLandingPageCompleta = async (req: Request, res: Response) => {
    try {
        let secciones: any[] = [];
        const redisActivo = await comprobarConexionRedis();

        // 1. Intentar obtener secciones de Redis
        if (redisActivo) {
            try {
                const cacheSecciones = await ClienteRedis.get(REDIS_KEY_LANDING);
                if (cacheSecciones) {
                    secciones = JSON.parse(cacheSecciones);
                }
            } catch (err) {
                console.warn("⚠️ Falló lectura de caché de landing page:", err);
            }
        }

        // 2. Fallback a DB si no hay caché
        if (secciones.length === 0) {
            const pgActive = await poolPg.connect();
            try {
                const query = `
                    SELECT id, titulo, descripcion, array_variantes, posicion, visibilidad
                    FROM public.landing_page
                    WHERE visibilidad = true
                    ORDER BY posicion ASC
                `;
                const result = await pgActive.query(query);
                secciones = result.rows;

                // Actualizar caché best-effort
                if (redisActivo && secciones.length > 0) {
                    await ClienteRedis.set(REDIS_KEY_LANDING, JSON.stringify(secciones));
                }
            } finally {
                pgActive.release();
            }
        }

        // 3. Hidratar secciones con información de productos
        const seccionesCompletas = await Promise.all(secciones.map(async (seccion) => {
            const idsVariantes = seccion.array_variantes || [];
            const productosPromesas = idsVariantes.map((idV: string) => obtenerProductoPorVarianteId(idV));
            const productosResultados = await Promise.all(productosPromesas);

            // Filtrar nulls (productos no encontrados o invisibles)
            const productos = productosResultados.filter(p => p !== null);

            return {
                ...seccion,
                productos
            };
        }));

        return res.status(200).json(seccionesCompletas);

    } catch (error) {
        console.error("❌ Error en GETLandingPageCompleta:", error);
        return res.status(500).json({ error: "Error interno al obtener la landing page" });
    }
};

export default GETLandingPageCompleta;
