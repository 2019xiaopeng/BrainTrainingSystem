# Brain Flow 深度开发路线图 (Detailed Roadmap)

> **文档状态**: 活跃 (Active)
> **最后更新**: 2026-02-11
> **目标**: 将项目从 "本地 MVP" 推进到 "全栈闭环商业化产品"。
> **前置条件**: 
> 1. 已完成基础游戏逻辑 (Numeric/Spatial/Mouse/House)。
> 2. 已集成 Better-Auth (本地 PostgreSQL 表已建)。
> 3. 前后端双终端启动环境已就绪。

---

## 📅 Phase 6: 云端数据同步与核心资产闭环 (Cloud Sync & Core Assets)
**目标**: 打通“本地游戏”与“云端数据库”的任督二脉，确保用户玩游戏能产生持久化数据。

### 6.1 数据库表结构完善 (Schema Migration)
- [x] **设计并执行迁移**: 
    - `users`: 扩充字段 (xp, brain_coins, energy_current, energy_updated_at, brain_radar_json)。
    - `game_sessions`: 存储每一局的游戏结果 (user_id, game_mode, n_level, score, accuracy, timestamp)。
    - `user_unlocks`: 存储解锁状态 (user_id, game_id, unlocked_params, updated_at)。
- [x] **后端 API 开发 (tRPC/NextAPI)**:
    - `POST /api/game/session`: 接收游戏结果，**原子性**地更新 Session 表、XP、Brain Coins。
    - `GET /api/user/profile`: 获取用户画像 (XP/体力/签到/解锁等；雷达图后端计算并回写 users.brain_stats)。

### 6.2 游戏结算逻辑上云 (Sync Logic)
- [x] **前端改造**:
    - 在 `GameScreen` 结算时，判断登录状态。
    - 若已登录，调用 `POST /api/game/session`。
    - 若未登录，暂存 LocalStorage (暂不实现复杂合并，仅提示注册)。
- [x] **热力图数据源切换**:
    - 后端在 `POST /api/game/session` 写入 `daily_activity(total_xp, sessions_count)` 聚合数据。
    - 前端 Profile 热力图从云端 `daily_activity` 取数（通过 `GET /api/user/profile` 返回当年聚合记录）。

### 6.3 静态资源私有化 (Assets)
- [ ] **图标/插画替换**:
    - 梳理所有外部链接图片 (Unsplash/IconFont)。
    - **行动**: 使用开源 SVG 库 (Lucide, Heroicons) 或 AI 生成专属图标，存入 `/public/assets`。
    - 确保无版权风险，且风格统一 (Zen/Morandi)。

---

## 🚀 Phase 7: 认证体系深化与社交 (Auth & Social)
**目标**: 完善登录方式，让用户不仅能存数据，还能展示自我。

### 7.1 第三方认证集成 (OAuth)
- [ ] **Google OAuth**:
    - 在 Google Cloud Console 申请 Client ID/Secret。
    - 在 Better-Auth 配置 Provider。
    - 验证：点击“Google 登录” -> 跳转 -> 回调 -> 创建用户。
- [ ] **邮箱验证 (Email Verification)**:
    - [x] 集成 Resend（服务端发信，前端不接触密钥）。
    - [x] 邮箱验证改为 6 位验证码（Better Auth email-otp），注册后自动发送验证码。
    - [x] 忘记密码/重置密码/修改密码使用 Better Auth 内置能力（重置密码同样使用 6 位验证码）。
    - [x] 路由补齐：/forgot-password、/reset-password、/change-password、/verify-email。

### 7.2 用户资料管理 (Profile Management)
- [ ] **头像上传**:
    - 接入 Supabase Storage 或简单的 Base64 (小图片)。
    - 允许用户上传自定义头像，或选择预设的“极简几何头像”。
- [x] **昵称修改（道具制）**:
    - 引入“改名卡”，消耗后可修改显示名称（Profile 内入口）。
- [ ] **用户资料页重构（减少拥挤）**:
    - 将头像/昵称/安全设置拆到独立页面或 Drawer，Profile 主面板只保留关键信息概览。

### 7.3 排行榜系统 (Leaderboard)
- [ ] **后端 API**:
    - `GET /api/leaderboard/coins`: 按 Brain Coins（积分）Top N（总榜/周榜可选）。
    - `GET /api/leaderboard/level`: 按 Brain Level（Lv）Top N；同 Lv 再按 XP/Coins 作为 tie-break。
- [ ] **前端 UI**:
    - 将排行榜移入独立页面（例如 `/rank` 里切 Tab：积分榜 / Lv 榜）。
    - 增加“我的排名”高亮显示。
#### 7.3.1 排行榜性能与缓存策略 (Caching & Performance)
- [ ] **客户端缓存（体验优先）**:
    - 切换 Tab 不清空列表；使用本地缓存 + TTL（例如 30-120s）避免重复请求。
    - 采用 “stale-while-revalidate”：先展示缓存，再后台刷新并平滑更新。
    - 可选：引入 React Query / SWR 统一处理缓存、去重、并发合并、失败重试。
- [ ] **服务端缓存（降 DB 压力）**:
    - API 增加 `Cache-Control: public, max-age=30, stale-while-revalidate=120`（可被 CDN/浏览器复用）。
    - 服务端进程内缓存或 Redis 缓存 TopN 结果（30-60s）。
    - “我的排名”接口结果同样缓存，避免频繁 count(*)。
#### 7.3.2 数据预聚合 (Pre-aggregation)
- [ ] **索引与基础优化（先做）**:
    - `users(brain_coins desc)`、`users(brain_level desc, xp desc)` 等索引，确保 TopN 查询快速。
- [ ] **快照表/物化视图（上量后）**:
    - 建 `leaderboard_snapshot(kind, computed_at, payload_json)` 或物化视图，定时任务每 1-5 分钟刷新。
    - API 直接读取最新快照，避免每次请求实时排序与聚合。

---

## 💎 Phase 8: 经济系统与元游戏 (Economy & Metagame)
**目标**: 构建循环机制 (Core Loop)，让用户玩得越久越爽。

### 8.1 经验与等级 (XP & Rank)
- [x] **后端计算**:
    - 已在 `POST /api/game/session` 实现 PRD 3.3 的 XP 公式与等级阈值，并返回 `xpEarned/xpAfter/brainLevelAfter`。
- [x] **升级事件**:
    - 结算响应已增加 `brainLevelBefore/brainLevelAfter/levelUp`。
- [x] **前端反馈**:
    - 结果页已实现“升级弹窗”动效。
    - 首页已展示 LV 徽章（基于 Rank 计算）。

### 8.2 体力系统 (Energy System)
- [x] **后端逻辑 (Lazy Calc)**:
    - 实现“惰性恢复”算法：`current = min(5, prev + (now - last_update)/4h)`。
    - 每次请求 Profile/结算写入时更新体力值。
- [ ] **前端限制**:
    - [x] 开始游戏前检查并扣除本地体力（游客态也适用）。
    - [x] 结算写入时服务端校验体力（体力不足拒绝记录本局）。
    - [x] 倒计时组件：显示“距离下一点体力恢复还有 XX:XX”。

### 8.3 虚拟商城 (Store)
- [x] **商品配置**:
    - 数据库 `products` 表 (ID, type, price_coins, rewards, is_active)。
- [x] **购买逻辑**:
    - 已实现 `POST /api/store/buy`：服务端扣除 Brain Coins(积分) -> 增加体力/道具，并持久化 `owned_items/inventory`。
- [x] **前端商城页面**:
    - 已对接后端购买接口，购买结果以服务端余额为准。

---

## 🎮 Phase 9: 游戏化深度与解锁体系 (Gamification)
**目标**: 让游戏不仅仅是枯燥的训练，而是有目标的闯关。

### 9.1 解锁树实现 (Unlock Tree)
- [x] **后端校验**:
    - 已在 `POST /api/game/session` 中校验“本局参数是否已解锁”，未解锁直接拒绝写入。
    - 已在结算时按 `accuracy >= 90%` 计算并更新 `user_unlocks`（并返回 `newlyUnlocked`；首通奖励 Brain Coins 已调整为 +20/条，不返还体力）。
- [ ] **前端可视化**:
    - 首页模式选择器改造为“技能树”或“闯关地图”样式。
    - 锁定的关卡显示灰色锁头图标。

### 9.2 每日任务与签到 (Daily Tasks)
- [x] **签到系统**:
    - 已实现 `POST /api/user/checkin`，并在 `users` 记录 `check_in_last_date/check_in_streak`（当前未使用 `daily_checkins` 表）。
- [x] **每日首胜**:
    - 已在 `POST /api/game/session` 判断当日是否已有 `game_sessions` 记录，并发放首胜奖励（返回 `dailyFirstWinBonus`）。
- [x] **每日完美 (Daily Perfect)**:
    - 已实现：每日首次 `accuracy == 100%` 额外奖励。

---

## 📱 Phase 10: 移动端适配与 PWA (Mobile Polish)
**目标**: 随时随地都能玩，体验像原生 App。

### 10.1 响应式布局终极优化
- [x] **布局重构**:
    - Mobile 端底部导航增加 Rank 入口（承载右侧栏的 History/Leaderboard）。
    - 训练页面增加 StageFrame，按模式强制约束 16:9 或 4:3 区域宽度上限。
- [ ] **PWA 配置**:
    - 完善 `manifest.json`。
    - 添加离线 Service Worker (缓存静态资源)。
    - 添加“添加到主屏幕”引导。

---

## 🧱 Phase 11: 性能与架构升级 (SSR / Next.js / Caching)
**目标**: 解决 SPA 常见体验问题（登录闪烁、排行榜加载慢），并为后续内容型功能（周报/高级报告/AI 指导）打好基础。

### 11.1 SSR 与渲染模式认知 (CSR vs SSR)
- [ ] **定义**:
    - CSR（当前 Vite SPA 主模式）：浏览器拉取 JS 后渲染页面，易出现“登录态短暂 Guest”。
    - SSR：服务端先渲染 HTML，再由客户端 Hydration 接管交互，首屏可携带已登录用户信息。
    - SSG/ISR：面向静态/半静态内容页（帮助文档、营销页、公开报告）。

### 11.2 升级路线（先优化 SPA，再评估 Next.js）
- [ ] **阶段 A：保持 Vite SPA（最高性价比）**:
    - 引入 auth/profile 的 loading 态 + skeleton，避免 Guest 闪现。
    - 排行榜采用“客户端缓存 + 服务端缓存 + 预聚合”组合（见 7.3.1/7.3.2）。
- [ ] **阶段 B：混合渲染（内容页优先）**:
    - 若需要 SEO/公开报告，可新增独立站点或子路由采用 SSR/SSG（不影响训练主流程）。
- [ ] **阶段 C：迁移到 Next.js（重构级别）**:
    - 将路由与数据获取迁移到 Next App Router。
    - 把“认证态首屏注入”作为关键收益点（减少闪烁）。
    - 后端 API 可选择继续独立部署或并入 Next Route Handlers（需统一鉴权与部署策略）。

---

## 🛡️ Phase 12: 管理员账号与运营后台 (Admin & Ops)
**目标**: 提供一套安全可审计的后台能力，用于用户治理、运营开关、排行榜管理与数据修正。

### 12.1 角色与权限模型 (RBAC)
- [ ] **用户角色**:
    - `users.role`: `member` / `admin` / `moderator`（最小可行先 `member/admin`）。
    - 管理员入口不依赖前端隐藏，所有权限必须在后端强校验。
- [ ] **初始化管理员**:
    - 通过环境变量白名单（例如 `ADMIN_EMAILS`）或一次性脚本把指定账号提升为 admin。
    - 禁止在前端写死管理员信息。

### 12.2 管理后台页面 (Admin Console)
- [ ] **路由**: `/admin`（不出现在普通导航）。
- [ ] **模块划分（Mobile 兼容）**:
    - 用户管理：搜索（email/昵称/ID）、用户详情、封禁/解封。
    - 资产与数据修正：XP/Coins/Energy/Inventory/BrainStats 的受控修改（字段白名单 + 范围校验）。
    - 运营配置：排行榜开关、周榜开关、榜单刷新频率、展示规则（TopN 数量、是否隐藏游客）。
    - 审计日志：按操作者/用户/时间筛选，支持导出。

### 12.3 后端 Admin API (Server-only)
- [ ] **鉴权**:
    - `requireAdmin(req)`：基于 Better Auth session + `users.role` 校验。
    - 所有 `/api/admin/*` 接口仅允许 admin 访问。
- [ ] **核心接口示例**:
    - `GET /api/admin/users?query=`：用户列表与搜索。
    - `GET /api/admin/users/:id`：用户详情。
    - `PATCH /api/admin/users/:id`：修改用户资产/状态（白名单字段）。
    - `POST /api/admin/users/:id/ban`、`POST /api/admin/users/:id/unban`：封禁管理。
    - `GET /api/admin/feature-flags`、`PATCH /api/admin/feature-flags`：运营开关。

### 12.4 封禁与风控 (Ban & Abuse Prevention)
- [ ] **数据结构**:
    - `users.banned_until`（或 `users.is_banned/ban_reason`）。
- [ ] **执行点**:
    - 在关键写入/敏感接口（如 `POST /api/game/session`、`POST /api/store/buy`、`POST /api/user/checkin`）统一检查并拒绝。
    - 对封禁用户返回稳定错误码（例如 `banned`），前端统一提示。

### 12.5 审计日志 (Audit Logs)
- [ ] **表结构**:
    - `admin_audit_logs(id, admin_user_id, target_user_id, action, before, after, ip, user_agent, created_at)`。
- [ ] **要求**:
    - 所有管理员写操作必须写日志（包括排行榜开关、封禁、资产调整）。
    - 后台提供查看与筛选能力。

## 📦 附录：独立开发顺序建议
建议按照 **Phase 6 -> Phase 8 -> Phase 7 -> Phase 9 -> Phase 10** 的顺序进行。
*理由*：先跑通数据和经济循环 (6, 8)，再做社交认证 (7)，最后做复杂的解锁 (9) 和移动端优化 (10)。
