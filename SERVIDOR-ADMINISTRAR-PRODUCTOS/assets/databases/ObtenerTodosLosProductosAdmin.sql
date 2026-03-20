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
  JOIN actual_precio_producto app 
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
  COALESCE(vf.variantes, '[]'::json) AS variantes
FROM grupos_producto gp
LEFT JOIN variantes_filtrados vf 
  ON gp.id = vf.id_grupo
WHERE 
  ($3::text IS NULL OR EXISTS (
      SELECT 1 FROM json_array_elements(vf.variantes) AS v 
      WHERE (v->>'nombre') ILIKE $3 OR (v->>'id') = REPLACE($3, '%', '')
  ))
  AND ($4::uuid IS NULL OR gp.id_categoria = $4)
  AND ($5::uuid IS NULL OR gp.id_marca = $5)
ORDER BY gp.created_at DESC
LIMIT $2
OFFSET $1;
