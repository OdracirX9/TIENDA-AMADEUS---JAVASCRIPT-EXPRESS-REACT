SELECT 
    (SELECT COALESCE(SUM(compra_total),0) FROM transaccion WHERE UPPER(estado) = 'APPROVED') as total_ventas,
    (SELECT COUNT(*) FROM orden_grupo og LEFT JOIN transaccion t ON og.id = t.id_orden WHERE UPPER(og.estado_envio) = 'PENDIENTE' AND UPPER(t.estado) = 'APPROVED') as ordenes_pendientes,
    (SELECT COUNT(*) FROM variantes_producto WHERE visibilidad = true) as productos_activos,
    (SELECT COUNT(*) FROM usuario) as nuevos_clientes;
