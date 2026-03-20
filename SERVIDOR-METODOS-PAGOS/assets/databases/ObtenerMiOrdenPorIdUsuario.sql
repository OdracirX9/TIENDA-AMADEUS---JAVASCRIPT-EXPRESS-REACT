SELECT 
    og.id,
    og.nombre_usuario,
    og.correo,
    og.celular,
    og.direccion_envio,
    og.ciudad,
    og.departamento,
    og.estado_envio,
    og.precio_envio,
    og.numero_guia,
    og.created_at,
    t.estado as estado_pago,
    t.compra_total,
    t.metodo_pago,
    t.id_wompi,
    (
        SELECT json_agg(
            json_build_object(
                'id_producto', op.id_producto,
                'nombre', op.nombre,
                'marca', op.marca,
                'categoria', op.categoria,
                'imagen', op.imagen,
                'cantidad', op.cantidad,
                'precio', op.precio,
                'descuento', op.descuento,
                'sub_total', op.sub_total
            )
        )
        FROM orden_producto op
        WHERE op.id_orden = og.id
    ) as productos
FROM orden_grupo og
LEFT JOIN transaccion t ON og.id = t.id_orden
WHERE og.id = $1 AND og.id_usuario = $2;
