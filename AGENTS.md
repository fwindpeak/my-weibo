# Repository Guidelines

This guide helps contributors ship features confidently on the Bun + Vite + Elysia stack.

## Project Structure & Module Organization
- `src/main.tsx`: Vite bootstrapping entry for the React client.
- `src/App.tsx`: Top-level composition for the SPA shell.
- `src/server.ts`: Elysia HTTP server (REST + static assets).
- `src/components`, `src/features`, `src/hooks`, `src/lib`, `src/providers`, `src/types`: Shared UI and logic modules; colocate styles with components.
- `src/lib/schema.ts`: Drizzle ORM schema definitions。
- `public`: Static assets (served by Vite/Elysia); `scripts`: Bun/Node helpers for maintenance.

## Build, Test, and Development Commands
- `bun run dev`: Start the Elysia API server with hot reload.
- `bun run dev:client`: Launch the Vite dev server for the React UI.
- `bun run build`: Build the Vite client bundle and compile the Bun executable (see `package.json`).
- `bun run lint`: Biome lint + type-aware checks.
- `bun run format`: Biome formatting fixer.
- Database schema defined in `src/lib/schema.ts` is initialized automatically on server startup.

## Coding Style & Naming Conventions
- TypeScript + React function components; PascalCase components, camelCase utilities.
- Keep hooks in `src/hooks` and start names with `use`.
- Prefer async/await and explicit return types for exported helpers and server modules.
- Rely on Biome (2-space indent, trailing commas) for formatting and linting.
- Tailwind classes follow logical grouping; avoid inline style objects unless necessary.

## Testing Guidelines
- Co-locate tests near features (`src/features/feed/feed.test.tsx`) or mirror folders under `src/__tests__`.
- Focus on data transforms and interactive flows; snapshot only complex layouts.
- Run `bun run lint` and smoke test with `bun run dev` / `bun run dev:client` before opening a PR, and document manual verification.

## Commit & Pull Request Guidelines
- Use Conventional Commits (`feat:`, `fix:`, `perf:`…) as seen in history; keep subjects ≤72 chars.
- Each PR needs a clear summary, linked issue or task ID, and UI evidence (screenshots/video) for visual changes.
- Mention schema updates, required migrations, or environment steps in the PR body.
- Rebase onto `main` before review; avoid merge commits.

## Database & Environment Setup
- Copy `.env.example` → `.env.local` and set `DATABASE_URL`（例如 `file:./sqlite.db`）。
- After editing `src/lib/schema.ts`, ensure new fields are reflected in the runtime initialization SQL inside `src/lib/db.ts` if manual adjustments are required.
- Treat `.env*` files as secrets; never commit credentials or tokens.
