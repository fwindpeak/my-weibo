# My Weibo · Vite + Elysia

Bun 驱动的 React SPA，后端使用 Elysia + Drizzle ORM。

## 开发流程

1. 安装依赖：

   ```bash
   bun install
   ```

2. 启动 API 服务（默认端口 `3000`）：

   ```bash
   bun run dev
   ```

3. 启动 Vite 前端开发服务器（默认端口 `5173`）：

   ```bash
   bun run dev:client
   ```

   Vite 会自动将 `/api` 与 `/uploads` 请求代理到 Elysia 服务。若需连到其它后端，可在启动时设置 `VITE_API_BASE_URL`。

## 生产构建

生成可直接由 Bun 运行的前后端产物：

```bash
bun run build
```

构建结果：

- `server.js`：打包后的 Elysia 服务入口，可直接执行 `bun run ./server.js`。
- `build/server.js`：与 `server.js` 内容一致，保留在 `build/` 目录中，便于自定义部署流程。
- `client/`：静态前端资源（JS + CSS），服务端会自动托管。

启动构建后的服务：

- 同时托管 API 与前端（单进程模式）：

  ```bash
  bun run serve
  # 或者
  bun run ./server.js
  ```

- 仅运行 API（静态资源交由 Nginx 等外部服务）：

  ```bash
  bun run start:api
  ```

若需自定义静态资源目录，可设置 `CLIENT_ASSETS_DIR` 指向其它路径；
通过 `SERVE_CLIENT=false` 可在自定义脚本中禁用前端托管。

## 正式环境部署流程

1. **准备运行环境**：安装 Bun ≥ 1.2，并确保有可写目录用于持久化用户上传（推荐 `storage/uploads`）。
2. **配置环境变量**：复制 `.env.example` 为 `.env.production` 或 `.env.local`，设置 `DATABASE_URL`、`PORT` 等。若上传目录不在默认位置，设定 `UPLOADS_DIR`（绝对路径或相对当前项目路径）。数据库使用 SQLite 文件，服务启动时会自动初始化所需表结构。
3. **安装依赖并构建**：

   ```bash
   bun install
   bun run build
   ```

4. **准备静态资源与上传目录**：
   - 将 `client/` 同步到目标服务器（如使用容器，可挂载为只读卷）。
   - 为 `UPLOADS_DIR` 指定的路径创建持久化存储，并赋予写权限；不要将真实上传文件放进 `build/` 目录。
5. **启动服务**：

   - 单进程模式（API + 前端）：

     ```bash
     bun run serve
     ```

   - 仅 API（静态资源由外部托管）：

     ```bash
     bun run start:api
     ```

 两种模式都会读取环境变量并侦听 `PORT`。前者会从 `CLIENT_ASSETS_DIR`（默认 `client`）提供前端资源，后者则只暴露 API 与 `/uploads`。
6. **进程托管与日志**：使用 PM2、fly.io、systemd 或 Docker 等方式守护进程，并确保错误日志被采集。

### 一键部署脚本

若希望将构建与上传自动化，可使用仓库内的 `scripts/deploy.sh`：

1. 复制 `deploy.config.example.json` 为 `deploy.config.json`，填写服务器地址、远程目录与部署后需要执行的命令。
2. 本地执行 `bun run deploy`（或直接运行 `scripts/deploy.sh`）。脚本会完成构建、打包、上传，并在远端解压后按顺序运行配置里的命令。

> ⚠️ 脚本依赖本机的 `bun`、`python3`、`ssh`、`scp`，并假设目标服务器已安装 Bun。

## 常用脚本

- `bun run clean`：清理 `build/` 目录。
- `bun run build:client` / `bun run build:server`：分别单独构建前端或后端。
- `bun run start:standalone`：从根目录 `server.js` 启动单进程服务，包含前端托管。
- `bun run serve`：`start:standalone` 的别名，便于部署脚本调用。
- `bun run start:api`：仅启动 API 服务，适合配合 Nginx/OSS 托管静态资源。
- `bun run start:local`：直接运行 TypeScript 版本的服务，便于调试。
- `bun run lint`：Biome 静态检查。
- `bun run deploy`：读取 `deploy.config.json`，打包并通过 `scp` 一键部署。

## 环境变量

- `PORT`：服务监听端口（默认 `3000`）。
- `CLIENT_ASSETS_DIR`：生产环境下前端静态资源目录，默认 `client`。
- `SERVE_CLIENT`：是否由 Elysia 托管前端资源，默认 `true`。
- `SERVE_PUBLIC`：是否托管 `public/` 静态资源，默认与 `SERVE_CLIENT` 一致。
- `UPLOADS_DIR`：用户上传文件的持久化目录，默认 `storage/uploads`。
- `VITE_API_BASE_URL`：开发模式下前端请求的 API 地址覆写。
- `DATABASE_URL`：SQLite 数据库路径（如 `file:./sqlite.db`），用于 Drizzle ORM。

## 文档

- 产品设计说明：`docs/product-design.md`

## 技术栈

- React 19 + Vite 6
- Tailwind CSS v4
- Elysia 1.4（Bun 1.2）
- Drizzle ORM (bun-sqlite)
