# Documentación Técnica y de Arquitectura: SERVIDOR-ADMINISTRAR-PRODUCTOS

Este documento detalla la estructura, dependencias y lógica de negocio del **SERVIDOR-ADMINISTRAR-PRODUCTOS**, el microservicio REST más grande y robusto del Backend. Su responsabilidad única (SRP) es gestionar el Backoffice (Panel de Administración) del E-commerce. Maneja el ciclo de vida (CRUD) del catálogo de productos, las estadísticas de ventas, el cambio de estado de envío de las órdenes, y la persistencia de los activos multimedia estáticos mediante un Object Storage (MinIO).

---

## 1. Configuración del Entorno y Secretos (`.env`)

Este microservicio requiere acceso irrestricto tanto a la Base de Datos principal como al Bucket S3 para subir imágenes, además de contar con permisos para forzar el vaciado y recarga del caché en el servidor público (Landing Page).

### Tabla de Variables de Entorno

| Variable | Tipo | Obligatorio | Propósito y Descripción |
|----------|------|-------------|-------------------------|
| `PORT` | Number | No | Puerto de escucha (Por defecto 4003). |
| `HOST_POSTGRESQL`, `DB_POSTGRESQL`, `USER_POSTGRESQL`, `PASS_POSTGRESQL`, `PORT_POSTGRESQL`, `SSL_POSTGRESQL` | String/Num | Sí | Conexión cruda al clúster de Base de Datos PostgreSQL donde reposan las tablas generadas por este servicio (`variantes_producto`, `grupos_producto`, etc). |
| `ISLOCAL` | Boolean | Sí | Define las políticas de CORS y Cookies de sesión. Si `0` (Producción), endurece la cookie exigiendo `Secure` y `SameSite: none`. |
| `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_USE_SSL`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY` | Strings | Sí | Credenciales de S3 para autenticar el cliente de MinIO Node.JS y permitirle realizar el `putObject` de las imágenes entrantes. |
| `REDIS_URL` | String | Sí | Conexión al nodo de Redis que sostendrá silenciosamente el `Store` en memoria de las sesiones activas del panel de administración. |
| `TOKEN_AUTORIZACION_ECOMCERCE` | String | Sí | Identificador secreto utilizado doblemente: 1. Como sal secreta para el `express-session`, 2. Validar que la petición venga estrictamente desde el API Gateway. |
| `CLAVE_DESENCRIPTACION_JWT` | String | Sí | Requerida por la rutina de seguridad (`comprobarTokenAutorizado`) para decodificar del header inyectado el Hash AES/JWT de identidad. |
| `LINK_SERVIDOR_CORREOS` | URL | Sí | Enlace a interno hacia el SERVIDOR-CORREOS (utilizado principalmente para expandir alertas logísticas y cambios de estado del paquete). |

### Ejemplo de Archivo `.env.example`

```env
PORT=4003
ISLOCAL=0

# Base de Datos Transaccional (Escritura/Lectura intensiva)
HOST_POSTGRESQL=cluster-pg.example.com
DB_POSTGRESQL=ecommerce_db
PORT_POSTGRESQL=5432
SSL_POSTGRESQL=0
USER_POSTGRESQL=[REDACTED_USER]
PASS_POSTGRESQL=[REDACTED_PASSWORD]

# MinIO Object Storage
MINIO_ENDPOINT=minio.example.com
MINIO_PORT=443
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=[REDACTED_KEY]
MINIO_SECRET_KEY=[REDACTED_SECRET]
MINIO_BROWSER_URL=https://minio.example.com/bucket-tienda

# Redis
REDIS_URL=redis://127.0.0.1:6379

# Tokens de Seguridad Intra-cluster
TOKEN_AUTORIZACION_ECOMCERCE=[REDACTED_TOKEN]
CLAVE_DESENCRIPTACION_JWT=[REDACTED_SECRET]

# Contacto de Servicios
LINK_SERVIDOR_CORREOS=http://10.x.x.x:4050
```

---

## 2. Mapa de Arquitectura y Conexiones

### 2.1 Análisis de Archivos y Responsabilidades (SRP)

*   **`src/index.ts`**:
    *   **Propósito**: Punto de entrada asíncrono. Inicia el cliente `connect-redis` inyectándole el prefijo estricto `admin_ecomerce:` (para no colisionar con clientes regulares). Monta el guardián de Gateway y prueba la vida de la BD y S3 antes de aceptar peticiones (`checkConexionServicios`).
*   **`src/minIo.ts`**:
    *   **Propósito**: Instancia el cliente `Minio.Client`, pasándole implícitamente las Keys IAM del `.env` para obtener derechos de lectura/escritura totales sobre los Buckets.
*   **`src/routes/index.route.ts`**:
    *   **Propósito**: Diccionario masivo de endpoints. Cuenta con ruteros separados lógico-conceptualmente: a) Autenticación, b) CRUD Variables de Productos (POST/PATCH/DELETE), c) Control Logístico y de Envío (`PATCH /estado-envio/:id`), y d) Borrado o refresco forzado de Caché.
*   **`src/utils/configuracionMulter.ts`**:
    *   **Propósito**: Altera el flujo HTTP normal para permitir cargas `multipart/form-data`. Usa Memoria en búfer para interceptar la foto entrante sin guardarla en disco del servidor, sirviéndole el String binario directo al controlador.
*   **`src/middlewares/comprobarSesionAdmin.ts`**:
    *   **Propósito**: Requisito *Sine qua non* bloqueante. Comprueba si el Cliente cuenta con la Cookie viva autorizada `admin_ecomerce_regenievex`. Caso contrario, envía 401 Unauthorized de inmediato.

### 2.2 Dependencias Principales

*   **`pg` (node-postgres)**: Cliente C++ / TS para conectarse al motor de PostgreSQL. Todas las queries de transacciones complejas (`INSERT INTO ... RETURNING id`) confían en el Pool persistente creado aquí.
*   **`minio`**: Driver oficial del Object Storage que expulsa los buffers binarios y entrega enlaces absolutos.
*   **`multer`**: Middleware para manejo de Stream y *Form-Data* en subida de los archivos de avatares/productos.
*   **`zod`**: El validador estricto. Revisa cada `req.body` (Ej. exigiendo que `caracteristicas` del producto conste de objetos JSON y que el array `imagenes` contenga extensiones .png/.jpg). Si el Administrador envía mal el precio, `Zod` corta el POST antes del controlador.
*   **`bcrypt`**: Invocado por precaución aquí también si algún administrador en el Backoffice decide cambiar su clave o agregar otro SuperAdmin (`POSTLoginAdmin.controller.ts`).
*   **`express-session` & `connect-redis`**: Mantiene en total anonimato (del lado del cliente Front) a qué registros se tiene derecho. Solamente almacena un Token ciego en su navegador de confianza.

### 2.3 Diagrama Lógico: Subida de Producto, Form-Data y MinIO

```text
 ┌─────────────┐       Petición POST /guardar-imagenes        ┌─────────────────────┐
 │ FRONTEND    ├──────────── (multipart/form-data) ──────────>│ API PRODUCTOS (App) │
 │ (Dashboard) │                                              └──────────┬──────────┘
 └───────┬─────┘                                                         │ Array Binario Memoria
         │                                       ┌───────────────────────▼───────┐
         │                                       │ (1) MULTER Buffer             │
         │           Petición JSON POST          │ (2) minioClient.putObject()   │
         │           /crear-nuevo-producto       └───────┬───────────────────────┘
         ├───────────────────────────────────────────────┼─────────────┐ (Upload a Bucket)
         │  { titulo, precio, stock,                     │             ▼
         │   [ "1772...jpg", "1772...png" ] }            │       ┌───────────┐
         │                                               │       │ S3 MINIO  │
         │                                               │       └───────────┘
         ▼                                               │
┌─────────────────────────────────┐                      │
│ MIDDLEWARE (Zod Validation)     │<─────────────────────┘
└────────┬────────────────────────┘
         │ (Payload Validado, el string de la foto existe)
         ▼
┌──────────────────────────────────────────────┐
│ CONTROLADOR (SQL a PostgreSQL)               │ ---> INSERTA a grupo_producto
│ BEGIN; INSERT INTO variantes_producto ...    │ ---> ACTUALIZA stock, marcas.
└──────────────────────────────────────────────┘
```

---

## 3. Flujo de Datos y Lógica de Negocio

### 3.1 Eventos Críticos

#### A. Flujo de Subida de Archivos Bifásico
El proceso Frontend -> Backend de Crear un producto comprende 2 solicitudes separadas:
1.  **Fase 1 (Carga Física)**: El administrador arrastra 3 fotos. El Frontend hace `POST /guardar-imagenes`. El endpoint intercepta el Blob a través de `Multer`, genera nombres únicos `Timestamp-Random.jpg`, los manda al S3 de `MinIO` directamente desde el Búfer (sin tocar el SSD), y le responde al Frontend un Array Textual con los nombres `["123x.jpg", "321y.png"]`.
2.  **Fase 2 (Acoplamiento de Datos)**: El Frontend aglutina el Formulario rellenado a mano (Texto, Talla, Precio) y le inyecta el Array provisto. Ahora viaja al `POST /crear-nuevo-producto`. postgres recibe los strings e inserta limpiamente, manteniendo la Base de datos sin peso binario.

#### B. Mecanismos Multi-Caché Global (`POSTActualizarCacheGlobal.controller.ts`)
Con el objetivo de refrescar el Frontend Público, el staff del Dashboard posee un botón que dispara rutas RPC. Este controlador asume un alto nivel de autoridad y hace un llamado a `ClienteRedis.flushAll()`.
*   Esto reinicia de tajo toda la copia catalogada subida en RAM que leen los clientes públicos y obliga al `SERVIDOR-API-LANDING-PAGE` a reconstruir el catálogo entero en Redis leyendo PostgreSQL desde 0.

#### C. Mutación Segura de Precios (Historial inmutable)
Modificar un producto (`PATCH /modificar-producto`) **nunca sobrescribe** un precio antiguo. Emplea la tabla de rastreo:
1.  Un INSERT va a `historial_precios` con el precio de ($15 USD) + el `$id_variante`. Obteniendo un `ID_Historia`.
2.  Posteriormente un simple `UPDATE` refresca la tabla puntero `actual_precio_producto`.
3.  Razonamiento: Garantiza que facturas compradas, reembolsos futuros e ingresos del dashboard del mes pasado consulten el precio en `historial_precios` del mes pasado, no de hoy.

### 3.2 Endpoints de API Seleccionados

*   **`POST /crear-nuevo-producto`**
    *   **Requires**: `comprobarSesionAdmin`.
    *   **Body Crítico (ZOD)**: `{ id_marca, id_categoria, variables: [ { nombre, descripcion, stock, precio, caracteristicas: {}, imagenes: [] } ] }`
*   **`PATCH /cambiar-estado-producto/:id`**
    *   **Propósito**: Actúa como interruptor Toggle de "visibilidad". Un producto Invisible no aparece en la Búsqueda pública, pero sigue en la Base de Datos. Dispara automáticamente un Trigger en BD para eliminar esa variante de carritos ajenos.
*   **`DELETE /borrar-producto/:id`**
    *   **Propósito**: Destrucción en Cascada (`ON DELETE CASCADE`). Aniquila Grupo Productivo, sus Variaciones, el historial y su presencia.
*   **`PATCH /admin/estado-envio/:id`**
    *   **Body**: `{ estado: "Enviado", trackId: "Servientrega-xyz123" }`
    *   **Propósito**: Cambia el estado de una orden. Invoca de manera interconectada al `SERVIDOR-CORREOS` pasándole el TrackID para alertar asíncronamente al comprador sobre su despacho.
*   **`GET /admin/obtener-estadisticas`**
    *   **Propósito**: Efectúa una Query SQL gigante usando Agrupamientos (`GROUP BY EXTRACT(MONTH...)`) para devolver series temporales y métricas de ganancia, volumen de ventas y usuarios activos dibujadas en las gráficas de ChartJs en Preact.
