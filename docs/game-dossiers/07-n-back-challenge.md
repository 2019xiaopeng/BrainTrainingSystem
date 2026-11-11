# 游戏档案 06 · N-Back Challenge(数字 N-Back)

## 1. SEO 定位
slug:`/games/n-back-challenge` · 关键词:n back test、nback game、working memory test · H1 钩子:Remember the answer from N steps ago.

## 2. 玩法协议(不变)
连续刺激流,判断当前是否与 N 步前相同;记忆相+判断相;N 可调 1-4,轮数可调

## 3. 参考值
**无典型值**(自研配置体系,N 与轮数皆可变,跨站不可比)——typicalNone,statline 显示本地 MAX N(userProfile.maxNLevel)

## 4. 落地页形态:**协议+CTA**(非嵌入)
复杂引擎(记忆相/答题相/暂停/截止)不复制进 landing;落地页 = 仪器风协议页:kicker/hook/statline(MAX N)/协议事实(现有 numericHelp)/训练说明/大 CTA → /train/numeric

## 5. 身份
色相 苔绿 #5F7040 · 记号:三刻+回环 · 编号 06/09

## 6. 验收
协议页完整可跳转;build+lint 零
