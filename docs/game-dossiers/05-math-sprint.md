# 游戏档案 05 · Math Sprint(口算冲刺)

## 1. SEO 定位
- slug:`/games/math-sprint` · 关键词:mental math test、math sprint、60 second math
- H1 钩子:60 seconds. No calculator.
- 副标题:Mental arithmetic, difficulty grows as you solve

## 2. 玩法协议(不变)
- 限时 60s(可配 30/60/120):题目随解题数变难;计正确数
- 难度曲线与 delta 计时(防刷分)均已正确

## 3. 参考值(诚实红线)
- **无典型值**:本协议为自研(难度曲线独特),无可比公开数据——typicalNone 分支,只比自己历史

## 4. 仪器面
- 表面 = 算式卡(idle/playing 大号算式 + 输入回显/finished)+ NumericKeypad
- 共享 ProgressBar 计时条 + 解题数行;错误红圈抖动反馈(现有)

## 5. 读数卡
- `{solved} SOLVED` + 尝试数/准确率;typicalNone;迷你图 = 历史正确数
- PLAY AGAIN / ALL 9 GAMES · 角标色相 #84663B

## 6. 身份
色相 赭金 #84663B · 记号:秒表 · 编号 05/09

## 7. 引擎改动
无

## 8. 落地页
直接可玩(同一模式)

## 9. 验收
- [ ] landing 全程可玩;读数卡 typicalNone;build+lint 零;playwright 实测
