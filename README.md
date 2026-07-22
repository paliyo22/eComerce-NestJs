# eComerce-NestJs

Backend de e-commerce basado en **NestJS**, organizado como **monorepo de microservicios**. Cada dominio de negocio (cuentas, productos, carrito y órdenes) corre como una aplicación independiente, coordinadas por un **gateway** central y comunicadas de forma asíncrona vía **RabbitMQ**.

> ⚠️ Este README es **preliminar**, generado a partir del análisis del código fuente (`package.json`, `compose.yml`, `nest-cli.json`, `.env.example`), ya que el repositorio no cuenta actualmente con documentación propia.

## Arquitectura

El proyecto sigue una arquitectura de **microservicios** con un patrón de **API Gateway**:

```
                    ┌─────────────┐
   Cliente  ───────▶│   gateway   │  (expone la API pública, puerto 3000)
                    └──────┬──────┘
                           │  RabbitMQ (mensajería async, amqplib)
        ┌──────────┬───────┴───────┬──────────┐
        ▼          ▼               ▼          ▼
   ┌─────────┐ ┌─────────┐   ┌─────────┐ ┌─────────┐
   │ account │ │ product │   │  cart   │ │  order  │
   └────┬────┘ └────┬────┘   └────┬────┘ └────┬────┘
        ▼          ▼               ▼          ▼
   MySQL(account) MySQL(product) MySQL(cart) MySQL(order)
```

- **gateway**: punto de entrada único de la API, autenticación, y expone endpoints al frontend/clientes. Health check en `/health`.
- **account**: gestión de usuarios/cuentas y autenticación (JWT).
- **product**: catálogo de productos.
- **cart**: carrito de compras.
- **order**: gestión de órdenes y pagos (integración con Mercado Pago).
- Cada servicio tiene su **propia base de datos MySQL** (patrón *database per service*), inicializada con scripts SQL propios (`initProduct.sql`, `initAccount.sql`, etc.).
- **Redis** se usa como caché compartida (`@nestjs/cache-manager` + `ioredis`).
- **RabbitMQ** se usa como bus de mensajería entre microservicios (`@nestjs/microservices`, `amqplib`, `amqp-connection-manager`).
- Librerías internas compartidas (`libs/`): `lib`, `rabit-proxy` (proxy/cliente de RabbitMQ) y `redis` (cliente/caché de Redis).

## Stack tecnológico

| Categoría | Tecnología |
|---|---|
| Framework | NestJS 11 (TypeScript) |
| Base de datos | MySQL 9.2 (TypeORM) |
| Caché | Redis 8 (ioredis + @nestjs/cache-manager) |
| Mensajería | RabbitMQ 4.0 (@nestjs/microservices, amqplib) |
| Autenticación | JWT (@nestjs/jwt, passport-jwt), passport-local, bcrypt |
| Pagos | Mercado Pago SDK |
| Validación | class-validator, class-transformer, Joi (validación de config) |
| Testing | Jest, Supertest |
| Infraestructura | Docker / Docker Swarm (`compose.yml`, `deploy.placement.constraints`, red overlay) |
| Linting/Formato | ESLint, Prettier |

## Estructura del repositorio

```
.
├── apps/
│   ├── gateway/     # API Gateway (app raíz, entry point del monorepo)
│   ├── account/     # Microservicio de cuentas/usuarios
│   ├── product/     # Microservicio de catálogo de productos
│   ├── cart/         # Microservicio de carrito
│   └── order/        # Microservicio de órdenes y pagos
├── libs/
│   ├── lib/          # Utilidades/código compartido
│   ├── rabit-proxy/  # Cliente/proxy para RabbitMQ
│   └── redis/        # Cliente/servicio de Redis compartido
├── compose.yml        # Orquestación Docker (Swarm) de todos los servicios
├── nest-cli.json      # Configuración del monorepo Nest (multi-app)
├── .env.example       # Variables de entorno de referencia
└── package.json
```

## Requisitos previos

- Node.js (compatible con NestJS 11 / TypeScript 5.7)
- Docker y Docker Compose (o Docker Swarm) para levantar MySQL, Redis y RabbitMQ
- Cuenta/credenciales de **Mercado Pago** (para el flujo de pagos del servicio `order`)

## Configuración

1. Copiar el archivo de variables de entorno de ejemplo:
   ```bash
   cp .env.example .env
   ```
2. Completar las variables necesarias, en especial:
   - `MP_SECRET_KEY` / `MP_ACCESS_TOKEN`: credenciales de Mercado Pago
   - `FRONT_URL` / `BACK_URL`: URLs para el flujo de pago/webhook
   - `JWT_SECRET` / `JWT_REFRESH_SECRET`: secretos de autenticación
   - Credenciales de MySQL (`MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD`)
   - `ACCEPTED_ORIGINS`: orígenes permitidos por CORS en el gateway

## Instalación

```bash
npm install
```

## Ejecución en desarrollo

Cada microservicio puede levantarse de forma individual:

```bash
npm run start:dev              # gateway (modo watch)
npm run start:dev:account      # microservicio account
npm run start:dev:product      # microservicio product
npm run start:dev:cart         # microservicio cart
npm run start:dev:order        # microservicio order
```

> Nota: para funcionar completamente, cada microservicio necesita su base de datos MySQL, Redis y RabbitMQ disponibles (ver sección Docker).

## Ejecución con Docker

El archivo `compose.yml` define todos los servicios (gateway, account, product, cart, order), sus bases de datos MySQL dedicadas, Redis y RabbitMQ, sobre una red `overlay` (pensado para Docker Swarm):

```bash
docker compose up -d
```

Servicios expuestos:
- `gateway` → puerto `3000`
- `rabbitmq` (panel de administración) → puerto `15672`

## Build

```bash
npm run build:all     # compila todos los microservicios
npm run build:gateway
npm run build:account
npm run build:product
npm run build:cart
npm run build:order
```

## Testing

```bash
npm run test        # unit tests
npm run test:cov     # cobertura
npm run test:e2e     # e2e (configurado sobre apps/gateway)
```

## Estado del proyecto

Este proyecto está en desarrollo activo. Pendientes sugeridos para completar la documentación:

- [ ] Documentar los endpoints expuestos por el `gateway` (o agregar Swagger/OpenAPI)
- [ ] Detallar el modelo de datos de cada microservicio
- [ ] Documentar los eventos/colas de RabbitMQ y contratos entre servicios
- [ ] Agregar instrucciones específicas del flujo de pago con Mercado Pago
- [ ] Especificar versión de Node.js requerida
- [ ] Agregar licencia (actualmente `UNLICENSED` en `package.json`)

## Licencia

`UNLICENSED` (privado) — definir política de licencia si el proyecto se hace público.