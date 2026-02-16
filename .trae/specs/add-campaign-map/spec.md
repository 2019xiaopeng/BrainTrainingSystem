# 闯关地图（Campaign Map）v4 Spec

## Why
当前首页以“模式选择 + 参数配置”驱动训练，缺少明确的目标路径与推进反馈。引入闯关地图可以把训练从“菜单选择”升级为“地图推进”，更自然承载道具/付费入口，并提升留存与目标感。

## What Changes
- 首页保持现有布局与主题风格不变，新增一个开关用于切换「自由训练」与「闯关地图」两种首页形态
- 复用并迁移 `.temp` 中的地图 UI 设计语言（章节、曲线路径、节点、故事弹窗、关卡详情弹窗），但关卡玩法全部改为现有项目的四个游戏：numeric / spatial / mouse / house
- 新增“章节（episode）/关卡（level）”元数据体系（至少 5 个 episode，每个 episode 至少 5 关），并提供与现有难度体系一致的关卡参数
- 新增“闯关进度”持久化：
  - 游客：localStorage 存储闯关进度
  - 登录用户：数据库存储闯关进度，并通过 API 下发
- 不改变现有训练/结算的核心逻辑：仍通过现有训练路由与结算接口完成一局训练；闯关只是在“入口与配置选择”层增加一套结构化导航与进度展示
- 交付要求：完成迁移与融合后，将项目推送到 `2019xiaopeng/BrainTrainingSystem` 的 `v4-dev` 分支（如需要可使用 7890 端口代理转发）

## Impact
- Affected specs: 首页入口形态、关卡体系、成长/解锁展示、数据库（闯关进度）
- Affected code:
  - 前端：首页相关组件、新增闯关地图组件、启动训练的桥接逻辑
  - 后端：新增闯关元数据与进度表、新增查询接口、（可选）在结算接口内写入闯关进度
  - 数据库迁移：新增表与索引、初始化种子数据（episodes/levels）

## ADDED Requirements

### Requirement: 首页切换闯关地图
系统 SHALL 在首页提供一个可见开关，允许用户在「自由训练（现有 HomeScreen）」与「闯关地图（新视图）」之间切换。

#### Scenario: 保留现有首页体验
- **WHEN** 用户处于「自由训练」
- **THEN** 现有的模式选择、参数配置、开始训练按钮的交互与主题风格保持不变

#### Scenario: 切换到闯关地图
- **WHEN** 用户切换到「闯关地图」
- **THEN** 展示章节选择器、地图路径与关卡节点，并可点击已解锁关卡进入关卡详情

### Requirement: 闯关地图 UI（从 `.temp` 提取）
系统 SHALL 提供闯关地图 UI，继承以下关键交互与视觉元素（基于 `.temp/App.tsx` 与 `.temp/components/MapNode.tsx` 的设计意图）：
- 章节头部：展示当前 chapter/episode 编号、标题、描述
- 地图容器：曲线路径连接关卡节点，节点展示状态（locked/unlocked/completed）与星级
- 故事弹窗：首次进入某个 episode 时弹出 storyText，确认后标记“已阅读”
- 关卡详情弹窗：展示该关卡对应模式与关键难度参数，并提供“开始训练”入口

#### Scenario: 首次进入章节显示故事
- **WHEN** 用户首次切换到某个 episode
- **THEN** 弹出该 episode 的 storyText
- **AND** 关闭后该 episode 不再重复弹出（可在设置中清理或版本升级时重置）

### Requirement: 关卡全部使用现有四个游戏
系统 SHALL 保证闯关地图中的每个关卡都映射到现有四个游戏之一，并使用现有参数体系表达难度：
- numeric：nLevel、rounds
- spatial：gridSize、nLevel、rounds
- mouse：count（老鼠数）、grid（网格）、difficulty（easy/medium/hard/hell）、rounds
- house：speed（easy/normal/fast）、initialPeople、eventCount、rounds

#### Scenario: 从闯关关卡进入训练
- **WHEN** 用户在关卡详情弹窗点击开始
- **THEN** 系统以该关卡预设参数启动对应模式的训练，并沿用现有能量扣除与路由跳转逻辑

### Requirement: 闯关进度持久化
系统 SHALL 记录每个用户在闯关地图中的通关信息（至少包含：已通关、最佳星级、最佳准确率、最后通关时间、已阅读章节故事）。

#### Scenario: 游客进度
- **WHEN** 游客通关关卡/阅读故事
- **THEN** 进度写入 localStorage

#### Scenario: 登录用户进度
- **WHEN** 登录用户通关关卡/阅读故事
- **THEN** 进度写入数据库，并可在其他设备恢复

### Requirement: 章节与关卡元数据（>= 5×5）
系统 SHALL 内置至少 5 个 episode，每个 episode 至少 5 关，并提供稳定的 ID 与顺序。

#### Episode & Levels v1（建议配置）
说明：以下为 v1 的最小可行“完整体系”，强调与现有解锁/难度梯度兼容；每个 episode 的第 5 关为 Boss，用于推进下一章并尽量触发“解锁树”的前沿扩展。

**Episode 1：觉醒（基础回路上线）**
- L1（numeric）：N=1，Rounds=5（新手）
- L2（spatial）：3×3，N=1，Rounds=5（新手）
- L3（mouse）：4×3，3鼠，easy，Rounds=3（新手）
- L4（house）：easy，初始3，事件6，Rounds=3（新手）
- L5 Boss（numeric）：N=1，Rounds=10（目标：解锁 numeric N=2）

**Episode 2：扩张（耐力与稳定性）**
- L6（numeric）：N=2，Rounds=10（目标：解锁 numeric N=3）
- L7（spatial）：3×3，N=1，Rounds=10（目标：解锁 spatial N=2）
- L8（mouse）：4×3，3鼠，easy，Rounds=3（目标：解锁 mouse medium/4鼠/4轮）
- L9（house）：easy，初始3，事件6，Rounds=3（目标：解锁 house normal/事件9/初始4/4轮）
- L10 Boss（spatial）：3×3，N=2，Rounds=10（目标：解锁 spatial N=3 + Rounds=15）

**Episode 3：分化（多分支策略）**
- L11（numeric）：N=2，Rounds=15（耐力）
- L12（spatial）：3×3，N=2，Rounds=15（耐力）
- L13（mouse）：4×3，4鼠，medium，Rounds=4（目标：解锁 5鼠 + 5×4 网格）
- L14（house）：normal，初始4，事件9，Rounds=4（目标：解锁 初始5 + 事件12）
- L15 Boss（numeric）：N=3，Rounds=10（目标：解锁 numeric N=4 + Rounds=15）

**Episode 4：并行（负载提升）**
- L16（spatial）：3×3，N=3，Rounds=10（目标：解锁 4×4 网格）
- L17（mouse）：5×4，5鼠，medium，Rounds=4（目标：解锁 hard + 6鼠 + 5轮）
- L18（house）：normal，初始5，事件12，Rounds=4（目标：解锁 fast + 初始6 + 事件15 + 5轮）
- L19（numeric）：N=3，Rounds=15（耐力）
- L20 Boss（spatial）：4×4，N=1，Rounds=10（目标：解锁 4×4 N=2）

**Episode 5：飞升（毕业前夜）**
- L21（mouse）：5×4，6鼠，hard，Rounds=5（目标：解锁 7鼠/hell）
- L22（house）：fast，初始6，事件15，Rounds=5（目标：解锁 初始7 + 事件18）
- L23（numeric）：N=4，Rounds=10（强度）
- L24（spatial）：4×4，N=2，Rounds=10（目标：解锁 4×4 N=3）
- L25 Boss（house）：fast，初始7，事件18，Rounds=5（毕业）

注：
- 关卡被“锁定”时必须仍可点击查看前置条件（例如：需要先在解锁树中解锁对应参数，或先通关上一章 Boss）
- 关卡参数最终以实现时“与现有解锁树兼容”为准，允许在不改变玩法的前提下做数值微调

## MODIFIED Requirements
### Requirement: 训练入口（HomeScreen）
系统 SHALL 在不破坏现有训练入口行为的情况下，为首页新增「闯关地图」视图切换能力，并保证自由训练仍为默认入口。

## REMOVED Requirements
（无）

## 数据库设计（闯关体系）

### 元数据表
1) `campaign_episodes`
- `id` (int, PK)
- `title` (text)
- `description` (text)
- `story_text` (text)
- `order` (int, unique)
- `is_active` (bool)

2) `campaign_levels`
- `id` (int, PK)
- `episode_id` (int, FK -> campaign_episodes.id)
- `order_in_episode` (int)
- `title` (text)
- `game_mode` (text: 'numeric'|'spatial'|'mouse'|'house')
- `config` (jsonb)：存储该关卡的固定参数（与现有四游戏参数结构一致）
- `pass_rule` (jsonb)：最小通关条件（例如 `{ "minAccuracy": 60 }` 或 `{ "minStars": 1 }`）
- `boss` (bool)
- `map_position` (jsonb)：`{ x: number, y: number }`（百分比坐标，复用 `.temp` 的思路）
- `is_active` (bool)

### 进度表
3) `user_campaign_state`
- `user_id` (text, PK, FK -> auth.user.id)
- `current_episode_id` (int)
- `current_level_id` (int)
- `viewed_episode_story_ids` (int[] or jsonb)
- `updated_at` (timestamp)

4) `user_campaign_level_results`
- `user_id` (text, FK -> auth.user.id)
- `level_id` (int, FK -> campaign_levels.id)
- `best_stars` (int, 0-3)
- `best_accuracy` (int, 0-100)
- `best_score` (int, nullable)
- `cleared_at` (timestamp, nullable)
- `updated_at` (timestamp)
- PK: (`user_id`, `level_id`)

### 关系与索引建议
- `campaign_levels(episode_id, order_in_episode)` unique
- `user_campaign_level_results(user_id, cleared_at)` index（进度页/统计）

### 与现有结算的融合策略（最小侵入）
两种实现均可，优先选择 A（一次结算事务内完成）：
- A) 在现有 `POST /api/game/session` 请求体中新增可选字段 `campaignLevelId`；当存在时，服务端在同一事务中更新 `user_campaign_state` 与 `user_campaign_level_results`
- B) 新增 `POST /api/campaign/complete`，由客户端在结算成功后再提交（需要处理幂等与失败重试）

## 迁移与融合边界
- 主题与现有 UI 组件风格保持一致（Zen/Sage 系列），地图 UI 不引入新的设计语言体系
- 不重写四个游戏的核心逻辑，不改变现有能量与结算计算逻辑
- 地图只负责“关卡选择/展示/进度”，训练仍走既有路由与结算 API
