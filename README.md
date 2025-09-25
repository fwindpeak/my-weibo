# 🌟 My Weibo 个人微博网站

My Weibo 是一个面向个人使用的微博客（Microblog）网站。它提供了图文混排、Markdown 渲染、访客评论与管理员发布等能力，帮助你记录生活点滴并即时分享给读者。

## 🧭 功能概览
- **微博发布**：管理员可以通过 Markdown/Monaco 编辑器撰写内容，支持实时预览与代码高亮。
- **图片上传**：前端直接上传图片到 `public/uploads`，单文件大小限制为 5MB，并在发布前提供缩略图预览与删除功能。
- **内容检索**：顶部搜索框支持按关键字实时过滤微博内容。
- **互动能力**：读者可以点赞、展开/收起评论区；登录用户与游客均可发表评论，游客需填写昵称与邮箱。
- **管理员工作台**：通过隐藏入口打开管理员登录弹窗，登录后可发布、编辑微博内容。
- **时间展示**：支持相对时间（“几分钟前”）与完整时间的双视图展示。
- **实时服务**：内置 Socket.IO Echo 服务示例，展示如何与实时能力集成。
- **健康检查**：`GET /api/health` 返回应用存活状态，方便部署环境做探活。

## 🛠️ 技术栈
- **框架**：Next.js 15（App Router）+ TypeScript 5
- **样式**：Tailwind CSS 4、shadcn/ui 组件库、Lucide 图标
- **数据层**：Prisma ORM + SQLite（默认数据库位于 `db/custom.db`）
- **富文本**：React Markdown、remark-gfm、rehype-highlight、Monaco Editor 包装组件
- **文件上传**：基于 Next.js Route Handler，将图片写入磁盘
- **实时通信**：Node.js 自定义服务器 (`server.ts`) 集成 Socket.IO
- **状态与工具**：React Hooks、Zustand、TanStack Query 等（根据需要逐步接入）

## 📁 目录结构
```
├── prisma/            # Prisma schema 与迁移
├── public/uploads/    # 本地存放上传图片的目录
├── scripts/           # 实用脚本（如管理员初始化）
├── src/
│   ├── app/           # Next.js App Router 页面与 API Route Handlers
│   ├── components/    # 通用组件（含 auth、ui 等子目录）
│   ├── hooks/         # 自定义 React hooks
│   └── lib/           # 数据库、Socket 等工具
└── server.ts          # 自定义服务器入口（Next.js + Socket.IO）
```

## 🚀 快速开始
1. **安装依赖**（推荐使用 pnpm，也可使用 npm/yarn）：
   ```bash
   pnpm install
   ```
2. **配置环境变量**：在项目根目录创建 `.env` 文件，至少包含
   ```env
   DATABASE_URL="file:./db/custom.db"
   ```
3. **同步数据库结构**：
   ```bash
   pnpm run db:push
   ```
4. **初始化管理员账号**（默认账号密码 `admin / admin123`，可按需修改脚本）：
   ```bash
   pnpm exec tsx scripts/init-admin.ts
   ```
5. **启动开发环境**（默认监听 `http://localhost:3000`）：
   ```bash
   pnpm run dev
   ```
   该命令会通过 `nodemon` 监视 `server.ts` 与源码变更，并将日志写入 `dev.log`。

> 生产环境可使用 `pnpm run build` 构建，再通过 `pnpm run start` 启动。

## 📡 常用脚本
- `pnpm run dev`：本地开发（Next.js + Socket.IO 自定义服务器）
- `pnpm run build`：打包生产版本
- `pnpm run start`：以生产模式启动自定义服务器
- `pnpm run lint`：执行 Next.js 内置 ESLint 校验
- `pnpm run db:push`：将 Prisma Schema 同步到数据库
- `pnpm run db:migrate`：创建并应用迁移（开发环境）
- `pnpm run db:reset`：重置数据库（慎用）

## 🔐 身份与权限
- 管理员登录入口隐藏在首页右上角的“管理员”按钮里。
- 管理员账号存储在 `User` 表，使用 `/api/auth/admin-login` 校验用户名/邮箱 + 明文密码（示例用途，生产需加密）。
- 普通访客可直接评论，但需要填写昵称与邮箱；若未来接入 `/api/auth/login` 即能支持注册/登录读者账号。
- 微博的创建与编辑仅限管理员；点赞与游客评论无需登录。

## 🧩 API 概览
- `GET /api/microblogs`：获取全部微博，支持 `?search=关键字`。
- `POST /api/microblogs`：管理员发布微博（需传 `content`、`userId` 及可选图片信息）。
- `PUT /api/microblogs/:id`：管理员更新微博文本内容。
- `POST /api/microblogs/:id/like` / `DELETE .../like`：为微博点赞或清空点赞。
- `GET /api/microblogs/:id/comments`：按时间倒序返回评论。
- `POST /api/microblogs/:id/comments`：登录用户或游客发表评论，游客需提供 `guestName` 与 `guestEmail`。
- `POST /api/upload`：上传图片文件，返回可直接引用的相对 URL。
- `POST /api/auth/admin-login`：管理员登录。
- `POST /api/auth/login`：创建/登录普通用户（目前前端未接入，可用于后续扩展）。
- `GET /api/health`：健康检查端点。

## 🗃️ 数据模型
| 模型 | 说明 |
| --- | --- |
| `User` | 用户信息，包含管理员标记与可选明文密码字段（示例）。|
| `Microblog` | 微博正文、关联图片/评论/点赞以及作者信息。|
| `Image` | 微博图片地址与描述，随微博删除自动级联删除。|
| `Like` | 点赞记录，目前未区分用户，主要用于计数展示。|
| `Comment` | 支持登录用户或游客，保留名称、邮箱及创建时间。|

## 🔄 前端交互要点
- Markdown 编辑器支持预览、Monaco 编辑、代码高亮，右侧徽章提醒当前模式。
- 选中图片会在发布卡片下方预览，可逐个删除。
- 列表项中可切换编辑模式，使用 Monaco 编辑器更新已有微博。
- 评论区对游客展示昵称/邮箱输入框；对已登录用户直接展示评论输入框。
- 搜索框默认折叠，点击按钮展开，支持清除关键字后回到完整列表。
- 点赞按钮采用本地 optimistic 更新，立即反馈点赞数。

## 📡 实时与拓展
`server.ts` 使用 Node.js 原生 HTTP + Socket.IO 承载 Next.js。`src/lib/socket.ts` 中提供了一个 Echo 示例，演示如何监听消息并返回响应，可据此扩展为实时通知、聊天等能力。

## ✅ 后续建议
1. 替换示例管理员密码为加密存储，接入会话管理。
2. 为点赞功能追加用户维度，避免重复计数。
3. 在 `/api/auth/login` 基础上完善普通用户注册/登录与会话持久化。
4. 扩展上传策略（如 OSS、S3 等）以满足生产环境需求。

欢迎继续完善 My Weibo，将个人微博玩出更多精彩！
