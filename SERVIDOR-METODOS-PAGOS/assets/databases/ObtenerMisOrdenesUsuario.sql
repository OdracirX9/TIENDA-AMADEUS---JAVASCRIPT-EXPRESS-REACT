SELECT 
    og.id,
    og.created_at,
    og.estado_envio,
    og.precio_envio,
    t.estado as estado_pago,
    t.compra_total,
    t.metodo_pago,
    (
        SELECT COUNT(*)
        FROM orden_producto op
        WHERE op.id_orden = og.id
    ) as total_productos
FROM orden_grupo og
LEFT JOIN transaccion t ON og.id = t.id_orden
WHERE og.id_usuario = $1
ORDER BY og.created_at DESC;
