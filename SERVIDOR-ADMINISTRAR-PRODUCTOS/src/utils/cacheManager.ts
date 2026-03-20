import fs from "fs";
import poolPg from "../database";
import redisClient from "../redisCache";

/**
 * Función que formatea (limpia) toda la caché actual en Redis para este entorno.
 */
export const formatearCacheRedis = async (): Promise<void> => {
    try {
        console.log("Iniciando formateo de Cache en Redis...");
        await redisClient.flushDb();
        console.log("✅ Caché de Redis formateada con éxito.");
    } catch (error) {
        console.error("❌ Error al formatear la caché de Redis:", error);
        throw error;
    }
};

/**
 * Función principal que primero formatea la caché y luego consulta
 * y cachea todas las marcas, categorías y productos desde la base de datos.
 */
export const actualizarCacheGlobal = async (): Promise<void> => {
    try {
        // 1. Formatear la caché existente
        await formatearCacheRedis();

        console.log("Iniciando caché de base de datos a Redis...");
        const pgActive = await poolPg.connect();

        try {
            await pgActive.query("BEGIN");

            // 2. Cachear Marcas
            const consultaMarcas = "SELECT * FROM marcas_producto";
            const resMarcas = await pgActive.query(consultaMarcas);
            if (resMarcas.rows.length > 0) {
                await redisClient.set("ecommerce:marcas", JSON.stringify(resMarcas.rows));
                console.log(`✅ ${resMarcas.rows.length} marcas cacheadas.`);
            }

            // 3. Cachear Categorías
            const consultaCategorias = "SELECT * FROM categorias_producto";
            const resCategorias = await pgActive.query(consultaCategorias);
            if (resCategorias.rows.length > 0) {
                await redisClient.set("ecommerce:categorias", JSON.stringify(resCategorias.rows));
                console.log(`✅ ${resCategorias.rows.length} categorías cacheadas.`);
            }

            // 4. Cachear Productos
            // Utilizamos la misma consulta rica de los admin pero con límite masivo y sin filtros
            const consultaTexto01 = fs.readFileSync("./assets/databases/ObtenerTodosLosProductosAdmin.sql", "utf8");

            // offset=0, limit=999999, search=null, idCategoria=null, idMarca=null
            const resProductos = await pgActive.query(consultaTexto01, [0, 999999, null, null, null]);

            if (resProductos.rows.length > 0) {
                // Almacenamos el gran volumen de todos los productos
                await redisClient.set("ecommerce:productos_todos", JSON.stringify(resProductos.rows));
                console.log(`✅ ${resProductos.rows.length} productos cacheadas globalmente.`);
            } else {
                // Si no hay productos, guardamos un array vacio
                await redisClient.set("ecommerce:productos_todos", JSON.stringify([]));
                console.log(`✅ 0 productos cacheados.`);
            }

            await pgActive.query("COMMIT");
            console.log("🚀 Todos los contenidos han sido cacheados exitosamente.");

        } catch (error) {
            await pgActive.query('ROLLBACK');
            throw error;
        } finally {
            pgActive.release();
        }

    } catch (error) {
        console.error("❌ Error en el proceso de almacenamiento en la Caché Global:", error);
    }
};
