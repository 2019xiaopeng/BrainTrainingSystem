# Serverless Function 合并说明

> **日期**: 2026-02-23  
> **触发原因**: Vercel Hobby plan 限制 — 最多 12 个 Serverless Functions  
> **部署错误**: `Error: No more than 12 Serverless Functions can be added to a Deployment on the Hobby plan.`

---

## 1. 问题分析

### 合并前的 Function 清单（13 个，超限）

| # | 文件路径 | 职责 |
|---|---|---|
| 1 | `api/auth.ts` | Better Auth 认证入口 (catch-all) |
| 2 | `api/admin/[...path].ts` | 后台管理 API (catch-all) |
| 3 | `api/campaign/[...path].ts` | 闯关地图 API (catch-all) ← **新增** |
| 4 | `api/game/session.ts` | 训练记录提交 |
| 5 | `api/store/buy.ts` | 商城购买 |
| 6 | `api/leaderboard/coins.ts` | 积分排行 (公开) |
| 7 | `api/leaderboard/level.ts` | 段位排行 (公开) |
| 8 | `api/leaderboard/coins/me.ts` | 我的积分排名 |
| 9 | `api/leaderboard/level/me.ts` | 我的段位排名 |
| 10 | `api/user/checkin.ts` | 每日签到 |
| 11 | `api/user/profile.ts` | 用户资料 (GET/PATCH) |
| 12 | `api/user/display-name.ts` | 修改昵称 |
| 13 | `api/user/email/[...path].ts` | 邮箱变更 (catch-all) |

**超出 1 个** — 原因是 v5-dev 新增了 `api/campaign/[...path].ts`。

---

## 2. 合并策略

### 核心决策：合并 Leaderboard 路由（4 → 1）

**为什么选择 Leaderboard？**
- 4 个文件属于同一业务领域，逻辑结构高度相似
- 共享大量公共逻辑（feature flag 读取、snapshot 缓存、medal 计算）
- 前端调用 URL 不变，零侵入式改造
- 合并后节省 3 个 slot（13 → 10），留出 2 个余量给未来扩展

**为什么不选择 User 路由？**
- User 下 4 个文件职责差异大（签到/资料/改名/邮箱），合并后文件过于臃肿
- `profile.ts` 单文件 450 行，合并后维护性差
- 当前无需进一步压缩（10 < 12）

### 合并方案

```
旧结构 (4 个 Function)              新结构 (1 个 Function)
─────────────────────               ─────────────────────
api/leaderboard/coins.ts            api/leaderboard/[...path].ts
api/leaderboard/level.ts            ├── GET /coins      → handleCoins()
api/leaderboard/coins/me.ts         ├── GET /level      → handleLevel()
api/leaderboard/level/me.ts         ├── GET /coins/me   → handleCoinsMe()
                                    └── GET /level/me   → handleLevelMe()
```

---

## 3. 具体操作

### 3.1 创建合并后的路由文件

**文件**: `api/leaderboard/[...path].ts`

**结构设计**:
```
[Imports]
  ↓
[Shared Helpers]
  - getUrl()          URL 解析
  - isRecord()        类型守卫
  - medalFor()        勋章计算
  - parseSubRoute()   路由子路径解析
  - loadFeatureFlag() 公共 feature flag 读取
  - readSnapshot()    排行快照读取
  ↓
[Sub-handlers]
  - handleCoins()     原 coins.ts 的完整逻辑
  - handleLevel()     原 level.ts 的完整逻辑
  - handleCoinsMe()   原 coins/me.ts 的完整逻辑
  - handleLevelMe()   原 level/me.ts 的完整逻辑
  ↓
[Router]
  export default handler()  基于 URL path 分发到对应 sub-handler
```

**路由分发逻辑**:
```typescript
const sub = parseSubRoute(req);
// sub examples: ["coins"], ["level"], ["coins","me"], ["level","me"]

if (sub[0] === "coins" && sub[1] === "me") return handleCoinsMe(req, res);
if (sub[0] === "level" && sub[1] === "me") return handleLevelMe(req, res);
if (sub[0] === "coins" && !sub[1]) return handleCoins(req, res);
if (sub[0] === "level" && !sub[1]) return handleLevel(req, res);

res.status(404).json({ error: "not_found" });
```

> 注意：`/me` 路由必须在非 `/me` 路由之前匹配，避免 `coins/me` 被 `coins` 拦截。

### 3.2 删除旧文件

```bash
rm api/leaderboard/coins.ts
rm api/leaderboard/level.ts
rm -rf api/leaderboard/coins/    # 包含 me.ts
rm -rf api/leaderboard/level/    # 包含 me.ts
```

### 3.3 更新 vercel.json

添加 leaderboard catch-all 路由规则：

```json
{ "src": "/api/leaderboard$", "dest": "/api/leaderboard/[...path].ts" },
{ "src": "/api/leaderboard/(.*)", "dest": "/api/leaderboard/[...path].ts" }
```

**为什么需要显式路由？**

Vercel 的 `{ "handle": "filesystem" }` 只匹配精确的文件路径。`[...path].ts` 是 Next.js 的 catch-all 命名约定，Vercel Serverless Functions 的 filesystem handler **不会**自动将 `/api/leaderboard/coins` 路由到 `[...path].ts`。必须通过显式 `routes` 规则将所有 `/api/leaderboard/*` 请求指向该文件。

---

## 4. 合并后的 Function 清单（10 个）

| # | 文件路径 | 职责 | 路由方式 |
|---|---|---|---|
| 1 | `api/auth.ts` | 认证 | 显式路由 |
| 2 | `api/admin/[...path].ts` | 管理后台 | 显式路由 |
| 3 | `api/campaign/[...path].ts` | 闯关地图 | 显式路由 |
| 4 | `api/game/session.ts` | 训练记录 | filesystem |
| 5 | `api/store/buy.ts` | 商城购买 | filesystem |
| 6 | `api/leaderboard/[...path].ts` | 排行榜（合并后） | **显式路由** |
| 7 | `api/user/checkin.ts` | 签到 | filesystem |
| 8 | `api/user/profile.ts` | 用户资料 | filesystem |
| 9 | `api/user/display-name.ts` | 改名 | filesystem |
| 10 | `api/user/email/[...path].ts` | 邮箱变更 | 显式路由 |

**余量**: 10 / 12 — 还可以新增 2 个独立 Function。

---

## 5. 前端影响

**零影响** — 前端调用的 URL 路径完全不变：

| 前端 URL | 合并前入口 | 合并后入口 |
|---|---|---|
| `GET /api/leaderboard/coins` | `coins.ts` | `[...path].ts` → `handleCoins()` |
| `GET /api/leaderboard/level` | `level.ts` | `[...path].ts` → `handleLevel()` |
| `GET /api/leaderboard/coins/me` | `coins/me.ts` | `[...path].ts` → `handleCoinsMe()` |
| `GET /api/leaderboard/level/me` | `level/me.ts` | `[...path].ts` → `handleLevelMe()` |

---

## 6. vercel.json 路由规则完整清单

```json
{
  "routes": [
    { "handle": "filesystem" },
    { "src": "/api/auth$",            "dest": "/api/auth.ts" },
    { "src": "/api/auth/(.*)",        "dest": "/api/auth.ts" },
    { "src": "/api/admin$",           "dest": "/api/admin/[...path].ts" },
    { "src": "/api/admin/(.*)",       "dest": "/api/admin/[...path].ts" },
    { "src": "/api/campaign$",        "dest": "/api/campaign/[...path].ts" },
    { "src": "/api/campaign/(.*)",    "dest": "/api/campaign/[...path].ts" },
    { "src": "/api/leaderboard$",     "dest": "/api/leaderboard/[...path].ts" },
    { "src": "/api/leaderboard/(.*)", "dest": "/api/leaderboard/[...path].ts" },
    { "src": "/api/user/email$",      "dest": "/api/user/email/[...path].ts" },
    { "src": "/api/user/email/(.*)",  "dest": "/api/user/email/[...path].ts" },
    { "src": "/(.*)",                 "dest": "/index.html" }
  ]
}
```

**路由匹配顺序说明**：
1. `filesystem` — 精确匹配静态文件和直接对应的 `.ts` 文件（如 `game/session.ts`、`store/buy.ts`）
2. 显式路由 — catch-all 文件的路由分发（auth、admin、campaign、leaderboard、user/email）
3. SPA fallback — 所有其他请求返回 `index.html`

---

## 7. 未来扩展建议

如果未来新增更多 API 路由导致再次逼近 12 个上限，可按优先级考虑：

1. **合并 User 路由** (4 → 1)：将 `checkin`、`profile`、`display-name`、`email` 合并为 `api/user/[...path].ts`，可再省 3 个 slot
2. **合并 Game + Store** (2 → 1)：如果业务关联度够高，可合并为 `api/service/[...path].ts`
3. **升级 Vercel Pro plan**：Team plan 无 function 数量限制

当前 10/12 的配额足够在不升级的情况下再增加 2 个独立 Function。
