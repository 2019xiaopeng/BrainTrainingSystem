# 管理员账号与运营后台（Admin & Ops）Spec

## Why
当前系统缺少可治理与可审计的后台能力，导致用户封禁、数据修正、运营开关等关键操作无法安全落地，也难以追溯与回滚。

## What Changes
- 增加管理员与普通用户的角色权限模型（RBAC），以 `users.role` 为准进行服务端强校验
- 新增 Admin Console 前端路由 `/admin`（不出现在普通导航），提供用户管理、运营配置、审计日志入口
- 新增 `/api/admin/*` 服务端接口：用户搜索/详情/受控修改、封禁/解封、审计日志查询、feature flags 管理
- 新增封禁机制：在关键写入接口统一拦截封禁用户并返回稳定错误码
- 新增审计日志：管理员所有写操作写入 `admin_audit_logs`，记录 before/after、IP、UA、时间
- 提供 drizzle 迁移脚本，保证 schema 与数据库一致
- **交付要求**：完成实现后在仓库创建并推送到远端 `v3-dev` 分支

## Impact
- Affected specs:
  - 认证与权限（RBAC、管理员鉴权）
  - 用户治理（封禁/解封）
  - 运营配置（feature flags）
  - 审计与合规（audit logs）
  - 管理后台 UI（/admin）
- Affected code:
  - 后端：`api/admin/*`，以及被封禁拦截的关键接口（结算/购买/签到）
  - DB：`api/_lib/db/schema/*` + `drizzle/*.sql`
  - 前端：新增 `/admin` 页面与相关组件、路由

## ADDED Requirements
### Requirement: RBAC（角色与权限）
系统 SHALL 支持基于 `users.role` 的角色鉴权，至少包含 `member` 与 `admin`（可扩展 `moderator`）。

#### Scenario: 管理员访问管理接口
- **WHEN** 已登录用户请求任意 `/api/admin/*`
- **THEN** 服务端读取会话用户并校验其 `users.role == 'admin'`
- **AND** 若非 admin，返回 403（或 401，视现有风格统一）

#### Scenario: 非管理员访问 /admin 页面
- **WHEN** 非 admin 用户访问 `/admin`
- **THEN** 前端提示无权限并引导返回主页
- **AND** 不得泄漏后台数据（即使前端绕过，也会被后端拒绝）

### Requirement: 管理员初始化
系统 SHALL 提供管理员初始化方式，且不得在前端写死管理员账号信息。

#### Scenario: 通过环境变量白名单初始化
- **WHEN** 运维配置 `ADMIN_EMAILS`（逗号分隔）
- **THEN** 提供一次性脚本或管理接口将这些邮箱对应用户提升为 `admin`

### Requirement: Admin API（/api/admin/*）
系统 SHALL 提供管理员接口集合，并对写操作进行受控字段更新与审计。

#### Scenario: 获取当前管理员信息
- **WHEN** admin 请求 `GET /api/admin/me`
- **THEN** 返回 `{ userId, email, role, isAdmin: true }`

#### Scenario: 搜索用户列表
- **WHEN** admin 请求 `GET /api/admin/users?query=&limit=&offset=`
- **THEN** 返回分页用户列表（按 email/昵称/id 模糊匹配）

#### Scenario: 获取用户详情
- **WHEN** admin 请求 `GET /api/admin/users/:id`
- **THEN** 返回用户基础画像与资产字段（XP/Coins/Energy/Inventory/Check-in 等）

#### Scenario: 受控修改用户数据
- **WHEN** admin 请求 `PATCH /api/admin/users/:id` 并提交 JSON body
- **THEN** 仅允许白名单字段被修改（例如 xp/brainCoins/energyCurrent/energyLastUpdated/checkInLastDate/checkInStreak/inventory/ownedItems/brainStats 等）
- **AND** 对每个字段进行类型与范围校验
- **AND** 写入审计日志（action、before/after、ip、ua）

### Requirement: 封禁/解封（Ban）
系统 SHALL 支持封禁与解封用户，并在关键写入接口强制拦截封禁用户。

#### Scenario: 封禁用户
- **WHEN** admin 调用 `POST /api/admin/users/:id/ban`（可传 reason 与 bannedUntil）
- **THEN** 服务端持久化封禁状态
- **AND** 写入审计日志

#### Scenario: 封禁用户触发拦截
- **WHEN** 被封禁用户调用以下任一接口：
  - `POST /api/game/session`
  - `POST /api/store/buy`
  - `POST /api/user/checkin`
- **THEN** 接口返回稳定错误码 `banned`（或统一错误结构）

### Requirement: 审计日志（Audit Logs）
系统 SHALL 记录管理员写操作审计日志，且后台可查询。

#### Scenario: 写入审计日志
- **WHEN** 管理员执行任何写操作（封禁/解封/资产调整/运营开关）
- **THEN** 在 `admin_audit_logs` 写入一条记录，包含：
  - admin_user_id、target_user_id（可空）、action、before、after、ip、user_agent、created_at

#### Scenario: 查询审计日志
- **WHEN** admin 请求 `GET /api/admin/audit-logs`（支持按 admin/target/time 筛选）
- **THEN** 返回分页日志列表

### Requirement: 运营开关（Feature Flags）
系统 SHALL 支持 feature flags 的读写，以便管理员控制功能开关（例如排行榜展示与否）。

#### Scenario: 读取与更新 feature flags
- **WHEN** admin 请求 `GET /api/admin/feature-flags`
- **THEN** 返回 flags 列表
- **WHEN** admin 请求 `PATCH /api/admin/feature-flags`
- **THEN** 更新指定 flag 并写入审计日志

## MODIFIED Requirements
### Requirement: 关键写入接口安全校验
系统 SHALL 在关键写入接口（结算/购买/签到）增加封禁校验与统一错误码返回，不改变既有正常用户路径的行为。

## REMOVED Requirements
无

