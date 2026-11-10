# 动画专项审计报告(9 游戏街机版)

日期:2026-11-10 · 对象:`v6-arcade`(9 游戏 + 落地页)· 方式:只读审计 + 关键结论人工核实(4/4 证实)

**前置核实(无问题项)**:所有 `animate-*` 工具类均在 tailwind.config.js 有定义;framer 12 对内联数组做浅比较,Stroop/MathSprint 的抖动不会因重渲染重启;StrictMode 单次启动守卫全部正确;唯一的 `times:` 用法 keyframe 数量匹配;framer 动画全部走 transform/opacity,无布局属性动画。

---

## 一、必须修(破坏体验/刷分向量/竞态)

1. **口算冲刺时钟按"每 tick 固定扣 250ms"而非真实流逝时间**——`useMathSprintGame.ts:215-226`。Chrome 对后台化窗口的定时器限流到约 1 次/秒,此时一个"60 秒"局实际只扣 250ms/秒 → 玩家获得数分钟额外时间、分数虚高(个人最佳可刷)。Stroop 已用正确写法(`useStroopGame.ts:229-238`,按 performance.now() 差值)。**修法:照抄 Stroop 的 delta 计时。**
2. **口算冲刺首个 tick 在 t=0 同步执行**——`useMathSprintGame.ts:226` 直接 `tick()`,开局进度条肉眼可见地从 100% 跳 99.6%,秒数显示"60"零秒。**修法:改为 `scheduleVisible(tick, TICK_MS)` 起步。**
3. **AnswerCountdown 环形倒计时双重平滑**——`AnswerCountdown.tsx:80` 给 rAF 每帧更新的 dashoffset 又加了 `transition-all duration-100`,CSS 过渡追不上 60fps 重设值 → 红色 <3s 段橡皮筋拖影,且 React 每秒渲染约 600 次。**修法:删掉 transition-all(可保留 transition-colors)。**
4. **House 的 peek→houseDrop 是全仓唯一裸 setTimeout**——`HouseGameScreen.tsx:192`,下一行用的都是 scheduleVisible。切后台 0.5 秒 → 揭示阶段被跳过,回来看不到初始人数,首个事件立即触发。**修法:t1 也走 scheduleVisible。**
5. **Mouse 阶段提示文字每次推挤都重播动画**——`MouseGameScreen.tsx:542` key 含 `currentPushIndex`,文字内容没变("猫来了!")却每 800ms 淡出淡入一次,一轮闪 2-3 次。**修法:key 去掉 currentPushIndex。**

## 二、应该修(可访问性/一致性)

6. **reduced-motion 覆盖缺口**:index.css:64-74 的降级只管 CSS 动画,**framer/rAF 全部不读这个媒体查询**(全仓 0 处 MotionConfig/useReducedMotion)。涉及 7 个游戏文件的 framer 动画 + Mouse 的 rAF 推滑动。最差混搭在 Stroop:进度条冻住了、卡片还在抖。**修法:App 根部包一层 `<MotionConfig reducedMotion="user">`(保留淡出)+ Mouse rAF 循环加 matchMedia 早退。**
7. **Stroop 答对反馈纯靠颜色**——`StroopGameScreen.tsx:105-110`,关声音+红绿色盲时"答对"与"无事发生"不可区分(错的有抖动,对的只有色调)。**修法:反馈 400ms 内在卡片角落加 ✓/✗ 字符。**
8. **每次阶段切换丢焦点**——4 个新游戏的 keyed AnimatePresence 换阶段时,被聚焦控件卸载,焦点落到 body,键盘用户 Tab 从头开始。**修法:每阶段主按钮 autoFocus。**
9. **Mouse 倒计时数字的 exit 永远不会播**——`MouseGameScreen.tsx:567-572`,keyed motion.div 不在 AnimatePresence 直接子级。**修法:套一层 AnimatePresence 或删 exit。**
10. **数字记忆是唯一没有局内退出按钮的新游戏**——只能靠浏览器返回。**修法:照抄 Sequence 的文字退出链接。**
11. **跨游戏一致性电池**(统一化改造的靶点,全部有 file:line):
    - 阶段过渡 7 种写法:0.25s/±10px(NumberMemory)、0.2s/±8px(Sequence)、0.25s/±10px(Math)、0.18s/scale(Reaction)、0.25s y-only(Stroop)、默认 y-flip(Mouse)、6px(House)
    - 错误反馈 5 种:卡片抖 / 键盘抖+红圈 / 红格揭示 / 无 / 彩色文字
    - 正确反馈 5 种:sage 卡+🌿 / 行内 sage 字 / 纯色调 / 无 / 彩色数字
    - 个人最佳徽章两种配色(sage-200 vs amber-100)、庆祝弹簧参数三处重复(260/18)
    - 进度条三种(颜色/高度/驱动方式/刷新频率都不同)
    - 结算按钮两种尺寸、退出按钮四种样式
    **修法:抽 4 个共享件——phaseMotion、ScoreReveal、PB 徽章、scaleX 进度条。**

## 三、顺手项

12. tailwind.config.js:55 `pulse-soft`、:81-84 `float` 无使用,删。
13. `HouseGameScreen.tsx:132` `sm:w-18` 不是合法 TW3 工具类(TW3 默认无 18 档)→ 类不生效,人物在 sm 断点不放大。改 `sm:w-[4.5rem]`。
14. `GameScreen.tsx:442` 反馈行只在首次挂载播一次 fade-in,后续轮次换字无动画(key 未按轮变化)。
15. `StroopGameScreen.tsx:162-180` 结算时上一张题目卡还留在分数面板上方,建议 `opacity-40` 或 finished 时隐藏。
16. `MouseGameScreen.tsx:488-497` 翻面动画 600ms 与 600ms 的 setTimeout 完回调差一帧,可能翻到一半切推挤。加 50ms 宽限或用 onAnimationComplete。
17. GameLandingScreen 纯 CSS 动画,干净无发现。

## 一致性矩阵(现状)

| 游戏 | 阶段过渡 | 对/错反馈 | 进度指示 | 破纪录庆祝 |
|---|---|---|---|---|
| 数字N-Back | 无(刺激卡 slide-up) | 彩色文字行 | scaleX 条+轮次文字 | 无(去 /result) |
| 空间N-Back | 无;格子 pulse-finite | 绿/红格+文字 | 同上 | 无 |
| 魔鬼老鼠 | AP wait keyed y-flip | 彩色药丸+格子色调 | framer amber 条 | 无 |
| 人来人往 | AP wait 6px-y 药丸 | 绿/红药丸 | CSS amber 条 | 无 |
| 反应力 | keyed 0.18s fade+scale | 彩色 ms 数字 | 文字计数 | 静态 amber 药丸 |
| 数字记忆 | AP wait 0.25s ±10px | 对:sage卡🌿 / 错:无 | 无(等级文字) | 弹簧+sage 药丸 |
| 顺序记忆 | AP wait 0.2s ±8px | 对:行内sage / 错:红格揭示 | 无(等级文字) | 弹簧+sage 药丸 |
| 色词冲突 | keyed 卡 fade/scale | 色调+错抖(对错纯色) | scaleX 条+时钟 | 静态 amber 药丸 |
| 口算冲刺 | AP wait 0.25s ±10px | 对:无 / 错:键盘抖+红圈 | scaleX 条+大秒数 | 弹簧+sage 药丸 |

**统一化建议**:以 Sequence/Math 的 `AnimatePresence mode="wait" + 0.25s phaseMotion` 为标准;错误反馈统一 Math 的"抖+红圈"、正确反馈加 ✓/✗ 文字符号;进度条统一 sage h-1.5 scaleX 200ms;庆祝统一 ScoreReveal 弹簧+sage 徽章。

---

**环境警告**:本次审计期间发现 **C 盘剩 0 MB**(Claude Code 临时目录所在盘),审计代理最后两次搜索因无法创建临时文件失败。建议尽快清理 C 盘(F 盘也仅剩 1.2G)。
