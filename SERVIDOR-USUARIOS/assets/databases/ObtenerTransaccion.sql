WITH ordenes_filtradas AS (
    SELECT
        og.id,
        json_build_object(
            'usuario', og.nombre_usuario,
            'correo', og.correo,
            'celular', og.celular,
            'direccion', og.direccion_envio,
            'ciudad', og.ciudad,
            'departamento', og.departamento
        ) AS orden_compra
    FROM orden_grupo og
),
ordenes_productos AS (
    SELECT 
        op.id_orden,
        json_agg(
            json_build_object(
                'id', op.id, 
                'nombre', op.nombre, 
                'marca', op.marca,
                'categoria', op.categoria, 
                'imagen', op.imagen, 
                'cantidad', op.cantidad, 
                'precio', op.precio,
                'descuento', op.descuento,
                'sub_total', op.sub_total
            )
        ) AS productos_comprados
    FROM orden_producto op
    GROUP BY op.id_orden
)
SELECT 
    t.id, 
    t.nombre, 
    t.descripcion, 
    t.expiracion_link, 
    t.estado, 
    t.divisa, 
    t.metodo_pago, 
    t.compra_total,
    of_alias.orden_compra,
    op.productos_comprados,
    t.created_at, 
    t.updated_at 
FROM transaccion t 
JOIN usuario u 
    ON t.id_usuario = u.id
JOIN ordenes_filtradas of_alias 
    ON t.id_orden = of_alias.id
JOIN ordenes_productos op 
    ON op.id_orden = of_alias.id
WHERE t.id_usuario = $1  
ORDER BY t.created_at DESC;
