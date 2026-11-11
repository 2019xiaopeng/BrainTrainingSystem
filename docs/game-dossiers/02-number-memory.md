# 游戏档案 02 · Number Memory(数字记忆)

## 1. SEO 定位
- slug:`/games/number-memory` · 关键词:number memory test、digit span test
- H1 钩子:How many digits can you hold?
- 副标题:Endless digit span · one more digit every round · no signup

## 2. 玩法协议(不变)
- 无限数字广度:每级数字串 +1 位,背出即升级,错即终局
- 计分:最终正确复述的位数(best = 历史最长)
- 展示时长 1000ms + 400ms/位;scheduleVisible 防隐藏页烧窗口(已正确)

## 3. 参考值(诚实红线)
- **TYPICAL 9 digits** — 来源:第三方对 humanbenchmark 数据的分析(median 9 / avg 9.2);HB 官方未直接公布,note 必须写"third-party analysis"
- 临床数字广度(顺背 ~7)与线上自选人群不可比——About 里说明,避免误读

## 4. 仪器面
- 表面四态:idle(zen-100 虚线)/ showing(墨面大号数字)/ input(zen-100 + NumericKeypad)/ feedback + finished(读数卡)
- 数字字号随位数自适应(现有 digitSizeClass 逻辑)
- 键盘数字 + 退格 + 回车提交(现有 NumericKeypad 全支持)

## 5. 读数卡
- 大读数 `{finalLength} DIGITS` · YOURS vs TYPICAL 9(来源脚注)
- 迷你图:历史各局位数(sessionHistory mode=numberMemory 的 totalRounds)
- PLAY AGAIN / ALL 9 GAMES · 角标色相 #4A6B8A

## 6. 身份
色相 石板蓝 #4A6B8A · 记号:方框+数字"7" · 编号 02/09

## 7. 引擎改动
无(协议/计时/best 全部已正确)。唯一改动:落地页用 hook 直玩 + saveSession 已由 hook 内部完成

## 8. 落地页
- **直接可玩**(同一模式):statline PB/typical → 数字面 → 键盘 → 读数卡 → 索引/About/FAQ

## 9. 验收
- [ ] landing 首屏即可玩;错局后读数卡数据真实;history 空态
- [ ] build+lint 零;playwright 实测
