# My Weibo · Vite + Elysia

Bun 驱动的 React SPA，后端使用 Elysia + Prisma。

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

- `build/server.js`：单文件 Elysia 服务，可在生产环境使用 `bun run` 执行。
- `build/client/`：静态前端资源（JS + CSS），服务端会自动托管。

启动构建后的服务（同时托管 API 与前端）：

```bash
bun run start
```

若需自定义静态资源目录，可设置 `CLIENT_ASSETS_DIR` 指向其它路径。

## 正式环境部署流程

1. **准备运行环境**：安装 Bun ≥ 1.2，并确保有可写目录用于持久化用户上传（推荐 `storage/uploads`）。
2. **配置环境变量**：复制 `.env.example` 为 `.env.production` 或 `.env.local`，设置 `DATABASE_URL`、`PORT` 等。若上传目录不在默认位置，设定 `UPLOADS_DIR`（绝对路径或相对当前项目路径）。
3. **安装依赖并构建**：

   ```bash
   bun install
   bun run build
   ```

4. **准备静态资源与上传目录**：
   - 将 `build/client/` 同步到目标服务器（如使用容器，可挂载为只读卷）。
   - 为 `UPLOADS_DIR` 指定的路径创建持久化存储，并赋予写权限；不要将真实上传文件放进 `build/` 目录。
5. **启动服务**：

   ```bash
   bun run start
   ```

   该命令会读取环境变量，侦听 `PORT`，并从 `CLIENT_ASSETS_DIR`（默认 `build/client`）与 `UPLOADS_DIR`（默认 `storage/uploads`）提供静态内容。
6. **进程托管与日志**：使用 PM2、fly.io、systemd 或 Docker 等方式守护进程，并确保错误日志被采集。

## 常用脚本

- `bun run clean`：清理 `build/` 目录。
- `bun run build:client` / `bun run build:server`：分别单独构建前端或后端。
- `bun run start:local`：直接运行 TypeScript 版本的服务，便于调试。
- `bun run lint`：Biome 静态检查。
- `bun run db:generate` / `bun run db:reset`：Prisma 常用命令。

## 环境变量

- `PORT`：服务监听端口（默认 `3000`）。
- `CLIENT_ASSETS_DIR`：生产环境下前端静态资源目录，默认 `build/client`。
- `UPLOADS_DIR`：用户上传文件的持久化目录，默认 `storage/uploads`。
- `VITE_API_BASE_URL`：开发模式下前端请求的 API 地址覆写。
- `DATABASE_URL`：Prisma 数据库连接字符串。

## 文档

- 产品设计说明：`docs/product-design.md`

## 技术栈

- React 19 + Vite 6
- Tailwind CSS v4
- Elysia 1.4（Bun 1.2）
- Prisma ORM
