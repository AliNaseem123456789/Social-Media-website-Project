# Backend

Express 5 API, Socket.IO server and RabbitMQ workers for Circle. See [../docs/architecture.md](../docs/architecture.md) for the design.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | API with reload (`src/server.js`) |
| `npm run worker:dev` | Workers with reload (`src/workers/index.js`) |
| `npm start` / `npm run worker` | Production entrypoints |
| `npm run lint` | ESLint |
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run db:status` / `npm run db:deploy` | Migration status / apply pending migrations |
| `npm run storage:check` | Verify the storage driver: lists buckets, uploads a test image, reads it back, deletes it |

## Configuration

Copy `.env.example` to `.env`. Configuration is validated at startup, so a missing or malformed variable stops the process with a clear message.

Useful switches:

- `ENABLED_MODULES`: `*` or a list such as `auth,users,posts`
- `WORKERS` / `EMBEDDED_WORKERS`: which consumers run in the worker process, or inside the API
- `STORAGE_DRIVER`: `supabase` or `s3`
- `ENABLE_LEGACY_GRAPHQL`: mounts the deprecated `/api/graphql` feed

## Adding a module

1. Create `src/modules/<name>/` with `*.routes.js`, `*.controller.js`, `*.service.js`, `*.repository.js`, `*.schemas.js` and an `index.js` exporting `{ name, basePath, router, socket? }`.
2. Register it in `src/modules/registry.js`.
3. Publish side effects with `eventBus.publish(EVENTS.X, data)` and consume them from a worker (`src/workers/registry.js`).
