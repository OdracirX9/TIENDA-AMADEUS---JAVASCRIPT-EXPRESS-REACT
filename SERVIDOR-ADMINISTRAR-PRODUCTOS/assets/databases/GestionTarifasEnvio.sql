-- [POST] Guardar o Actualizar una Tarifa de Envío
INSERT INTO public.tarifas_envio (departamento, ciudad, precio, tiempo_estimado)
VALUES ($1, $2, $3, $4)
ON CONFLICT (departamento, ciudad)
DO UPDATE SET
    precio = EXCLUDED.precio,
    tiempo_estimado = EXCLUDED.tiempo_estimado;

-- [GET] Resumir todas las Tarifas de Envío registradas
-- SELECT id, departamento, ciudad, precio, tiempo_estimado, created_at FROM public.tarifas_envio ORDER BY departamento ASC, ciudad ASC;

-- [DELETE] Eliminar una regla específica por ID
-- DELETE FROM public.tarifas_envio WHERE id = $1;
