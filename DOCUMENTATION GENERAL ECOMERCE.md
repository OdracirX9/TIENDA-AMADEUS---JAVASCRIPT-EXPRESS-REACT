# 🌐 Arquitectura y Documentación Macro del E-commerce

Este documento es la **Guía Maestra y Unificada** de toda la red de microservicios, bases de datos y frontends que componen el ecosistema de comercio electrónico. Su propósito es otorgar al desarrollador, DevOps o Arquitecto una vista cenital del sistema para comprender cómo escala, cómo están divididas las responsabilidades y cómo fluye la información transaccional desde el Frontend hasta la Base de Datos Relacional.

---

## 1. Topología del Sistema (Patrón de Microservicios)

El ecosistema ha sido desacoplado utilizando el patrón de Microservicios distribuidos, los cuales giran en torno a un **API Gateway** central. Esto permite escalar independientemente las partes más estresadas del sistema (como el catálogo público) sin afectar componentes críticos como los pagos.

### 1.1 Frontends (Capa de Presentación)
**Despliegue Técnico:** Alojados nativamente en el ecosistema Edge de **Vercel** asegurando alta disponibilidad (CDN) y despliegues continuos.
Tecnología base: **Preact, Vite, TailwindCSS, React-Router-Dom, Axios**.
*   🖥️ **FRONTEND-PUBLICO-ECOMERCE**: La cara del cliente. Renderiza el catálogo, maneja el estado global con Signals (Preact) y aloja el embudo de ventas (Checkout) interconectándose con Wompi.
    *   **Repositorio GitHub:** `ECOMERCE-FRONTEND-PUBLICO-FINAL`
*   🎛️ **DASHBOARD-ADMIN-ECOMERCE**: Panel interno y protegido. Consumido exclusivamente por Staff para crear categorías, subir imágenes (MinIO), ajustar precios y cambiar estados logísticos de los pedidos (Guías de Servientrega/Coordinadora).
    *   **Repositorio GitHub:** `ECOMERCE-FRONTEND-DASHBOARD-FINAL`
    *   **Credenciales por Defecto:**
        *   Usuario: `admin@example.com`
        *   Contraseña: `[REDACTED_PASSWORD]`
    *   *Nota Crítica:* Para modificar, crear o revocar usuarios y contraseñas de esta pasarela administrativa, se debe alterar directamente el JSON rígido (o la semilla en base de datos) ubicado dentro del microservicio fuente **SERVIDOR-ADMINISTRAR-PRODUCTOS**.

### 1.2 API Gateway (Capa de Seguridad Perimetral)
**Despliegue Técnico:** Contenedor alojado en la Infraestructura Cloud de **Railway**.
Tecnología base: **Node.js, Express, http-proxy-middleware, JWT**.
*   🛡️ **SERVIDOR-API-GATEWAY**: Único puerto abierto al mundo (Ej. 4001).
    *   **Repositorio GitHub:** `SERVIDOR-API-GATEWAY`
    *   Filtra ataques DDoS mediante Rate-Limiting.
    *   Protege mediante un Firewall CORS perimetral.
    *   Inyecta el secreto `TOKEN_AUTORIZACION_ECOMCERCE` (JWT efímero a través del header `imagine-dragons`). Ningún microservicio interno atiende a nadie que no viaje a través de esta pasarela.

### 1.3 Microservicios Backend (Capa de Lógica de Negocio)
**Despliegue Técnico:** Todas y cada una de las instancias Backend independientes levantan Node.js bajo los clústeres elásticos y aislados provistos por la plataforma nube **Railway**.
Tecnología base: **Node.js, Express, Postgres (pg), Redis**, Zod y Bcrypt.
*   🚀 **SERVIDOR-API-LANDING-PAGE (El Catálogo)**: Optimizado para velocidad extrema. Utiliza **Redis** para mantener el catálogo JSON en memoria y responder rápido. (**Repositorio:** `SERVIDOR-API-LANDING-PAGE`)
*   👥 **SERVIDOR-USUARIOS (IAM)**: Encripta contraseñas (`bcrypt`), maneja sesión (`express-session` con `connect-redis`). (**Repositorio:** `SERVIDOR-USUARIOS`)
*   📦 **SERVIDOR-ADMINISTRAR-PRODUCTOS**: API Restful pesada consumida por administradores. Ejecuta transacciones SQL y carga avatares a S3 MinIO. (**Repositorio:** `SERVIDOR-ADMINISTRAR-PRODUCTOS`)
*   💳 **SERVIDOR-METODOS-PAGOS**: El corazón financiero. Recibe webhooks asíncronos de Wompi y altera BD transaccionales. (**Repositorio:** `SERVIDOR-METODOS-PAGOS`)
*   📬 **SERVIDOR-CORREOS**: Un microservicio `Stateless`. Utiliza `Handlebars` y Brevo API v3. (**Repositorio:** `SERVIDOR-CORREOS-ECOMERCE`)

### 1.4 Componentes de Almacenamiento e Infraestructura
**Despliegue Técnico:** Todos los PaaS (Platform as a Service) de Bases de Datos viven aprovisionados e interconectados bajo la Red Privada VPC de **Railway**. Para los Buckets S3 se emplea **MinIO** instalado y aprovisionado igualmente desde la infraestructura nativa ferroviaria.
*   🐘 **PostgreSQL** (Railway DB): La única fuente de la verdad para persistir dinero, órdenes, productos, clientes y estados transaccionales.
*   🟥 **Redis** (Railway Key-Value): Orquestador en memoria. Almacena las Sesiones Web e indexa catálogos.
*   🪣 **MinIO** (Railway Object Storage): Repositorio agnóstico de archivos binarios para S3 (imágenes y categorías).

---

## 2. Diagrama Arquitectónico a Escala

```text
                               ┌─────────────────┐
 ┌─────────────┐               │ COMPRADORES WEB │
 │ ADMIN WEB   │               └────────┬────────┘
 └──────┬──────┘                        │ 
        │            (Tráfico HTTPS / API Gateway URL)
        └────────────────────┐          │
                             ▼          ▼
                       ┌─────────────────────────┐
                       │   SERVIDOR-API-GATEWAY  │
                       │ [CORS, RateLimit, JWT]  │
                       └─────────────┬───────────┘
                                     │
   (Red Privada u Oculta / Redirección Transparente con Token Header)
    ┌────────────────┬───────────────┴──────────────┬────────────────┐
    ▼                ▼                              ▼                ▼
 ┌──────┐       ┌────────┐                      ┌────────┐      ┌─────────┐
 │ API  │       │ API    │                      │ API    │      │ API     │
 │ PROD │       │ USERS  │                      │ PAGOS  │      │ LANDING │
 └──┬───┘       └───┬────┘                      └──┬─────┘      └───┬─────┘
    │               │                              │                │    (Memoria JSON)
    │               ├─────>(Cookies)────────>┌─────┴──┐<────────────┤
    │               │                        │ REDIS  │          ┌──▼──────┐
    │               │                        └────────┘          │ CORREOS │(Axios) ---> BREVO API
    │               │                              │             └─────────┘
    │      ┌────────▼──────────────────────────────▼──────┐
    └─────>│              POSTGRESQL DB                   │
      S3   │ (Triggers, Relaciones, Pagos, Historiales)   │
  (MinIO)  └──────────────────────────────────────────────┘
```

---

## 3. Análisis del Esquema Base de Datos (`Esquema-Base-Datos-Final.sql`)

El sistema relacional en Postgres hace uso intensivo del estándar ANSI-SQL, utilizando `UUIDV4` como Primary Keys para evitar vectores de ataque de escaneo y apoyándose fundamentalmente en Procedimientos Almacenados (Triggers y Funciones) nativos.

### 3.1 Entidades Primarias

*   **Identidad**: `usuario` *(con bandera "habilitacion" para Double Opt-in y Hashes Bcrypt)* y `administradores` *(con "nivel_acceso")*. Sus locaciones físicas descansan aisladas en la tabla `direcciones_envio`, unidas por foreign keys.
*   **Taxonomía Catálogo**: Existe una jerarquía estricta:
    *   Una matriz base: `categorias_producto` y `marcas_producto`.
    *   Relacional intermedio: `grupos_producto` (El esqueleto base).
    *   Elemento Transaccional Vivo: **`variantes_producto`**. (Aquí es donde ocurre el stock, almacena características profundas en campos `JSONB` e inicializa los arrays de imágenes `text[]`).
*   **Finanzas Temporales**: Todo cambio financiero queda documentado imborrablemente gracias a `historial_precios` y reflejado activamente en `actual_precio_producto`.

### 3.2 Lógica en el Carrito y Prevención de Errores
Postgres maneja nativamente el Carrito de compras (`carrito` e `items_carrito`) usando `ON DELETE CASCADE`. 

**Trigger Crítico de Resonancia (`trg_limpiar_carrito_por_variante`):**
Si el Administrador oculta del Frontend una `variante_producto` (visibilidad = false) o el `stock` decae a 0:
*   El trigger detecta el `AFTER UPDATE` sobre la variante.
*   Ejecuta la función nativa `limpiar_items_sin_disponibilidad()`.
*   Esta función busca en la base de datos nacional, eliminando silenciosamente el artículo de TODOS LOS CARRITOS de TODOS LOS CLIENTES que aún lo tenían "agregado pero no pagado". Evitando fallos fatales logísticos de "Sobrevendidos".

### 3.3 El Proceso de la Orden (`orden_grupo` y Pagos Wompi)
Cuando el usuario acciona "Pagar", el ecosistema crea flujos blindados:
1.  **Boceto Físico**: Registra `orden_grupo` con la dirección y tarifa logística quemadas en duro (para no verse afectadas si los precios de las trasportadoras cambian semanas en el futuro).
2.  **Snapshot Monetario**: Graba las iteraciones de `orden_producto`, congelando en piedra el monto transaccional (`sub_total`).
3.  **Vigilancia de Wompi**: Inserta en la relación huérfana temporal `transaccion` el Request en estado `PENDING`.
4.  **Autolimpieza Cronometrada (`trg_limpiar_transacciones_expiradas`)**: Las pasarelas de pago no son estables, el cliente en Panamá quizás cerró la tarjeta y nunca completó la pasarela. Para evitar acumulación de chatarra, este Trigger asíncrono revisa si la transacción lleva "*Más de 1 hora PENDING*". Si es afirmativo, el servidor Postgres re-cataloga el status a `DECLINED` por sí mismo sin que el servidor de Node deba correr CronJobs crudos de memoria.

### 3.4 Actualización Asíncrona (Aprobación)
Al momento en el que API Gateway y SERVIDOR-METODOS-PAGOS reciben el Webhook exitoso de Wompi:
*   Se abren Transacciones Atómicas (`BEGIN`).
*   Cambia `transaccion` a `APPROVED`.
*   Toma la cantidad comprada, ubica `variantes_producto` por ID y ejecuta `UPDATE... SET stock = stock - N, ventas = ventas + 1`. Todo esto ocurre en milisegundos y con bloqueos de escritura a nivel de fila y cierra con un `COMMIT`.

---

## 4. Replicabilidad del Entorno (.env master)
Para una réplica exitosa local u homologación de Producción, recordar las directivas ambientales para cada microservicio:
1.  **Todos los Cuerpos de Express**: Requieren el secreto pre-compilado en Gateway (`TOKEN_AUTORIZACION_ECOMCERCE`).
2.  **Landing / Usuarios**: Dependen de la URL URI (`REDIS_URL`).
3.  **Gateway Central**: Exige la URL hosteada absoluta de todos los microservicios aguas abajo (`SERVIDOR_PROXY_01` a `04`) y declarar un único conjunto de Dominios Válidos (`DOMINIOS_PERMITIDOS`).
4.  **MinIO S3**: Credenciales Access e Identity para Frontend (`VITE_MINIO_BROWSER_URL`) y Backend.
5.  **Postgres URL**: Única fuente global estricta con SSL Disabled o Enabled dependiendo del ORM (Railway).

---

## 5. Notas de Traspaso y Seguridad (Handover)

### 5.1 Revisiones de Seguridad Pendientes
Si bien el ecosistema cuenta con protocolos de seguridad estructurales (arquitectura de proxies inversos, JWT, `express-rate-limit` y sanitización estricta por Zod), **aún se requieren revisiones y auditorías de seguridad a profundidad** antes de la apertura pública masiva para blindar completamente las transacciones y prevenir vectores de ataque sofisticados.

### 5.2 Personalización del Frontend (Landing Page)
El E-commerce base está funcional a un nivel casi del 100% en lógica de negocio; sin embargo, **la Landing Page requiere personalización visual y estructural** para adaptarse de manera precisa a la imagen corporativa final que necesita el cliente.
*   **Aviso para el nuevo desarrollador:** Ténlo en cuenta; el programador original responsable de la estructuración arquitectónica del e-commerce ya no participará activamente ni cuenta con la información y criterios necesarios para continuar construyéndolo o personalizando la UI. Esta tarea creativa y funcional ahora le corresponde y se delega exclusivamente al nuevo talento técnico interno de **Clínica Nieves**.

### 5.3 Credenciales y Transacciones (Wompi)
*   **¿Qué es Wompi?**
    [Wompi](https://wompi.com/) es una robusta pasarela de pagos colombiana transaccional (soportada y perteneciente al **Grupo Bancolombia**), diseñada para facilitar al ecosistema del e-commerce procesar pagos seguros vía Checkout con tarjetas de crédito, débito, PSE, Nequi y transferencias.
*   **Estado Actual:** Actualmente, el nodo financiero central (`SERVIDOR-METODOS-PAGOS`) **no cuenta con todas las llaves y secretos de Wompi reales (Prv_Keys, Pub_Keys, Event Secrets)** en producción requeridos para que las transferencias del e-commerce funcionen correctamente.
*   **Plan de Acción:** El nuevo programador debe contactar y consultar estrictamente al **Departamento de Contabilidad** de la Clínica Nieves para que otorguen las contraseñas oficiales de reactivación.
    *   **Registro Oficial:** La cuenta responsable está registrada bajo el correo: **`contabilidad@[REDACTED_DOMAIN]`**
    *   Se debe solicitar cordialmente el usuario y la contraseña de este ingreso a la plataforma de administración de Wompi para extraer los Hash/Keys recientes, copiarlos bajo la seguridad del `.env` y garantizar el correcto acoplamiento de la pasarela local.

### 5.4 Testeo de Integridad Pre-Lanzamiento
A pesar de que el E-commerce se encuentra desarrollado, completado e interconectado exitosamente en sus respectivos entornos Cloud (**Railway** para el Backend y Base de Datos, **Vercel** para los Frontends), es imperativo que el nuevo desarrollador a cargo realice un **testeo de integridad total ("End-to-End Testing")** de todos y cada uno de los microservicios.
*   **Motivo:** Se debe asegurar que las pasarelas, el envío de correos, la respuesta del caché en Redis y la lectura de MinIO no sufran obstrucciones por variables de entorno faltantes o desactualizadas en los servidores de producción antes de ejecutar el "Go-Live" (Apertura al público general).
