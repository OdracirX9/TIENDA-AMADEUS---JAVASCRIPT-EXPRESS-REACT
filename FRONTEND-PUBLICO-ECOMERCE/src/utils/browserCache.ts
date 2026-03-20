/**
 * Caché del navegador usando localStorage con tiempo de expiración (TTL).
 *
 * La data persiste entre recargas de página y sólo se invalida por tiempo,
 * NO en cada recarga.
 *
 * Formato almacenado: { data: T, expira: number (timestamp ms) }
 */

const TTL_DEFAULT_MS = 5 * 60 * 1000; // 5 minutos

interface CacheEntry<T> {
    data: T;
    expira: number;
}

/**
 * Obtiene un valor del caché.
 * Retorna `null` si no existe o si ya expiró.
 */
export function getCache<T>(key: string): T | null {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;

        const entry: CacheEntry<T> = JSON.parse(raw);
        const ahora = Date.now();

        if (ahora > entry.expira) {
            localStorage.removeItem(key);
            return null;
        }

        return entry.data;
    } catch {
        return null;
    }
}

/**
 * Guarda un valor en el caché con un TTL en milisegundos.
 * Por defecto expira en 5 minutos.
 */
export function setCache<T>(key: string, data: T, ttlMs = TTL_DEFAULT_MS): void {
    try {
        const entry: CacheEntry<T> = {
            data,
            expira: Date.now() + ttlMs,
        };
        localStorage.setItem(key, JSON.stringify(entry));
    } catch (e) {
        console.warn('[BrowserCache] No se pudo guardar en localStorage:', e);
    }
}

/**
 * Elimina manualmente una entrada del caché.
 */
export function clearCache(key: string): void {
    localStorage.removeItem(key);
}

/**
 * Elimina todas las entradas del caché que usen el prefijo 'ecomerce:'.
 */
export function clearAllEcomerceCache(): void {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith('ecomerce:'));
    keys.forEach((k) => localStorage.removeItem(k));
}
