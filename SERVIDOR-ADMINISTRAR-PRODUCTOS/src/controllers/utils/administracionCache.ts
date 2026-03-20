import { PoolClient, QueryResult } from "pg"
import fs from "fs"
import ClienteRedis from "../../redisCache"
import { POSTCrearElementoProductoI } from "../../utils/Interfaces"
import poolPg from "../../database"




const filtrarVisibles = (data: { [key: string]: any }[]) => {
  return data
    .filter(grupo => grupo.visibilidad === true)
    .map(grupo => {
      // Create a shallow copy to safely mutate variantes
      const grupoFiltrado = { ...grupo };
      if (grupoFiltrado.variantes && Array.isArray(grupoFiltrado.variantes)) {
        grupoFiltrado.variantes = grupoFiltrado.variantes.filter((v: any) => v.visibilidad === true);
      } else {
        grupoFiltrado.variantes = [];
      }
      return grupoFiltrado;
    });
};



export const crearCacheProducto = async (pgConexion: PoolClient, idGrupo: string) => {

  try {

    const consultaTexto01 = fs.readFileSync("./assets/databases/ObtenerProducto.sql", "utf8");
    const resQuery01 = await pgConexion.query(consultaTexto01, [idGrupo]);

    const productoVisible = filtrarVisibles(resQuery01.rows)[0];

    if (productoVisible) {
      // If the product is visible and has data, update the Redis cache
      await ClienteRedis.json.set(`ecomerce:productos:${idGrupo}`, '$', productoVisible);
    } else {
      // If the product is hidden (or completely deleted), remove it from the cache public list
      await ClienteRedis.del(`ecomerce:productos:${idGrupo}`);
    }

    return true

  } catch (error) {
    console.error(error)
    throw Error(`Error en crearCacheProducto : [[[ ${JSON.stringify(error)} ]]]`)
  }
}

export const crearCacheProductoMemoria = async (grupo: any, variantes: any[], actualPrecios: any[]) => {
  try {
    const variantesMapeadas = variantes.map(v => {
      const precioMatch = actualPrecios.find(p => String(p.id_variante) === String(v.id));
      return {
        id: v.id,
        nombre: v.nombre,
        descripcion: v.descripcion,
        caracteristicas: v.caracteristicas,
        imagenes: v.imagenes,
        precio: precioMatch ? Number(precioMatch.precio) : 0,
        stock: v.stock,
        ventas: v.ventas || 0,
        posicion: v.posicion,
        visibilidad: v.visibilidad,
        created_at: v.created_at,
        updated_at: v.updated_at
      }
    });

    const productoEstructurado = {
      id: grupo.id,
      id_marca: grupo.id_marca,
      id_categoria: grupo.id_categoria,
      visibilidad: grupo.visibilidad,
      created_at: grupo.created_at,
      updated_at: grupo.updated_at,
      variantes: variantesMapeadas
    };

    // Cachea solo si el grupo es visible
    if (productoEstructurado.visibilidad) {
      productoEstructurado.variantes = productoEstructurado.variantes.filter(v => v.visibilidad === true);
      await ClienteRedis.json.set(`ecomerce:productos:${productoEstructurado.id}`, '$', productoEstructurado);
    }

    return true;
  } catch (error) {
    console.error(error);
    throw Error(`Error en crearCacheProductoMemoria : [[[ ${JSON.stringify(error)} ]]]`);
  }
}

export const crearCacheElemento = async (resQuery: any[]) => {
  try {
    const respuesta = await ClienteRedis.json.set(`ecomerce:${resQuery[0].elemento}:${resQuery[0].id}`, '$', resQuery[0])

    return true

  } catch (error) {
    throw Error(`Error en crearCacheElemento : [[[ ${JSON.stringify(error)} ]]]`)
  }
}


export const eliminarCacheProducto = async (pgConexion: PoolClient, idGrupo: string) => {
  try {
    await ClienteRedis.del(`ecomerce:productos:${idGrupo}`)
    return true
  } catch (error) {
    throw Error(`Error en eliminarCacheProducto : [[[ ${JSON.stringify(error)} ]]]`)
  }
}

export const eliminarCacheElementoPorId = async (tipoElemento: string, idElemento: string) => {
  try {
    await ClienteRedis.del(`ecomerce:${tipoElemento}:${idElemento}`)
    return true
  } catch (error) {
    throw Error(`Error en eliminarCacheElementoPorId : [[[ ${JSON.stringify(error)} ]]]`)
  }
}

export const crearCacheLandingPage = async () => {
  try {
    const resultado = await poolPg.query(
      `SELECT * FROM public.landing_page 
       WHERE visibilidad = true 
       ORDER BY posicion ASC`
    );

    const secciones = resultado.rows || [];
    await ClienteRedis.json.set(`ecomerce:landing_page:full`, '$', secciones);

    return true;
  } catch (error) {
    console.error("Error en crearCacheLandingPage:", error);
    throw Error(`Error en crearCacheLandingPage : [[[ ${JSON.stringify(error)} ]]]`);
  }
};