-- Obtiene el carrito completo del usuario con info de cada variante y su precio actual
SELECT
    ic.id              AS id_item,
    ic.id_variante,
    ic.cantidad,
    ic.created_at      AS fecha_agregado,
    ic.updated_at      AS fecha_actualizacion,

    -- Datos de la variante
    vp.nombre          AS nombre_variante,
    vp.imagenes,
    vp.stock,
    vp.visibilidad,

    -- Precio actual
    app.precio         AS precio_actual,

    -- Precio con descuento (si existe en historial se puede extender)
    NULL               AS precio_descuento

FROM public.carrito c
JOIN public.items_carrito   ic  ON ic.id_carrito  = c.id
JOIN public.variantes_producto vp ON vp.id         = ic.id_variante
LEFT JOIN public.actual_precio_producto app ON app.id_variante = ic.id_variante

WHERE c.id_usuario = $1
ORDER BY ic.created_at ASC;
