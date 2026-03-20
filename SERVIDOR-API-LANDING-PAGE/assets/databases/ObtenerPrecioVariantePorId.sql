SELECT 
    v.id as id_variante,
    v.nombre,
    v.stock,
    v.imagenes,
    v.visibilidad as variante_visible,
    gp.visibilidad as grupo_visible,
    app.precio
FROM variantes_producto v
JOIN grupos_producto gp ON v.id_grupo = gp.id
JOIN actual_precio_producto app ON v.id = app.id_variante
WHERE v.id = $1;
