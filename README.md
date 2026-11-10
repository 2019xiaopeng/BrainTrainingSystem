# Brain Flow — 脑力心流

一个极简风格的 N-Back 脑力训练小游戏（Vite + React + TypeScript），**游客即玩、无后端、纯静态部署**。

> 2026-11 起项目转向出海小游戏矩阵路线：砍掉账号/体力/商城/战役等系统，专注做更多 2-5 分钟的脑力小游戏。
> 背景与计划见 [docs/pivot-roadmap-2026-11.md](docs/pivot-roadmap-2026-11.md)（路线图）与 [docs/code-audit-2026-11-09.md](docs/code-audit-2026-11-09.md)（转向前的全仓审计）。

## 现有游戏

| 模式 | 说明 |
|---|---|
| 🔢 数字心流 | 延迟回忆算术答案（N-Back 魔鬼计算） |
| 🎯 空间心流 | 网格位置 N-Back（3×3 / 4×4 / 5×5） |
| 🐭 魔鬼老鼠 | 老鼠路径追踪 + 推挤位移记忆 |
| 🏠 人来人往 | 动态进出人数心算 |
| ⚡ 反应力测试 | 变绿即点,5 次取平均(humanbenchmark 风格) |
| 🧠 数字记忆 | 数字广度测试,记对加一位直到记错 |
| 🧩 顺序记忆 | 复现格子亮起顺序,每级 +1 步 |
| 🎨 色词冲突 | 60 秒忽略词义选印刷颜色 |
| 🧮 口算冲刺 | 60 秒限时口算,难度爬坡 |

## SEO

每个游戏有独立落地页(`/games/reaction-time-test` 等 9 个 SEO slug),含 JSON-LD 结构化数据、站内互链、sitemap.xml 与 robots.txt。上线前需将 `src/lib/games.ts` 中的 `SITE_URL` 占位符替换为真实域名。

所有参数（N 值、轮数、网格、难度、速度）自由调节，无需解锁。

## 技术栈

- **前端**:Vite 7 + React 19 + TypeScript 5.9(strict)
- **样式**:Tailwind CSS 3(zen/sage 主题色板)
- **状态**:Zustand 5 + persist(localStorage `brain-flow-storage`,仅本地游客数据)
- **路由**:react-router-dom v7
- **动画**:Framer Motion 12
- **图表**:Recharts(六维脑力雷达)
- **国际化**:i18next(zh/en)
- **部署**:Vercel 纯静态(见 `vercel.json` 的 SPA rewrite)

## 快速开始

```bash
npm install
npm run dev      # 本地开发
npm run build    # tsc 类型检查 + 生产构建
npm run preview  # 预览生产构建
npm run lint     # ESLint
```

无需任何环境变量或数据库。

## 架构速览

```
src/
├── App.tsx                    # 路由:/ /train/:mode /result /profile /rank /settings
├── store/gameStore.ts         # 唯一 Zustand store:配置 + 本地历史 + 本地档案
├── types/game.ts              # 全部游戏类型与常量(N-Back/老鼠/人来人往)
├── hooks/                     # useNBack / useMouseGame / useHouseGame / useSoundEffects
├── components/
│   ├── pages/                 # 路由包装(Home/Train/Result)
│   ├── screens/               # 页面级 UI(Home/Game/MouseGame/HouseGame/Result/Profile/Rank/Settings/Instruction)
│   ├── game/                  # 游戏内组件(StimulusCard/NumericKeypad/AnswerCountdown/StatusBar)
│   ├── profile/               # BrainRankCard / RadarChartWidget / ActivityHeatmap
│   └── layout/                # MainLayout 三栏 + Sidebar/RightPanel/MobileNav
└── lib/                       # cn 工具 / heatmap 聚合
```

**数据模型**:`userProfile`(总分/XP/最高N/连续天数/六维脑力/里程碑)全部由本地 `sessionHistory` 驱动,存在浏览器 localStorage。无服务端。

## 开发约定

- React 函数组件 + Hooks;严格 TS,禁止 `any`
- 组件放 `components/`,游戏逻辑放 `hooks/`,类型集中 `types/game.ts`
- PascalCase 组件名,camelCase 变量;提交信息遵循 conventional commits
- 新游戏接入:在 `types/game.ts` 定义配置 → `hooks/` 写引擎 → `components/screens/` 写界面 → HomeScreen 加模式入口
