# 技术文档（Brain Flow / N-Back）

## 项目概览

这是一个基于 Vite + React 的 N-Back 训练游戏，同时内置了 better-auth 认证服务（通过 Vercel Functions 的 `/api/*` 目录提供）。前端默认以“游客模式”可试玩；注册/登录后解锁参数编辑、签到、商城等功能。

## 技术栈

- 前端：Vite + React + TypeScript
- 样式：Tailwind CSS
- 状态管理：Zustand（含持久化）
- 动画：framer-motion
- 认证：better-auth（前端 client + 后端 API）
- 数据库：Postgres（用于 better-auth 表；目前业务数据未上云）
- ORM / 迁移：drizzle-orm + drizzle-kit
- 部署：Vercel（静态站点 + Functions）

## 运行时架构

### 1) 前端（SPA）

- 入口：[main.tsx](file:///f:/N-Back/src/main.tsx) → [App.tsx](file:///f:/N-Back/src/App.tsx)
- 路由：React Router（见 [App.tsx](file:///f:/N-Back/src/App.tsx)）
- 页面：
  - `/`：训练首页配置（[HomePage.tsx](file:///f:/N-Back/src/components/pages/HomePage.tsx) + [HomeScreen.tsx](file:///f:/N-Back/src/components/screens/HomeScreen.tsx)）
  - `/train`：游戏页（[TrainPage.tsx](file:///f:/N-Back/src/components/pages/TrainPage.tsx)）
  - `/result`：结算页（[ResultPage.tsx](file:///f:/N-Back/src/components/pages/ResultPage.tsx)）
  - `/profile`：档案页（[ProfileScreen.tsx](file:///f:/N-Back/src/components/screens/ProfileScreen.tsx)）
  - `/store`：商城页（[StoreScreen.tsx](file:///f:/N-Back/src/components/screens/StoreScreen.tsx)）
  - `/signin`、`/signup`：认证页（[SignInPage.tsx](file:///f:/N-Back/src/components/pages/SignInPage.tsx)、[SignUpPage.tsx](file:///f:/N-Back/src/components/pages/SignUpPage.tsx)）

### 2) 认证服务（/api）

- Vercel Function 入口：[api/auth.ts](file:///f:/N-Back/api/auth.ts)
- Auth 配置（providers、trustedOrigins、adapter）：[api/_lib/auth.ts](file:///f:/N-Back/api/_lib/auth.ts)
- 数据库连接（drizzle）：[api/_lib/db/index.ts](file:///f:/N-Back/api/_lib/db/index.ts)
- Auth 表结构（user/session/account/verification）：[api/_lib/db/schema/auth](file:///f:/N-Back/api/_lib/db/schema/auth)

本地联调时，使用一个 Express 服务器启动 `/api/auth/*`：

- 启动脚本：[scripts/auth-dev.ts](file:///f:/N-Back/scripts/auth-dev.ts)

## 认证与会话

### 前端客户端

- better-auth client： [src/lib/auth/client.ts](file:///f:/N-Back/src/lib/auth/client.ts)
  - 默认走同域 `/api/auth`（适配 Vercel 与本地 Vite proxy）
  - 仅当 `VITE_AUTH_BASE_URL` 为 `http(s)://...` 时才会启用绝对地址

### 会话注入到 Store

- [AuthContext.tsx](file:///f:/N-Back/src/contexts/AuthContext.tsx) 通过 `useSession()` 获取 session，并更新到 Zustand：
  - `userProfile.auth.status`：`guest` / `authenticated`
  - `userProfile.auth.userId`：better-auth user id（登录态存在）

## 游客模式（业务规则实现）

### 当前规则

- 游客可以开始训练并看到单局结算
- 游客不能：
  - 编辑训练参数（首页配置区锁定）
  - 签到、购买商城物品
  - 产生训练历史/经验/脑力币等进度

### 关键实现点

- 写入拦截（游客不产生进度）：[gameStore.ts](file:///f:/N-Back/src/store/gameStore.ts)
  - `saveSession()`：游客只写 `lastSummary`，不写 history/XP/points
  - `performCheckIn()`、`purchaseProduct()`：游客直接返回失败
  - `updateGameConfig()`：游客不写入持久化配置
- UI 隐藏与引导：
  - 首页锁定参数与注册引导：[HomeScreen.tsx](file:///f:/N-Back/src/components/screens/HomeScreen.tsx)
  - 侧边栏/右侧栏/档案页在游客态隐藏进度模块：
    - [Sidebar.tsx](file:///f:/N-Back/src/components/layout/Sidebar.tsx)
    - [RightPanel.tsx](file:///f:/N-Back/src/components/layout/RightPanel.tsx)
    - [ProfileScreen.tsx](file:///f:/N-Back/src/components/screens/ProfileScreen.tsx)
  - 商城游客不可用引导：[StoreScreen.tsx](file:///f:/N-Back/src/components/screens/StoreScreen.tsx)

## 体力（Energy）与账号切换

目标：

- 游客试玩后“注册新账号”：体力继承到新账号
- 游客试玩后“登录已有账号”：体力切换为该账号自己的体力

实现方式：

- 为游客与每个 userId 单独存一份体力到 localStorage
  - `brain-flow-energy:guest`
  - `brain-flow-energy:user:<userId>`
- 通过 `brain-flow-auth-intent` 标记当前操作是 `signup` 还是 `signin`
  - 注册页/登录页在请求前写入该标记
  - store 在登录态落地时读取并清除，决定“继承”还是“切换”

实现入口：

- `setAuthProfile()` 在 [gameStore.ts](file:///f:/N-Back/src/store/gameStore.ts) 内处理体力切换与存储
- intent 写入：
  - [SignUpPage.tsx](file:///f:/N-Back/src/components/pages/SignUpPage.tsx)
  - [SignInPage.tsx](file:///f:/N-Back/src/components/pages/SignInPage.tsx)

## 数据持久化

### Zustand persist

- key：`brain-flow-storage`
- 持久化字段：`sessionHistory` / `userProfile` / `gameConfigs`
- 代码位置：[gameStore.ts](file:///f:/N-Back/src/store/gameStore.ts)

### 额外 localStorage keys

- `brain-flow-lang`：语言
- `brain-flow-energy:*`：游客与账号体力
- `brain-flow-auth-intent`：注册/登录意图（一次性）

## 数据库与迁移（better-auth 表）

- drizzle config： [drizzle.config.ts](file:///f:/N-Back/drizzle.config.ts)
- 建表（开发/上线前执行一次）：
  - `npm run db:push`

## 本地开发

1. 安装依赖：`npm install`
2. 启动认证服务：`npm run dev:auth`（默认 `http://localhost:3000`）
3. 启动前端：`npm run dev`（默认 `http://localhost:5173`）

本地代理：

- Vite 会将 `/api/auth/*` 代理到 `http://localhost:3000`（见 [vite.config.ts](file:///f:/N-Back/vite.config.ts)）

## 部署到 Vercel（单仓）

- 前端：Vite build 输出 `dist/`
- 后端：Vercel Functions 位于 `/api/*`
- 路由：见 [vercel.json](file:///f:/N-Back/vercel.json)

必须配置的环境变量（生产）：

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`（例如 `https://your-app.vercel.app`）
- `NEXT_PUBLIC_BASE_URL`（同上）

可选：

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

## 常见问题（排错速查）

### 1) 页面白屏：Invalid base URL: /api/auth

原因：`VITE_AUTH_BASE_URL` 被设置为相对路径，better-auth client 会 `new URL()` 失败。

解决：不要设置相对路径；或直接删掉 `VITE_AUTH_BASE_URL`，使用默认同域 `/api/auth`。

### 2) db:push 报 drizzle-kit replace undefined

这是 drizzle-kit 在某些数据库约束 introspect 场景的已知崩溃形态，优先升级 drizzle-kit 并重试。

