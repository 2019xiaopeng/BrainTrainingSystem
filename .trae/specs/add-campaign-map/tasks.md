# Tasks

- [x] Task 1: 盘点现有四游戏参数与解锁约束，确定关卡可用区间
  - [x] SubTask 1.1: 梳理 numeric/spatial/mouse/house 的可配置参数与默认解锁
  - [x] SubTask 1.2: 将 5×5 关卡表校准到“不会被后端 locked 拒绝”的梯度

- [x] Task 2: 新增闯关数据库表与迁移脚本（episodes/levels/progress）
  - [x] SubTask 2.1: 在 Drizzle schema 中添加 campaign_episodes/campaign_levels/user_campaign_state/user_campaign_level_results
  - [x] SubTask 2.2: 生成并应用迁移（含索引/约束）
  - [x] SubTask 2.3: 编写种子数据（5 episodes × 5+ levels，含地图坐标与文案）

- [x] Task 3: 新增闯关 API（元数据 + 进度）
  - [x] SubTask 3.1: GET /api/campaign/meta（episodes + levels）
  - [x] SubTask 3.2: GET /api/campaign/progress（读取用户进度；未初始化则自动初始化）
  - [x] SubTask 3.3: 写入通关结果（选择 spec 中融合策略 A 或 B）

- [x] Task 4: 迁移 `.temp` 地图 UI 为项目内组件（保持现有主题）
  - [x] SubTask 4.1: 实现 MapNode（locked/unlocked/completed + 星级）
  - [x] SubTask 4.2: 实现章节头部、故事弹窗、关卡详情弹窗、路径绘制
  - [x] SubTask 4.3: 适配移动端与现有 LayoutShell/MainLayout

- [x] Task 5: 首页增加开关并完成“自由训练 ↔ 闯关地图”融合
  - [x] SubTask 5.1: HomeScreen 保持原样，新增切换控件（默认自由训练）
  - [x] SubTask 5.2: 闯关地图点击关卡后，桥接到现有 onStart/路由启动训练
  - [x] SubTask 5.3: 游客使用 localStorage 进度；登录用户走 API 进度

- [x] Task 6: 端到端验证与回归
  - [x] SubTask 6.1: 验证自由训练所有模式仍可正常开始/结算
  - [x] SubTask 6.2: 验证闯关地图：章节切换、故事弹窗、通关记录、星级更新、锁定提示
  - [x] SubTask 6.3: 验证数据库迁移可重复执行，且不会破坏既有表

- [x] Task 7: 推送到 GitHub `v4-dev` 分支
  - [x] SubTask 7.1: 配置远端并拉取/创建 v4-dev
  - [x] SubTask 7.2: 如需代理，配置 Git HTTP 代理至 127.0.0.1:7890
  - [x] SubTask 7.3: 推送代码到 `https://github.com/2019xiaopeng/BrainTrainingSystem` 的 v4-dev

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 2
- Task 5 depends on Task 4 and Task 3
- Task 6 depends on Task 5
- Task 7 depends on Task 6
