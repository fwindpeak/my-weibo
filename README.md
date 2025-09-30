# My Weibo · Vite + Elysia

A Bun-powered React app built with Vite on the client and an Elysia API server backed by Prisma.

## Development

1. Install dependencies

   ```bash
   bun install
   ```

2. Start the API server (defaults to `http://localhost:3000`):

   ```bash
   bun run dev
   ```

3. Start the Vite dev server for the React UI (defaults to `http://localhost:5173`):

   ```bash
   bun run dev:client
   ```

   Vite proxies `/api` and `/uploads` to the Elysia server, so the UI works without extra configuration. To target a remote API, set `VITE_API_BASE_URL` when launching Vite.

## Building

Generate the production React bundle **and** compile the Elysia server into a standalone executable:

```bash
bun run build
```

- Client assets are emitted to `dist/client`.
- A self-contained binary is written to `build/my-weibo` with the client bundle embedded. Run it directly:

  ```bash
  ./build/my-weibo
  ```

The server will serve both the API and static UI on the configured port (default `3000`). Uploaded files are saved to `public/uploads`; ensure the process has write access there.

## Useful Commands

- `bun run build:client` – Vite production build only.
- `bun run build:server` – rebuild the executable after updating server code.
- `bun run lint` – Biome static analysis.
- `bun run db:generate` / `bun run db:reset` – Prisma workflows.

## Environment

- `PORT` – Server bind port (defaults to 3000).
- `VITE_API_BASE_URL` – Optional base URL for frontend requests in development.
- Prisma expects `DATABASE_URL` in your `.env.local`.

## Stack

- React 19 + Vite 6
- Tailwind CSS v4
- Elysia 1.4 on Bun 1.2
- Prisma ORM
