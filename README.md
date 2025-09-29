# My Weibo

A front-end and back-end separated microblogging demo. The Vite-powered React SPA lives in `frontend/`, and a Go HTTP API with a SQLite database powers the back-end under `backend/`.

## Project Layout

```
backend/   Go HTTP API (chi + GORM + SQLite)
frontend/  React + TypeScript SPA built with Vite and Tailwind CSS
```

The API exposes routes compatible with the original Next.js project (`/api/auth/*`, `/api/microblogs/*`, etc.) so the UI behaviour remains familiar.

## Requirements

- Node.js 18+ (to build the SPA)
- Go 1.24+

## Backend

```bash
cd backend
# download dependencies
go mod tidy
# start the API server
go run .
```

If your environment blocks access to `proxy.golang.org`, rerun the install step with
`GOPROXY=direct go mod tidy` or configure an alternative proxy.

Environment variables:

| Variable         | Default                           | Description                                     |
| ---------------- | --------------------------------- | ----------------------------------------------- |
| `SERVER_ADDR`    | `:8080`                           | Address the API listens on                      |
| `DATABASE_PATH`  | `backend/data/weibo.db`           | SQLite database path                            |
| `UPLOAD_DIR`     | `backend/public/uploads`          | Directory to persist uploaded images            |
| `ALLOWED_ORIGINS`| `http://localhost:5173`           | Comma separated list of allowed CORS origins    |

Uploaded files are served from `GET /uploads/{filename}`.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` to access the SPA. Configure the API origin by setting `VITE_API_BASE_URL` in a `.env` file under `frontend/` when the backend runs on a different host.

An example `.env` file covering the common backend and frontend variables is provided at the repository root as `.env.example`.

## Available Scripts (frontend)

- `npm run dev` – start the Vite development server.
- `npm run build` – type-check and build the production bundle.
- `npm run preview` – preview the production build locally.

## Database

The Go service automatically migrates the schema on startup. SQLite files live under `backend/data/`; delete the database file to reset the data.

## Testing the API quickly

```bash
# With the backend running
curl http://localhost:8080/api/health
```

## Notes

- Sessions are implemented with HTTP-only cookies stored in the `sessions` table.
- Uploaded images are validated for file type and size (max 5 MB).
- Markdown content supports GitHub-flavored markdown and syntax highlighting.
