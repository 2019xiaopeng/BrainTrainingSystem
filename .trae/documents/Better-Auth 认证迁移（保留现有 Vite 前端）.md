## 你关心的 3 个细节（先回答）
### 1) 本地如何跑起来做功能验证
- 结构：保留现有 Vite SPA；新增一个独立的 Auth 服务目录（从 `.temp` 迁移出来）。
- 启动方式（两种都支持）：
  1. 双终端启动
     - 终端 A：在 `auth-server/`（或 `apps/auth/`）运行 Next Auth 服务（端口例如 3000）。
     - 终端 B：在仓库根目录运行 Vite（端口 5173）。
  2. 单命令启动（可选）
     - 在根目录增加一个并发启动脚本（例如用 `concurrently`），一条命令同时起前后端。
- 联调关键点：
  - Vite 开发服务器增加一个 proxy：把浏览器请求的 `/api/auth/*` 代理到 Auth 服务。
  - 前端的 auth client 只请求同源 `/api/auth`，这样：
    - 不需要处理 CORS/跨站 cookie。
    - cookie 会落在 `localhost:5173`（由 Vite 代理返回），刷新/重开页面 session 也能保持。

### 2) 这会对你后续开发造成什么影响
- 对现有训练/经济/本地存档：不动数据结构、不改逻辑、不强制登录；因此影响很小。
- 你会多维护一个“后端目录”（Auth 服务）：
  - 后续你要做数据库（PRD 里 users/game_sessions/heatmap 等）时，可以选择：
    - 继续把这些 API 放进同一个后端（推荐：一个后端统一管理 DB 访问与鉴权）。
    - 或再拆一个 game-api 服务（不推荐起步就拆太细）。
- 前端会多一层“会话同步”：
  - `gameStore.userProfile.auth` 从永远 guest 变为真实 session 状态。
  - 但暂不做“本地数据合并到云端”，避免引入迁移复杂度；以后需要时再单独设计 merge。

### 3) 如何部署到 Vercel（兼容 cookie 的推荐做法）
- 建议在 Vercel 建 2 个 Project：
  1. **Auth Project**：部署 Next（Auth 服务）
  2. **Web Project**：部署 Vite SPA（现有项目）
- 关键：在 Web Project 的 `vercel.json` 里加一条 rewrite：
  - `/api/auth/(.*)` 先转发到 Auth Project 的 `/api/auth/$1`
  - 其他路径继续保持 SPA 的 `/(.*) -> /index.html`
- 这样浏览器始终访问的是 Web 域名下的 `/api/auth/*`：
  - cookie 设置在 Web 域名上（不会变成第三方 cookie）。
  - Google OAuth 回调也配置为 Web 域名下的回调路径（因为会被 rewrite 到 Auth）。
- Auth Project 的 `NEXT_PUBLIC_BASE_URL` 需要设置为 Web 的线上域名（用于生成正确的回调/跳转链接）。

## 实施计划
## A. 迁移 Auth 服务（从 `.temp` 抽出来）
1. 创建 `auth-server/`（或 `apps/auth/`）目录，并把 `.temp` 的以下模块迁移进去
   - `src/lib/auth/*`、`src/db/*`、`src/db/schema/auth/*`、`drizzle.config.ts`
   - `src/app/api/auth/[...all]/route.ts`
2. 调整 TS path alias 与导入路径，确保 Auth 服务可独立启动。
3. 配置 drizzle 连接 Supabase Postgres（使用你已有的环境变量），并执行迁移创建 auth 表。
4. 在 Auth 服务中预留 Google provider 配置（读取 `GOOGLE_CLIENT_ID/SECRET`）；即使未配置也不影响邮箱密码登录。

## B. 前端接入（保持现有功能不变）
1. 新增前端 auth client（Vite 环境）
   - 默认 baseURL 走相对路径 `/api/auth`（生产配合 rewrites、本地配合 Vite proxy）。
2. 新增 `AuthProvider`（或 hook）
   - 启动时取 session，同步到 `gameStore.userProfile.auth`。
3. 新增登录/注册页面并接入路由
   - 在 `App.tsx` 增量添加 `/signin`、`/signup`。
   - UI 复用当前 Zen 风格（`Card`、现有布局组件）。
   - 保留 Google 登录按钮 UI；删除微信登录/绑定 UI。
4. 更新 Profile 的 AuthSection
   - 游客：引导登录/注册。
   - 登录：展示账号信息 + 退出登录。
   - i18n 同步删除 `linkWechat` 相关文案。

## C. 本地验证与回归
- Auth：注册/登录/退出/刷新保持 session。
- Web：所有既有路由与训练流程不变（`/train/:mode`、`/result`、`/profile` 等）。

## D. Vercel 部署落地
1. 创建 Auth Project（Root Directory 指向 `auth-server/`）。
2. 创建 Web Project（Root Directory 指向仓库根目录）。
3. Web Project：更新 `vercel.json` rewrites（先 `/api/auth/*`，后 SPA fallback）。
4. Google Console：把回调 URI 配成 `https://<web-domain>/api/auth/callback/google`（走 rewrite）。
5. Auth Project：`NEXT_PUBLIC_BASE_URL` 指向 Web 域名；DB/Secret 等环境变量按需配置。

## 清理策略
- 迁移验证完成后，`.temp/` 可删除或保留为参考（建议删除避免双份依赖与误用）。