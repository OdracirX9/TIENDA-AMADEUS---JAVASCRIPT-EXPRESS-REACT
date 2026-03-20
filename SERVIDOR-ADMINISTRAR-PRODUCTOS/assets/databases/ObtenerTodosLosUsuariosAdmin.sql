SELECT 
    u.id,
    u.nombre,
    u.correo,
    u.celular,
    u.created_at,
    (SELECT COUNT(*) FROM orden_grupo og WHERE og.id_usuario = u.id) as total_ordenes,
    (SELECT COALESCE(SUM(t.compra_total), 0) FROM transaccion t WHERE t.id_usuario = u.id AND UPPER(t.estado) = 'APPROVED') as total_gastado
FROM usuario u
ORDER BY u.created_at DESC
LIMIT $2 OFFSET $1;
