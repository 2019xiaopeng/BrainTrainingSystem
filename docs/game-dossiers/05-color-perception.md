# 游戏档案 05 · Color Perception Test(色觉挑战)[新游戏,替换已下架的口算冲刺]

## 1. SEO 定位
- slug:`/games/color-perception-test` · 关键词:color perception test、color test game、shade test
- H1 钩子:One shade is different. Find it.
- 参考系:Kuku Kube(kuku-kube.com,同类鼻祖)——网格同色块中找唯一异色,网格渐大、色差渐小

## 2. 玩法协议(本档案定义)
- 无限等级:每级网格 2×2 起,每 4 级 +1(上限 6×6);异色块亮度差 = max(3, 16−等级)%
- 点对升级,点错即终局;**成绩 = 已通过等级数**(best 存 `brain-flow-best:color-perception`)
- 颜色:HSL 随机基色(45-70% 饱和、45-63% 亮度),异色仅动亮度(±方向随机),高等级逼近可辨极限

## 3. 参考值(诚实红线)
**无典型值**:Kuku 系各版本参数各异不可比——typicalNone,只比自己历史
特别诚实点:屏幕质量/环境光对此游戏影响大于多数测试,About 里写明"信自己的趋势线"

## 4. 仪器面
网格即 hero(playing 态);错误红圈;色块为**刺激素材**(非主题色管辖,但恰为彩色也符合"刺激豁免"精神)

## 5. 读数卡
`{finalLevel} LEVELS` · typicalNone · 迷你图=历史等级 · 角标色相 #84663B(继承原 05 槽位赭金)

## 6. 身份
色相 赭金 #84663B · 记号:色阶方块 · 编号 05/10

## 7. 引擎
`useColorPerceptionGame`(新写):idle→playing→finished;levelFor() 纯函数可测;无定时器(无需 scheduleVisible)

## 8. 落地页
直接可玩(网格轻量,同 Sequence 模式)

## 9. 验收
- [ ] landing 可玩全流程;异色块永远存在且唯一;高等级色差单调递减
- [ ] build+lint 零;playwright 实测
