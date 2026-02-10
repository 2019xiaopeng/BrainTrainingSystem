# 文件树与职责速览

下面是“理解项目 + 快速定位问题”的最小文件树（省略了大量 UI 组件的细节文件）。

## 根目录

```
.
├─ api/                  # Vercel Functions（后端）
├─ docs/                 # 文档
├─ public/               # 静态资源（音效/图片）
├─ scripts/              # 本地辅助脚本（auth dev server）
├─ src/                  # 前端 SPA
├─ drizzle.config.ts     # drizzle-kit 配置（迁移/推送）
├─ vercel.json           # Vercel 路由与 SPA fallback
├─ vite.config.ts        # Vite 配置（含 /api/auth 代理）
├─ env.example           # 环境变量模板（无敏感信息）
└─ README.md
```

## 后端（api/）

```
api/
├─ auth.ts               # better-auth 入口（Vercel Function）
├─ game/
│  └─ session.ts          # 训练结算写入（XP/体力/解锁/每日奖励/历史）
├─ store/
│  └─ buy.ts              # 商城购买（扣币/加体力/道具）
└─ user/
   ├─ profile.ts          # 读取档案（含聚合统计/历史/解锁/热力图）
   └─ checkin.ts          # 每日签到（streak/奖励/补签卡）
└─ _lib/
   ├─ auth.ts            # better-auth 配置（adapter/providers/trustedOrigins）
   └─ db/
      ├─ index.ts        # drizzle 连接
      └─ schema/
         ├─ index.ts     # schema 汇总
         ├─ auth/        # better-auth 表：user/session/account/verification
         └─ game.ts      # game_sessions / user_unlocks / daily_activity
```

定位后端问题常用入口：

- 认证路由是否工作：`/api/auth/*` → [api/auth.ts](file:///f:/N-Back/api/auth.ts)
- trustedOrigins / baseURL： [api/_lib/auth.ts](file:///f:/N-Back/api/_lib/auth.ts)
- 数据库连接： [api/_lib/db/index.ts](file:///f:/N-Back/api/_lib/db/index.ts)
- 训练结算（XP/解锁/每日奖励）： [session.ts](file:///f:/N-Back/api/game/session.ts)
- 档案聚合（totalScore/maxNLevel/streak/history）： [profile.ts](file:///f:/N-Back/api/user/profile.ts)
- 签到（check_in_last_date/check_in_streak）： [checkin.ts](file:///f:/N-Back/api/user/checkin.ts)

## 前端（src/）

```
src/
├─ App.tsx               # 路由入口
├─ layouts/
│  └─ MainLayout.tsx      # 三栏布局（Desktop）+ Mobile 单列 + 底部导航
├─ contexts/
│  └─ AuthContext.tsx    # 监听 session → 写入 store（游客/登录态切换）
├─ lib/
│  └─ auth/client.ts     # better-auth client（同域 /api/auth）
├─ store/
│  └─ gameStore.ts       # Zustand：游戏/体力/签到/商城/游客拦截核心逻辑
├─ components/
│  ├─ pages/             # 路由页封装（signin/signup/home/train/result）
│  ├─ screens/           # 主要屏幕（Home/Game/Result/Profile/Store）
│  │  └─ RankScreen.tsx   # 移动端 Rank 页（承载右栏的 History/Leaderboard）
│  ├─ layout/            # Sidebar、RightPanel、MobileNav
│  └─ profile/           # 档案页组件（热力图/雷达/段位等）
└─ types/
   └─ game.ts            # 领域模型：体力、档案、里程碑、配置等
```

定位前端问题常用入口：

- 游客/登录态切换： [AuthContext.tsx](file:///f:/N-Back/src/contexts/AuthContext.tsx)
- 游客禁用规则（不落盘、不加经验/币/签到等）： [gameStore.ts](file:///f:/N-Back/src/store/gameStore.ts)
- 训练参数锁定与提示： [HomeScreen.tsx](file:///f:/N-Back/src/components/screens/HomeScreen.tsx)
- 白屏/认证请求： [client.ts](file:///f:/N-Back/src/lib/auth/client.ts)
- 移动端底部导航： [MobileNav.tsx](file:///f:/N-Back/src/components/layout/MobileNav.tsx)
- 训练路由页（含 StageFrame 比例约束）： [TrainPage.tsx](file:///f:/N-Back/src/components/pages/TrainPage.tsx)

## 本地联调脚本（scripts/）

```
scripts/
└─ auth-dev.ts           # 本地启动 /api/auth（便于 Vite 代理联调）
```

---

## 架构师视角：当前结构是否冗杂？

整体评价：当前项目结构“主干清晰、边缘略有历史包袱”，已具备可持续演进的骨架（Router + Layout + Store + Vercel Functions）。冗杂点主要来自“从单页状态机迁移到 Router 架构”的过渡残留，以及“前后端存在重复计算逻辑”。

建议关注的冗杂/风险点（从高到低）：

- **状态源重复（前后端都算一遍）**：解锁逻辑、段位/等级、统计（streak/brainStats）既在前端做乐观更新，也在后端落库/聚合。短期可接受，但长期建议明确“后端权威、前端只做乐观展示 + 对账”，并把同一套阈值/公式沉淀为共享模块或接口契约。
- **Store 中可能存在 Router 迁移遗留字段**：`currentView/goToGame/goHome` 等看起来像旧的 view-state 路由方式；现在已由 React Router 驱动，后续可考虑清理以降低认知负担。
- **组件复用边界可以更清晰**：RightPanel 与 RankScreen 存在 UI 复用空间（History/Leaderboard tab）。建议抽出可复用的 `HistoryPanel` / `LeaderboardPanel` 组件，减少未来重复修改。
- **文档与实现易漂移**：PRD/ROADMAP/TREE 多文档并存很好，但建议在 TREE 中明确“权威来源”层级（例如：数据库以 Drizzle schema 为准、接口以 api/ 代码为准），并在 ROADMAP 里只记录“待办与验收标准”，减少重复描述。
