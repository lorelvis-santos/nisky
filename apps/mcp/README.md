# Nisky MCP Server

Servidor MCP (Model Context Protocol) que expone los proyectos, bloques de tiempo y tareas de Nisky a asistentes de IA (opencode, Claude Desktop, etc.).

```
[Cliente MCP] --HTTPS + PAT--> [este servidor] --HTTPS + PAT--> [Nisky backend]
```

El servidor es stateless: no guarda tokens, no guarda estado de sesión. Cada petición lleva el Personal Access Token (PAT) del usuario en el header `Authorization`, y el servidor lo reenvía al backend, que valida y aísla los datos por `userId`.

## Tools disponibles (12)

| Tool | Descripción |
|---|---|
| `list-projects` | Lista los proyectos del usuario |
| `create-project` | Crea un proyecto (máx. 20, nombre único) |
| `update-project` | Actualiza nombre/color |
| `list-timeblocks` | Lista bloques de tiempo |
| `get-timeblock-active` | Bloque activo ahora |
| `get-timeblocks-today` | Bloques que aplican hoy |
| `create-timeblock` | Crea un bloque semanal (valida solapes) |
| `update-timeblock` | Actualiza un bloque |
| `list-tasks` | Lista tareas con filtros y paginación |
| `get-task` | Obtiene una tarea por id |
| `create-task` | Crea una tarea |
| `update-task` | Actualiza una tarea |

Sin tools de borrado por diseño.

## Despliegue

### Requisitos

- Docker (para el Dockerfile provisto)
- Una instancia desplegada del backend de Nisky

### Opción 1: Docker

```bash
docker build -t nisky-mcp apps/mcp
docker run -d -p 8787:8787 \
  -e NISKY_API_URL=https://api.tu-nisky.com/api/v1 \
  --name nisky-mcp nisky-mcp
```

### Opción 2: local (dev)

```bash
cd apps/mcp
bun install
NISKY_API_URL=http://localhost:4000/api/v1 bun run dev
```

### Variables de entorno

| Variable | Default | Descripción |
|---|---|---|
| `NISKY_API_URL` | `http://localhost:3000/api/v1` | URL base del backend de Nisky |
| `MCP_PORT` | `8787` | Puerto HTTP del servidor |
| `RATE_LIMIT_PER_MIN` | `60` | Máximo de peticiones por minuto por usuario |

Después del despliegue el endpoint MCP queda en `https://<tu-host>/mcp`.

## Uso

### 1. Crear un token de acceso (PAT)

En la aplicación web de Nisky: **Ajustes → Seguridad → Tokens de acceso → Crear token**.

Copia el token (`nisky_pat_...`). Solo se muestra una vez. Puedes revocarlo en cualquier momento desde esa misma pantalla.

### 2. Configurar el cliente MCP

#### opencode (`opencode.json`)

```json
{
  "mcp": {
    "nisky": {
      "type": "remote",
      "url": "https://<tu-host>/mcp",
      "headers": {
        "Authorization": "Bearer nisky_pat_XXXX"
      }
    }
  }
}
```

#### Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "nisky": {
      "url": "https://<tu-host>/mcp",
      "headers": {
        "Authorization": "Bearer nisky_pat_XXXX"
      }
    }
  }
}
```

#### Otros clientes con soporte HTTP (Streamable HTTP)

Configurar la URL del endpoint y el header `Authorization: Bearer <PAT>` como credencial/personalización de cada servidor.

### 3. Probar (opcional)

```bash
curl -X POST https://<tu-host>/mcp \
  -H "Authorization: Bearer nisky_pat_XXXX" \
  -H "Accept: application/json, text/event-stream" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
```

También puedes listar las tools:

```bash
curl -X POST https://<tu-host>/mcp \
  -H "Authorization: Bearer nisky_pat_XXXX" \
  -H "Accept: application/json, text/event-stream" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

## Seguridad

- El servidor no almacena ningún token ni dato de usuario: el PAT viaja de cliente → servidor → backend y se descarta.
- Cada usuario usa su propio PAT; el backend solo devuelve sus datos (`userId` isolation).
- Rate limit por usuario: `RATE_LIMIT_PER_MIN` (default 60) con respuesta `429` y header `Retry-After`.
- Revocar el PAT en la web invalida el acceso de inmediato, sin tocar el servidor MCP.
- Cambiar la contraseña revoca todos los PATs del usuario.

## Desarrollo

```bash
cd apps/mcp
bun install
bun run typecheck   # tsc --noEmit
bun run dev         # bun --watch src/index.ts
```

Estructura:

```
apps/mcp/
├── Dockerfile          # multi-stage: deps → build → runtime
├── src/
│   ├── index.ts        # entrypoint HTTP + transporte Streamable HTTP
│   ├── client.ts       # forwarding de peticiones al backend con el PAT
│   ├── ratelimit.ts    # rate limiting in-memory por prefix de PAT
│   └── tools/
│       ├── index.ts    # registro de todas las tools
│       ├── projects.ts
│       ├── timeblocks.ts
│       └── tasks.ts
```