# 脑力训练 Web 游戏项目策划书 (Project Brain Training PRD)

> **文档状态**: 草稿 (Draft)  
> **最后更新**: 2026-02-06  
> **目标读者**: 开发团队、产品负责人  

## 1. 产品概述 (Product Overview)
**项目名称**: 脑力心流 (Brain Flow)
**核心目标**: 打造一款基于 Web 的国际化脑力提升平台，通过极简的视觉体验和科学的训练机制，帮助用户进入“心流”状态并提升工作记忆与专注力。
**目标用户**: 追求自我提升的学生、职场人士（核心），兼顾不同年龄层（通过皮肤/无障碍适配）。
**风险控制 (版权规避)**: 
- **视觉层面**: 摒弃原作具体形象，采用**极简几何/数字风格**，支持皮肤系统。
- **玩法层面**: 基于神经科学范式 (N-Back, Running Memory) 原创交互。

## 2. 内容体系：训练与评测 (Content System)
**核心理念**: 明确区分“日常训练”与“能力评测”。

### 2.1 日常训练 (Training Mode)
- **目标**: 能力提升与心流体验。
- **机制**: 
    - **自适应难度**: 动态 N-Back (2-Back -> 3-Back...)，根据实时表现升降级。
    - **低挫败感**: 允许失败，提供辅助提示（可选），强调连续性和完成度。
- **游戏库 (Game Library)**:
    1.  **数字心流 (Numeric Flow)**: 算术 + N-Back (已实现)。
    2.  **空间心流 (Spatial Flow)**: 网格位置记忆 (已实现)。
    3.  **追踪心流 (Mouse Flow)**: 动态路径追踪 (已实现)。
    4.  **人来人往 (House Flow)**: [新增] 房屋进出人数统计。锻炼动态工作记忆更新能力。
        - 玩法: 房子初始 X 人，随机进出 Y 人，结束后回答现有人数。

### 2.2 脑力体检 (Assessment Mode)
- **目标**: 定量评估，生成雷达图。
- **机制**:
    - **标准化序列**: Numeric (2-Back) -> Spatial (2-Back) -> Mouse (Tracking) -> House (Dynamic Counting)。
    - **严格限时**: 全程约 5 分钟，无暂停。
    - **产出**: 六维雷达图（记忆力、计算力、专注力、观察力、负载力、反应力）及详细分析报告。

## 3. 经济与成长系统 (Economy & Progression)
### 3.1 脑力段位体系 (The Rank System)
**核心逻辑**: `Rank = XP (活跃度) + Milestones (硬实力)`。
用户必须同时满足 XP 要求和**任意一项**核心能力考核指标，才能晋升。

- **LV1 见习 (Novice)**: 
    - XP: 0
    - 考核: 无
    - 解锁: 基础训练 (1-Back, 3x3 Spatial, 3-Mouse, Easy House)
- **LV2 觉醒 (Awakened)**: 
    - XP: 500
    - 考核: Numeric 2-Back > 90% **或** Spatial 3x3(2-Back) > 90%
    - 解锁: Numeric 2-Back, House (Normal Speed)
- **LV3 敏捷 (Agile)**: 
    - XP: 2000
    - 考核: Spatial 4x4(2-Back) > 85% **或** Mouse (4-Mice) > 90%
    - 解锁: Spatial 4x4, Mouse (5-Mice), Numeric 3-Back
- **LV4 逻辑 (Logical)**: 
    - XP: 5000
    - 考核: Numeric 3-Back > 85% **或** House (Normal Speed, 10 Events) > 90%
    - 解锁: Numeric 5-Back, House (Double Door)
- **LV5 深邃 (Profound)**: 
    - XP: 10000
    - 考核: Spatial 5x5(3-Back) > 80% **或** Mouse (7-Mice) > 85%
    - 解锁: Numeric 7-Back, Spatial 5x5
- **LV6 大师 (Master)**: 
    - XP: 30000
    - 考核: Numeric 5-Back > 80% **或** House (Fast Speed, 15 Events) > 85%
    - 解锁: Numeric 9-Back, Mouse (9-Mice/Hell)
- **LV7 超凡 (Transcendent)**: 
    - XP: 80000
    - 考核: 全模式核心关卡毕业 (Numeric 7-Back + Spatial 5x5 + Mouse 9-Mice + House Double Door)
    - 解锁: 11-Back, 荣誉徽章, 隐藏主题

### 3.2 游戏模式解锁树 (Progression Trees)
**整合规则**: 部分高难度内容需要 **Brain Rank (LV)** 和 **前置关卡通关** 双重条件。

- **数字心流 (Numeric Flow)**
    - **维度**: N-Back (1-12) x 题量 (10/15/20)。
    - **解锁规则**: 
        - 1-Back(10) > 90% -> 解锁 1-Back(15) & 2-Back(10)。
        - 此后每级逻辑相同：N-Back(10) 通关解锁 N+1(10) 和 N(15)。
- **空间心流 (Spatial Flow)**
    - **维度**: N-Back (1-12) x 题量 (5/10/15/20/25/30) x 网格 (3x3/4x4/5x5)。
    - **解锁规则**:
        - **题量**: 与数字心流一致：默认 10，最小 5；当某一 N 的当前题量通关（准确率 ≥ 90%）时，解锁该 N 的下一级题量（+5）。
        - **3x3**: N=1 -> N=2 -> ... -> N=5 (上限)。
        - **4x4**: 当 3x3 @ N=3 通关 -> 解锁 4x4 @ N=1。
        - **5x5**: 当 4x4 @ N=4 通关 -> 解锁 5x5 @ N=1。
- **魔鬼老鼠 (Mouse Flow)**
    - **维度**: 
        - **老鼠数**: 3 -> 9 只。
        - **网格**: 4x3 (3-4鼠) -> 5x4 (5-6鼠) -> 6x5 (7-9鼠)。
        - **步数**: 4(简单) -> 7(中等) -> 10(困难) -> 13(地狱)。
        - **轮数**: 3轮 (默认) -> 4轮 (LV3解锁) -> 5轮 (LV6解锁)。
    - **解锁路径**:
        - **Phase 1**: 初始 3鼠 | 4x3 | 4步。通关解锁 7步。
        - **Phase 2**: 通关 3鼠所有步数 -> 解锁 4鼠。
        - **Phase 3**: 通关 4鼠 -> 解锁 5鼠 (网格扩至 5x4)。以此类推至 9鼠。
- **人来人往 (House Flow)**
    - **核心机制**: 动态计数 (Running Counter)。
    - **维度**:
        - **速度**: Easy(1.2s~1.6s/事件) -> Normal(0.64s~1.2s/事件) -> Fast(0.32s~0.72s/事件)。
        - **初始人数**: 3 -> 7。
        - **事件数**: 6次起步，按 3 为步进（6/9/12/...）。
        - **事件类型**:
            - 进入（Enter）
            - 离开（Leave）
            - 同时进出（Concurrent）：同一事件内同时出现 enterCount 与 leaveCount（且两者不相等）。
        - **人数上限**: 为避免数值爆炸，事件生成时对总人数有软上限（例如 15）。
    - **解锁路径**:
        - **入门**: 速度Easy + 初始3人 + 6事件。
        - **晋升（事件数）**: 当以当前已解锁的最大事件数通关（准确率 ≥ 90%）时，解锁下一档事件数（+3，直到 24）。
        - **晋升（初始人数）**: 当以当前已解锁的最大初始人数通关（准确率 ≥ 90%）时，解锁下一档初始人数（+1，直到 7）。
        - **晋升（速度）**: 当以当前已解锁的最高速度通关（准确率 ≥ 90%）时，解锁下一档速度（Easy → Normal → Fast）。

### 3.3 经济与经验数值配置 (Economy & XP Config)
**设计目标**: 半年(180天)活跃玩家可达 LV7。
- **每日体力**: 5 点 (即每天约 5-8 局游戏)。
- **XP 获取公式**: `XP = 基准分(20) * (N系数 + 模式系数) * 准确率`
    - **基准**: 20 XP / 局。
    - **N系数**: `1 + (N-1)*0.2` (例: 1-Back=1.0, 5-Back=1.8, 10-Back=2.8)。
    - **模式系数**: 
        - 简单(10题/4步): 1.0
        - 困难(20题/13步): 1.5
    - **估算**: 
        - 新手 (LV1-2): 每天约 150 XP。
        - 中手 (LV3-4): 每天约 300 XP (3-Back)。
        - 高手 (LV5+): 每天约 600 XP (5-Back+)。
- **升级阈值 (累积XP)**:
    - **LV1**: 0
    - **LV2**: 500 (约 3-4 天)
    - **LV3**: 2,500 (约 2 周)
    - **LV4**: 10,000 (约 1.5 个月)
    - **LV5**: 25,000 (约 3 个月)
    - **LV6**: 50,000 (约 4.5 个月)
    - **LV7**: 80,000 (约 6 个月 - 毕业)

- **签到奖励 (Daily Check-in)**:
    - 每日签到: +50 XP，+10 Brain Coins。
    - 连续 3 天: 当天签到 +20 Brain Coins（随 streak 结算）。
    - 连续 7 天: 当天签到 +60 Brain Coins（随 streak 结算）。
- **训练结算奖励 (Session Rewards)**:
    - **基础金币**: `BrainCoins = Min(20, Round(score * 0.05))`（降低单局产出，避免通胀）。
    - **解锁奖励 (First Clear Bonus)**: 当本局触发 `newlyUnlocked` 时，每条解锁 +20 Brain Coins（解锁本身不返还体力，仍消耗 1 点体力）。
    - **每日首胜 (Daily First Win)**: 每日首次完成任意有效训练，额外 +15 Brain Coins。
    - **每日完美 (Daily Perfect)**: 每日首次 `accuracy == 100%` 额外 +30 Brain Coins。
- **商城主要定价 (Brain Coins)**:
    - 体力药水: +1 体力 (100) / +5 体力 (450)。
    - 补签卡: 500。

### 3.4 积分与体力经济 (Economy System)
- **体力 (Energy) 架构设计**: 
    - **存储**: `users` 表中的 `energy_current` (Int) 和 `energy_last_updated` (Timestamp)。
    - **消耗机制 (Client-Optimistic)**: 
        - 前端: 扣除本地体力，允许立即开始游戏。
        - 后端: 游戏结算接口 (`POST /api/game/session`) 校验体力。如果作弊（体力不足强行提交），则拒绝记录该次成绩。
    - **恢复机制 (Lazy Calculation)**:
        - **不使用 Cron Job** (太重)。
        - **计算逻辑**: 每次用户请求用户信息或开始游戏时，Edge Function 触发计算：
          `NewEnergy = Min(MaxEnergy, Current + Floor((Now - LastUpdated) / 4h))`
          `RemainderTime = (Now - LastUpdated) % 4h` (用于前端倒计时显示)
        - 这样可确保用户长时间离线后回归，体力能瞬间回满。
    - **无限体力**: `users.unlimited_energy_until` (Timestamp)。若当前时间在此之前，不扣减体力。

- **Brain Coins (积分)**: 
    - **获取**: 
        - 每日打卡（完成至少一局有效训练）。
        - 达成成就（如首次通关 N-Back 3）。
    - **用途**: 兑换“体力药水”或“补签卡”。

### 3.4 关卡解锁体系 (Level Progression)
**核心逻辑**: 树状技能树，而非自由选择。用户必须证明能力才能挑战更高难度。

- **初始状态**: 
    - N-Back: 1
    - Rounds: 10
- **晋升规则 (Unlock Condition)**: 
    - 当某关卡 **准确率 >= 90%** 时，触发晋升。
- **解锁路径**:
    - **横向扩展 (Endurance)**: 解锁当前 N 值的更多题目（如 10题 -> 15题 -> 20题）。
    - **纵向突破 (Intensity)**: 当 10题模式达到 90% 准确率时，同时解锁下一级 N 值的 10题模式（如 1-Back 10题 -> 2-Back 10题）。
- **首通奖励 (First Clear Bonus)**:
    - 首次成功解锁新关卡时，仍消耗本局 1 点体力（不返还）。
    - 额外奖励 Brain Coins（每条解锁 +20 Brain Coins）。
- **每日首胜 / 每日完美**:
    - 每日首次完成任意有效训练：+15 Brain Coins。
    - 每日首次获得 100% 准确率（任意难度）：+30 Brain Coins。

#### 3.4.1 首页可视化（世界地图 + 模式内关卡树）
- **目标**: 让玩家一眼看到“我在哪、下一步做什么、锁在哪里”，并把解锁条件可视化为路径。
- **首页世界地图（替换当前 2x2 模式按钮区域）**:
  - 4 个区域节点：数字心流 / 空间心流 / 魔鬼老鼠 / 人来人往。
  - 每个节点展示 3 类信息：
    - 当前进度：取 `unlocks` 中的上限（例如数字 maxN、空间 grids/maxN、老鼠 maxMice/难度、House speeds/maxEvents/maxInitialPeople）。
    - 下一目标：基于当前解锁上限计算“下一条可解锁的关卡”，并展示条件（准确率 ≥ 90%、建议题量/参数）。
    - 锁状态：当该模式存在未满足的里程碑门槛（例如 LV2 需要 numeric_2back 或 spatial_3x3_2back）时，节点右上角叠加锁头与提示。
- **点击节点 → 模式内关卡树面板（折叠卡片/Drawer/Modal）**:
  - **数字心流**：以 N 为纵轴、题量为横轴（5/10/15/…），以“当前可选配置”为可点击节点；锁定节点灰显并可点击查看解锁条件。
  - **空间心流**：以网格分支（3×3/4×4/5×5）作为一级树；每个网格下再展开 N 与题量节点，展示当前已解锁范围与下一步目标。
  - **魔鬼老鼠**：按难度 → 老鼠数量 → 轮数的层级展开，避免一次性铺满所有节点。
  - **人来人往**：按速度分支（easy/normal/fast）展开，并在分支内展示“初始人数”与“事件次数(6/9/12/…)”两条进度条式节点。
- **锁头交互**:
  - 锁定节点保持可点击，但不切换配置，仅弹出解锁条件（例如“用 N=2、题量=10、准确率≥90% 通关”）。
  - 在配置面板中尝试选择锁定值时，前端应立即本地拦截并提示，不阻塞训练流程；云端校验失败时以 toast/提示条告知并回滚到最近合法配置。

### 3.6 虚拟商城 (Brain Store)
- **入口**: 顶部导航栏显眼位置。
- **商品配置与数据源**:
    - 后端以数据库 `products` 表为权威来源（id/type/price_coins/rewards/is_active）。
    - 前端可内置展示文案与图标，但购买时以服务端价格与效果为准。
- **当前实际商品（与代码一致）**:
    - `energy_1`（consumable）: 价格 100 Brain Coins；效果 `{ energy: 1 }`（能量上限封顶为 5）。
    - `energy_5`（consumable）: 价格 450 Brain Coins；效果 `{ energy: 5 }`（能量上限封顶为 5）。
    - `streak_saver`（consumable）: 价格 500 Brain Coins；效果 `{ inventory: { streak_saver: 1 } }`（占位：用于未来补签机制）。
    - `premium_report`（permanent）: 价格 1000 Brain Coins；效果 `{ ownedItem: "premium_report" }`（占位：用于未来高级报告）。
- **后续完善方向（不影响当前版本）**:
    - **外观（Cosmetics）**: 主题配色、头像框（均作为 `permanent`/`inventory` 形式发放）。
    - **功能（Upgrades）**: 高级报表、训练计划、数据导出等（与 Resend 周报联动）。

### 3.9 邮件系统（Resend）
- **用途**:
  - 注册欢迎信（可选）
  - 邮箱验证 / 找回密码（与 Better Auth 的邮件流程对齐）
  - 周报/训练报告推送（与“高级报表”联动，付费/解锁后启用）
- **要求**:
  - 仅服务端使用 Resend API Key，不在前端暴露。
  - 邮件模板集中管理（纯文本/HTML 均可），并对发送失败做降级（不影响训练结算）。
- **环境变量**:
  - `RESEND_API_KEY`
  - `RESEND_FROM_EMAIL`

### 3.7 六维脑力模型 (Brain Radar)
**定义**: 用户的核心属性，存储于数据库，随训练动态更新。
- **维度计算公式**:
    1.  **记忆力 (Memory)**: `(Max_N_Numeric + Max_N_Spatial + Max_N_Mouse) * 权重`。
    2.  **专注力 (Focus)**: `近 20 局平均准确率`。
    3.  **计算力 (Math)**: `Numeric Flow` 的正确率与反应速度加权。
    4.  **观察力 (Observation)**: `Mouse Flow` (追踪) 和 `Spatial Flow` 的表现。
    5.  **负载力 (Load Capacity)**: 由 `House Flow` (动态更新) 和 `Numeric Flow` (N-Back) 共同决定。
    6.  **反应力 (Reaction)**: 所有模式的平均反应时间 (基准值 2000ms 倒扣)。
- **数据流**: 每次 `Assessment` (包含 Numeric -> Spatial -> Mouse -> House 序列) 或 `Training` 结算后，后端重新计算并更新 `users.brain_stats`。

##### 3.8 数据关联与热力图 (Data & Heatmap)
**设计目标**: 确保每一次有效训练都能在“热力图”和“经验值”上得到反馈，形成正向循环。

- **数据链路**:
    1.  **Game Session (游戏结算)**: 
        - 前端提交 `game_sessions` 记录 (含 `score`, `n_level`, `timestamp`)。
    2.  **XP Calculation (Session API)**:
        - 由结算接口计算本次 XP 并更新 `users.xp` / `users.brain_level`。
    3.  **Daily Activity (Heatmap Aggregation)**:
        - **表结构**: `public.daily_activity`
            - `user_id`: Text/UUID
            - `date`: Date (YYYY-MM-DD)
            - `total_xp`: Integer
            - `sessions_count`: Integer
        - **逻辑**: 结算接口对该表原子 Upsert。
        - **热力图渲染**: 前端通过 Profile 接口读取聚合记录，根据 `sessions_count` 渲染颜色深浅 (0=灰色, 1-2=浅绿, 3-5=中绿, 6+=深绿)。

### 4. 排行榜与社交 (Leaderboards)
**核心逻辑**: 分 N 值赛道，比拼平均速度。
- **榜单分类**:
    - **2-Back 速通榜**: 仅统计 2-Back 难度的成绩。
    - **3-Back 速通榜**: 仅统计 3-Back 难度的成绩。
    - ...以此类推至 12-Back。
- **排序指标**: **平均反应时间 (Average Response Time)**。
    - 仅当准确率 >= 90% 时才有资格上榜（防止乱点）。
    - 无论题目总数是 20 还是 50，均按平均单题耗时排序。
- **周期**: 每周一凌晨重置（周榜），激发持续挑战。

## 5. 用户体验与架构设计 (UX & Architecture)
**核心原则**: Mobile-First 但 PC-Friendly，全球化，无障碍。

### 4.1 布局架构 (Responsive Layout)
- **移动端**: 单列沉浸式布局。
- **PC/平板端**: **三栏式仪表盘布局**。
    - **左栏 (Profile)**: 个人档案、脑力等级、雷达图、连胜纪录。
    - **中栏 (Stage)**: 核心游戏区域（保持 16:9 或 4:3 比例，避免过宽）。
    - **右栏 (Dashboard)**: 历史记录、排行榜、任务清单。

### 4.2 国际化 (i18n)
- **架构**: 采用 `react-i18next` 或类似库。
- **支持语言**: 简体中文 (zh-CN)、英语 (en-US) 首发。
- **实现**: 所有文案提取至 JSON 字典，支持动态切换。

### 4.3 主题与无障碍 (Theming & a11y)
- **明暗模式**: 
    - **Light (Zen)**: 现有的莫兰迪暖灰。
    - **Dark (Deep Focus)**: 深蓝灰背景，高对比度文字，适合夜间训练。
    - **自动切换**: 跟随系统设置或用户手动切换。
- **无障碍设计**: 
    - 支持键盘操作（已部分实现）。
    - 颜色对比度符合 WCAG AA 标准。
    - 字体大小可缩放。

## 5. 技术架构升级 (Technical Roadmap)
- **Phase 1-3**: MVP (已完成)。
- **Phase 4**: 
    - **UI 重构**: 引入 Layout 系统，实现三栏布局。
    - **i18n 集成**: 搭建多语言框架。
    - **Theming**: 实现 Context API 管理明暗主题。
- **Phase 5**: 
    - **新内容**: 开发“人来人往” (House Flow)。
    - **评测模块**: 开发 Assessment 逻辑与雷达图可视化。
- **Phase 6**: 
    - **后端集成**: Supabase Auth & Database。

## 6. 视觉与交互风格 (UI/UX Design)
- **设计语言**: Flat Design (扁平化)。
- **配色**: 莫兰迪色系（低饱和度），保护视力，久看不累。
- **动效**: 丝滑的 CSS3 动画，强调操作的即时反馈。

## 7. 后端与数据架构 (Backend & Data Architecture)
**核心技术栈**: Supabase (PostgreSQL + Auth + Edge Functions)

### 7.1 身份认证体系 (Authentication & Identity)
**核心策略**: 统一身份认证 (Unified Identity)，支持多端登录与账号互通。利用 Supabase Auth 简化实现。

- **支持方式 (Providers)**:
    1.  **邮箱/密码 (Email/Password)**: 基础托底方案，需支持邮箱验证。
    2.  **OAuth 2.0 (Social)**:
        - **Google**: 面向国际用户 (OpenID Connect)。
        - **微信 (WeChat)**: 面向国内用户。
            - **PC Web**: 微信开放平台 (扫码登录)。
            - **Mobile Web/小程序**: 必须获取 `UnionID` 以确保多端数据互通。
- **账号体系 (Account System)**:
    - **账号关联 (Linking)**: 用户可在设置页绑定/解绑第三方账号 (如：已用邮箱注册，后续绑定微信)。
    - **匿名登录 (Guest)**: 允许游客试玩 (存储于 LocalStorage)，注册后数据合并 (Merge Strategy)。
- **安全风控**:
    - **JWT**: 无状态鉴权，Token 短效期 + Refresh Token 轮换。
    - **敏感操作**: 修改密码、支付需 Re-authentication (二次验证)。

#### 7.1.1 密码找回与修改（UI 与接口预留）
- **找回密码（Forgot Password）**:
  - 登录页提供“忘记密码？”入口，跳转到找回页输入邮箱。
  - 接口：使用 Better Auth 内置 `forgetPassword`（不暴露“邮箱是否存在”，统一返回 ok）。
  - 邮件发送：由 Better Auth 回调 `sendResetPassword` 触发 Resend 发信，链接指向 `/reset-password?...&token=...`。
- **重置密码（Reset Password）**:
  - 用户从邮件链接进入重置页，设置新密码。
  - 接口：使用 Better Auth 内置 `resetPassword`（token + newPassword）。
- **修改密码（Change Password）**:
  - Profile/Auth 区域提供“修改密码”入口。
  - 接口：使用 Better Auth 内置 `changePassword`（需登录态，currentPassword + newPassword，可选 revokeOtherSessions）。
  - 预留策略：对于 OAuth-only 用户，UI 仍展示入口，但后端可返回未支持提示或引导“改用邮箱登录/绑定邮箱”。

### 7.2 支付与订单架构 (Payment Architecture)
**设计原则**: 支付网关抽象层 (Payment Gateway Abstraction)，隔离业务逻辑与具体支付渠道。

- **多渠道适配 (Adapters)**:
    - **Stripe**: 全球信用卡、支付宝国际版 (主要面向海外)。
    - **微信支付 (WeChat Pay)**: Native 扫码 (PC) / JSAPI (Mobile) / H5 支付。
    - **支付宝 (Alipay)**: 备选渠道。
- **商品系统 (Product Catalog)**:
    - **SKU 定义**: 积分包 (Points Pack)、会员订阅 (Premium)、主题 (Theme)。
    - **定价策略**: 支持多货币 (CNY/USD) 动态定价。
- **订单生命周期 (Order Lifecycle)**:
    1.  **Created**: 用户点击购买，生成本地订单号。
    2.  **Pending**: 调用支付网关，获取支付凭证 (QR Code / Pay URL)。
    3.  **Paid (Webhook)**: **关键**。后端接收支付渠道的异步通知，验证签名，确认支付成功。
    4.  **Fulfilled**: 触发业务逻辑 (加积分/开会员)，更新用户资产。
    5.  **Completed**: 订单结束。
    - **异常处理**: 
        - **Refunded**: 客服退款，自动扣除对应权益。
        - **Expired**: 支付超时（15分钟未支付）。

### 7.3 数据库设计 (Database Schema)

#### Core Config Tables (Metadata)
- **`public.games`**: 游戏元数据，支持动态扩展。
    - `id`: Text (PK, e.g., 'numeric', 'house')
    - `name_key`: Text (i18n key)
    - `config_schema`: JSONB (Defines adjustable params: N-value, grid_size, mice_count)
    - `is_active`: Boolean
- **`public.level_configs`**: 难度配置表。
    - `id`: Integer (PK)
    - `game_id`: Text (FK)
    - `level_requirements`: JSONB (XP, Rank needed)
    - `unlock_criteria`: JSONB (e.g., `{"accuracy": 90, "prev_level_id": 101}`)

#### User Data Tables
- **`public.users`**:
    - ... (原有字段: id, email, created_at)
    - `auth_providers`: JSONB (['google', 'wechat'])
    - `wechat_unionid`: Text (Unique index, nullable)
    - `stripe_customer_id`: Text
    - `xp`: Integer (Experience Points)
    - `brain_level`: Integer (1-7)
    - `tutorial_status`: JSONB (Tracks completed tutorials: `{'numeric': true}`)
- **`public.user_unlocks`**: 替代原 user_progress，更灵活。
    - `user_id`: UUID (FK)
    - `game_id`: Text (FK)
    - `unlocked_params`: JSONB (Current max params: `{"n": 5, "grid": 4}`)
    - `completed_level_ids`: Array<Integer> (List of beaten level IDs)

#### Payment & Orders Tables
- **`public.products`**:
    - `id`: Text (PK, e.g., 'energy_pack_1')
    - `type`: Enum ('consumable', 'subscription', 'permanent')
    - `price_cny`: Integer (单位: 分)
    - `price_usd`: Integer (单位: Cent)
    - `price_coins`: Integer (Brain Coins 定价，免费内购用)
    - `rewards`: JSONB (e.g., `{"energy": 5, "points": 100}`)
- **`public.orders`**:
    - `id`: UUID (PK)
    - `user_id`: UUID (FK)
    - `product_id`: Text (FK)
    - `amount_paid`: Integer
    - `currency`: Text ('CNY', 'USD')
    - `status`: Enum ('created', 'pending', 'paid', 'fulfilled', 'failed', 'refunded')
    - `gateway_ref_id`: Text (第三方支付单号)
    - `created_at`: Timestamp
    - `paid_at`: Timestamp

#### Operational Tables
- **`public.sync_queue`**: 离线数据同步队列。
    - `user_id`: UUID
    - `payload`: JSONB (Offline session data)
    - `status`: Enum ('pending', 'processed', 'failed')

### 7.4 当前仓库已实现的数据库结构（以 Drizzle Schema 为准）
> 说明：本节用于“对齐现状”。上面的 7.3 是设计草案；实际落库表与字段以仓库内 Drizzle schema + migrations 为准。

#### 7.4.1 Auth 相关表（已实现）
- **`public.user`**（用户主表，含游戏字段）
  - 身份字段：`id/name/username/display_username/email/emailVerified/image/role/gender`
  - 游戏字段：`xp/brain_level/brain_coins`
  - 体力字段：`energy_current/energy_last_updated/unlimited_energy_until`
  - 签到字段：`check_in_last_date/check_in_streak`
  - 进度字段：`brain_stats (jsonb)/tutorial_status (jsonb)`
  - 商城资产：`owned_items (jsonb)/inventory (jsonb)`
  - 其他：`wechat_unionid/stripe_customer_id/createdAt/updatedAt`
- **`public.session`**：登录会话（token + expiresAt + userId + ip/userAgent 等）
- **`public.account`**：账号绑定（providerId/accountId + token 等）
- **`public.verification`**：邮箱验证/一次性验证记录

#### 7.4.2 游戏数据表（已实现）
- **`public.game_sessions`**（每局训练历史，后端结算接口会写入）
  - `id/user_id/game_mode/n_level/score/accuracy/config_snapshot(avg params + metrics)/avg_reaction_time/created_at`
- **`public.user_unlocks`**（解锁树，复合主键 user_id + game_id）
  - `unlocked_params (jsonb)/completed_level_ids (int[])/updated_at`
- **`public.daily_activity`**（热力图聚合）
  - `user_id/date/total_xp/sessions_count/updated_at`

#### 7.4.3 商城/订单（当前实现状态）
- **数据库侧**：目前没有 `products` / `orders` / `payments` 等表结构（尚未落库）。
- **前端侧**：商品目录目前为前端常量（`STORE_PRODUCTS`），用户资产通过 `user.owned_items`（以及预留的 `inventory`）存储。
- **缺口**：若要实现“可扩展商品体系 + 支付订单”，需要补齐：`products` / `orders` / `order_items` / `payments` 等表，以及购买/发货/回滚的后端接口。

#### 7.4.4 与前端显示字段的对齐说明（重要）
- **当前后端 `/api/user/profile` 能稳定返回/恢复的数据**：`xp/brainLevel/brainCoins/energy/checkIn/unlocks/dailyActivity/ownedItems`，以及（新增）`totalScore/maxNLevel/daysStreak/brainStats/sessionHistory`。
- **容易“刷新后看似丢失”的数据来源**：
  - 若仅依赖前端 localStorage（如 `totalScore/maxNLevel/daysStreak/brainStats/sessionHistory`），在 redeploy/清缓存/不同设备登录时会出现不一致。
  - 解决方向：将这些统计统一由后端基于 `game_sessions/user_unlocks/daily_activity` 计算并随 profile 下发（或落库到 `user.brain_stats` 等字段）。

## 8. 新手引导设计 (Onboarding)
**核心理念**: "Show, Don't Tell"。通过交互式引导让用户理解 N-Back 机制。

### 8.1 引导流程：数字心流 (Numeric Flow)
- **场景**: 用户首次进入数字心流模式。
- **配置**: 强制 1-Back, 5 Rounds (极简模式)。
- **Step-by-Step**:
    1.  **Round 1 (展示)**: 
        - 屏幕显示 `3 + 2`。
        - 出现遮罩层 + 指针动画：“记住这个答案 (5)”。
        - **不出现输入框**。
        - 自动进入下一轮。
    2.  **Round 2 (回忆)**:
        - 屏幕显示 `1 + 1`。
        - 指针指向输入框：“输入**上一题**的答案 (5)”。
        - 输入框高亮，等待用户输入 `5`。
        - 输入正确后，显示正确反馈。
    3.  **Round 3 (连续)**:
        - 屏幕显示 `4 + 4`。
        - 提示：“现在输入刚才那题 (1+1) 的答案”。
        - 用户独立完成。
    4.  **Round 4-5**: 无提示，独立完成。
    5.  **结算**: 恭喜完成新手教学，获得“初学者”徽章 + 50 积分。

### 8.2 引导流程：空间心流 (Spatial Flow)
- **场景**: 用户首次进入空间模式。
- **配置**: 1-Back, 3x3 Grid, 5 Rounds。
- **Step-by-Step**:
    1.  **Round 1 (展示)**:
        - 左上角格子亮起（蓝色）。
        - 提示：“记住这个位置”。
        - **所有格子点击无效**。
        - 自动进入下一轮。
    2.  **Round 2 (回忆)**:
        - 中间格子亮起。
        - 提示：“点击**上一次**亮起的位置（左上角）”。
        - 左上角格子出现幽灵图标引导。
        - 用户点击正确后，进入下一轮。
    3.  **Round 3 (连续)**:
        - 右下角格子亮起。
        - 提示：“现在点击刚才那个位置（中间）”。
        - 无幽灵图标，等待用户操作。
    4.  **Round 4-5**: 独立完成。

### 8.3 引导流程：魔鬼老鼠 (Mouse Flow)
- **场景**: 追踪模式新手引导。
- **配置**: 4x3 Grid, 3 Mice, 2 Steps。
- **阶段一：明牌模式 (无遮蔽)**
    1.  **Start**: 3 只老鼠出现在不同位置。
    2.  **Move**: 老鼠移动 2 步，**全程可见**，没有遮挡板。
    3.  **Prompt**: 移动结束后，提示：“点击所有老鼠现在的栖息地”。
    4.  **Action**: 用户点击 3 个正确位置。
- **阶段二：遮蔽模式 (实战)**
    1.  **Start**: 老鼠就位，然后遮挡板落下。
    2.  **Move**: 只能看到遮挡板下的轻微晃动或仅仅是起点终点逻辑（视实现而定）。
    3.  **Prompt**: “凭记忆找出它们”。
    4.  **Action**: 用户尝试点击。如果错误，透视显示正确位置并重试。

### 8.4 引导流程：人来人往 (House Flow)
- **场景**: 计数模式新手引导。
- **配置**: 单门, 3次事件, 初始3人。
- **Step-by-Step**:
    1.  **Start**: 房子剖面图，显示里面有 3 个小人。
    2.  **Event 1 (进)**: 门打开，进来 2 人。数字 "+2" 浮动显示。
    3.  **Pause**: 画面暂停。提示：“现在有 3+2 = 5 人”。
    4.  **Event 2 (出)**: 门打开，出去 1 人。数字 "-1" 浮动显示。
    5.  **Pause**: 画面暂停。提示：“现在有 5-1 = 4 人”。
    6.  **Event 3 (进)**: 进来 3 人。无提示。
    7.  **Result**: 画面变暗，出现数字键盘。提示：“请输入现在的人数”。
    8.  **Feedback**: 输入 7 -> 正确！

## 9. 扩展性设计 (Extensibility Guide)
**如何添加新游戏 (e.g., House Flow)**:
1.  **DB**: 在 `games` 表插入一行 `{'house', ...}`。
2.  **Frontend**: 
    - 实现 `IGameEngine` 接口 (`useHouseGame.ts`)。
    - 注册到 `GameRegistry` (映射 `game_id` 到组件)。
    - i18n 文件添加对应翻译。
3.  **Backend**: 无需修改代码，API 自动透传新的 `game_id` 和 `stats`。

## 11. 帮助与说明中心 (Help & Instruction)
**入口**: 设置菜单或首页 "?" 按钮。

- **游戏玩法百科**:
    - 图文展示每种模式的核心规则（如 N-Back 机制图解）。
    - 高级技巧（如“声音记忆法”、“位置分组法”）。
- **等级制度说明**:
    - 详细列出 LV1-LV7 的 XP 门槛和解锁权益。
    - 解释雷达图六维（记忆、专注、计算、观察、负载、反应）的具体含义。
- **关于我们**:
    - 项目愿景（心流体验）。
    - 隐私政策与服务条款。
