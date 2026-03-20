WITH variantes_filtrados AS (
  SELECT 
    v.id_grupo,
    json_agg(
      json_build_object(
        'id', v.id, 
        'nombre', v.nombre, 
        'descripcion', v.descripcion,
        'caracteristicas', v.caracteristicas, 
        'imagenes', v.imagenes, 
        'precio', app.precio,
        'stock', v.stock,
        'ventas', v.ventas,
        'posicion', v.posicion, 
        'visibilidad', v.visibilidad,
        'created_at', v.created_at,
        'updated_at', v.updated_at
      )
      ORDER BY v.posicion ASC
    ) AS variantes
  FROM variantes_producto v 
  LEFT JOIN actual_precio_producto app 
    ON v.id = app.id_variante 
  GROUP BY v.id_grupo
)
SELECT 
  gp.id,
  gp.id_marca,
  gp.id_categoria,
  gp.visibilidad,
  gp.created_at,
  gp.updated_at,
  mp.nombre  AS nombre_marca,
  cp.nombre  AS nombre_categoria,
  mp.imagen  AS imagen_marca,
  cp.imagen  AS imagen_categoria,
  COALESCE(vf.variantes, '[]'::json) AS variantes
FROM grupos_producto gp
LEFT JOIN marcas_producto mp     ON gp.id_marca     = mp.id
LEFT JOIN categorias_producto cp ON gp.id_categoria = cp.id
LEFT JOIN variantes_filtrados vf 
  ON gp.id = vf.id_grupo
WHERE gp.id = $1 OR gp.id = (SELECT id_grupo FROM public.variantes_producto WHERE id = $1 LIMIT 1);
