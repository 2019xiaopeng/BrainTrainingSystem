# 游戏档案 04 · Stroop Test(色词冲突)

## 1. SEO 定位
- slug:`/games/stroop-test` · 关键词:stroop test、stroop effect test
- H1 钩子:Your brain lies to you. Catch it.
- 副标题:Name the ink color, not the word · 60 seconds

## 2. 玩法协议(不变)
- 限时 60s:看色词(字义与墨色冲突),点"墨水颜色"的按钮;计正确数
- 墨色 = 标准刺激集 红蓝绿黄(**刺激色豁免**,不可主题化)
- 按钮恒为中性墨 + 柔色卡(按钮永不"用自己颜色拼自己"——会反转挑战)

## 3. 参考值(诚实红线)
- **无典型值**:各家 Stroop 协议差异大(时长/试次/计分),跨站数字不可比——readout 走 typicalNone 分支(只比自己历史),About 解释原因
- 这是"没有可信参考就不编"红线的示范用例

## 4. 仪器面
- 表面 = 色词卡(idle 提示 / playing 大字墨色 / finished 淡出)
- 计时条(共享 ProgressBar)+ 分数行;1-4 键盘快捷(现有)

## 5. 读数卡
- `{score} CORRECT` + 尝试数/准确率;typicalNone 注释;迷你图=历史正确数
- PLAY AGAIN / ALL 9 GAMES · 角标色相 #7C5F98

## 6. 身份
色相 紫 #7C5F98 · 记号:交叠方块 · 编号 04/09

## 7. 引擎/结构改动
- 词表/墨色/色卡从组件抽到 `lib/stroop.ts`(游戏屏与落地页共用,顺手消除组件内表的老 shortcut)

## 8. 落地页
直接可玩(同一模式):statline → 计时条+色词卡 hero → 答题按钮 → 读数卡 → 索引/About/FAQ

## 9. 验收
- [ ] landing 可玩全程 60s;读数卡 typicalNone 正确显示;✓/✗ 反馈在
- [ ] build+lint 零;playwright 实测
