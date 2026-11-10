# Brain Flow UI Refresh — Design Spec(v6-ui-refresh)

三方向共用输入。只写「要说什么」,不写「长什么样」。

## 项目
Brain Flow——出海英文优先的脑力小游戏街机,9 个游戏(Reaction Time / Number Memory / Sequence Memory / Stroop / Math Sprint / N-Back / Spatial / Devilish Mice / House Flow)。游客即玩、无注册、纯本地数据。现有视觉:Morandi 低饱和 sage/zen 色板,Tailwind token,Inter + JetBrains Mono。

## 受众与场景
- Google 搜 "reaction time test / brain games" 落地的英文用户,手机为主(>60%),30 秒内没玩上就走
- 门户(Poki 类)导流的休闲玩家
- 场景:SEO 落地页 → 首页逛 → 玩一局(60 秒)→ 看结果 → 再来/换游戏/走人

## 核心信息(按优先级)
1. **立刻能玩**——零注册、零下载,首屏就有 Play
2. **你的成绩有上下文**——和典型值比(静态参考表,诚实标注来源)、和自己历史比(本地迷你图)
3. **9 个游戏,每个一句话钩子**(HB 式:"Are you smarter than a chimpanzee?" 风格)
4. 安静、可信、不吵——zen 定位,反 CogniFit 式的浮夸

## 三个设计面(每版 HTML 都要含全部三面,同一页面纵向滚动)
1. **SEO 落地页 hero**(以 Reaction Time Test 为示例页):H1 + 一行钩子 + **首屏即玩 CTA** + 小统计条(9 games · plays in your browser · no signup) + About the test 实质段落 + FAQ 开头
2. **首页游戏列表**:9 个游戏,名称 + 钩子文案 + 每游戏一个可区分的视觉记号(不搞每游戏一套 UI 色),入口即玩
3. **结果页**:大分数 + **典型值对比**(Reaction: typical 273ms · yours 245ms,静态参考表,来源 humanbenchmark 公开数据,诚实标注)+ **个人历史迷你图**(本地数据示意)+ Play again / More games

## 诚实红线
- 参考值必须标注来源与样本(HB 公布:反应力中位 273ms/81M samples);不编百分位,不称"认知得分"
- 不放不存在的用户评价/媒体 logo;统计条只用真实事实(9 games、no signup、plays in browser)
- 迷你图数据标注 "demo data" 或用示意波形

## 输出格式与尺寸(三版统一)
单文件 HTML,响应式,验收视口 1440×900 与 375×812;英文文案;Inter/JetBrains Mono 或各方向卡指定字体(Google Fonts CDN);零图片素材(T0:全部 CSS/SVG 程序化);游戏视觉记号用程序化 SVG/CSS。

## 已知约束
- 这是给现有 React 应用做的改版方向稿,落地时会映射回 Tailwind token(zen/sage 色板保留为品牌底色之一,但方向卡可重新推导比例与 accent)
- 文案全部真实(钩子见下)
- 9 游戏钩子文案(三版共用):Reaction "How fast are your reflexes?" / Number Memory "How many digits can you hold?" / Sequence "Repeat the pattern. One more every round." / Stroop "Your brain lies to you. Catch it." / Math Sprint "60 seconds. No calculator." / N-Back "Remember the answer from 2 steps ago." / Spatial "Positions fade. Your memory doesn't." / Mice "Track the mice through the shuffle." / House "Count who's left when the door stops."
