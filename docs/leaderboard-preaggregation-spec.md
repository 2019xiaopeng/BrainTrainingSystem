# 排行榜预聚合与成本优化实施说明书（方案稿）

目标：实现排行榜预聚合（快照表/缓存）以降低公共热点接口 DB 压力，同时保持“我的排名”可用，并把榜单开关纳入运营配置。本文只给出实现方案与具体改动清单（文件/函数/接口行为/SQL/字段），不包含代码变更。

> 适用范围：Vite SPA + Vercel Serverless Functions（自定义 `vercel.json` routes），API 位于 `api/`。

---

## 1) 现状勘察（基于代码库实际）

### 1.1 相关文件与职责

**后端**
- [coins.ts](file:///f:/N-Back/api/leaderboard/coins.ts)：Brain Coins 总榜接口；读取 feature flag；读取/写入快照；同时计算并返回 myRank/myEntry（带 isMe 标记）。
- [level.ts](file:///f:/N-Back/api/leaderboard/level.ts)：Brain Level 总榜接口；逻辑与 coins 类似。
- [meta.ts](file:///f:/N-Back/api/_lib/db/schema/meta.ts)：定义 `feature_flags`、`leaderboard_snapshots` 两张表的 schema。
- [db/index.ts](file:///f:/N-Back/api/_lib/db/index.ts)：`ensureSchemaReady()` 中创建 `feature_flags`、`leaderboard_snapshots` 表，并创建 user 排行相关索引（coins、level+xp）。

**前端**
- [RankScreen.tsx](file:///f:/N-Back/src/components/screens/RankScreen.tsx)：`/rank` 页面 Tab（history/leaderboard），内部再切换 coins/level。
- [LeaderboardWidget.tsx](file:///f:/N-Back/src/components/leaderboard/LeaderboardWidget.tsx)：调用 `/api/leaderboard/coins|level`，并展示 entries + 我的排名（myRank）。

### 1.2 当前 leaderboard_snapshots 的 kind 与 payload

表结构（现状）：
- `leaderboard_snapshots(kind text PK, computed_at timestamp, payload jsonb)`（[meta.ts](file:///f:/N-Back/api/_lib/db/schema/meta.ts)）

已使用的 `kind`：
- `coins`：在 [coins.ts](file:///f:/N-Back/api/leaderboard/coins.ts) 中读写
- `level`：在 [level.ts](file:///f:/N-Back/api/leaderboard/level.ts) 中读写

当前 payload 结构（两种 kind 都类似）：
- `{ entries: [...] }`
- entries 元素包含：rank、userId、displayName、avatarUrl、brainCoins/brainLevel/xp 等（coins/level字段略有差异）

### 1.3 当前 DB 查询与潜在瓶颈

#### TopN 查询（当快照缺失或过期）
- coins：`SELECT ... FROM user ORDER BY brain_coins DESC, xp DESC, brain_level DESC, updated_at DESC LIMIT topN`
- level：`SELECT ... FROM user ORDER BY brain_level DESC, xp DESC, brain_coins DESC, updated_at DESC LIMIT topN`

TopN 查询在索引存在时通常可控，但“过期刷新 + 并发”会引发 **stampede**：多个请求同时发现过期而同时计算并写入。

#### 我的排名（每次请求都会尝试计算）
- coins：先取 me，再 `count(*)` 统计比我更高的用户（复杂 OR 条件 + tie-break）
- level：同理（条件更复杂）

这是公共热点接口最可能成为瓶颈的部分：一旦流量大，“每次请求都 count(*)”会迅速放大 DB 成本，即使有索引也可能产生大量扫描。

---

## 2) 目标设计（最终形态）

### 2.1 运营配置（feature_flags）

推荐沿用现有 key：`leaderboard`（兼容当前实现），并扩展 payload schema：

**feature_flags**
- `key`: `leaderboard`
- `enabled`: boolean（总开关）
- `payload`（建议字段）：
  - `topN: number`（默认 10，范围 1-100）
  - `snapshotTtlSeconds: number`（默认 60，范围 5-3600）
  - `hideGuests: boolean`（默认 false；true 时未登录用户不返回榜单数据）
  - `weeklyEnabled: boolean`（默认 false；周榜开关）
  - `version: number`（默认 1；用于将来升级排序/字段时让快照失效）

向后兼容策略：
- payload 缺字段时使用默认值。
- 若历史 payload 仍使用 `snapshotTtlMs`，继续兼容读取（仅迁移期）。

### 2.2 快照数据模型（leaderboard_snapshots）

现状的 `kind` 只有 `coins`/`level`，建议升级为可扩展命名（但要兼容旧 kind）：

推荐 kind 命名：
- `coins:all`
- `level:all`
- `coins:week`（可选，见周榜设计）
- `level:week`（可选）

兼容策略：
- 旧 kind `coins`/`level` 读取优先级：若 `coins:all` 不存在则回退读 `coins`，写入时写新 kind（方案中说明迁移窗口）。

推荐 payload 结构（统一）：
```json
{
  "computedAt": "2026-02-15T00:00:00.000Z",
  "kind": "coins:all",
  "config": {
    "topN": 10,
    "scope": "all",
    "version": 1
  },
  "entries": [
    {
      "rank": 1,
      "userId": "u_xxx",
      "displayName": "Alice",
      "avatarUrl": null,
      "brainCoins": 123,
      "brainLevel": 4,
      "xp": 1000
    }
  ]
}
```

注意：
- 快照 payload 必须 **不包含 isMe / myRank / email** 等个性化或敏感信息，确保可 CDN 缓存且不会发生缓存污染。

### 2.3 “我的排名”策略（给出多方案并推荐）

#### 方案 A（推荐 MVP）：实时计算 + 强制分离 endpoint + 缓存/限流
- 将 myRank 从公共榜单接口剥离到 `/me` endpoint（私有、no-store）。
- 对 `/me` endpoint：
  - 仅登录用户可访问
  - 增加“服务端缓存（DB 级缓存表或短 TTL）”或“速率限制建议”
- 优点：改动最小、正确性最好。
- 缺点：仍需要 count(*)，但通过“拆分 endpoint + 缓存 + 限流”把成本控制在可接受范围。

#### 方案 B：快照中附带更大映射（userId -> rank）
- 在快照 payload 中存储更大范围的排名映射（例如 top 10k），或存分段索引。
- 优点：/me 查询几乎为 O(1)。
- 缺点：payload 体积大、写入成本高、更新更慢；Vercel 响应大小/数据库 jsonb 体积会变成新瓶颈；也更难做增量更新。

#### 方案 C：异步物化 rank_cache 表（推荐中期）
- 新增 `leaderboard_rank_cache(kind, scope, user_id, rank, metrics_json, computed_at)`，定时/软刷新批量更新。
- 优点：/me endpoint 变轻（读缓存表）；可精确控制更新频率。
- 缺点：实现与维护复杂度更高；需要额外作业机制（cron/触发器）。

推荐选择：
- **短期（先压住热点）：方案 A**
- **中期（流量更大后）：方案 C**

### 2.4 周榜定义（可选实现路径）

周的边界：推荐统一 UTC（周一 00:00:00Z 到下周一 00:00:00Z）。

周榜数据源选项：
- A：基于 `daily_activity.total_xp` 聚合本周 XP（推荐，表已存在且聚合粒度低）
  - 适合 `level:week`（按 weekly xp 排序）
  - 不适合 `coins:week`（当前没有“本周 coins 增量”数据源）
- B：基于 `game_sessions` 按 created_at 聚合周内得分/局数（成本更高）
- C：新增 `coin_ledger`（记录 coins 增量）后才能严格实现 `coins:week`（工程量更大）

建议：
- 先落地 `level:week`（weekly XP）
- `coins:week` 作为后续扩展，需要先补齐 coin 交易流水或周初快照差分机制

---

## 3) 计算与刷新机制（Vercel 环境关键）

### 方案 1（推荐）：按请求触发的软刷新 + DB 锁防 stampede

流程：
1) 请求先读快照（`leaderboard_snapshots`）
2) 若快照未过期：直接返回
3) 若过期：尝试获取锁（推荐 `pg_advisory_lock` 或行级锁）
4) 获取锁成功：计算并写入新快照
5) 获取锁失败：直接返回旧快照（stale），并在响应里带 `computedAt` 让前端知道是旧数据

锁实现推荐：
- `pg_try_advisory_lock(hash(kind))`：简单、无额外表字段；释放锁依赖连接结束或显式 unlock（需要事务约束）。
- 或 `SELECT ... FOR UPDATE SKIP LOCKED`：用行锁保证只有一个刷新者。

### 方案 2：外部定时刷新（可选）

可选方式：
- Vercel Cron：定时调用 “刷新接口” 或 “读接口（带 refresh=1）”
- GitHub Actions cron：curl 调用
- Supabase scheduled function：在 DB 同域调度更近、延迟更低

要点：
- 刷新接口必须走 admin 鉴权，写入审计日志（admin_audit_logs）
- 若部署启用了 Vercel Deployment Protection，需要使用 bypass token（header 或 query）以便自动化调用

### Cache-Control 策略（强约束）

必须拆分 endpoint 才能安全缓存：
- 公共榜单（不含个性化信息）：`Cache-Control: public, max-age=30, stale-while-revalidate=120`
- 我的排名（个性化）：`Cache-Control: private, no-store`

---

## 4) 接口改造方案（对外契约）

### 推荐最终接口（拆分公共榜单与我的排名）

公共榜单：
- `GET /api/leaderboard/coins`：返回 `{ entries, computedAt, kind, config }`（可 CDN 缓存）
- `GET /api/leaderboard/level`：同上

我的排名（私有、no-store）：
- `GET /api/leaderboard/coins/me`：返回 `{ myRank, myEntry, computedAt }`
- `GET /api/leaderboard/level/me`：同上

可选：scope 参数（周榜）
- `GET /api/leaderboard/level?scope=week`
- `GET /api/leaderboard/level/me?scope=week`

不建议：
- 在公共榜单里直接返回 `isMe/myRank`（会导致 CDN/浏览器缓存污染，风险极高）

### 错误码建议
- `leaderboard_disabled`（503）：开关关闭
- `login_required`（401）：hideGuests 开启且未登录（公共榜单也可这样处理）
- `invalid_config`（400）：payload 配置非法（例如 topN 超界）
- `server_busy`（503/429）：刷新锁竞争严重时可返回（建议仅用于 refresh 触发接口）

---

## 5) 数据库与索引（对齐现有项目）

### 现有索引
`ensureSchemaReady()` 已创建：
- `idx_user_brain_coins_desc`：`user(brain_coins desc)`
- `idx_user_brain_level_xp_desc`：`user(brain_level desc, xp desc)`

这对 TopN 查询有帮助，但对“我的排名” count(*) 仍可能昂贵。

### 建议新增索引（若继续用 count(*) 方案）
为减少 heap 访问并让排序/比较更贴近索引：
- coins：`(brain_coins desc, xp desc, id desc)`
- level：`(brain_level desc, xp desc, brain_coins desc, id desc)`

注意：即使有索引，rank 的 count(*) 仍会随着用户量线性增长，因此依然建议拆分 endpoint + 缓存/限流。

### 最小迁移建议
短期（方案 A）不必新增表即可上线；若要做“我的排名缓存表”（方案 C），新增：
- `leaderboard_my_rank_cache`：
  - `kind text`
  - `scope text`
  - `user_id text`
  - `rank int`
  - `payload jsonb`
  - `computed_at timestamp`
  - PK：`(kind, scope, user_id)`

快照 payload 大小限制建议：
- `topN <= 100`
- entries 字段仅保留展示必需字段

---

## 6) 前端改造点（/rank）

### 6.1 Tab 切换不清空 + 本地缓存 TTL + stale-while-revalidate

轻量实现（不引入 React Query/SWR）：
- 在 `LeaderboardWidget` 内用 `useRef` 保存：
  - `cache[kind][scope] = { data, cachedAt }`
- 渲染策略：
  1) 有缓存先展示缓存（stale）
  2) 若过期（TTL）在后台刷新并平滑替换 state
- Tab 切换只切换展示引用，不清空缓存

### 6.2 我的排名高亮

推荐：公共榜单 entries 不再携带 `isMe`：
- 前端额外请求 `/api/leaderboard/*/me` 获得 `myEntry/myRank`
- 本地用 `userId` 或 displayName 做匹配并高亮（需要后端在 me 返回里带 userId，或前端从 session/profile 获取当前 userId）

### 6.3 榜单开关与隐藏游客 UI 行为
- `leaderboard_enabled=false`：Rank 页面展示“维护中”提示
- `hideGuests=true` 且未登录：Rank 页面展示登录引导

---

## 7) 安全与滥用控制

- 任何“主动刷新/重算”能力（若新增 admin 刷新接口）必须：
  - `requireAdmin(req)`
  - 写入 `admin_audit_logs`
- `/me` endpoint 速率限制建议（可选实现）：
  - 以 `userId + IP` 为 key，1 分钟 N 次（例如 30）
  - 超限返回 429
- 排行榜 payload 禁止输出 PII：email、手机号等

---

## 8) 验证与回滚计划

### 验证清单
- 开关：
  - `feature_flags.leaderboard.enabled=false` 时 API 返回 503 `leaderboard_disabled`
  - `hideGuests=true` 时未登录访问返回 401 `login_required`
- TTL 刷新：
  - 快照过期后第一次请求触发刷新；并发请求不会出现多次同时刷新（无 stampede）
  - 返回体 `computedAt` 正确更新
- 缓存安全：
  - 公共榜单可设置 public cache headers，且返回体不包含个性化字段
  - `/me` endpoint no-store，不会被 CDN/浏览器共享缓存污染
- 周榜边界（如实现）：
  - 周一 00:00Z 切换窗口正确

### 回滚策略
- 只要将 `feature_flags.leaderboard.enabled=false` 即可快速降级（榜单关闭）。
- 若新增表/索引：
  - 不影响现有 read path 时可保留（不必立刻回滚）
  - 若必须回滚：删除新 endpoint 的调用，恢复单接口 no-store 返回

