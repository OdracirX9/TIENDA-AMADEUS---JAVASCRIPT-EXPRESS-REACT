/**
 * Utilidad de formateo de precios — FRONTEND-PUBLICO-ECOMERCE
 *
 * Los precios se almacenan en la base de datos en CENTAVOS (COP × 100).
 * Esta función los convierte a pesos colombianos y los formatea con el
 * separador de miles correspondiente.
 *
 * @example
 * formatearPrecio(42990000)  →  "$429.900"
 * formatearPrecio(10000)     →  "$100"
 * formatearPrecio(0)         →  "$0"
 */
export function formatearPrecio(centavos: number | null | undefined): string {
    if (centavos == null || isNaN(centavos)) return '$0';
    const pesos = Math.round(centavos / 100);
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(pesos);
}

/**
 * Convierte centavos a pesos colombianos (sin formatear).
 * Útil para cálculos intermedios.
 */
export function centavosAPesos(centavos: number | null | undefined): number {
    if (centavos == null || isNaN(centavos)) return 0;
    return Math.round(centavos / 100);
}

/**
 * Calcula el porcentaje de descuento entre el precio original y el precio con descuento.
 * Ambos valores deben estar en centavos.
 *
 * @returns número entero entre 1 y 99, o null si no hay descuento válido.
 */
export function calcularDescuento(
    precioOriginal: number | null | undefined,
    precioDescuento: number | null | undefined
): number | null {
    if (!precioOriginal || !precioDescuento) return null;
    if (precioDescuento >= precioOriginal) return null;
    return Math.round((1 - precioDescuento / precioOriginal) * 100);
}
