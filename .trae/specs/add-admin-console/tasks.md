# Tasks

- [x] Task 1: 设计并落地 Admin 数据表与迁移
  - [x] 新增/确认用户封禁字段（banned_until 或等价字段）
  - [x] 新建 `admin_audit_logs` 表并写入 drizzle 迁移
  - [x] 新建/复用 `feature_flags` 表并写入 drizzle 迁移
  - [x] 更新 Drizzle schema（与迁移一致）

- [x] Task 2: 实现服务端鉴权与 Admin API
  - [x] 封装 `requireAdmin(req)` 与 `requireNotBanned(userId)` 等复用逻辑
  - [x] 实现 `GET /api/admin/me`
  - [x] 实现 `GET /api/admin/users`（query + limit/offset）
  - [x] 实现 `GET /api/admin/users/:id`
  - [x] 实现 `PATCH /api/admin/users/:id`（白名单字段 + 校验 + 审计日志）
  - [x] 实现 `POST /api/admin/users/:id/ban`、`POST /api/admin/users/:id/unban`（含审计日志）
  - [x] 实现 `GET /api/admin/audit-logs`（分页 + 筛选）
  - [x] 实现 `GET/PATCH /api/admin/feature-flags`（含审计日志）

- [x] Task 3: 在关键写入接口接入封禁拦截
  - [x] `POST /api/game/session` 增加 banned 拦截与稳定错误码
  - [x] `POST /api/store/buy` 增加 banned 拦截与稳定错误码
  - [x] `POST /api/user/checkin` 增加 banned 拦截与稳定错误码

- [x] Task 4: 实现 Admin Console 前端（/admin）
  - [x] 新增 `/admin` 路由（不加入 Sidebar/MobileNav）
  - [x] 管理后台首页（用户管理 / 运营配置 / 审计日志入口）
  - [x] 用户列表页：搜索、分页、进入详情
  - [x] 用户详情页：资产展示、封禁/解封、受控修改（带二次确认）
  - [x] 审计日志页：筛选与分页
  - [x] 运营配置页：feature flags 开关（含排行榜开关）
  - [x] 非 admin 访问时：提示无权限并引导返回

- [x] Task 5: 管理员初始化与发布流程
  - [x] 提供管理员初始化方式（环境变量白名单或一次性脚本/接口）
  - [x] 本地验证：`npm run build` 通过
  - [x] 创建/切换分支 `v3-dev`
  - [x] 提交 commit（信息清晰）
  - [x] 推送到远端 `v3-dev`

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 2
- Task 4 depends on Task 2
- Task 5 depends on Task 1, Task 2, Task 4
