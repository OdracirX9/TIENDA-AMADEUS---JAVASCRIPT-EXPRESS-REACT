export const validarProxysIniciales = async () => {
    const proxies = [
        { nombre: 'Administrar Productos', url: process.env.SERVIDOR_PROXY_01 },
        { nombre: 'Métodos de Pagos', url: process.env.SERVIDOR_PROXY_02 },
        { nombre: 'API Landing Page', url: process.env.SERVIDOR_PROXY_03 },
        { nombre: 'Usuarios', url: process.env.SERVIDOR_PROXY_04 },
    ];

    console.log("\n--- ESTADO DE MICROSERVICIOS (PROXYS) ---");

    const resultados = await Promise.allSettled(
        proxies.map(async (proxy) => {
            if (!proxy.url) {
                return { nombre: proxy.nombre, estado: 'NO CONFIGURADO', url: 'N/A' };
            }

            try {
                // Timeout de 5 segundos para no bloquear si no responde
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);

                // Intenta una petición a la raíz, el microservicio podría devolver 404 pero significa que el servidor está levantado.
                const response = await fetch(proxy.url, { signal: controller.signal as RequestInit["signal"] });
                clearTimeout(timeoutId);

                return { nombre: proxy.nombre, estado: '✅ ONLINE', url: proxy.url };
            } catch (error: any) {
                if (error.name === 'AbortError') {
                    return { nombre: proxy.nombre, estado: '❌ TIMEOUT', url: proxy.url };
                }
                return { nombre: proxy.nombre, estado: '❌ OFFLINE', url: proxy.url };
            }
        })
    );

    const tablaFormateada = resultados.map((result: any) => ({
        Microservicio: result.value?.nombre,
        Estado: result.value?.estado,
        URL: result.value?.url
    }));

    console.table(tablaFormateada);
    console.log("-----------------------------------------\n");
};
