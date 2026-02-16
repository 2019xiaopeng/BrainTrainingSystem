# 排行榜预聚合与成本优化 Spec

## Why
当前排行榜读接口属于公共热点：在 Vercel Serverless 环境下，若每次请求都做 TopN 排序与“我的排名”count 计算，数据库成本会快速上升并成为瓶颈。需要用快照预聚合 + 缓存策略把热点读的成本压住，并把榜单开关与参数纳入运营配置。

## What Changes
- 将排行榜拆分为“公共榜单”和“我的排名”两类接口，避免个性化数据被 CDN/浏览器缓存污染。
- 使用 `leaderboard_snapshots` 作为 DB 级快照缓存；在快照过期时采用“软刷新 + 防 stampede 锁”更新快照。
- 运营配置统一由 `feature_flags.key=leaderboard` 控制（enabled + payload 参数），由 Admin Console 可配置。
- 可选实现周榜：以 UTC 周为边界，基于已有数据源实现最小可行的周榜（优先 Level 周榜）。
- 更新 `docs/ROADMAP_DETAILED.md#L65-86` 中 Phase 7.3 的描述与 checkbox 状态（实现后勾选）。

## Impact
- Affected specs: 排行榜开关、TopN/TTL 参数、游客可见性、我的排名展示、周榜可选、缓存策略与快照策略。
- Affected code:
  - 后端：`api/leaderboard/*.ts`、`api/_lib/db/index.ts`（如需索引/新表）、`api/_lib/db/schema/*`（如需新 schema）
  - 管理端：`api/admin/[...path].ts`（如需新增 admin 刷新接口）、`src/components/screens/AdminScreen.tsx`
  - 前端榜单：`src/components/leaderboard/LeaderboardWidget.tsx`、`src/components/screens/RankScreen.tsx`
  - 文档：`docs/ROADMAP_DETAILED.md#L65-86`

## ADDED Requirements

### Requirement: 运营配置（Feature Flag）
系统 SHALL 通过 `feature_flags.key = "leaderboard"` 控制排行榜可用性与参数。
- `enabled=false` 时，所有排行榜相关读接口 SHALL 返回 `503 { error: "leaderboard_disabled" }`。
- `payload` 支持如下字段（缺省使用默认值）：
  - `topN`：整数，默认 10，范围 1-100
  - `snapshotTtlSeconds`：整数，默认 60，范围 5-3600
  - `hideGuests`：布尔，默认 false；为 true 时未登录访问公共榜单 SHALL 返回 `401 { error: "login_required" }`
  - `weeklyEnabled`：布尔，默认 false；为 true 时开放周榜 scope
  - `version`：整数，默认 1；用于快照失效与演进（见快照要求）

#### Scenario: 关闭榜单
- **WHEN** `feature_flags.leaderboard.enabled=false`
- **THEN** `GET /api/leaderboard/*` 与 `GET /api/leaderboard/*/me` 返回 503 + `leaderboard_disabled`

### Requirement: 公共榜单接口（可缓存、无个性化信息）
系统 SHALL 提供公共榜单接口，仅返回与展示相关的公共数据，且可被 CDN/浏览器缓存。
- `GET /api/leaderboard/coins` 返回 `{ kind, scope, computedAt, config, entries }`
- `GET /api/leaderboard/level` 返回 `{ kind, scope, computedAt, config, entries }`
- 返回体 SHALL 不包含 `isMe`、`myRank`、`myEntry`、email 等个性化或敏感信息。
- 返回头 SHALL 设置 `Cache-Control: public, max-age=30, stale-while-revalidate=120`（可调整，但需可缓存）。

#### Scenario: 游客访问且 hideGuests=false
- **WHEN** 未登录访问 `GET /api/leaderboard/coins`
- **THEN** 返回 200 + entries（不含任何“我的排名”字段）

### Requirement: 我的排名接口（私有、不可缓存）
系统 SHALL 提供我的排名接口，仅对登录用户可用，并禁止共享缓存。
- `GET /api/leaderboard/coins/me` 返回 `{ kind, scope, computedAt, myRank, myEntry }`
- `GET /api/leaderboard/level/me` 返回 `{ kind, scope, computedAt, myRank, myEntry }`
- 返回头 SHALL 设置 `Cache-Control: private, no-store`
- 未登录访问 SHALL 返回 `401 { error: "unauthorized" }`

#### Scenario: 登录用户查询我的排名
- **WHEN** 已登录访问 `GET /api/leaderboard/level/me`
- **THEN** 返回 200 且包含 myRank/myEntry（或 null），且响应为 no-store

### Requirement: 快照预聚合（DB 级缓存）
系统 SHALL 使用 `leaderboard_snapshots` 保存榜单快照，并按 TTL 刷新。
- 快照键 `kind` SHALL 支持区分 scope：
  - `coins:all`、`level:all`
  - 若启用周榜：`level:week`（以及未来可扩展的 `coins:week`）
- 快照 payload SHALL 至少包含：
  - `computedAt`（ISO 字符串）
  - `kind`、`scope`
  - `config`（topN、version、窗口信息）
  - `entries`
- 当 `feature_flags.leaderboard.payload.version` 变化时，服务端 SHALL 视为快照失效并刷新。

#### Scenario: 快照过期软刷新
- **WHEN** 公共榜单接口被请求且快照过期
- **THEN** 服务端尝试更新快照；若锁竞争失败，返回旧快照（stale）但仍为 200

### Requirement: 防 stampede（并发刷新保护）
系统 SHALL 在快照刷新时避免并发 stampede。
- 推荐实现：Postgres advisory lock 或行级锁（实现细节在 tasks 中给出）。

### Requirement: 周榜（最小可行）
当 `weeklyEnabled=true` 时，系统 SHALL 支持 `scope=week`（至少 `level` 周榜）。
- 周边界 SHALL 统一为 UTC 周一 00:00:00Z。
- 周榜数据源 SHALL 基于现有数据（推荐 `daily_activity.total_xp` 聚合本周 XP）。

## MODIFIED Requirements

### Requirement: 现有排行榜接口返回体（去个性化）
现有 `GET /api/leaderboard/coins|level` SHALL 从“返回 entries+myRank+myEntry”调整为“仅公共榜单返回”。
**BREAKING**：前端需要改为调用 `/me` endpoint 获取“我的排名”。

## REMOVED Requirements

### Requirement: 公共榜单返回 isMe/myRank
**Reason**: 共享缓存下会导致个性化数据污染与泄露风险。
**Migration**: 前端改为调用 `/api/leaderboard/*/me`，并在 UI 内高亮显示。

