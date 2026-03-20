# Documentación Técnica y de Arquitectura: SERVIDOR-METODOS-PAGOS

Este documento detalla la arquitectura, las integraciones y los flujos críticos del microservicio **SERVIDOR-METODOS-PAGOS**. Este servicio es el corazón financiero de la aplicación, encargado de recibir, orquestar y validar los pagos del E-commerce mediante la integración con la pasarela **Wompi**. 

> **⚠️ IMPORTANTE**: Este servidor requiere ser ejecutado en un entorno de Producción o accesible públicamente en internet (ej. Railway o Ngrok), dado que depende estrictamente de recibir eventos HTTP asíncronos (Webhooks) creados por los servidores de Wompi.

---

## 1. Configuración del Entorno y Secretos (`.env`)

El servicio requiere múltiples variables de entorno para establecer comunicación con Postgres, Redis (sesiones transaccionales temporales), el servicio de correos y la pasarela Wompi.

### Tabla de Variables de Entorno

| Variable | Tipo de Dato | Obligatorio | Propósito y Descripción |
|----------|--------------|-------------|-------------------------|
| `PORT` | Number | No | Puerto de escucha (Por defecto 4005). |
| `HOST_POSTGRESQL`, `DB_POSTGRESQL`, `PORT_POSTGRESQL`, `USER_POSTGRESQL`, `PASS_POSTGRESQL`, `SSL_POSTGRESQL` | Strings/Numbers | Sí | Credenciales para conectarse a la única fuente de verdad (Base de Datos PostgreSQL) e insertar las transacciones. |
| `ISLOCAL` | Boolean (0/1) | Sí | Desactiva políticas estrictas de cookies (Secure) y limitadores de velocidad para depuración. |
| `REDIS_URL` | String (URI) | Sí | Cadena de conexión hacia Redis. Utilizado como almacén de sesiones (`express-session`). |
| `TOKEN_AUTORIZACION_ECOMCERCE` | String | Sí | Llave JWT para validar que las peticiones frontend previas cruzaron seguras por el API Gateway. |
| `LLAVE_PRIVADA_WOMPI`, `LLAVE_INTEGRIDAD_WOMPI`, `LLAVE_EVENTO_WOMPI` | Strings | Sí | Credenciales criptográficas dadas por el Dashboard de Wompi. Permiten generar firmas transaccionales y validar matemáticamente que los webhooks no son intentos de fraude. |
| `REDIRECCION_PAGO_FRONTEND` | String (URL) | Sí | URL hacia donde Wompi enviará al usuario después del pago. |
| `LINK_POST_WOMPI`, `LINK_PAGO_WOMPI` | Strings (URL) | Sí | Enlaces base de API de Wompi (Difieren si es Sandbox o Producción). |
| `SECRETO_SESION` | String | Sí | Sal secreta de encriptación para las cookies transaccionales en Redis. |
| `LINK_SERVIDOR_CORREOS` | String (URL) | Sí | URL del microservicio interno de correos (`SERVIDOR-CORREOS`) para disparar facturas electrónicas. |

### Ejemplo de Archivo `.env.example`

```env
PORT=4005
ISLOCAL=0

# Configuración Base de Datos
HOST_POSTGRESQL=localhost
DB_POSTGRESQL=ecommercedb
PORT_POSTGRESQL=5432
SSL_POSTGRESQL=0
USER_POSTGRESQL=[REDACTED_USER]
PASS_POSTGRESQL=[REDACTED_PASSWORD]
REDIS_URL=redis://localhost:6379

# JWT Gateway
TOKEN_AUTORIZACION_ECOMCERCE=[REDACTED_TOKEN]

# WOMPI (Sandbox/Prod)
LLAVE_PRIVADA_WOMPI=[REDACTED_PRIVATE_KEY]
LLAVE_INTEGRIDAD_WOMPI=[REDACTED_INTEGRITY_KEY]
LLAVE_EVENTO_WOMPI=[REDACTED_EVENT_KEY]
REDIRECCION_PAGO_FRONTEND=https://your-domain.com/checkout/resultado
LINK_POST_WOMPI=https://sandbox.wompi.co/v1/payment_links
LINK_PAGO_WOMPI=https://checkout.wompi.co/l/

SECRETO_SESION=[REDACTED_SECRET]
LINK_SERVIDOR_CORREOS=http://localhost:4006
```

---

## 2. Mapa de Arquitectura y Conexiones

### 2.1 Análisis de Archivos y Responsabilidades (SRP)

El proyecto mantiene una estructura estricta enfocada en la seguridad del flujo de dinero:

*   **`src/index.ts`**:
    *   **Propósito**: Levantar Express, configurar CORS universal (requerido por Wompi), aplicar inyección de Sesiones Redis y validar dependencias en `checkConexion()`.
*   **`src/redisCache.ts`**:
    *   **Propósito**: Controla la conexión a Redis. No usa RediSearch (como el Landing API), sino que alimenta directamente a `RedisStore` de `express-session` para rastrear temporalmente procesos frágiles.
*   **`src/database.ts`**:
    *   **Propósito**: Proveer el Pool de Postgres.
*   **`src/controllers/POSTGenerarPago.controller.ts`**:
    *   **Propósito**: Recibe el Carrito validado. Construye una cadena concatenando valores y la encripta con `LLAVE_INTEGRIDAD_WOMPI` generándo el hash SHA-256 requerido por Wompi. Inserta la orden en PostgreSQL como `Pendiente` y retorna el link público del `widget` de pago.
*   **`src/controllers/POSTwebHookWompi.controller.ts`**:
    *   **Propósito**: Archivo CRÍTICO. Un webhook asíncrono expuesto a la nube. Wompi hace POST aquí indicando si el humano pagó o no. Valida la firma `LLAVE_EVENTO_WOMPI` y ejecuta transacciones SQL atómicas (`BEGIN/COMMIT/ROLLBACK`).
*   **`src/middleware/validacionZod.ts` / `src/utils/esquemasZod.ts`**:
    *   **Propósito**: Defiende estructuralmente los Endpoints. Todo JSON entrante debe cincordar estrictamente con las validaciones Zod, previniendo inyecciones de datos corruptos al Pool monetario.

### 2.2 Dependencias Principales (`package.json`)

*   **`express`** y **`express-session`**: El motor base y su gestor de estado para clientes web y carritos transaccionales temporales.
*   **`connect-redis`** e **`redis`**: Sistema de almacenamiento para las sesiones que permite que el microservicio pueda escalarse horizontalmente sin perder el login temporal transaccional de los usuarios.
*   **`axios`**: Para que este microservicio orqueste comunicaciones proactivamente (Ej. Contactar a `SERVIDOR-CORREOS` o a las APIs de Wompi).
*   **`pg`**: Driver conductor de la Base de datos relacional.
*   **`zod`**: Validador de esquemas TypeScript First, blindando la recolección de variables del Body contra inyecciones SQL o Typescript exploits.

### 2.3 Diagrama Lógico: Cliente -> Servidor -> Wompi -> Webhook

```text
 ┌─────────────┐        1. POST /generar-pago          ┌────────────────────┐
 │  FrontEnd   │ ────────────────────────────────────> │  SERVIDOR PAGOS    │
 │ (Checkout)  │ <──────────────────────────────────── │  (Crea Firma Wompi)│
 └──────┬──────┘        2. Devuelve Link Checkout      └─────────┬──────────┘
        │                                                        │
        │ 3. Paga Tarjeta                                        │ 4. Persiste Orden
        ▼                                                        ▼    "Pendiente"
 ┌─────────────┐                                       ┌────────────────────┐
 │ Widget      │                                       │   Base de Datos    │
 │ Pagos WOMPI │                                       │   (PostgreSQL)     │
 └──────┬──────┘                                       └─────────▲──────────┘
        │                                                        │
        │             5. POST Asíncrono WebHook                  │
        └────────────────────────────────────────────────────────┘
          (Golpea POSTWebHookWompi confirmando "APPROVED"/"DECLINED")
                            │
                            │ 6. Actualiza Estado de BD y Envía factura
                            ▼
                   ┌─────────────────┐
                   │ SERVIDOR CORREOS│
                   └─────────────────┘
```

---

## 3. Flujo de Datos y Lógica de Negocio

### 3.1 Eventos Críticos

#### A. Flujo Webhook y Garantía de Consistencia (Transacciones SQL)
La recepción de pagos es frágil frente a caídas de internet. El flujo implementa Transacciones de Base de datos (ACID):
1.  Servidor de Wompi golpea a `POST /remitente-webhook-wompi` con un Payload JSON.
2.  El controlador captura la conexión y bloquea la sesión en PG (`await pgActive.query("BEGIN")`).
3.  Llama a `verificarEventoPOST()` enviando la Data. Internamente, se concatena `id_transaccion + monto + estado + timestamp` aplicándole un hash con `LLAVE_EVENTO_WOMPI`. Si el hash no coincide con la firma del Body, arroja un error abortando `ROLLBACK`, destruyendo un ataque de falsificación y robo.
4.  Si es legítimo, inserta la trazabilidad en base de datos.
5.  Si el `status` es `APPROVED`, invoca `actualizarProductoPg` que descuenta masivamente los cupos de stock (`stock = stock - N`).
6.  Salva permanentemente la información en Disco `await pgActive.query("COMMIT")`.
7.  **(Orquestación)** Inmediatamente le hace un POST asíncrono y en segundo plano a `SERVIDOR-CORREOS` con el template de la factura detallada al correo del cliente. No se espera al envío de correos, el servidor responde a Wompi en milisegundos (`Res 200`) para que la pasarela no reintente.

### 3.2 Endpoints Externos Consumidos

*   **`GET /usuario/transaccion-wompi/:id`**:
    *   **Propósito**: Punto de consulta para el Frontend o el API Gateway. Busca bajo demanda los detalles de la orden en PG si el cliente recarga la página esperando la confirmación de la pasarela. `comprobarSesion` lo blinda de mirones.
*   **`POST /generar-pago`** (Ruta encapsulada en `pagos.route.ts`):
    *   **Propósito**: Inicializador. Toma los ítems, calcula el hash SHA-256 obligatorio de seguridad firmado con el Checksum y crea un Draft en la relación Transaccional antes de redirigir al usuario al embudo de Wompi.
*   **`POST /remitente-webhook-wompi`**:
    *   **Propósito**: El Core lógico. No es consumido por clientes humanos sino por los Robots de Wompi. Acepta y procesa transferencias electrónicas, tarjetas declinadas o expiradas, actualizando el estado de compra y orquestando rebajas en el inventario o gatillando facturas vía `SERVIDOR-CORREOS`.
