import { PoolClient } from "pg"
import ClienteRedis, { comprobarConexionRedis } from "../../redisCache"
import { consultarProductos } from "../utils/consultarProductos"
import poolPg from "../../database"


// ─────────────────────────────────────────────────────────────────────────────
//  CLAVES REDIS — deben coincidir con las que usa SERVIDOR-ADMINISTRAR-PRODUCTOS
//  (cacheManager.ts → actualizarCacheGlobal):
//    "ecommerce:marcas"          → JSON.stringify(marcas_producto[])
//    "ecommerce:categorias"      → JSON.stringify(categorias_producto[])
//    "ecommerce:productos_todos" → JSON.stringify(productos[])
//
//  El Landing Page también tiene sus propios índices FT por producto individual:
//    "ecomerce:productos:{id}"   → JSON (FT index)
// ─────────────────────────────────────────────────────────────────────────────

const REDIS_KEY_MARCAS = 'ecommerce:marcas';
const REDIS_KEY_CATEGORIAS = 'ecommerce:categorias';
const REDIS_KEY_PRODUCTOS = 'ecommerce:productos_todos';


// ─────────────────────────────────────────────────────────────────────────────
//  FILTRADO DE PRODUCTOS VISIBLES
// ─────────────────────────────────────────────────────────────────────────────

// Tolera boolean true, string "true", number 1
const esVisible = (v: any) => v === true || v === 1 || v === 'true';

const filtrarVisibles = (data: { [key: string]: any }[], filtros: { search?: string, categoria?: string, marca?: string } = {}) => {
  return data
    .filter(grupo => {
      if (!esVisible(grupo.visibilidad)) return false;
      if (filtros.categoria && grupo.id_categoria !== filtros.categoria) return false;
      if (filtros.marca && grupo.id_marca !== filtros.marca) return false;
      return true;
    })
    .map(grupo => {
      const variantesVisibles = (grupo.variantes || []).filter((v: any) => esVisible(v.visibilidad));

      let variantesFiltradas = variantesVisibles;

      if (filtros.search) {
        const searchTerm = filtros.search.toLowerCase();
        const contieneTexto = variantesVisibles.some((v: any) =>
          v.nombre?.toLowerCase().includes(searchTerm) ||
          v.descripcion?.toLowerCase().includes(searchTerm)
        );
        variantesFiltradas = contieneTexto ? variantesVisibles : [];
      }

      return { ...grupo, variantes: variantesFiltradas };
    })
    .filter(grupo => grupo.variantes.length > 0);
};


// ─────────────────────────────────────────────────────────────────────────────
//  HELPER: leer un string JSON de Redis de forma segura
// ─────────────────────────────────────────────────────────────────────────────

async function leerRedisJson<T = any[]>(clave: string): Promise<T | null> {
  try {
    const raw = await ClienteRedis.get(clave);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}


// ─────────────────────────────────────────────────────────────────────────────
//  CONSULTAR PRODUCTOS  —  Redis simple primero, luego FT, luego PostgreSQL
// ─────────────────────────────────────────────────────────────────────────────

export const consultarCacheProductos = async (pgConexion: PoolClient, _desde = 0, _hasta = 50, filtros = {}) => {

  const redisActivo = await comprobarConexionRedis();

  if (redisActivo) {

    // 1. Intentar clave simple (formato Admin: "ecommerce:productos_todos")
    try {
      const productosCache = await leerRedisJson<any[]>(REDIS_KEY_PRODUCTOS);
      if (productosCache && productosCache.length > 0) {
        return filtrarVisibles(productosCache, filtros);
      }
    } catch (e) {
      console.warn('⚠️  Redis: fallo leyendo clave simple de productos:', (e as any)?.message);
    }

    // 2. Intentar índice FT (formato Landing Page: "ecomerce:productos:{id}")
    try {
      const resRedis = await ClienteRedis.ft.search('idx:ecomerce:productos', '*', {
        LIMIT: { from: _desde, size: _hasta }
      });

      if (resRedis.total > 0) {
        const datos = resRedis.documents.map(itm => itm.value);
        return filtrarVisibles(datos, filtros);
      }

      console.log('ℹ️  Redis: ambas cachés de productos vacías, cargando desde PostgreSQL...');

    } catch (redisErr: any) {
      console.warn('⚠️  Redis ft.search (productos) falló:', redisErr?.message ?? redisErr);
    }
  } else {
    console.warn('⚠️  Redis no disponible, consultando PostgreSQL directamente.');
  }

  // 3. Fallback final: PostgreSQL
  const resQuery = await consultarProductos(pgConexion);
  return filtrarVisibles(resQuery, filtros);
};


// ─────────────────────────────────────────────────────────────────────────────
//  CONSULTAR ELEMENTOS (marcas + categorías)
//  Estrategia:
//    1. Redis clave simple "ecommerce:marcas" / "ecommerce:categorias" (Admin)
//    2. Fallback: PostgreSQL → tablas marcas_producto / categorias_producto
// ─────────────────────────────────────────────────────────────────────────────

export const consultarCacheElementos = async () => {

  const redisActivo = await comprobarConexionRedis();

  if (redisActivo) {
    try {
      const marcasCache = await leerRedisJson<any[]>(REDIS_KEY_MARCAS);
      const categoriasCache = await leerRedisJson<any[]>(REDIS_KEY_CATEGORIAS);

      if (marcasCache && categoriasCache) {
        return {
          marcas: marcasCache,
          categorias: categoriasCache,
        };
      }

      console.log('ℹ️  Redis: claves de elementos vacías, consultando PostgreSQL...');

    } catch (redisErr: any) {
      console.warn('⚠️  Redis (elementos) falló, usando PostgreSQL:', redisErr?.message ?? redisErr);
    }
  } else {
    console.warn('⚠️  Redis no disponible para elementos, consultando PostgreSQL.');
  }

  // Fallback: PostgreSQL — tablas reales del schema
  try {
    const pgActive = await poolPg.connect();
    try {
      await pgActive.query("BEGIN");

      const resMarcas = await pgActive.query("SELECT * FROM marcas_producto");
      const resCategorias = await pgActive.query("SELECT * FROM categorias_producto");

      const marcas = resMarcas.rows;
      const categorias = resCategorias.rows;

      await pgActive.query("COMMIT");

      // Poblar Redis para la próxima petición (best-effort, mismo formato que el Admin)
      if (redisActivo) {
        try { await ClienteRedis.set(REDIS_KEY_MARCAS, JSON.stringify(marcas)); } catch { }
        try { await ClienteRedis.set(REDIS_KEY_CATEGORIAS, JSON.stringify(categorias)); } catch { }
      }

      return { marcas, categorias };

    } catch (pgErr) {
      await pgActive.query("ROLLBACK").catch(() => { });
      throw pgErr;
    } finally {
      pgActive.release();
    }
  } catch (pgErr: any) {
    throw new Error(`Error en consultarCacheElementos (fallback PostgreSQL): ${pgErr?.message ?? pgErr}`);
  }
};
