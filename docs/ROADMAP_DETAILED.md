# Brain Flow 深度开发路线图 (Detailed Roadmap)

> **文档状态**: 活跃 (Active)
> **最后更新**: 2026-02-08
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
    - `GET /api/user/profile`: 获取用户画像 (XP/体力/签到/解锁等；雷达图目前在前端侧计算)。

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
    - 集成 Resend (如前述计划)。
    - 实现“注册后发送验证邮件”逻辑。
    - 实现“忘记密码”流程。

### 7.2 用户资料管理 (Profile Management)
- [ ] **头像上传**:
    - 接入 Supabase Storage 或简单的 Base64 (小图片)。
    - 允许用户上传自定义头像，或选择预设的“极简几何头像”。
- [ ] **昵称修改**:
    - 简单的 CRUD 页面。

### 7.3 排行榜系统 (Leaderboard)
- [ ] **后端 API**:
    - `GET /api/leaderboard`: 按 `game_mode` + `n_level` 查询 Top 50。
    - 逻辑：基于 `game_sessions` 聚合 `AVG(avg_reaction_time)`，仅统计 `accuracy >= 90%` 的记录；周榜按周一 00:00 重置。
- [ ] **前端 UI**:
    - 修复移动端侧栏消失问题：将排行榜移入独立的 `/leaderboard` 路由 (Mobile) 或 侧边栏 (Desktop)。
    - 增加“我的排名”高亮显示。

---

## 💎 Phase 8: 经济系统与元游戏 (Economy & Metagame)
**目标**: 构建循环机制 (Core Loop)，让用户玩得越久越爽。

### 8.1 经验与等级 (XP & Rank)
- [x] **后端计算**:
    - 已在 `POST /api/game/session` 实现 PRD 3.3 的 XP 公式与等级阈值，并返回 `xpEarned/xpAfter/brainLevelAfter`。
- [ ] **升级事件**:
    - 结算响应增加 `levelUp: true/false`（或返回 `brainLevelBefore` 供前端自行判断）。
- [ ] **前端反馈**:
    - 制作精美的“升级弹窗”动画。
    - 个人主页展示 LV 徽章。

### 8.2 体力系统 (Energy System)
- [x] **后端逻辑 (Lazy Calc)**:
    - 实现“惰性恢复”算法：`current = min(5, prev + (now - last_update)/4h)`。
    - 每次请求 Profile/结算写入时更新体力值。
- [ ] **前端限制**:
    - [x] 开始游戏前检查并扣除本地体力（游客态也适用）。
    - [x] 结算写入时服务端校验体力（体力不足拒绝记录本局）。
    - [ ] 倒计时组件：显示“距离下一点体力恢复还有 XX:XX”（当前仅自动补点，无倒计时展示）。

### 8.3 虚拟商城 (Store)
- [ ] **商品配置**:
    - 数据库 `products` 表 (ID, 价格, 效果)。
- [ ] **购买逻辑**:
    - `POST /api/store/buy`: 扣除 Brain Coins(积分) -> 增加体力/道具。
- [x] **前端商城页面**:
    - 已实现本地商品配置与购买交互（尚未对接后端与数据库）。

---

## 🎮 Phase 9: 游戏化深度与解锁体系 (Gamification)
**目标**: 让游戏不仅仅是枯燥的训练，而是有目标的闯关。

### 9.1 解锁树实现 (Unlock Tree)
- [x] **后端校验**:
    - 已在 `POST /api/game/session` 中校验“本局参数是否已解锁”，未解锁直接拒绝写入。
    - 已在结算时按 `accuracy >= 90%` 计算并更新 `user_unlocks`（并返回 `newlyUnlocked`；首通返还体力已实现）。
- [ ] **前端可视化**:
    - 首页模式选择器改造为“技能树”或“闯关地图”样式。
    - 锁定的关卡显示灰色锁头图标。

### 9.2 每日任务与签到 (Daily Tasks)
- [x] **签到系统**:
    - 已实现 `POST /api/user/checkin`，并在 `users` 记录 `check_in_last_date/check_in_streak`（当前未使用 `daily_checkins` 表）。
- [ ] **每日首胜**:
    - 逻辑：判断 `game_sessions` 今日是否有记录，并发放首胜奖励。
- [x] **每日完美 (Daily Perfect)**:
    - 已实现：每日首次 `accuracy == 100%` 额外奖励。

---

## 📱 Phase 10: 移动端适配与 PWA (Mobile Polish)
**目标**: 随时随地都能玩，体验像原生 App。

### 10.1 响应式布局终极优化
- [ ] **布局重构**:
    - 彻底解决“右侧栏消失”问题：Mobile 端底部增加 TabBar (Home, Rank, Profile)。
    - 游戏区域 (`GameStage`) 强制保持 16:9 或 4:3，防止键盘遮挡。
- [ ] **PWA 配置**:
    - 完善 `manifest.json`。
    - 添加离线 Service Worker (缓存静态资源)。
    - 添加“添加到主屏幕”引导。

---

## 📦 附录：独立开发顺序建议
建议按照 **Phase 6 -> Phase 8 -> Phase 7 -> Phase 9 -> Phase 10** 的顺序进行。
*理由*：先跑通数据和经济循环 (6, 8)，再做社交认证 (7)，最后做复杂的解锁 (9) 和移动端优化 (10)。
