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
    - **维度**: N-Back (1-12) x 网格 (3x3/4x4/5x5)。
    - **解锁规则**:
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
        - **速度**: Easy(1.5s/人) -> Normal(1.0s/人) -> Fast(0.5s/人)。
        - **事件数**: 5次 -> 10次 -> 15次 -> 20次进出事件。
        - **复杂度**: 
            - Lv1: 单门 (只进不出)。
            - Lv2: 单门 (有进有出)。
            - Lv3: 双门 (左进右出，需同时关注)。
            - Lv4: 干扰 (有人走到门口折返)。
    - **解锁路径**:
        - **入门**: 速度Easy + 5事件 + 单门。
        - **晋升**: 准确率 > 90% 解锁下一级事件数 (5->10)。
        - **质变**: 通关 Normal 速度所有事件数 -> 解锁双门模式。

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
    - **基础金币**: `BrainCoins = Round(score * 0.1)`。
    - **解锁奖励 (First Clear Bonus)**: 当本局触发 `newlyUnlocked` 时，每条解锁 +100 Brain Coins，且返还本局消耗的 1 点体力。
    - **每日完美 (Daily Perfect)**: 每日首次 `accuracy == 100%` 额外 +50 Brain Coins。
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
    - 首次成功解锁新关卡时，**返还本次消耗的 1 点体力**（相当于免费挑战）。
    - 额外奖励 Brain Coins（每条解锁 +100 Brain Coins）。
- **每日首胜 (Daily Perfect)**:
    - 每日首次获得 100% 准确率（任意难度），奖励额外 +50 Brain Coins。

### 3.6 虚拟商城 (Brain Store)
- **入口**: 顶部导航栏显眼位置。
- **商品分类**:
    - **补给品 (Consumables)**:
        - **体力药水**: +1 体力 (100积分) / +5 体力 (450积分)。
        - **补签卡 (Streak Saver)**: 恢复中断的连胜 (500积分)。
    - **外观 (Cosmetics)**:
        - **主题配色**: 解锁 "Dark Focus" 或 "Geek Green" 等 CSS 主题。
        - **头像框**: 显示在排行榜上的特殊边框。
    - **功能 (Upgrades)**:
        - **高级报表**: 解锁 30 天能力趋势分析图。

### 3.7 五维脑力模型 (Brain Radar)
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
