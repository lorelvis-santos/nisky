# Nisky - Plan de implementación

## Objetivo

Construir una plataforma multiusuario de gestión operativa, comercial y financiera, inicialmente para uso personal pero preparada para comercialización como SaaS.

## Fase 0

La Fase 0 entrega una base ejecutable, reproducible y segura:

1. Monorepo `apps/backend` + `apps/frontend`.
2. PostgreSQL y MinIO local mediante Docker Compose.
3. Backend modular basado en el patrón del proyecto `consejoecoturisticosr`.
4. Modelo `User` con roles `ADMIN` y `USER`.
5. Login, registro público configurable, refresh token rotatorio, logout y consulta del usuario.
6. Frontend Next.js 16 con `proxy.ts`, formularios validados y tokens Steel Monolith.
7. Storage y email preparados para las fases de negocio.

## Decisiones de arquitectura

- Datos de negocio scoped por `userId`.
- Access JWT en memoria durante 15 minutos.
- Refresh token aleatorio de 48 bytes, guardado solo como hash bcrypt y enviado mediante cookie `httpOnly` de 7 días con `Path=/` para que el proxy del frontend pueda detectar la sesión.
- Rotación de refresh tokens y revocación por dispositivo.
- Máximo cinco refresh tokens activos por usuario; se revocan primero los más antiguos.
- Registro público controlado por `PUBLIC_SIGNUP`.
- CORS explícito y `credentials: true`.
- Prisma 7 con `prisma-client` generado en `src/infra/prisma/generated` y `PrismaPg`.
- Steel Monolith como lenguaje visual único: Inter, JetBrains Mono, slate, bordes, sin sombras.

## Roadmap posterior

### Fase 1: Gestión diaria

Tareas, hábitos, planificación semanal, Pomodoro, diario cifrado AES-256-GCM y base de conocimiento.

### Fase 2: CRM comercial

Clientes, proyectos, fases financieras, mantenimiento, facturación incremental y ledger.

### Fase 3: Gestión financiera

Integración real con Sure, cuentas, movimientos, sincronización, credenciales y registro rápido.

### Fase 4: Calidad y operación

Pruebas unitarias/E2E, accesibilidad, observabilidad, rate limiting distribuido, despliegue Coolify y documentación de API.

## Criterios de aceptación de Fase 0

- `docker compose up -d` inicia PostgreSQL y MinIO.
- Prisma crea `User` y `RefreshToken` y el seed crea el administrador inicial.
- Health responde desde `/api/v1/health`.
- Login devuelve access token y cookie httpOnly.
- Refresh rota la cookie y revoca el token usado.
- `/auth/me` requiere access token válido.
- Logout revoca la sesión y elimina la cookie.
- Registro respeta `PUBLIC_SIGNUP`.
- El frontend redirige rutas protegidas usando `proxy.ts` y valida sesión contra la API.
- Backend pasa typecheck y frontend pasa build.
