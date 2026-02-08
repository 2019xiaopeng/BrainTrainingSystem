# Brain Flow - 脑力心流

一个极简风格的 N-Back 脑力训练游戏（Vite + React），并内置 better-auth 认证服务（同仓 `/api/*`，可直接部署到 Vercel）。

## 功能概览

- 训练模式：数字 N-Back / 空间 N-Back / 魔鬼老鼠 / 人来人往
- 游客模式：可试玩；不产生经验/脑力币/签到/历史；不能改参数与购买
- 登录后：解锁参数编辑、签到、商城等（当前业务数据仍以本地为主）

## 技术栈

- 前端：Vite + React + TypeScript + Tailwind CSS
- 状态：Zustand（含持久化）
- 认证：better-auth（前端 client + Vercel Functions）
- 数据库：Postgres（用于 better-auth 表）
- ORM/迁移：drizzle-orm + drizzle-kit
- 部署：Vercel（静态站点 + Functions）

## 快速开始（本地）

1) 安装依赖：

```bash
npm install
```

2) 配置环境变量：复制 `env.example` 为 `.env`，并填写：

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `NEXT_PUBLIC_BASE_URL`

3) 启动认证服务（本地 /api/auth）：

```bash
npm run dev:auth
```

4) 启动前端：

```bash
npm run dev
```

默认：

- 前端：http://localhost:5173
- Auth 服务：http://localhost:3000
- Vite 会将 `/api/auth/*` 代理到 3000（见 `vite.config.ts`）

## 数据库初始化（仅第一次）

better-auth 需要创建 `user/session/account/verification` 等表：

```bash
npm run db:push
```

## 部署到 Vercel（单仓）

本项目可直接一个 Vercel 项目部署：

- 前端 build 输出：`dist/`
- Functions：`/api/*`
- 路由与 SPA fallback：`vercel.json`

在 Vercel 项目中配置环境变量（生产）：

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`（例：`https://your-app.vercel.app`，不要带 `/api/auth`）
- `NEXT_PUBLIC_BASE_URL`（同上）

可选（Google 登录）：

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

## 文档

- 技术文档：`docs/TECH.md`
- 文件树速览：`docs/TREE.md`

## 常见排错

- 白屏 `Invalid base URL: /api/auth`：不要把 `VITE_AUTH_BASE_URL` 配成相对路径；删掉该变量即可使用同域默认 `/api/auth`。
- `db:push` drizzle-kit 报 replace undefined：优先升级 `drizzle-kit` 后重试。
