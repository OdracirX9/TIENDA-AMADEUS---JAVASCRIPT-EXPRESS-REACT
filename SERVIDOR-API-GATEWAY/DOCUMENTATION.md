# Documentación Técnica y de Arquitectura: SERVIDOR-API-GATEWAY

Este documento proporciona una visión integral, estructurada y profunda del proyecto **SERVIDOR-API-GATEWAY**. Este microservicio en Node.js actúa como la puerta de enlace única, proxy reverso y firewall de seguridad para todas las peticiones que ingresan desde el ecosistema público y administrativo hacia los microservicios internos.

---

## 1. Configuración del Entorno y Secretos (`.env`)

El API Gateway es el orquestador principal. Necesita conocer la ubicación exacta (IP o DNS local/remoto) de todos los microservicios aguas abajo para poder enrutar el tráfico correctamente, además de manejar secretos de autorización inter-servidor.

### Tabla de Variables de Entorno

| Variable | Tipo de Dato | Obligatorio | Propósito y Descripción |
|----------|--------------|-------------|-------------------------|
| `PORT` | Number | No | Puerto donde el API Gateway escuchará peticiones (Por defecto 4001). |
| `SERVIDOR_PROXY_01` | String (URL) | Sí | Ruta hacia el **SERVIDOR-ADMINISTRAR-PRODUCTOS**. |
| `SERVIDOR_PROXY_02` | String (URL) | Sí | Ruta hacia el **SERVIDOR-METODOS-PAGOS**. |
| `SERVIDOR_PROXY_03` | String (URL) | Sí | Ruta hacia el **SERVIDOR-API-LANDING-PAGE**. |
| `SERVIDOR_PROXY_04` | String (URL) | Sí | Ruta hacia el **SERVIDOR-USUARIOS**. |
| `ISLOCAL` | Boolean (0/1) | Sí | Bandera que deshabilita los limitadores de tasa (Rate Limiting) para facilitar el desarrollo en máquina local. |
| `DOMINIOS_PERMITIDOS` | String | Sí | Lista separada por comas de dominios Frontend autorizados vía CORS. |
| `TOKEN_AUTORIZACION_ECOMCERCE` | String | Sí | Secreto crítico usado para firmar un JWT efímero. El Gateway lo inyecta en la cabecera `imagine-dragons` hacia los microservicios para demostrar que la petición pasó por el Gateway y evitar conexiones directas a los servidores ocultos. |

### Ejemplo de Archivo `.env.example`

```env
PORT=4001
SERVIDOR_PROXY_01=http://localhost:4003
SERVIDOR_PROXY_02=https://pagos-production.example.com
SERVIDOR_PROXY_03=http://localhost:4004
SERVIDOR_PROXY_04=http://localhost:4002

ISLOCAL=1
DOMINIOS_PERMITIDOS=http://localhost:5173,https://your-domain.com

# Secreto para JWT inter-microservicios
TOKEN_AUTORIZACION_ECOMCERCE=[REDACTED_TOKEN]
```

---

## 2. Mapa de Arquitectura y Conexiones

### 2.1 Análisis de Archivos y Responsabilidades (SRP)

*   **`src/index.ts`**:
    *   **Propósito**: Punto de entrada principal (App de Express). Entrelaza middlewares base, aplica configuraciones globales (como inyectar variables) e inicializa el demonio `listen`.
    *   **Conexiones**: Pasa el tráfico global hacia el enrutador central `IndexRoute`. Además, llama a las utilidades iniciales (`validarProxysIniciales`).
*   **`src/routes/index.route.ts`**:
    *   **Propósito**: Mapa principal de redireccionamiento (Reverse Proxy Table).
    *   **Conexiones**: Atrapa prefijos (Ej: `/ecomerce-regenievex-usuarios`) y decide hacia qué `SERVIDOR_PROXY_XX` enviarlo utilizando la función fabricadora `crearProxyConexion()`.
*   **`src/utils/configuracionProxy.ts`**:
    *   **Propósito**: Instancia y configura la poderosa librería `http-proxy-middleware`.
    *   **Conexiones**: Este archivo es el núcleo. Sobrescribe la ruta, ajusta el dominio de las cookies para mantener sesiones unificadas hacia el cliente y escucha el evento `proxyReq` para inyectar cabeceras de seguridad o reparar el Body JSON.
*   **`src/utils/generadorToken.ts`**:
    *   **Propósito**: Firma un JWT ultrarrápido (expira en milisegundos) basado en `TOKEN_AUTORIZACION_ECOMCERCE` para identificar el Gateway frente a los microservicios de la red interna.
*   **`src/middlewares/limitadorTasa.ts`**:
    *   **Propósito**: Políticas restrictivas y mitigación de ataques de Denegación de Servicio (DDoS). Utiliza `express-rate-limit` con `trust proxy` para contabilizar conexiones por IP.
*   **`src/middlewares/corsNode.ts`**:
    *   **Propósito**: Firewall pre-vuelo (Preflight request firewall). Determina qué dominios web (Frontend) y qué métodos HTTP pueden dialogar con la plataforma cruzando `DOMINIOS_PERMITIDOS`.

### 2.2 Dependencias Principales (`package.json`)

*   **`express`**: El framework HTTP base, estándar y el cual todas las librerías middleware extienden.
*   **`http-proxy-middleware`**: Provee el motor V2 para forwardear (reenviar) streams HTTP completos, headers y form-datas de manera intacta hacia un target. Esencial para la arquitectura Gateway.
*   **`express-rate-limit`**: Sistema defensivo que cuenta los hits de las IPs y bloquea abuzos automatizados (brute-forcing y DoS).
*   **`jsonwebtoken`**: Generador veloz de firmas HMAC-SHA256 para validación inter-servicios blindada.
*   **`cors`**: Middleware oficial para administrar políticas de "Cross-Origin Resource Sharing".

### 2.3 Diagrama Lógico: Internet -> Gateway -> Microservicios

El Gateway centraliza la validación, seguridad, y divide el tráfico ocultando la verdadera topología del Backend.

```text
 ┌─────────────────────────────────────────┐
 │ Internet (Frontends y Clientes Públicos)│
 └───────────────────┬─────────────────────┘
                     │ (Red HTTP Pública)
                     ▼
 ┌──────────────────────────────────────────────┐
 │ SERVIDOR-API-GATEWAY (Puerto 4001)           │
 │ ├─ 1. CORS Preflight Check                   │
 │ ├─ 2. Rate Limiting (Anti-DDoS 300req/10m)   │
 │ ├─ 3. Creación de JWT Interno                │
 │ └─ 4. Reescritura de URL y Path              │
 └───────────────────┬──────────────────────────┘
                     │ (Red Interna Privada o HTTPS seguro)
       ┌─────────────┼──────────────┬───────────────┐
       ▼             ▼              ▼               ▼
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────┐
│ SERVIDOR   │ │ SERVIDOR   │ │ SERVIDOR   │ │ SERVIDOR     │
│ USUARIOS   │ │ PRODUCTOS  │ │ PAGOS      │ │ LANDING PAGE │
│ (PROXY_04) │ │ (PROXY_01) │ │ (PROXY_02) │ │ (PROXY_03)   │
└────────────┘ └────────────┘ └────────────┘ └──────────────┘
```

---

## 3. Flujo de Datos y Lógica de Negocio

### 3.1 Eventos Críticos

#### A. Flujo de Reenvío Transparente y Reparación de Cuerpo (Proxy Forwarding)
Debido a que Express procesa el JSON entrante usando `app.use(express.json())` a nivel global (`index.ts`), el stream crudo se altera antes de llegar al proxy.
1. Una petición web llega con métodos `POST/PATCH/PUT` que contienen un cuerpo JSON (ej. Un registro de usuario).
2. `http-proxy-middleware` captura la respuesta en *`configuracionProxy.ts`*.
3. En el evento `proxyReq`, el sistema inspecciona el `Content-Type`.
4. Si NO consiste en carga de imágenes (`multipart/form-data`), el middleware invoca la función `fixRequestBody(proxyReq, req)` para restituir y empujar el JSON correctamente hacia el microservicio final.

#### B. Flujo de Confianza de Cookies (Cookie Domain Rewrite)
Cuando un servicio como `SERVIDOR-USUARIOS` o `SERVIDOR-PRODUCTOS` responde con un `Set-Cookie` para una sesión (HTTPOnly):
1. El microservicio emitidor adjunta su propio origen o en ruta.
2. Al regresar a través de `configuracionProxy.ts`, la instrucción `cookieDomainRewrite: { "*": "" }` instruye a la pasarela a blanquear el dominio.
3. Esto fuerza al navegador web del cliente a aceptar la Cookie bajo el dominio global del API Gateway, compartiéndola correctamente entre todos los frontends subsecuentes y previniendo el abandono de la sesión.

### 3.2 Endpoints de API Estructurales (Mapas de Ruta)

Dado que este proyecto es un Proxy y no un servidor de lógica de negocio o de base de datos directa, sus "Endpoints" son en realidad prefijos "Wildcard" atrapa-todo (catch-all) registrados en `routes/index.route.ts`:

*   **`GET /test`**:
    *   **Respuesta**: `"SERVIDOR-API-GATEWAY"`. Endpoint de pureza y Health Check (Status 200). Usado por orquestadores de despliegue para saber si el contenedor arrancó.
*   **`USE /ecomerce-regenievex-administrar-productos/*`** -> Reenruta hacia `SERVIDOR_PROXY_01`.
*   **`USE /ecomerce-regenievex-metodos-pagos/*`** -> Reenruta hacia `SERVIDOR_PROXY_02`.
*   **`USE /ecomerce-regenievex/*`** -> Reenruta hacia `SERVIDOR_PROXY_03`.
*   **`USE /ecomerce-regenievex-usuarios/*`** -> Reenruta hacia `SERVIDOR_PROXY_04`.

Cualquier sub-ruta será respetada gracias a la propiedad de re-escritura `pathRewrite: { '^/prefijo': '' }`, entregando peticiones limpias a los servidores finales como si fueran invocados directamente desde la raíz`/`.
