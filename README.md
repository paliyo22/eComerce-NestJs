# eCommerce-NestJS

- [English](#english)
- [Español](#español)

# Español

**Descripción general**

Backend de un marketplace multi-vendedor basado en **NestJS**, organizado como **monorepo de microservicios**. Cada dominio de negocio (cuentas, productos, carrito y órdenes) corre como una aplicación independiente, coordinadas por un **gateway** central, comunicadas de forma asíncrona vía **RabbitMQ**, con **Redis** para manejo de locks y caché.

- 5 Aplicaciones NestJS.
- 3 Librerias compartidas.
- RabbitMQ message broker.
- Redis cache + distributed locking.
- 4 Bases de datos MySQL independientes.
- Docker Swarm deployment.

Frontend de referencia (Angular): [publicECommerce-Angular](https://github.com/paliyo22/publicEComerce-Angular)

---

## Índice

- [Descripción](#descripción)
- [Arquitectura](#arquitectura)
- [Stack tecnológico](#stack-tecnológico)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Requisitos previos](#requisitos-previos)
- [Configuración](#configuración)
- [Cómo levantar el proyecto](#cómo-levantar-el-proyecto)
- [Servicios y puertos](#servicios-y-puertos)
- [Endpoints principales](#endpoints-principales)
- [Cómo se probó](#cómo-se-probó)
- [Decisiones de diseño](#decisiones-de-diseño)
- [Estado del proyecto / roadmap](#estado-del-proyecto)
- [Esquemas](#esquemas--schemas)
- [Autor](#autor)
- [Licencia](#licencia)

---

## Descripción

Originalmente pensé en crear un marketplace/e-commerce similar a los que se pueden armar con Shopify, pero que permitiera múltiples vendedores. No definí correctamente una idea final, y por eso, a medida que el proyecto evolucionó hacia un modelo más cercano al de Mercado Libre o Amazon, fui encontrando problemas de diseño que no había considerado por desconocimiento.

Por ejemplo, al crear el sistema de cobros integrando Mercado Pago Pro, tuve que reformular la base de datos: en un principio iba a obligar a los usuarios a vincular su cuenta con una de MP para poder generar links de cobro propios, pero eso implicaba que mi marketplace dependiera, en esencia, de otra plataforma — algo que no quería. La solución fue implementar un sistema interno de gestión de fondos. Todos los pagos ingresan a la cuenta de mi "empresa", lo que permite incorporar distintas pasarelas de pago sin depender de una implementación específica. Los vendedores solo asocian un CBU a su cuenta, y al pedir un retiro, la idea es automatizar la transferencia bancaria correspondiente (esto último no lo pude implementar por completo, ya que según entiendo requiere una asociación con una entidad bancaria).

## Arquitectura

Este proyecto es un **monorepo de microservicios** construido con NestJS. Cada servicio es independiente, tiene su propia base de datos MySQL y se comunica con los demás de forma asíncrona a través de RabbitMQ.

```
                        ┌─────────────┐
                        │   Cliente   │
                        │  (Angular)  │
                        └──────┬──────┘
                               │ HTTP/REST
                        ┌──────▼──────┐
                        │   Gateway   │  ← único punto de entrada público
                        └──────┬──────┘
                               │ RabbitMQ (RPC + eventos)
          ┌──────────┬─────────┼─────────┬──────────┐
          │          │         │         │          │
     ┌────▼───┐ ┌────▼───┐┌────▼───┐┌────▼───┐  ┌────▼────┐
     │account │ │product ││  cart  ││ order  │  │  Redis  │
     └────┬───┘ └────┬───┘└────┬───┘└────┬───┘  │ (cache, │
          │          │         │         │      │  locks, │
     ┌────▼───┐ ┌────▼───┐┌────▼───┐┌────▼───┐  │ pub/sub)│
     │ MySQL  │ │ MySQL  ││ MySQL  ││ MySQL  │  └─────────┘
     │account │ │product ││  cart  ││ order  │
     └────────┘ └────────┘└────────┘└────────┘
```

- **gateway**: punto de entrada único de la API. Maneja la autenticación y expone los endpoints al frontend/clientes. Health check en `/health`.
- **account**: gestión de usuarios/cuentas y autenticación (JWT).
- **product**: catálogo de productos.
- **cart**: carrito de compras.
- **order**: gestión de órdenes y pagos (integración con Mercado Pago).
- Cada servicio tiene su **propia base de datos MySQL** (patrón *database per service*), inicializada con scripts SQL propios (`initProduct.sql`, `initAccount.sql`, etc.).
- **Redis** se usa como caché compartida (`@nestjs/cache-manager` + `ioredis`).
- **RabbitMQ** se usa como bus de mensajería entre microservicios (`@nestjs/microservices`, `amqplib`, `amqp-connection-manager`).
- Librerías internas compartidas (`libs/`): `lib`, `rabbit-proxy` (proxy/cliente de RabbitMQ) y `redis` (cliente/caché de Redis).

**Patrones usados:**
- Database-per-service: cada microservicio tiene su propia base MySQL, sin acceso cruzado directo.
- API Gateway: el `gateway` es el único servicio expuesto públicamente; los demás solo son alcanzables por RabbitMQ.
- Comunicación híbrida: `send` (request/response, patrón RPC) para operaciones que necesitan respuesta inmediata, `emit` (eventos) para notificaciones fire-and-forget.
- Compensación tipo saga: cuando una operación multi-servicio falla a mitad de camino (ej: reservar stock y luego fallar el pago), se ejecutan acciones de reversión (ej: `restoreStock`).
- Locking distribuido con Redis (script Lua) para evitar condiciones de carrera al liberar locks entre servicios.
- Locking pesimista a nivel de base de datos (`pessimistic_write`) para evitar sobreventa de stock bajo concurrencia.
- Operaciones asíncronas con "token de resultado": ver [sección dedicada](#patrón-de-operaciones-asíncronas) más abajo.

## Stack tecnológico

| Categoría | Tecnología |
|---|---|
| Framework | NestJS 11 (monorepo) |
| Lenguaje | TypeScript |
| Base de datos | MySQL (TypeORM) — *verificar versión exacta en `compose.yml`* |
| Cache / locks / pub-sub | Redis (ioredis + @nestjs/cache-manager) |
| Mensajería | RabbitMQ (@nestjs/microservices, amqplib) |
| Autenticación | JWT (access + refresh) vía cookies httpOnly, Passport, bcrypt |
| Pagos | Mercado Pago SDK (Checkout Pro + webhooks) |
| Contenedores | Docker (multi-stage builds) + Docker Swarm (despliegue mediante compose.yml) |
| Validación | class-validator, class-transformer, Joi (validación de config) |
| Infraestructura | Docker / Docker Swarm (`compose.yml`, `deploy.placement.constraints`, red overlay) |

## Estructura del repositorio

```
apps/
  gateway/     → API pública. Auth, orquestación, checkout, exposición REST.
  account/     → Cuentas, perfiles (usuario/negocio/admin), direcciones, balances.
  product/     → Catálogo, stock, reviews.
  cart/        → Carrito de compras.
  order/       → Draft orders, checkout, órdenes finales, ventas.
libs/
  lib/         → DTOs, entidades TypeORM, enums, decoradores y helpers compartidos.
  rabbit-proxy/ → Módulo dinámico para registrar clientes RabbitMQ.
  redis/       → Cliente Redis global.
compose.yml    → Orquestación de todos los servicios + bases de datos.
```

## Requisitos previos

- Node.js 22.x (el proyecto se compila con `node:22.14-alpine` en los Dockerfiles)
- Docker y Docker Compose (con soporte de Swarm)
- Una cuenta de Mercado Pago (credenciales de prueba) si se quiere probar el flujo de pago completo

## Configuración

1. Cloná el repositorio.
2. Copiá `.env.example` a `.env` y completá los valores. El resto de las variables (conexión a las bases de datos, secrets de JWT, Redis y RabbitMQ) son obligatorias para levantar cualquier servicio; las siguientes son las únicas opcionales si querés probar sin usar el servicio de pagos:
   - `MP_SECRET_KEY` / `MP_ACCESS_TOKEN`: credenciales de Mercado Pago
   - `FRONT_URL` / `BACK_URL`: URLs para el flujo de pago/webhook

3. Para evitar errores de CORS, asegurate de completar correctamente:
   - `ACCEPTED_ORIGINS`: orígenes permitidos por CORS en el gateway

   O, si solo estás probando en local, podés desactivar la validación de CORS directamente en `apps/gateway/src/main.ts`.

4. **Usuario de base de datos:** si querés cambiar el username por defecto de las DB, tenés que ajustar los scripts de inicialización (ej. `GRANT ALL PRIVILEGES ON cart_db.* TO 'tu_usuario'@'%';`), ya que si no coincide con lo que espera cada servicio, las consultas fallarán.

## Cómo levantar el proyecto

**Con Docker (necesario, ver nota abajo):**

```bash
docker build --no-cache -f apps/gateway/gateway.dockerfile -t ecommerce-gateway:1.0 .
docker build --no-cache -f apps/product/product.dockerfile -t ecommerce-product:1.0 .
docker build --no-cache -f apps/account/account.dockerfile -t ecommerce-account:1.0 .
docker build --no-cache -f apps/cart/cart.dockerfile -t ecommerce-cart:1.0 .
docker build --no-cache -f apps/order/order.dockerfile -t ecommerce-order:1.0 .
```

Estos comandos construyen las imágenes Docker del gateway y de los cuatro microservicios. **Importante:** estos tags (`ecommerce-gateway:1.0`, etc.) tienen que coincidir exactamente con los `image:` definidos en `compose.yml`, o `docker stack deploy` no podrá encontrar las imágenes correspondientes.

```bash
docker swarm init
```

Esto inicializa el nodo de Docker Swarm (necesario una sola vez por máquina).

```bash
docker stack deploy -c compose.yml ecommerce
```

Esto levanta el gateway y los 4 microservicios, además de sus respectivas bases MySQL, RabbitMQ y Redis.

> **Nota:** a diferencia de `docker compose up`, `docker stack deploy` no siempre toma las variables de un archivo `.env` de la misma forma. Si al levantar el stack notás que las variables de entorno no están llegando a los contenedores, exportalas manualmente antes de desplegar (ej. `export $(grep -v '^#' .env | xargs)`).
>
> También tené en cuenta que, al construir las imágenes con `docker build` en la misma máquina, esto solo funciona sin configuración adicional en un swarm de un solo nodo. Si en algún momento se despliega en varios nodos físicos, hace falta subir las imágenes a un registry (Docker Hub, GHCR, etc.), porque Swarm no construye ni distribuye imágenes locales entre nodos por sí solo.

Debido a que la app usa RabbitMQ y Redis, es necesario usar Docker para poder hacer pruebas en local.

## Servicios y puertos

| Servicio | Puerto | Notas |
|---|---|---|
| Gateway | 3000 | Único servicio expuesto al exterior |
| RabbitMQ Management | 15672 | UI de administración de colas |
| Redis | 6379 | Cache, solo accesible dentro de la red interna |
| Product | 3001 | Solo accesible dentro de la red interna |
| Account | 3002 | Solo accesible dentro de la red interna |
| Cart | 3003 | Solo accesible dentro de la red interna |
| Order | 3004 | Solo accesible dentro de la red interna |
| MySQL | 3306 | Bases de datos, solo accesibles dentro de la red interna |

## Endpoints principales

> **Convención de la columna "Output":** cuando aparecen dos valores separados por `/` (ej. `Withdrawal/void`), el primero es la respuesta en el caso normal y el segundo corresponde a un caso alternativo (por ejemplo, cuando la operación queda pendiente de forma asíncrona, o cuando no hay datos que devolver).

### Auth (`/auth`)
| Endpoint | Input | Output | Rol requerido | Info |
|---|---|---|---|---|
| `POST /auth/login` | Body: `Login` | `Auth` | Público | Inicia sesión, genera los JWT y los devuelve como cookies. |
| `POST /auth/refresh` | — (usa la cookie de refresh token) | `Auth` | Usuario | Valida el refresh token y genera nuevos tokens para mantener la sesión activa. |
| `POST /auth/logout` | — | — | Usuario | Cierra sesión, eliminando las cookies. |

### Cuenta (`/account`)
| Endpoint | Input | Output | Rol requerido | Info |
|---|---|---|---|---|
| `GET /account` | — | `Account` | Usuario | Retorna la información completa de la cuenta del usuario. |
| `POST /account` | Body: `NewAccount` | `Auth` / — | Público | Crea una nueva cuenta de usuario o empresa. |
| `PUT /account` | Body: `UpdateAccount` | `Account` / — | Usuario | Actualiza datos de la cuenta del usuario. |
| `PATCH /account/password` | Body: `{ oldPassword, newPassword }` | — | Usuario | Cambio de contraseña. |
| `PATCH /account/cbu` | Body: `{ password, newCBU }` | — | Usuario | Cambia el CBU asociado a la cuenta. |
| `DELETE /account` | Body: `{ password }` | — | Usuario | Realiza un soft delete sobre la cuenta. |
| `GET /account/:username` | Param: `username` | `PublicAccount` | Público | Muestra los datos públicos de una cuenta. |

### Productos (`/product`)
| Endpoint | Input | Output | Rol requerido | Info |
|---|---|---|---|---|
| `GET /product/total` | Query: `category?` | `number` | Público | Retorna el número total de productos, o el total de la categoría si se especifica. |
| `GET /product` | Query: `{ limit?, offset? }` | `PartialProduct[]` | Público | Retorna los productos. |
| `GET /product/category/:category` | Param: `category`, Query: `{ limit?, offset? }` | `PartialProduct[]` | Público | Retorna los productos de la categoría. |
| `GET /product/featured` | Query: `limit?` | `PartialProduct[]` | Público | Retorna los productos más solicitados (el criterio de cálculo se define internamente y puede variar). |
| `POST /product` | Body: `NewProduct` | `Product` / `{ product: string }` | Usuario | Crea un nuevo producto. |
| `GET /product/me` | Query: `limit?` | `PartialProduct[]` | Usuario | Retorna los productos publicados por el usuario. |
| `PATCH /product/discount/:productId` | Param: `productId`, Body: `{ discount: number }` | — | Usuario | Actualiza el porcentaje de descuento de un producto. |
| `PATCH /product/price/:productId` | Param: `productId`, Body: `{ price: number }` | — | Usuario | Actualiza el precio de un producto. |
| `PATCH /product/stock/:productId` | Param: `productId`, Body: `{ stock: number }` | — | Usuario | Actualiza la cantidad de stock de un producto. |
| `PATCH /product/restore/:productId` | Param: `productId` | — | Usuario | Restaura un producto dado de baja por el usuario (con stock 0). |
| `GET /product/:productId` | Param: `productId` | `Product` | Público | Retorna el producto completo. |
| `PUT /product/:productId` | Param: `productId`, Body: `Partial<NewProduct>` | `Product` | Usuario | Actualiza el producto. Los campos no incluidos en el body conservan su valor actual. |
| `DELETE /product/:productId` | Param: `productId` | `Product` | Usuario | Realiza un soft delete sobre el producto. |

### Order (`/order`)
| Endpoint | Input | Output | Rol requerido | Info |
|---|---|---|---|---|
| `GET /order` | Query: `{ orderId?, draftOrderId? }` | `Order` | Usuario | Retorna la orden de compra. |
| `GET /order/shopping-list` | — | `PartialOrder[]` | Usuario | Retorna la lista de órdenes de compra del usuario. |
| `GET /order/expenses` | Query: `{ since?, until? }` | `MoneyVariation` | Usuario | Retorna el total de gastos realizados entre dos fechas. |
| `GET /order/income` | Query: `{ since?, until? }` | `MoneyVariation` | Usuario | Retorna el total de ingresos percibidos entre dos fechas. |
| `GET /order/sales-list` | — | `Sale[]` | Usuario | Retorna la lista de ventas del usuario. |

### Carrito (`/cart`)
| Endpoint | Input | Output | Rol requerido | Info |
|---|---|---|---|---|
| `GET /cart` | — | `Cart` | Usuario | Retorna el carrito del usuario. |
| `POST /cart` | Body: `{ productId, amount }` | — | Usuario | Agrega una cantidad `amount` de un producto al carrito. |
| `DELETE /cart` | — | — | Usuario | Elimina todos los productos del carrito del usuario. |
| `PATCH /cart/:cartProductId` | Param: `cartProductId`, Body: `{ amount }` | — | Usuario | Modifica la cantidad del producto en el carrito. Si `amount` es 0, elimina el producto. |
| `DELETE /cart/:cartProductId` | Param: `cartProductId` | — | Usuario | Elimina el producto del carrito. |

### Checkout (`/checkout`)
| Endpoint | Input | Output | Rol requerido | Info |
|---|---|---|---|---|
| `POST /checkout` | Body: `NewDraftOrder` | `DraftOrder` / `UnavailableProduct[]` | Usuario | Crea el borrador de una orden y reserva el stock. |
| `GET /checkout/status/:draftOrderId` | Param: `draftOrderId` | `{ status }` | Usuario | Consulta el estado de la orden (procesando / completada / cancelada). Las órdenes en borrador vencen a los 15 minutos de creadas. |
| `POST /checkout/mp/:draftOrderId` | Param: `draftOrderId` | `{ link }` | Usuario | Genera el link de pago de Mercado Pago. |
| `DELETE /checkout/:draftOrderId` | Param: `draftOrderId` | — | Usuario | Cancela una orden en borrador y restaura el stock. |
| `POST /checkout/webhook/mp` | Webhook de MP | — | Público | Notificación de pago (uso interno de Mercado Pago, valida firma HMAC). |

### Admin (`/admin`)
| Endpoint | Input | Output | Rol requerido | Info |
|---|---|---|---|---|
| `POST /admin` | Body: `NewAdmin` | — | Admin | Crea una nueva cuenta de administrador. |
| `PUT /admin` | Body: `UpdateAdmin` | `Account` / — | Admin | Actualiza datos de la cuenta del administrador. |
| `GET /admin/account/list` | Query: `{ limit?, offset? }` | `Auth[]` | Admin | Retorna la lista de usuarios activos. |
| `GET /admin/account/banned-list` | Query: `{ offset? }` | `Auth[]` | Admin | Retorna la lista de usuarios baneados. |
| `GET /admin/account/search` | Query: `{ contain }` | `Auth[]` | Admin | Retorna los usuarios cuya información pública incluye el texto ingresado. |
| `POST /admin/account/ban/:username` | Param: `username` | `204 No Content` | Admin | Banea a un usuario. Si ya estaba baneado, no hace nada y de todas formas responde éxito (evita mostrar un error confuso por una acción que ya estaba aplicada). |
| `POST /admin/account/unban/:username` | Param: `username` | `204 No Content` | Admin | Restaura el estado de un usuario a activo. Mismo criterio: si ya estaba activo, responde éxito sin hacer cambios. |
| `POST /admin/account/suspend/:username` | Param: `username` | `204 No Content` | Admin | Suspende a un usuario que no esté baneado. Si ya estaba suspendido, responde éxito sin hacer cambios. |
| `GET /admin/account/search-account/:username` | Param: `username` | `Account` | Admin | Retorna la información completa del usuario. |
| `POST /admin/product/calculate-rating` | — | — | Admin | Recalcula el rating de los productos a partir de las reseñas. También corre automáticamente por cron job cada 2 horas. |
| `GET /admin/product/banned-list` | Query: `{ limit?, offset? }` | `PartialProduct[]` | Admin | Retorna la lista de productos baneados. |
| `POST /admin/product/ban/:id` | Param: `id` | — | Admin | Banea un producto. |
| `POST /admin/product/unban/:id` | Param: `id` | — | Admin | Restaura un producto baneado. |
| `POST /admin/order/clean-draft-orders` | — | — | Admin | Elimina las órdenes borrador con más de 7 días de antigüedad. También corre automáticamente por cron job todos los días a medianoche. |

### Address (`/address`)
| Endpoint | Input | Output | Rol requerido | Info |
|---|---|---|---|---|
| `GET /address` | — | `Address[]` | Usuario | Direcciones del usuario. |
| `POST /address` | Body: `NewAddress` | `Address` | Usuario | Agrega una nueva dirección. |
| `DELETE /address/:addressId` | Param: `addressId` | — | Usuario | Elimina una dirección registrada del usuario. |

### Balance (`/balance`)
| Endpoint | Input | Output | Rol requerido | Info |
|---|---|---|---|---|
| `GET /balance` | — | `number` | Usuario | Balance actual de la cuenta. |
| `POST /balance` | Body: `{ amount }` | `Withdrawal` / token de resultado | Usuario | Solicita un retiro. Ver [patrón de operaciones asíncronas](#patrón-de-operaciones-asíncronas). |
| `GET /balance/withdrawal-list` | — | `Withdrawal[]` | Usuario | Historial de retiros. |
| `GET /balance/income-list` | — | `Income[]` | Usuario | Historial de ingresos por ventas. |

### General (`/`)
| Endpoint | Input | Output | Rol requerido | Info |
|---|---|---|---|---|
| `GET /result/:token` | Param: `token` | — (el estado se comunica por código HTTP) | Usuario | Consulta una operación asíncrona en curso. Ver [patrón de operaciones asíncronas](#patrón-de-operaciones-asíncronas). |
| `GET /health` | — | — | Público | Health check. |
| `GET /search` | Query: `contains` | `{ products: PartialProduct[], accounts: string[] }` | Público | Búsqueda principal: unifica productos y cuentas en un solo endpoint. |

### Review (`/review`)
| Endpoint | Input | Output | Rol requerido | Info |
|---|---|---|---|---|
| `GET /review` | — | `AccountReview[]` | Usuario | Retorna todas las reseñas del usuario. |
| `POST /review` | Body: `NewReview` | `ProductReview` / — | Usuario | Crea una reseña de un producto. Solo se permite una reseña por producto, y las cuentas empresariales no pueden dejar reseñas. |
| `DELETE /review/:productId` | Param: `productId` | — | Usuario | Elimina la reseña del usuario. |

### Store (`/store`)
| Endpoint | Input | Output | Rol requerido | Info |
|---|---|---|---|---|
| `GET /store` | — | `Store[]` | Usuario | Locales del usuario. |
| `POST /store` | Body: `NewStore` | `Store` | Usuario | Agrega un nuevo local. |
| `DELETE /store/:storeId` | Param: `storeId` | — | Usuario | Elimina un local registrado del usuario. |

### Patrón de operaciones asíncronas

Algunas operaciones (por ejemplo, un retiro de saldo) no se resuelven de forma inmediata porque dependen de una coordinación entre microservicios. En esos casos, el endpoint puede devolver un **token** en lugar del resultado final. Ese token permite consultar el estado en `GET /result/:token`, que comunica el resultado a través del código HTTP:

- `102` → la operación todavía se está procesando.
- `200` (sin cuerpo) → la operación se resolvió correctamente.
- `500` → la operación falló.

> Los esquemas mencionados en esta sección están detallados en [Esquemas](#esquemas--schemas).

## Cómo se probó

Este proyecto no tiene una suite de tests automatizados (unitarios/e2e). La validación se hizo de dos formas:

1. **End-to-end funcional real**, usando el frontend [publicECommerce-Angular](https://github.com/paliyo22/publicEComerce-Angular) contra el backend completo (auth, catálogo, carrito, checkout y pago con Mercado Pago).
2. **Manual, con ThunderClient**, para los endpoints de administrador que no tienen interfaz en el frontend.

Fue una decisión consciente: priorizar el diseño de la arquitectura por sobre invertir tiempo en testing automatizado. Queda como posible mejora a futuro agregar tests de integración sobre los flujos más sensibles (reserva de stock, checkout, webhook de pago).

## Decisiones de diseño

**¿Por qué microservicios?**
Me interesa mucho la implementación de diferentes arquitecturas, y esta en particular es muy solicitada en las publicaciones de empleo. El principal objetivo era aprender tecnologías nuevas, lo cual considero haber logrado, ya que esta es mi primera aplicación con NestJS. A nivel arquitectura pude llegar a un diseño de microservicios sólido, en contraposición a mis primeros commits, donde el gateway era el único que se comunicaba con los servicios — lo que hacía que la arquitectura tendiera más a una arquitectura por capas que a microservicios reales.

**¿Por qué RabbitMQ y no HTTP directo entre servicios?**
La comunicación entre servicios mediante HTTP no representaba un desafío técnico nuevo para mí, a diferencia de un broker de mensajería que no conocía ni había usado. Originalmente usé el transporte TCP nativo de NestJS para monorepos, que simula un broker real, pero después aproveché para aprender uno real como RabbitMQ.

**¿Cómo se resuelve la consistencia entre servicios cuando algo falla a mitad de una compra?**
Esto lo resolví con varias capas defensivas para mantener la máxima trazabilidad posible en el código. De forma simple, hay dos mecanismos de protección que evitan que se pierda información o se generen compras duplicadas.

El primero es el diseño de la base de datos: antes de ejecutar la compra se crea una orden borrador con un estado. Al ejecutarse la transacción, ese estado pasa a completada o cancelada, así las consultas de estado pueden establecer el resultado final; además, al completarse se guarda su id como referencia en la orden real y, al ser `unique`, se asegura que por cada orden borrador se registre una sola venta.

La limpieza de estas órdenes borrador tiene dos caminos, no uno solo: si la orden quedó **completada**, se borra en el momento en que alguien consulta su estado (`GET /checkout/status/:draftOrderId`), porque en ese punto ya cumplió su función y el registro que importa pasó a la orden real. Si quedó **cancelada, pendiente, o nadie volvió a consultarla**, se mantiene en el sistema hasta que un cron job diario la elimina si tiene más de 7 días de antigüedad — así, ante cualquier problema, hay una ventana de una semana para poder inspeccionarla antes de que se borre. Como en Swarm puede haber varias réplicas del servicio `order` corriendo al mismo tiempo, ese cron toma un lock distribuido en Redis (`SET NX EX`) antes de ejecutar el borrado, para asegurarse de que una sola réplica haga la limpieza cada vez y no se pisen entre sí.

El segundo seguro es a nivel sistema: se genera un token por cada compra que contiene el id de la solicitud y su estado, además de reintentos y timeouts altos. Ese token se guarda en caché junto con el resultado, y se usa un lock con el id del token para evitar inserciones múltiples. Ya sea que la orden se complete o falle al crearse en la base de datos, el resultado queda registrado en el token y en el caché — así, si entran otros intentos de registrar la misma compra, se responde directamente con el resultado final sin volver a ejecutarla. De esta manera se evita duplicar compras, se notifica correctamente al usuario del resultado, y en caso de error queda un registro contra el cual contrastar la información.

**¿Por qué Docker Swarm y no Kubernetes / un docker-compose simple?**
Al implementar RabbitMQ y Redis, se vuelve muy complejo (o directamente imposible, según entiendo) probar la app en local sin Docker. Además, la idea original era alojar el proyecto en algún servicio gratuito como Oracle Cloud, generando mis propias instancias de MySQL, RabbitMQ y Redis — algo que finalmente no pude concretar por problemas con mi cuenta. En cuanto a por qué Swarm en particular: nunca había trabajado con Docker antes, así que tuve que aprender cómo funciona y configurar cada detalle para que funcionara bien, lo que implicó resolver varios conflictos hasta entonces desconocidos en la configuración de Node.js y NestJS. Una vez que ya funcionaba, aproveché para experimentar con actualizaciones en caliente sobre múltiples nodos, y para aumentar/reducir réplicas de cada microservicio y así distribuir tráfico o ajustar el consumo de recursos.

## Estado del proyecto

**Hecho:**
- [x] Arquitectura de microservicios funcional end-to-end
- [x] Auth con JWT (access + refresh) y roles
- [x] Checkout con Mercado Pago (link de pago + webhook validado por HMAC)
- [x] Manejo de stock con locking pesimista
- [x] Frontend funcional consumiendo la API completa

**Pendiente / mejoras futuras:**
Considero que ya aprendí lo que me proponía con este proyecto. Quedan muchos detalles menores por corregir, nuevos métodos que exploten mejor los datos que ya guardan las bases, y varias mejoras estructurales (por ejemplo, en cómo se arman las respuestas HTTP). Pero voy a pasar a algo nuevo y más simple, ya que desarrollar una arquitectura de microservicios en solitario, sin la estructura fija que da un equipo o la experiencia previa, muy demandante desde el punto de vista técnico, porque hay demasiados detalles a tener en cuenta cada vez que se realizan cambios, y la mayoría son errores silenciosos entre servicios.

- [ ] Servicio de comunicación con los usuarios: recuperación de contraseña por email, y notificación a los vendedores por cada venta (o algo similar).

---

# English

**General overview**

Backend for a multi-vendor marketplace built with **NestJS**, organized as a **microservices monorepo**. Each business domain (accounts, products, cart, and orders) runs as an independent application, coordinated by a central **gateway**, communicating asynchronously through **RabbitMQ**, with **Redis** used for distributed locks and caching.

- 5 NestJS applications
- 3 shared libraries
- RabbitMQ message broker
- Redis cache + distributed locking
- 4 independent MySQL databases
- Docker Swarm deployment

Reference frontend (Angular): [publicECommerce-Angular](https://github.com/paliyo22/publicEComerce-Angular)

---

## Contents

- [Description](#description)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Configuration](#configuration)
- [Running the Project](#how-to-run-the-project)
- [Services and Ports](#services-and-ports)
- [Main Endpoints](#main-endpoints)
- [Testing](#testing)
- [Design Decisions](#design-decisions)
- [Roadmap](#roadmap)
- [Schemas](#esquemas--schemas)
- [Author](#autor)
- [License](#licencia)

## Description

The original idea was to build a marketplace/e-commerce platform similar to one you could create with Shopify, but supporting multiple sellers. I didn't have a clear vision of the final product from the beginning, so as the project evolved into something closer to Mercado Libre or Amazon, I kept running into design problems that I hadn't anticipated due to my lack of knowledge in this field.

For example, when implementing the payment system with Mercado Pago Checkout Pro, I had to redesign the database. My initial idea required users to link their own Mercado Pago account so the platform could generate payment links on their behalf. However, that would have made the marketplace fundamentally dependent on another platform, which wasn't the direction I wanted to take.

The solution was to implement an internal funds management system. All customer payments are received by the marketplace's own account, making it possible to integrate multiple payment providers without tying the platform to a specific one. Sellers only need to associate a bank account (CBU) with their profile, and when they request a withdrawal, the idea is to automate the corresponding bank transfer. I wasn't able to fully implement this last part, as it appears to require an agreement with a banking institution.

## Architecture

This project is a **NestJS microservices monorepo**. Each service is independent, has its own MySQL database, and communicates with the others asynchronously through RabbitMQ.

```
                        ┌─────────────┐
                        │    Client   │
                        │  (Angular)  │
                        └──────┬──────┘
                               │ HTTP/REST
                        ┌──────▼──────┐
                        │   Gateway   │  ← single public entry point
                        └──────┬──────┘
                               │ RabbitMQ (RPC + events)
          ┌──────────┬─────────┼─────────┬──────────┐
          │          │         │         │          │
     ┌────▼───┐ ┌────▼───┐┌────▼───┐┌────▼───┐  ┌────▼────┐
     │account │ │product ││  cart  ││ order  │  │  Redis  │
     └────┬───┘ └────┬───┘└────┬───┘└────┬───┘  │ (cache, │
          │          │         │         │      │  locks, │
     ┌────▼───┐ ┌────▼───┐┌────▼───┐┌────▼───┐  │ pub/sub)│
     │ MySQL  │ │ MySQL  ││ MySQL  ││ MySQL  │  └─────────┘
     │account │ │product ││  cart  ││ order  │
     └────────┘ └────────┘└────────┘└────────┘
```
- **gateway**: the single entry point to the API. Handles authentication and exposes the REST endpoints consumed by the frontend and other clients. Health check available at /health.
- **account**: user account management and authentication (JWT).
- **product**: product catalog.
- **cart**: shopping cart management.
- **order**: order and payment management (Mercado Pago integration).
- Each service has its own MySQL database (database-per-service pattern), initialized with its own SQL script (initProduct.sql, initAccount.sql, etc.).
- **Redis** is used as a shared cache (@nestjs/cache-manager + ioredis).
- **RabbitMQ** acts as the messaging broker between microservices (@nestjs/microservices, amqplib, amqp-connection-manager).
- Shared internal libraries (`libs/`): 
  - `lib`: shared DTOs, TypeORM entities, enums, decorators, and helpers.
  - `rabbit-proxy`: dynamic module used to register RabbitMQ clients.
  - `redis`: global Redis client.

**Design patterns used:**

- Database-per-service: every microservice owns its own MySQL database, with no direct cross-service database access.
- API Gateway: `gateway` is the only publicly exposed service; all other services are reachable exclusively through RabbitMQ.
- Hybrid communication: `send` (request/response, RPC pattern) is used for operations requiring an immediate response, while `emit` (events) is used for fire-and-forget notifications.
- Saga-style compensation: when a multi-service operation fails midway (for example, reserving stock and then failing during payment), compensating actions are executed (such as `restoreStock`).
- Distributed locking with Redis (Lua script) to prevent race conditions when releasing locks across services.
- Pessimistic database locking (`pessimistic_write`) to prevent stock overselling under concurrent requests.
- Asynchronous operations with result tokens: see the [dedicated section](#asynchronous-operations-pattern) below.

## Technology Stack

| Category	| Technology	|
|---|---|
| Framework	| NestJS 11 (monorepo)	|
| Language	| TypeScript	|
| Database	| MySQL (TypeORM) — check the exact version in compose.yml	|
| Cache / Locks / Pub-Sub	| Redis (ioredis + @nestjs/cache-manager)	|
| Messaging	| RabbitMQ (@nestjs/microservices, amqplib)	|
| Authentication	| JWT (access + refresh) via httpOnly cookies, Passport, bcrypt	|
| Payments	| Mercado Pago SDK (Checkout Pro + webhooks)	|
| Containers	| Docker (multi-stage builds) + Docker Swarm (deployment through compose.yml)	|
| Validation	| class-validator, class-transformer, Joi (configuration validation)	|
| Infrastructure	| Docker / Docker Swarm (`compose.yml`, `deploy.placement.constraints`, overlay network)	|

## Repository Structure

```
apps/
  gateway/     → Public API. Auth, orchestration, checkout, and REST exposure.
  account/     → Accounts, profiles (user/business/admin), addresses, and balances.
  product/     → Catalog, stock, and reviews.
  cart/        → Shopping cart.
  order/       → Draft orders, checkout, final orders, and sales.
libs/
  lib/         → Shared DTOs, TypeORM entities, enums, decorators, and helpers.
  rabbit-proxy/ → Dynamic module for registering RabbitMQ clients.
  redis/       → Global Redis client.
compose.yml    → Orchestration for all services + databases.
```

## Prerequisites

- Node.js 22.x (the project is built with `node:22.14-alpine` in the Dockerfiles)
- Docker and Docker Compose (with Swarm support)
- A Mercado Pago account (test credentials) if you want to test the full payment flow

## Configuration

1. Clone the repository.
2. Copy `.env.example` to `.env` and fill in the required values. The rest of the variables (database connections, JWT secrets, Redis, and RabbitMQ) are mandatory to start any service. The following are the only optional ones if you want to test without using the payment service:
   - `MP_SECRET_KEY` / `MP_ACCESS_TOKEN`: Mercado Pago credentials
   - `FRONT_URL` / `BACK_URL`: URLs for the payment/webhook flow

3. To avoid CORS errors, make sure to fill in:
   - `ACCEPTED_ORIGINS`: allowed origins for CORS in the gateway

   Or, if you are only testing locally, you can disable CORS validation directly in `apps/gateway/src/main.ts`.

4. **Database user:** if you want to change the default DB username, you must also update the initialization scripts (for example, `GRANT ALL PRIVILEGES ON cart_db.* TO 'your_user'@'%';`), because if it does not match what each service expects, queries will fail.

## How to Run the Project

**With Docker (required, see note below):**

```bash
docker build --no-cache -f apps/gateway/gateway.dockerfile -t ecommerce-gateway:1.0 .
docker build --no-cache -f apps/product/product.dockerfile -t ecommerce-product:1.0 .
docker build --no-cache -f apps/account/account.dockerfile -t ecommerce-account:1.0 .
docker build --no-cache -f apps/cart/cart.dockerfile -t ecommerce-cart:1.0 .
docker build --no-cache -f apps/order/order.dockerfile -t ecommerce-order:1.0 .
```

These commands build the Docker images for the gateway and the four microservices. **Important:** these tags (`ecommerce-gateway:1.0`, etc.) must match the `image:` entries defined in `compose.yml`, or `docker stack deploy` will not find the corresponding images.

```bash
docker swarm init
```

This initializes the Docker Swarm node (needed only once per machine).

```bash
docker stack deploy -c compose.yml ecommerce
```

This brings up the gateway and the 4 microservices, together with their MySQL, RabbitMQ, and Redis components.

> **Note:** unlike `docker compose up`, `docker stack deploy` does not always pick up environment variables from a `.env` file in the same way. If, after launching the stack, you notice that environment variables are not reaching the containers, export them manually before deploying (for example, `export $(grep -v '^#' .env | xargs)`).
>
> Also note that, because the images are built locally on the same machine, this only works without extra configuration in a single-node swarm. If the project is ever deployed across multiple physical nodes, the images need to be pushed to a registry (Docker Hub, GHCR, etc.), since Swarm does not build or distribute local images between nodes by itself.

Because the app relies on RabbitMQ and Redis, Docker is required for local testing.

## Services and Ports

| Service | Port | Notes |
|---|---|---|
| Gateway | 3000 | Only service exposed externally |
| RabbitMQ Management | 15672 | Queue administration UI |
| Redis | 6379 | Cache, only accessible inside the internal network |
| Product | 3001 | Only accessible inside the internal network |
| Account | 3002 | Only accessible inside the internal network |
| Cart | 3003 | Only accessible inside the internal network |
| Order | 3004 | Only accessible inside the internal network |
| MySQL | 3306 | Databases, only accessible inside the internal network |

## Main Endpoints

> **Convention for the "Output" column:** when two values are separated by `/` (for example, `Withdrawal/void`), the first is the response in the normal case and the second corresponds to an alternative case (for example, when the operation remains pending asynchronously, or when there is no data to return).

### Auth (`/auth`)
| Endpoint | Input | Output | Required role | Info |
|---|---|---|---|---|
| `POST /auth/login` | Body: `Login` | `Auth` | Public | Logs in, generates JWTs, and returns them as cookies. |
| `POST /auth/refresh` | — (uses the refresh token cookie) | `Auth` | User | Validates the refresh token and generates new tokens to keep the session active. |
| `POST /auth/logout` | — | — | User | Logs out and clears the cookies. |

### Account (`/account`)
| Endpoint | Input | Output | Required role | Info |
|---|---|---|---|---|
| `GET /account` | — | `Account` | User | Returns the user's complete account information. |
| `POST /account` | Body: `NewAccount` | `Auth` / — | Public | Creates a new user or business account. |
| `PUT /account` | Body: `UpdateAccount` | `Account` / — | User | Updates the user's account information. |
| `PATCH /account/password` | Body: `{ oldPassword, newPassword }` | — | User | Changes the password. |
| `PATCH /account/cbu` | Body: `{ password, newCBU }` | — | User | Changes the CBU associated with the account. |
| `DELETE /account` | Body: `{ password }` | — | User | Performs a soft delete on the account. |
| `GET /account/:username` | Param: `username` | `PublicAccount` | Public | Shows the public account data. |

### Products (`/product`)
| Endpoint | Input | Output | Required role | Info |
|---|---|---|---|---|
| `GET /product/total` | Query: `category?` | `number` | Public | Returns the total number of products, or the total of the category if specified. |
| `GET /product` | Query: `{ limit?, offset? }` | `PartialProduct[]` | Public | Returns the products. |
| `GET /product/category/:category` | Param: `category`, Query: `{ limit?, offset? }` | `PartialProduct[]` | Public | Returns the products in the category. |
| `GET /product/featured` | Query: `limit?` | `PartialProduct[]` | Public | Returns the most requested products (the calculation criteria are defined internally and may vary). |
| `POST /product` | Body: `NewProduct` | `Product` / `{ product: string }` | User | Creates a new product. |
| `GET /product/me` | Query: `limit?` | `PartialProduct[]` | User | Returns the products published by the user. |
| `PATCH /product/discount/:productId` | Param: `productId`, Body: `{ discount: number }` | — | User | Updates the discount percentage of a product. |
| `PATCH /product/price/:productId` | Param: `productId`, Body: `{ price: number }` | — | User | Updates the price of a product. |
| `PATCH /product/stock/:productId` | Param: `productId`, Body: `{ stock: number }` | — | User | Updates the stock quantity of a product. |
| `PATCH /product/restore/:productId` | Param: `productId` | — | User | Restores a product that was previously soft-deleted by the user (with stock 0). |
| `GET /product/:productId` | Param: `productId` | `Product` | Public | Returns the full product. |
| `PUT /product/:productId` | Param: `productId`, Body: `Partial<NewProduct>` | `Product` | User | Updates the product. Fields omitted from the body keep their current values. |
| `DELETE /product/:productId` | Param: `productId` | `Product` | User | Performs a soft delete on the product. |

### Order (`/order`)
| Endpoint | Input | Output | Required role | Info |
|---|---|---|---|---|
| `GET /order` | Query: `{ orderId?, draftOrderId? }` | `Order` | User | Returns the purchase order. |
| `GET /order/shopping-list` | — | `PartialOrder[]` | User | Returns the user's shopping orders list. |
| `GET /order/expenses` | Query: `{ since?, until? }` | `MoneyVariation` | User | Returns the total expenses made between two dates. |
| `GET /order/income` | Query: `{ since?, until? }` | `MoneyVariation` | User | Returns the total income received between two dates. |
| `GET /order/sales-list` | — | `Sale[]` | User | Returns the user's sales list. |

### Cart (`/cart`)
| Endpoint | Input | Output | Required role | Info |
|---|---|---|---|---|
| `GET /cart` | — | `Cart` | User | Returns the user's cart. |
| `POST /cart` | Body: `{ productId, amount }` | — | User | Adds an `amount` of a product to the cart. |
| `DELETE /cart` | — | — | User | Removes all products from the user's cart. |
| `PATCH /cart/:cartProductId` | Param: `cartProductId`, Body: `{ amount }` | — | User | Modifies the quantity of a cart product. If `amount` is 0, the product is removed. |
| `DELETE /cart/:cartProductId` | Param: `cartProductId` | — | User | Removes the product from the cart. |

### Checkout (`/checkout`)
| Endpoint | Input | Output | Required role | Info |
|---|---|---|---|---|
| `POST /checkout` | Body: `NewDraftOrder` | `DraftOrder` / `UnavailableProduct[]` | User | Creates a draft order and reserves stock. |
| `GET /checkout/status/:draftOrderId` | Param: `draftOrderId` | `{ status }` | User | Checks the order status (`processing` / `completed` / `cancelled`). Draft orders expire after 15 minutes. |
| `POST /checkout/mp/:draftOrderId` | Param: `draftOrderId` | `{ link }` | User | Generates the Mercado Pago payment link. |
| `DELETE /checkout/:draftOrderId` | Param: `draftOrderId` | — | User | Cancels a draft order and restores stock. |
| `POST /checkout/webhook/mp` | Mercado Pago webhook | — | Public | Payment notification (internal use by Mercado Pago, validates signature via HMAC). |

### Admin (`/admin`)
| Endpoint | Input | Output | Required role | Info |
|---|---|---|---|---|
| `POST /admin` | Body: `NewAdmin` | — | Admin | Creates a new administrator account. |
| `PUT /admin` | Body: `UpdateAdmin` | `Account` / — | Admin | Updates administrator account data. |
| `GET /admin/account/list` | Query: `{ limit?, offset? }` | `Auth[]` | Admin | Returns the list of active users. |
| `GET /admin/account/banned-list` | Query: `{ offset? }` | `Auth[]` | Admin | Returns the list of banned users. |
| `GET /admin/account/search` | Query: `{ contain }` | `Auth[]` | Admin | Returns users whose public information includes the given text. |
| `POST /admin/account/ban/:username` | Param: `username` | `204 No Content` | Admin | Bans a user. If already banned, it does nothing and still responds successfully (to avoid showing a confusing error for an already-applied action). |
| `POST /admin/account/unban/:username` | Param: `username` | `204 No Content` | Admin | Restores a user's status to active. Same criterion: if already active, it responds successfully without changes. |
| `POST /admin/account/suspend/:username` | Param: `username` | `204 No Content` | Admin | Suspends a user who is not banned. If already suspended, it responds successfully without changes. |
| `GET /admin/account/search-account/:username` | Param: `username` | `Account` | Admin | Returns the user's complete information. |
| `POST /admin/product/calculate-rating` | — | — | Admin | Recalculates product ratings from reviews. Also runs automatically via a cron job every 2 hours. |
| `GET /admin/product/banned-list` | Query: `{ limit?, offset? }` | `PartialProduct[]` | Admin | Returns the list of banned products. |
| `POST /admin/product/ban/:id` | Param: `id` | — | Admin | Bans a product. |
| `POST /admin/product/unban/:id` | Param: `id` | — | Admin | Restores a banned product. |
| `POST /admin/order/clean-draft-orders` | — | — | Admin | Deletes draft orders older than 7 days. It also runs automatically via a cron job every day at midnight. |

### Address (`/address`)
| Endpoint | Input | Output | Required role | Info |
|---|---|---|---|---|
| `GET /address` | — | `Address[]` | User | User addresses. |
| `POST /address` | Body: `NewAddress` | `Address` | User | Adds a new address. |
| `DELETE /address/:addressId` | Param: `addressId` | — | User | Removes a registered address from the user. |

### Balance (`/balance`)
| Endpoint | Input | Output | Required role | Info |
|---|---|---|---|---|
| `GET /balance` | — | `number` | User | Current account balance. |
| `POST /balance` | Body: `{ amount }` | `Withdrawal` / result token | User | Requests a withdrawal. See [asynchronous operations pattern](#asynchronous-operations-pattern). |
| `GET /balance/withdrawal-list` | — | `Withdrawal[]` | User | Withdrawal history. |
| `GET /balance/income-list` | — | `Income[]` | User | Income history from sales. |

### General (`/`)
| Endpoint | Input | Output | Required role | Info |
|---|---|---|---|---|
| `GET /result/:token` | Param: `token` | — (status communicated through HTTP code) | User | Checks an asynchronous operation in progress. See [asynchronous operations pattern](#asynchronous-operations-pattern). |
| `GET /health` | — | — | Public | Health check. |
| `GET /search` | Query: `contains` | `{ products: PartialProduct[], accounts: string[] }` | Public | Main search endpoint: unifies products and accounts in a single request. |

### Review (`/review`)
| Endpoint | Input | Output | Required role | Info |
|---|---|---|---|---|
| `GET /review` | — | `AccountReview[]` | User | Returns all of the user's reviews. |
| `POST /review` | Body: `NewReview` | `ProductReview` / — | User | Creates a product review. Only one review per product is allowed, and business accounts cannot leave reviews. |
| `DELETE /review/:productId` | Param: `productId` | — | User | Deletes the user's review. |

### Store (`/store`)
| Endpoint | Input | Output | Required role | Info |
|---|---|---|---|---|
| `GET /store` | — | `Store[]` | User | User stores. |
| `POST /store` | Body: `NewStore` | `Store` | User | Adds a new store. |
| `DELETE /store/:storeId` | Param: `storeId` | — | User | Removes a registered store. |

### Asynchronous operations pattern

Some operations (for example, a balance withdrawal) do not resolve immediately because they depend on coordination between microservices. In those cases, the endpoint may return a **token** instead of the final result. That token allows checking the state at `GET /result/:token`, which communicates the result through the HTTP status code:

- `102` → the operation is still being processed.
- `200` (with no body) → the operation completed successfully.
- `500` → the operation failed.

> The schemas mentioned in this section are detailed in [Schemas](#esquemas--schemas).

## Testing

This project does not have an automated test suite (unit/e2e). Validation was done in two ways:

1. **Real end-to-end functional testing**, using the frontend [publicECommerce-Angular](https://github.com/paliyo22/publicEComerce-Angular) against the full backend (auth, catalog, cart, checkout, and payment with Mercado Pago).
2. **Manual testing with ThunderClient**, for admin endpoints that do not have a frontend interface.

This was a conscious decision: prioritizing the architecture design over investing time in automated testing. It remains a possible future improvement to add integration tests for the most sensitive flows (stock reservation, checkout, and payment webhook).

## Design Decisions

**Why microservices?**
I am very interested in implementing different architectures, and this one in particular is widely requested in job postings. The main goal was to learn new technologies, which I believe I accomplished, since this is my first application with NestJS. At the architecture level, I was able to reach a solid microservices design, in contrast to my earlier commits, where the gateway was the only component communicating with the services — which made the architecture trend more toward a layered architecture than real microservices.

**Why RabbitMQ instead of direct HTTP between services?**
Communication between services through HTTP did not represent a new technical challenge for me, unlike a messaging broker that I had never used before. Originally, I used NestJS's native TCP transport for monorepos, which simulates a real broker, but later I switched to a real one like RabbitMQ to learn it.

**How is consistency preserved between services when something fails midway through a purchase?**
I solved this with several defensive layers to preserve the highest possible traceability in the code. In simple terms, there are two protection mechanisms that prevent information loss or duplicate purchases.

The first is the database design: before executing the purchase, a draft order is created with a status. When the transaction runs, that status changes to completed or cancelled, so state queries can determine the final result. In addition, when it completes, its id is saved as a reference in the real order, and because it is `unique`, it ensures that only one sale is registered per draft order.

Cleaning up these draft orders has two paths, not one: if the order was **completed**, it is removed when someone queries its status (`GET /checkout/status/:draftOrderId`), because at that point it has already served its purpose and the important record has moved to the real order. If it was **cancelled, pending, or nobody queries it again**, it remains in the system until a daily cron job deletes it if it is more than 7 days old — thus, in any problem case, there is a one-week window to inspect it before deletion. Since Swarm may run multiple replicas of the `order` service at the same time, that cron takes a distributed lock in Redis (`SET NX EX`) before deleting anything, ensuring that only one replica performs the cleanup at a time and they do not interfere with each other.

The second safety net is at the system level: a token is generated for each purchase that contains the request id and its status, along with retries and high timeouts. This token is stored in cache together with the result and is used with a lock on the token id to avoid multiple insertions. Whether the order completes or fails to be created in the database, the result is registered in the token and cache — so if other attempts try to register the same purchase, they get the final result directly instead of re-executing it. This avoids duplicate purchases, notifies the user correctly of the outcome, and in case of error it leaves a record against which the information can be contrasted.

**Why Docker Swarm instead of Kubernetes / a simple docker-compose?**
When implementing RabbitMQ and Redis, it becomes very complex — or even impossible, depending on the case — to test the app locally without Docker. Beyond that, the original idea was to host the project on some free service such as Oracle Cloud, creating my own MySQL, RabbitMQ, and Redis instances — something that I finally could not do due to account issues. As for why Swarm specifically: I had never worked with Docker before, so I had to learn how it works and configure every detail to make it work well, which involved resolving several conflicts that were previously unknown in the configuration of Node.js and NestJS. Once it was working, I used it to experiment with hot updates across multiple nodes and to scale replicas up or down for each microservice to distribute traffic or adjust resource consumption.

## Roadmap

**Completed:**
- [x] End-to-end functional microservices architecture
- [x] Auth with JWT (access + refresh) and roles
- [x] Checkout with Mercado Pago (payment link + webhook validated via HMAC)
- [x] Stock handling with pessimistic locking
- [x] Functional frontend consuming the full API

**Future Improvements:**
I consider that I have already learned what I set out to learn with this project. Many minor details still need fixing, new methods could better exploit the data already stored in the databases, and there are several structural improvements ahead (for example, in how HTTP responses are assembled). However, I consider the learning goals of this project complete, so I'm moving on to something new. Building a microservices architecture alone (without an established team structure or prior experience) turned out to be technically demanding, because even small changes require coordinating many moving parts, and most failures between services are silent.

- [ ] User communication service: password recovery by email and notifications to sellers for each sale (or similar).
---

## Esquemas / Schemas

- **Login**:
  ```
  { account, password }
  ```

- **Auth**:
  ```
  { email, username, role, status }
  ```

- **Account**:
  ```
  {
    email, username, role, status,
    meta: { created, updated },
    userProfile?: { firstname, lastname, birth?, phone?, cbu? },
    businessProfile?: { title, bio?, phone, cbu? },
    adminProfile?: { publicName },
    address?: { id, address, apartment?, city, zip, country }[],
    store?: { id, phone, address: { id, address, apartment?, city, zip, country } }[]
  }
  ```

- **NewAccount**:
  ```
  {
    email, username, password,
    businessAccount?: { title, phone, bio?, cbu? },
    userAccount?: { firstname, lastname, birth?, phone?, cbu? }
  }
  ```

- **UpdateAccount**:
  ```
  {
    email?, username?,
    businessAccount?: { title?, phone? },
    userAccount?: { firstname?, lastname?, birth?, phone? }
  }
  ```

- **PublicAccount**:
  ```
  {
    username, accountName, contactPhone, bio?,
    meta: { created, updated },
    store: { address, city, country, phone }[],
    products: PartialProduct[]
  }
  ```

- **Address**:
  ```
  { id, address, apartment?, city, zip, country }
  ```

- **NewAddress**:
  ```
  { address, apartment?, city, zip, country }
  ```

- **NewAdmin**:
  ```
  { email, username, password, adminAccount: { publicName } }
  ```

- **UpdateAdmin**:
  ```
  { email?, username?, adminAccount?: { publicName? } }
  ```

- **PartialProduct**:
  ```
  {
    id, title, description, category, price, discountPercentage, stock,
    brand?, ratingAvg, tags[], images?[], thumbnail?, status
  }
  ```

- **Withdrawal**:
  ```
  { amount, status, cbu, created }
  ```

- **Income**:
  ```
  { amount, orderId, created }
  ```

- **Cart**:
  ```
  {
    id, created, updated,
    products: { cartProductId, productId, title, price, amount, discount }[]
  }
  ```

- **NewDraftOrder**:
  ```
  {
    address, apartment?, city, zip, country,
    fromCart?: { cartId?, cartProductId? },
    fromProduct?: { productId, amount }
  }
  ```

- **DraftOrder**:
  ```
  { id, total, shippingAddress }
  ```

- **UnavailableProduct**:
  ```
  { id, title, reason }
  ```

- **Order**:
  ```
  {
    id, total, shippingAddress, created,
    items: { productId, seller, product, price, amount, discount, subtotal }[]
  }
  ```

- **PartialOrder**:
  ```
  { id, total, shippingAddress, created }
  ```

- **MoneyVariation**:
  ```
  { since, until, total }
  ```

- **Sale**:
  ```
  { productId, buyerEmail, product, price, amount, discount, subtotal }
  ```

- **Product**:
  ```
  {
    id, title, description, category, price, discountPercentage, stock,
    brand?, ratingAvg, tags[], images?[], thumbnail?, status,
    accountUsername,
    meta: { created, updated },
    weight, physical,
    accountName, contactPhone, contactEmail, accountBio?,
    store: { address, city, country, phone }[],
    reviews: { username, productId, rating, comment?, created }[],
    warrantyInfo?, shippingInfo?
  }
  ```

- **NewProduct**:
  ```
  {
    title, description, category, price, discountPercentage?, stock,
    brand?, weight, physical, warrantyInfo?, shippingInfo?,
    tags?[], images?[], thumbnail?
  }
  ```

- **AccountReview**:
  ```
  { productId, title, brand?, thumbnail?, rating, comment?, created }
  ```

- **ProductReview**:
  ```
  { username, productId, rating, comment?, created }
  ```

- **NewReview**:
  ```
  { productId, rating, comment? }
  ```

- **Store**:
  ```
  { id, address: { id, address, apartment?, city, zip, country }, phone }
  ```

- **NewStore**:
  ```
  { phone?, address, apartment?, city, zip, country }
  ```

> Nota: `NewStore` recibe la dirección "aplanada" (campos sueltos), mientras que `Store` la devuelve anidada dentro de `address`. Es intencional (así es como lo espera el input vs. cómo se arma el output), pero vale la pena tenerlo presente al integrar.

> Note: `NewStore` receives the address in a flattened structure (plain fields), while `Store` returns it nested inside `address`. This is intentional, as it matches the expected input vs. output format, but it is worth keeping in mind during integration.

## Autor

**Palito**

---

## Licencia

UNLICENSED