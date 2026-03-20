SELECT 
    og.id,
    og.nombre_usuario,
    og.correo,
    og.celular,
    og.ciudad,
    og.departamento,
    og.estado_envio,
    og.numero_guia,
    og.precio_envio,
    og.created_at,
    t.estado,
    t.compra_total,
    t.metodo_pago,
    t.id_wompi
FROM orden_grupo og
LEFT JOIN transaccion t ON og.id = t.id_orden
ORDER BY og.created_at DESC
LIMIT $2 OFFSET $1;
