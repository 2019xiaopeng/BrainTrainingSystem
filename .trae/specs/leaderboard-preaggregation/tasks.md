# Tasks

- [x] Task 1: 设计并落地排行榜接口契约变更
  - [x] 明确返回体：公共榜单去个性化（不含 isMe/myRank）
  - [x] 新增 `/api/leaderboard/{coins|level}/me` 端点（no-store）
  - [x] 更新前端调用与高亮逻辑以适配新契约

- [x] Task 2: 实现快照预聚合与软刷新防 stampede
  - [x] 为 all scope 定义快照 kind（`coins:all`、`level:all`）并兼容旧 kind
  - [x] 实现 TTL + version 变更触发刷新
  - [x] 引入 DB 锁（advisory lock 或行锁）避免并发 stampede
  - [x] 公共榜单响应增加 Cache-Control（public + s-w-r）

- [x] Task 3: 实现最小可行周榜（level:week）
  - [x] 定义 UTC 周窗口与 scope=week
  - [x] 基于 `daily_activity` 聚合 weekly xp，生成 `level:week` 快照
  - [x] `weeklyEnabled=false` 时拒绝 week scope（400 或 404，按现有风格统一）

- [x] Task 4: 将榜单开关与参数纳入运营配置与 Admin Console
  - [x] `feature_flags.key=leaderboard` payload schema 完整落地（topN/ttl/hideGuests/weeklyEnabled/version）
  - [x] Admin Console 支持配置这些字段并写入审计日志

- [ ] Task 5: 验证与文档更新（含 push v3-dev）
  - [x] 本地构建通过：`npm run build`
  - [ ] 关键场景验证：开关/游客隐藏/缓存头/myRank 不缓存/快照刷新/周榜边界
  - [x] 更新 `docs/ROADMAP_DETAILED.md#L65-86` 的 checkbox 与描述（与实际实现一致）
  - [ ] 提交并 push 到 `v3-dev`

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 2
- Task 4 depends on Task 1
- Task 5 depends on Task 1, Task 2, Task 3, Task 4
