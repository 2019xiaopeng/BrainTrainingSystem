# 游戏档案 01 · Reaction Time Test(反应力测试)

> 每游戏一册,实现前定案。顺序依据:SEO 流量潜力第一。

## 1. SEO 定位

- **slug**:`/games/reaction-time-test`(已存在)
- **目标关键词**:reaction time test(主)、reaction test、reflex test(变体)
- **H1 钩子**:How fast are your reflexes?
- **副标题**:5-tap series · score is your median · plays in your browser, no signup
- **竞品对照**:humanbenchmark /tests/reactiontime;差异 = 零广告、深色读数卡、移动端优先

## 2. 玩法协议(核心变更)

| 项 | 现状 | 定案 | 理由 |
|---|---|---|---|
| 局制 | 5 击 | 5 击(不变) | 行业惯例 |
| 计分 | 平均数 avgMs | **中位数 medianMs** | 单次失手不毁成绩;与典型值同口径可比 |
| best 记录 | best avg | **best median**,新 key `reaction-v2` | 异口径不混比,旧值不迁移(诚实优先) |
| too-soon | 作废重试同一击 | 不变 | 已正确 |
| 隐藏标签页 | 绿屏期作废重试 | 不变 | 已正确(计时诚实) |

## 3. 参考值(诚实红线)

- **TYPICAL 273 ms** — humanbenchmark.com 公开统计,用户中位数,≈81M 样本(2026-11 竞品研究核实)
- 措辞:`typical value, not a clinical norm · not a percentile`
- About 保留设备/输入方式差异说明(鼠标 vs 触屏,比较仅作精神参考)

## 4. 仪器面(pad)

- 四态:idle(zen-100 虚线框)/ wait(刺激红 #C62828)/ go(刺激绿 #6FBF73)/ result+tooSoon(zen-900,sage-light 数字)
- **刺激色豁免主题**(标准红→绿协议+文字同步,色盲冗余);GO 翻转零 transition
- 空格/Enter 全局;击间大号毫秒 + TAP n/5 芯片行

## 5. 读数卡(墨室)

- `{median} MS · MEDIAN OF 5 TAPS` + YOURS vs TYPICAL 273(来源脚注)
- 迷你图:本次 5 击(实线)+ 历史局中位数(虚线,sessionHistory mode=reaction 的 avgReactionTimeMs)+ TYPICAL 参考线;无历史空态
- PLAY AGAIN(sage-light)/ ALL 9 GAMES(ghost);角标色相 #9C5F46

## 6. 身份

色相 砖红 #9C5F46(paper-on-hue 4.7:1)· 闪电线条记号 · 编号 01/09

## 7. 引擎改动(useReactionGame)

1. `ReactionResult` 增 `medianMs: number`;`finish()` 计算(sort 取 [2]);best 比较改用 median
2. best 换新 key `brain-flow-best:reaction-v2`,旧 key 不读不迁
3. `session.avgReactionTimeMs` 填 median(历史图直接可用);rounds 保留每击毫秒
4. i18n:reactionHelp 改中位数口径;新增 gameLanding.hook/statline/about/faq 键(en+zh)

## 8. 落地页

- **直接可玩**(HB 同款转化路径):landing 内嵌 pad 复用同一引擎 hook,不跳转
- 结构 = direction-final-instrument.html 已验证稿:品牌栏 → kicker/hook/PB+TYPICAL 行 → pad → 芯片行 → 读数卡(局完出现)→ 九游戏索引 → About → 页脚
- 其余 8 游戏走"协议+CTA"版(嵌入玩法仅限反应力)

## 9. 验收

- [ ] 5 击出 median;too-soon 不计数;隐藏标签页作废绿屏局
- [ ] landing 首屏即可玩;读数卡全真实数据(历史空态除外)
- [ ] build+lint 零;playwright 过真实页面
