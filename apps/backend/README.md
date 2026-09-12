# Nisky Backend

API modular de Nisky.

```bash
cp .env.example .env
bun install
bun run db:migrate
bun run db:seed
bun run dev
```

API base: `http://localhost:4000/api/v1`.

UASD runs outside the API process so its durable queue and distributed limits
work with multiple backend replicas:

```bash
bun run worker:uasd
```

En producción se pueden ejecutar varias réplicas del worker usando las mismas
instancias de PostgreSQL y Redis. PostgreSQL guarda los jobs y sus leases;
`FOR UPDATE SKIP LOCKED` evita que dos workers procesen el mismo job, mientras
Redis limita la concurrencia global, por usuario, por cuenta y por host UASD.

Cada cuenta está aislada por `userId`. Una conexión UASD nueva sincroniza dentro
de la petición de conexión; las sincronizaciones manuales y programadas usan
jobs durables con reintentos y recuperación de leases. El worker imprime un
resumen por job con usuario, resultado, cantidades y duración. Para depurar
temporalmente cada request, usa `UASD_VERBOSE_LOGS=true`.
