# Repository Guidelines

This guide helps contributors ship features confidently in `my-weibo-next`.

## Project Structure & Module Organization
- `src/app`: App Router routes, layouts, API handlers.
- `src/components`: Shared UI building blocks; colocate component-specific styles.
- `src/hooks`: Reusable client hooks; prefix with `use`.
- `src/lib`: Utilities, API helpers, Prisma adapters.
- `prisma`: `schema.prisma`, migrations, generated client.
- `public`: Static assets, icons; `scripts`: Node helpers for maintenance.

## Build, Test, and Development Commands
- `npm run dev` / `bun run dev`: Turbopack dev server.
- `npm run build`: Production build verification.
- `npm run start`: Serve compiled output locally.
- `npm run lint`: Biome lint + type-aware checks.
- `npm run format`: Biome formatting fixer.
- `npm run db:generate`: Rebuild Prisma client after schema tweaks.
- `npm run db:reset`: Reset database and rerun migrations (destructive).

## Coding Style & Naming Conventions
- TypeScript + React function components; PascalCase components, camelCase utilities.
- Keep hooks in `src/hooks` and start names with `use`.
- Prefer async/await and explicit return types for exported helpers.
- Rely on Biome (2-space indent, trailing commas) for formatting and linting.
- Tailwind classes follow logical grouping; avoid inline style objects unless necessary.

## Testing Guidelines
- Co-locate tests near features (`src/app/feed/feed.test.tsx`) or mirror folders under `src/__tests__`.
- Focus on data transforms and interactive flows; snapshot only complex layouts.
- Run `npm run lint` and smoke test with `npm run dev` before opening a PR, and document manual verification.

## Commit & Pull Request Guidelines
- Use Conventional Commits (`feat:`, `fix:`, `perf:`…) as seen in history; keep subjects ≤72 chars.
- Each PR needs a clear summary, linked issue or task ID, and UI evidence (screenshots/video) for visual changes.
- Mention schema updates, required migrations, or environment steps in the PR body.
- Rebase onto `main` before review; avoid merge commits.

## Database & Environment Setup
- Copy `.env.example` → `.env.local` and set `DATABASE_URL` (e.g., Postgres).
- After editing `schema.prisma`, run `npm run db:generate`; when migrations change, follow with `npm run db:reset` on local dev only.
- Treat `.env*` files as secrets; never commit credentials or tokens.
