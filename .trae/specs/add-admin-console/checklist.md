- [ ] RBAC：所有 `/api/admin/*` 均在服务端校验 admin 权限
- [ ] 管理员初始化：支持通过 `ADMIN_EMAILS` 或一次性脚本/接口提升 admin
- [ ] Admin API：me/users/users:id/users:id patch/ban/unban/audit-logs/feature-flags 均可用
- [ ] 审计日志：所有管理员写操作都写入 `admin_audit_logs`（含 before/after、IP、UA）
- [ ] 封禁拦截：结算/购买/签到对封禁用户返回统一错误码 `banned`
- [ ] 前端 /admin：非 admin 无法查看数据；admin 可完成用户管理与运营开关
- [ ] Mobile 友好：列表可滚动、关键操作二次确认
- [ ] 构建验证：`npm run build` 通过
- [ ] 分支交付：创建/切换 `v3-dev`，提交并推送到远端 `v3-dev`

