# 游戏档案 06 · Hippocampus Test(海马体测试)[新游戏]

## 1. SEO 定位
- slug:`/games/hippocampus-test` · 关键词:hippocampus test、chimp test、number memory order
- H1 钩子:Numbers flash once. Recall them in order.
- 参考系:humanbenchmark Chimp Test(源自 2007 Ayumu 研究——年轻黑猩猩在此任务胜过成人);"海马体测试"为中文圈病毒式称呼,直接吃搜索词

## 2. 玩法协议(本档案定义)
- 5×5 网格;第 L 级放 3+L 个数字于随机位置(1 级 4 个,同 HB)
- 展示 900ms + 160ms/数字(scheduleVisible)→ 隐藏 → 按从小到大点击
- 点对:数字短暂揭示;点错:红闪 + 记 1 次 strike;**3 strikes 终局**
- **成绩 = 最高完成等级**(best 存 `brain-flow-best:hippocampus`)

## 3. 参考值(诚实红线)
- **TYPICAL 6 levels** — humanbenchmark 黑猩猩测试 FAQ:"levels 5–7 为平均人类表现"(注明 FAQ 来源,非临床)

## 4. 仪器面
网格即 hero:showing 态数字可见(墨底 sage 格)、recall 态全部遮蔽、正确揭示/错误红闪
Strike 显示:✕✕·(三点上限)

## 5. 读数卡
`{finalLevel} LEVELS` · YOURS vs TYPICAL 6(FAQ 来源)· 迷你图=历史等级 · 角标色相 #4E6E8E(新海蓝)

## 6. 身份
色相 海蓝 #4E6E8E · 记号:数字+网格 · 编号 06/10

## 7. 引擎
`useHippocampusGame`(新写):idle→showing→recall→feedback→finished;全部计时走 scheduleVisible;strikes 逻辑可测

## 8. 落地页
直接可玩(同 Sequence 模式)

## 9. 验收
- [ ] 闪现→遮蔽→按序点击→升级/红闪/三振 全流程;隐藏标签页不烧展示窗
- [ ] build+lint 零;playwright 实测
