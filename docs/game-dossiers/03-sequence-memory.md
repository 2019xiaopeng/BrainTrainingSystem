# 游戏档案 03 · Sequence Memory(顺序记忆)

## 1. SEO 定位
- slug:`/games/sequence-memory` · 关键词:sequence memory test
- H1 钩子:Repeat the pattern. One more step every round.
- 副标题:Grid flashes in order · recall it · grows each level

## 2. 玩法协议(不变)
- 网格序列:每级闪序 +1 格(前序延展),点击复述;错即终局
- 计分:最终完整复述的序列长度;best = 历史最长
- 闪 600ms + 隙 250ms;scheduleVisible 防隐藏页推进(已正确)

## 3. 参考值(诚实红线)
- **TYPICAL 8 levels** — 来源:多个第三方对 humanbenchmark 数据的分析("typical ≈8,6-8 健康成人区间");HB 官方未公布。note 写明 third-party analyses
- 我们从第 1 级 1 格起,与 HB 口径一致(其 "level" 即序列长),可比

## 4. 仪器面
- 表面 = 网格本体(idle 显示提示;showing 闪亮格 sage;input 可点;finished 保留终局揭示)
- 网格尺寸取用户配置(3-5),复用引擎的 lit/wrongCell/pick 闪示
- 移动端网格 max-w-xs

## 5. 读数卡
- `{finalLength} LEVELS` · YOURS vs TYPICAL 8(来源脚注)
- 迷你图:历史各局长度(sessionHistory mode=sequence 的 totalRounds)
- PLAY AGAIN / ALL 9 GAMES · 角标色相 #2B6E68

## 6. 身份
色相 苔青 #2B6E68 · 记号:三点渐大 · 编号 03/09

## 7. 引擎改动
无(协议/计时/pressCell/best 均已正确;saveSession 在 hook 内完成)

## 8. 落地页
- 直接可玩(同一模式):statline → 网格 hero → 读数卡 → 索引/About/FAQ

## 9. 验收
- [ ] landing 闪示/点选/终局读数全通;history 空态
- [ ] build+lint 零;playwright 实测
