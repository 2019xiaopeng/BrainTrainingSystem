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
└─ _lib/
   ├─ auth.ts            # better-auth 配置（adapter/providers/trustedOrigins）
   └─ db/
      ├─ index.ts        # drizzle 连接
      └─ schema/
         ├─ index.ts     # schema 汇总
         └─ auth/        # better-auth 表：user/session/account/verification
```

定位后端问题常用入口：

- 认证路由是否工作：`/api/auth/*` → [api/auth.ts](file:///f:/N-Back/api/auth.ts)
- trustedOrigins / baseURL： [api/_lib/auth.ts](file:///f:/N-Back/api/_lib/auth.ts)
- 数据库连接： [api/_lib/db/index.ts](file:///f:/N-Back/api/_lib/db/index.ts)

## 前端（src/）

```
src/
├─ App.tsx               # 路由入口
├─ contexts/
│  └─ AuthContext.tsx    # 监听 session → 写入 store（游客/登录态切换）
├─ lib/
│  └─ auth/client.ts     # better-auth client（同域 /api/auth）
├─ store/
│  └─ gameStore.ts       # Zustand：游戏/体力/签到/商城/游客拦截核心逻辑
├─ components/
│  ├─ pages/             # 路由页封装（signin/signup/home/train/result）
│  ├─ screens/           # 主要屏幕（Home/Game/Result/Profile/Store）
│  ├─ layout/            # Layout、Sidebar、RightPanel
│  └─ profile/           # 档案页组件（热力图/雷达/段位等）
└─ types/
   └─ game.ts            # 领域模型：体力、档案、里程碑、配置等
```

定位前端问题常用入口：

- 游客/登录态切换： [AuthContext.tsx](file:///f:/N-Back/src/contexts/AuthContext.tsx)
- 游客禁用规则（不落盘、不加经验/币/签到等）： [gameStore.ts](file:///f:/N-Back/src/store/gameStore.ts)
- 训练参数锁定与提示： [HomeScreen.tsx](file:///f:/N-Back/src/components/screens/HomeScreen.tsx)
- 白屏/认证请求： [client.ts](file:///f:/N-Back/src/lib/auth/client.ts)

## 本地联调脚本（scripts/）

```
scripts/
└─ auth-dev.ts           # 本地启动 /api/auth（便于 Vite 代理联调）
```

