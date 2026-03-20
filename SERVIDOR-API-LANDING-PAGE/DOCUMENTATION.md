# Documentación Técnica y de Arquitectura: SERVIDOR-API-LANDING-PAGE

Este documento estipula la arquitectura, configuración y flujos de datos del microservicio **SERVIDOR-API-LANDING-PAGE**. Este servidor Node.js/Express está especializado en atender exclusivamente las peticiones de muy alta concurrencia originadas desde el Frontend Público (Catálogo de cliente), utilizando estrategias de caché en memoria (Redis) y acceso de lectura a la base de datos de Productos.

---

## 1. Configuración del Entorno y Secretos (`.env`)

El servicio requiere variables para exponer su puerto, interconectarse con PostgreSQL (para validar el carrito original), con MinIO (para gestionar adjuntos), y especialmente con Redis (para acelerar la entrega de catálogos mediante índices `RediSearch`).

### Tabla de Variables de Entorno

| Variable | Tipo de Dato | Obligatorio | Propósito y Descripción |
|----------|--------------|-------------|-------------------------|
| `PORT` | Number | No | Puerto de escucha del servidor (Por defecto 4004). |
| `HOST_POSTGRESQL`, `DB_POSTGRESQL`, `PORT_POSTGRESQL`, `USER_POSTGRESQL`, `PASS_POSTGRESQL` | Strings/Numbers | Sí | Credenciales de conexión directa al clúster de base de datos PostgreSQL. Utilizadas mediante el ORM/Driver `pg` (pool). |
| `SSL_POSTGRESQL` | Number (0/1) | Sí | Define si la conexión a Postgres requiere protocolo SSL estricto (1) o no (0). |
| `ISLOCAL` | Boolean (0/1) | Sí | Bandera de desarrollo. Al ser `1`, los límites de peticiones (Rate Limit) se relajan a 2000req/15min en lugar de los 80req estandarizados para Producción. |
| `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_USE_SSL`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY` | Strings/Booleans | Sí | Credenciales de autenticación S3. Se proveen al SDK `minio` nativo para eventuales operaciones de lectura/escritura profunda sobre las imágenes. |
| `REDIS_URL` | String (URI) | Sí | Cadena de conexión completa (`redis://user:pass@host:port`) requerida para inyectar la caché. Fundamental para estabilizar el microservicio y habilitar `ft.create`. |
| `TOKEN_AUTORIZACION_ECOMCERCE` | String | Sí | Secreto JWT interceptado mediante middleware. Garantiza que solo el **API-GATEWAY** pueda consumir estas rutas, denegando el acceso a peticiones directas desde internet hacia el puerto 4004. |

### Ejemplo de Archivo `.env.example`

```env
PORT=4004
ISLOCAL=1

# Configuración Base de Datos
HOST_POSTGRESQL=localhost
DB_POSTGRESQL=ecommercedb
PORT_POSTGRESQL=5432
SSL_POSTGRESQL=0
USER_POSTGRESQL=[REDACTED_USER]
PASS_POSTGRESQL=[REDACTED_PASSWORD]

# Configuración Object Storage (Compatible con S3 MinIO)
MINIO_ENDPOINT=minio.example.com
MINIO_PORT=443
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=[REDACTED_KEY]
MINIO_SECRET_KEY=[REDACTED_SECRET]

# Motor de Caché
REDIS_URL=redis://localhost:6379

# JWT Gateway Auth
TOKEN_AUTORIZACION_ECOMCERCE=[REDACTED_TOKEN]
```

---

## 2. Mapa de Arquitectura y Conexiones

### 2.1 Análisis de Archivos y Responsabilidades (SRP)

El proyecto sigue el patrón MVC (Model-View-Controller) simplificado a Enrutadores → Controladores → Servicios.

*   **`src/index.ts`**:
    *   **Propósito**: Levantar Express, configurar políticas CORS masivas (origen `*` pre-vuelo), aplicar `express-rate-limit` y ejecutar `checkConexion()`.
    *   **Conexiones**: Llama recurrentemente a `poolPg.connect()` y a `ClienteRedis.connect()` informando si ambas dependencias críticas están en línea antes de atender.
*   **`src/database.ts`**:
    *   **Propósito**: Configurar el `Pool` (Conjunto de conexiones reutilizables) del motor `pg` de NodeJS contra PostgreSQL.
*   **`src/redisCache.ts`**:
    *   **Propósito**: Controlador independiente de Redis V4.
    *   **Poder Crítico**: Exporta `crearIndicesRedis()`, una función que usa el módulo **RediSearch (FT)** para crear esquemáticas JSON incrustadas en memoria de productos, categorías y marcas (`idx:ecomerce:productos`). Si el cliente pide buscar "Zapatos rojos", Redis lo encuentra en 1ms en lugar de estresar POSTGRES con cláusulas `ILIKE`.
*   **`src/routes/index.route.ts`**:
    *   **Propósito**: Agrupador principal de Endpoints.
    *   **Seguridad**: Inyecta en la línea 5 el middleware `verificarOrigenGateway`. Si el Header `imagine-dragons` no cincuerda con el `.env`, expulsa un 401.
*   **`src/middlewares/verificarOrigenGateway.ts` / `comprobarTokenNode.ts`**:
    *   **Propósito**: Interceptores (Guardians) de seguridad que decodifican la validez criptográfica impuesta por el API Gateway.
*   **`src/controllers/`**:
    *   **Propósito**: Contienen la lógica final y asíncrona de extracción y validación de entidades (Ej. `GETProductos`, `POSTComprobarProductos`).

### 2.2 Dependencias Principales (`package.json`)

*   **`express`**: Estructura de red base.
*   **`pg`**: Driver de bajo nivel para inyectar consultas crudas en SQL a PostgreSQL.
*   **`redis`**: Driver robusto `@redis/client` V4 para guardar representaciones JSON pesadas y liberar CPU.
*   **`express-rate-limit`**: Previene ataques de escaneo DDoS por IP. En este servidor es doblemente estricto (`80 peticiones / 15m`).
*   **`minio`**: SDK oficial en JS para acceder directa o programáticamente al Bucket, revisar estatus o generar links preservados.
*   **`jsonwebtoken`**: Utilizado pasivamente por el middleware para descifrar firmas HMAC simétricas.
*   **`cors`**: Indispensable. Asegura la apertura del servidor a peticiones pre-flight en caso de que el Gateway modifique pasivamente el Host Origin Web.

### 2.3 Diagrama Lógico: Gateway -> Landing API -> Storage Híbrido

Este servidor es altamente dependiente de Redis para soportar picos gigantes de tráfico (por ejemplo, Black Friday):

```text
 ┌───────────────────────────────────────────────┐
 │ API GATEWAY                                   │
 │ (Inyecta "imagine-dragons" + Rate Limit)      │
 └───────────────────────┬───────────────────────┘
                         │ (Proxy Reverse hacia el Landing Page)
                         ▼
 ┌───────────────────────────────────────────────────────────────┐
 │ SERVIDOR-API-LANDING-PAGE (Puerto 4004)                       │
 │ ├─ 1. Valida "imagine-dragons" usando TOKEN_AUTORIZACION      │
 │ ├─ 2. Verifica Conexión en "checkConexion()"                  │
 │ └─ 3. Invocan a Endpoints GET o POST                          │
 └──────┬────────────────────────────────────────────────┬───────┘
        │ (Queries SQL Crudas)                           │ (Llamadas Memoria)
        ▼                                                ▼
 ┌───────────────┐                             ┌───────────────────┐
 │ BASE DE DATOS │  <───── Sincronización ──── │ MEMORIA RUNTIME   │
 │ PostgreSQL    │     Ocasional/Validación    │ REDIS (RediSearch)│
 └───────────────┘                             └───────────────────┘
```

---

## 3. Flujo de Datos y Lógica de Negocio

### 3.1 Eventos Críticos

#### A. Flujo de Obtención del Catálogo Rápido
1.  Un visitante entra a la portada (`/`). Todo el catálogo debe cargar en centésimas de segundo.
2.  La petición atraviesa el Gateway y golpea a `GETProductos`.
3.  El controlador consulta prioritariamente **Redis**. Al estar cacheada toda la representación JSON (y gracias a RediSearch `idx:ecomerce:productos` si existieran filtros), los devuelve instantáneamente sin usar operaciones JOIN del ORM de Postgres.
4.  La CPU se ahorra ciclos y la red se relaja inmensamente frente a mil peticiones por minuto.

#### B. Flujo Estricto de "Comprobación de Carrito" antes de Pagar
Es una vulnerabilidad terrible que el cliente elija 2 camisas, tarde en pagar, el stock baje a 0, y él avance con el Checkout pagando un artículo inexistente.
1.  **Activación**: Cuando el usuario en el Frontend da click al botón "Ir al Checkout", el cliente dispara el endpoint `/comprobar-productos-para-compra` hacia este microservicio.
2.  **Validación Continua**: `POSTComprobarProductos.controller.ts` toma el arreglo con `{id_variante, cantidad}`.
3.  **Lógica Crítica (`src/controllers/POST/POSTComprobarProductos.controller.ts`)**: No confía jamás en el caché para transacciones monetarias. Conecta directamente con PostgreSQL (`poolPg.connect()`).
4.  Ejecuta una consulta explícita y leída del archivo `ObtenerPrecioVariantePorId.sql` contra cada ítem.
5.  Comprueba rigurosamente:
    *   Si `grupo_visible` o `variante_visible` están encendidos en base de datos.
    *   Si `stock < cantidad_requerida`.
6.  Si ambas cláusulas son válidas, re-calcula el `SubTotal` utilizando **el Precio de la base de datos (y nunca el precio enviado por el HTML del frontend, el cual puede ser alterado en la Consola del Navegador)**, devolviendo la luz verde al cliente para levantar la pasarela de Wompi.

### 3.2 Endpoints Externos Consumidos

Todos estos endpoints son proxyeados con el prefijo `/ecomerce-regenievex` establecido en el Gateway.

#### Lectura Inmediata y Catálogo (GET)
*   **`GET /conseguir-productos`**:
    *   Lee de la memoria Caché Redis o atiende fallbacks directos la lista de artículos, filtrando internamente de ser exigido por el cliente.
*   **`GET /conseguir-elementos`**:
    *   Delega la extracción agrupada abstracta de `Categorías` y `Marcas` construidas en el array de memoria.
*   **`GET /conseguir-producto/:id`**:
    *   Ruta específica SEO/Link directo. Carga un único grupo fusionando todas sus variables, descripciones ricas HTML y arrays de imágenes S3.

#### Verificación Transaccional o Logística (POST)
*   **`POST /comprobar-productos-para-compra`**:
    *   **Body**: `[{ id_variante: string, cantidad: number }]`
    *   **Función**: Validador Maestro frente a Hacking/Vaciado de stock. Devuelve `{ valido: true, total: N, items: [...] }`.
*   **`POST /comprobar-tarifa-envio`**:
    *   Delega hacia la base de datos relacional para ubicar la regla geográfica impuesta mediante el dashboard de los Administradores (Departamento/Ciudad), garantizando que el coste logístico refleje el valor central real antes del CheckOut.
