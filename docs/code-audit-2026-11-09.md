# Brain Flow 全仓代码审计报告

日期:2026-11-09 · 方式:静态通读(未运行应用)· 审计范围:全部 `api/`、`src/` 关键路径、构建与部署配置

**负载假设**:单人游戏型 Web 应用,Vercel + Supabase(transaction pooler),并发用户量级为几十到几百,不是万人同时在线。所有"规模"类结论按这个量级判断。

---

## 这是什么项目

N-Back 类脑力训练游戏(4 种模式),React 19 + Vite + Zustand 前端,`/api/*` Vercel Functions + better-auth + drizzle/Postgres 后端。商业模式是免费玩 + 体力/脑力币经济系统,未来接支付。当前状态:前端有一套完整的本地游戏逻辑副本,后端已接管登录、结算、解锁、商城、排行榜,但两边**各留了一整套对方的逻辑**,而且 campaign(战役)后端只建了一半。

**总体判断**:游戏核心可玩、输入防重复提交等基础卫生做得不错,但**结算接口信任客户端数据 + 余额并发竞态**在商业化前必须修;前端约 1/3 体积可以直接删;动画层有几个真实的渲染 bug。

---

## 一、Must Fix(不改会出错、丢数据或被刷)

### 1. 结算接口信任客户端分数,排行榜等于不设防
- **是什么**:`api/game/session.ts:504` 直接采用客户端 POST 的 `summary.score`(`clampInt` 无上限),`accuracy` 也全由客户端上报。
- **问题**:金币排行榜按 `sum(gameSessions.score)` 排名(`api/leaderboard/[...path].ts:155-170`)。用 fetch 手发一个 `score: 999999999` 即可永久霸榜;上报 `accuracy: 100` 还能白拿每日满分奖励、快速解锁全部难度(`updateUnlocksAfterSession` 只看 acc ≥ 90),每局白得最多 20 币。对要接 IAP 的商业项目这是致命的。
- **最小修复**:服务端已有公式 `computeScore()`(`session.ts:92`),删掉对 `summary.score` 的信任,一律服务端重算;accuracy/totalRounds/nLevel 加合理上限(如 rounds ≤ 30、n ≤ 12)。彻底方案是逐轮上报答案,重排架构时再做。
- **不修的后果**:排行榜和进度系统上线第一天就可被刷穿,脑力币经济失去意义。

### 2. 余额与体力的并发竞态(商城 + 结算两处)
- **是什么**:`api/store/buy.ts:69-150` 和 `api/game/session.ts:514-689` 都是"事务里 SELECT 余额 → JS 计算 → UPDATE 写回绝对值",没有行锁。
- **问题**:Postgres 默认 READ COMMITTED 下,两个并发请求会读到同一余额:并发买两件商品只扣一次钱;体力剩 1 时并发提交两局,两局都通过 `energyBeforeConsume <= 0` 检查,1 点体力玩两局,且一局的币/XP 会被另一局的写回覆盖丢失。
- **最小修复**:drizzle 支持 `tx.select().for("update")`,两处各加一个调用;或改成原子 `UPDATE user SET brain_coins = brain_coins - $x WHERE brain_coins >= $x`。
- **不修的后果**:手快的用户等于无限体力/免费商品;正常用户偶发奖励丢失。

### 3. 暂停后游戏软锁死
- **是什么**:`useNBack.ts:376-393` 允许在记忆展示阶段('playing')暂停,但 `resumeGame` 一律恢复到 'answering' 阶段。
- **问题**:数字 2-Back 第 2 题展示时暂停再恢复 → 阶段变成 'answering' 但 `currentIndex < nLevel`,`submitAnswer` 永远被 `useNBack.ts:237` 的守卫拒绝,自动推进 effect 也不触发,游戏卡死,只能退出。
- **最小修复**:resume 时记住并恢复暂停前的阶段(一个 phaseRef),约 5 行。
- **不修的后果**:任何玩家在展示阶段按一次暂停就能复现卡死。

### 4. effect 依赖整个 engine 对象 → 商店任何更新都会干扰游戏进行
- **是什么**:`HouseGameScreen.tsx:146-195`、`GameScreen.tsx:53-61/113-133` 的计时/事件 effect 都把整个 `engine` 对象放进依赖数组,而 `useHouseGame()` 每次渲染返回新对象(`useHouseGame.ts:323-342`)。放大器是 `TrainPage.tsx:20` 用了不带 selector 的 `useGameStore()`——侧栏体力倒计时(`EnergyBar.tsx:27-34`)每次跳动都会让 TrainPage 重渲染。
- **问题**:事件阶段中途任何 store 写入 → 同一事件的人物生成两份、点击音效重播、事件间隔计时器重置拉长回合;答题后的 500/1000ms 反馈计时器重启,对/错音效二连播;记忆阶段计时器重启,题目停留时间超出配置。开发模式(StrictMode 开着,`main.tsx:10`)下每个事件、每次答题都必然双份。
- **最小修复**:effect 依赖改为标量值 + ref 保存最新回调;顺手给 TrainPage 的 `useGameStore()` 加 selector。
- **不修的后果**:线上偶发"幽灵人/双音效/节奏漂移",开发环境全程复现,极难排查。

### 5. Campaign(战役)后端只建了一半,玩家看不到任何奖励结算
- **是什么**:一组互相关联的断头路:
  - 星星结果只写 localStorage(`CampaignMapView.tsx:309` 调 `writeGuestCampaignProgress`,登录用户也一样),换设备/清缓存进度全丢;
  - 服务端 `userCampaignLevelResults` 表只在 `api/campaign/[...path].ts:183-192` 被**读**,全仓没有任何写入者;
  - 结算响应里根本没有 `campaign` 字段,`gameStore.ts:813` 的 `data.campaign ?? ...` 永远是空操作;
  - 专门的结算动画页 `CampaignResultScreen.tsx`(326 行)无人引用,是死代码;
  - `ResultPage.tsx:36` 传了 `rewards={lastRewards}`,但 `ResultScreen.tsx:4-11` 的 props 没有这一项——**prop 被静默丢弃**(顺带是潜在 tsc 报错),玩家打完一局看不到 XP/币/升级/每日奖励的任何反馈,而 `lastRewards` 管道(gameStore 里约 70 行)三种方式算完却没有任何界面渲染它。
- **最小修复**:先给 ResultScreen 补上 rewards 渲染(最小改动,立刻恢复反馈);campaign 结果写库放到架构重排时做(写入逻辑照抄 guest 路径)。
- **不修的后果**:登录用户的战役进度不随账号走;核心激励反馈(赢了给什么)完全不可见,留存直接受损。

### 6. 换邮箱 OTP:弱随机 + 无尝试限制 + 无发送频率限制
- **是什么**:`api/user/email/[...path].ts:26` 用 `Math.random()` 生成 6 位验证码;`change-confirm`(:77-126)不限制尝试次数,`change-request`(:36-75)不限发送频率;:145-147 还把一切异常(含 DB/邮件故障)统一吞成 401。
- **问题**:持有会话的攻击者可无限爆破 6 位数字(10 分钟窗口内暴力穷举);任何人可脚本刷 change-request 让 Resend 发信烧钱。
- **最小修复**:`crypto.getRandomValues` 生成 OTP;验证失败 N 次(如 5 次)即删记录;change-request 按用户加简单限频(可先复用 verification 表计数)。
- **不修的后果**:账号邮箱可被接管;邮件账单可被刷爆。

### 7. i18n 半壁江山是硬编码中文
- **是什么**:六个登录/注册/验证/改密页(`SignInPage`、`SignUpPage`(含"男/女")、`VerifyEmailPage`、`ForgotPasswordPage`、`ResetPasswordPage`、`ChangePasswordPage`)、整个 `AdminScreen`、`AuthSection` 的验证提示全部写死中文,而项目带完整 en 语言包。
- **问题**:切到英文的用户,登录/注册/找回密码/后台全是中文。
- **最小修复**:把这些文案补进 zh/en locale(机械工作,一次过)。
- **不修的后果**:英文 locale 形同虚设,出海/英文用户第一屏就穿帮。

### 8. 数据库 schema 初始化挂在 auth 入口 + 商品价格每次冷启动被重置
- **是什么**:`ensureSchemaReady()`(140 行运行时 DDL + 种子)只被 `api/auth.ts:9`、开发脚本和 bootstrap 调用,其余 8 个 API 入口都不调;且它结尾的 `ON CONFLICT DO UPDATE`(`db/index.ts:126-138`)每次冷启动都把 5 个商品的价格/奖励**强制覆盖回默认值**。
- **问题**:全新数据库上,任何先于 `/api/auth` 被调用的接口(爬虫、直连 `/api/game/session`)会因列不存在而 500;将来想在库里调价,下次冷启动就被静默改回。
- **最小修复**:DDL 迁移交给已有的 drizzle-kit(`db:generate`/`db:push`,输出目录 `drizzle/` 已存在),种子移到显式脚本;`ON CONFLICT DO NOTHING` 或删掉种子。
- **不修的后果**:部署顺序脆弱;商品定价权实际在代码里而不在数据库。

---

## 二、Should Fix(可靠性、规模、重复、该删的)

### 9. 所有"每日"逻辑用 UTC,对中国用户差 8 小时
- **是什么**:签到(`api/user/checkin.ts:44`)、每日首胜/满分奖励与热力图日期(`api/game/session.ts:509-511`)、周榜起点(`leaderboard/[...path].ts:320-331`)全部用 UTC 日期。
- **问题**:北京时间 0:00-8:00 玩游戏算"昨天";23:50 和次日 00:10 各签到一次可能被判同一天(拿不到第二天奖励)或一天签两次。
- **最小修复**:抽一个 `localDateKey()` 统一用 UTC+8(或用户时区),四处替换。一行函数的事,但涉及历史数据口径,趁早统一。

### 10. 全仓零测试,而最危险的逻辑恰恰没测试
- **是什么**:CLAUDE.md 写着 "Testing: Vitest + React Testing Library",但 package.json 没有测试框架、没有 test 脚本——文档撒谎。
- **问题**:分数/币/解锁规则(`updateUnlocksAfterSession` 240 行分支)、体力恢复、签到 streak 全是无测试的纯函数,恰是钱和进度所在,也是前后端两份副本最容易漂移的地方。
- **最小修复**:先装 Vitest,只给 `api/game/session.ts` 的纯函数(computeScore/computeXp/computeBrainLevel/recoverEnergy/updateUnlocksAfterSession)和 checkin streak 写测试——十几个用例覆盖住经济系统。同时修正 CLAUDE.md。

### 11. 切后台标签页会让游戏状态与动画脱节
- **是什么**:没有任何 `visibilitychange` 处理。House 模式事件用 `setTimeout` 推进(`HouseGameScreen.tsx:188-190`)而人物动画走 rAF/framer(:447-492);后台标签 rAF 冻结但计时器(降频后)继续跑。
- **问题**:事件阶段切走 20 秒 → 回来后错过的人物一次性全部出现又消失,玩家没有视觉记录,答案必错。数字模式的题目同理:后台"闪过"的题目没看见也不算 miss。
- **最小修复**:游戏页监听 `visibilitychange`,隐藏即自动暂停(暂停机制已存在,复用即可)。

### 12. 没有作答时限,missed 统计永远是 0
- **是什么**:三个引擎都没有答题截止;`useNBack.ts:303-327` 的 miss 记录分支实际不可达(自动推进只发生在已作答后),`ResultScreen` 的"超时/错过"恒为 0;本来该做这件事的 `AnswerCountdown.tsx` 组件闲置无人引用。
- **问题**:玩家可以无限停在一轮;结果页一项统计是假的。
- **最小修复**:要么把 AnswerCountdown 接进数字模式给每轮加倒计时(它就是为此写的),要么删掉 missed 统计字段,别展示假数据。

### 13. 战役地图手动翻集被同步 effect 弹回
- **是什么**:`CampaignMapView.tsx:271-281` 的 effect 会在 `activeEpisodeId` 与服务端 `state.currentEpisodeId` 不一致时强行重置,而客户端从不更新服务端该字段(`markEpisodeViewed` 只写 viewed)。
- **问题**:用户点 ▶ 从第 1 集翻到第 2 集 → 视图立即弹回第 1 集;浏览的集与能选的关卡对不上,◀/▶ 形同虚设。
- **最小修复**:effect 只在初次加载时定位一次(用 ref 标记),之后尊重用户选择。

### 14. 手写 HMAC 会话校验,重复造 better-auth 的轮子
- **是什么**:`api/_lib/session.ts:89-104` 手工解析 cookie、校验签名(硬编码"44 字符且以 = 结尾")、查 session 表,绕开 better-auth 自带的 `auth.api.getSession()`。
- **问题**:这是对 better-auth 内部 cookie 格式的逆向依赖,升级 better-auth 换签名格式时所有 API 会静默变 401,且享受不到它的会话轮换逻辑。
- **最小修复**:换成 `auth.api.getSession({ headers })`(一次调用),`requireSessionUser` 内部改写,外部接口不变。若是为省初始化开销,先测一下,大概率不值。

### 15. coins/me 每请求全表聚合,且排名口径与榜单不一致
- **是什么**:`leaderboard/[...path].ts:534-553` 的"我的排名"用 CTE 对全部用户×全部 session 聚合计数,无缓存无锁,每次请求都算;tie-break 用 `id`(第 550 行),而榜单快照用 `updatedAt/brainLevel`(:169)。
- **问题**:用户量上千后这是每次打开排行榜页一个全表聚合;同分时"我的名次"和榜单显示的位次可能不同。
- **最小修复**:tie-break 键与快照统一;`count` 查询限定 `totalScore >= meScore` 再细算,或复用快照数据。

### 16. 约 700 行确认死代码 + gameStore 里的"前朝遗物"(该删)
- **是什么**(全部经全仓 grep 验证零引用):
  - 死文件:`CampaignResultScreen.tsx`(326 行,见 #5)、`store/mockData.ts`(101 行,CLAUDE.md 自己也标了 LEGACY)、`LayoutShell.tsx`(27 行,连带 tailwind.config.js:35-46 整个 dust 色板死掉)、`useCampaignUnlocks.ts`(90 行,连带 `unlocking.ts:59-178` 两个函数)、`AnswerCountdown.tsx`/`SpatialGrid.tsx`(见 #12、#17——前者建议启用而非删)。
  - `mocks/userData.ts` 259 行里只有 `generateYearlyHeatmap` 一个函数被 ProfileScreen 使用,其余 ~200 行死。
  - gameStore 的视图切换切片(`currentView`/`setView`/`goToGame/goToResult/goHome`,~40 行)——react-router 早已接管。
  - ~90 个 i18n 死 key/语言(含整段 `settings.general.*`、`settings.about.*`、孤儿化的 `result.rewards*` 11 个 key、22 个 `campaignResult.*`)。
  - 零碎死代码:`useNBack` 的 `endGame`/`nBackTarget`、`GameScreen.tsx:102-110` 写了没人读的两个 ref、`types/game.ts` 的 `stimulusType`/`hits/falseAlarms/correctRejects` 字段(三个引擎都在填,没人读)、`UserProfile.preferences` 两个偏好项没人读(语言真正存在 `brain-flow-lang`,双份事实来源)、Settings 的"每周报告邮件"开关只写 localStorage 没有任何代码读(**对用户撒谎的功能**)、ThemeContext 整个是空壳(`useTheme` 零调用,index.css 的 CSS 变量没有任何组件用 `var(--...)` 消费)。
- **最小修复**:按上面清单删。零行为变化,纯减法。

### 17. 三个游戏引擎零共享,同一套状态机抄了三遍
- **是什么**:summary 构建(`buildSummary`/`buildMouseSummary`/`buildHouseSummary`)、回合推进与收尾、`resetGame`、反馈自动推进 timer、键盘 0-9/退格/回车处理、进度条与分数条 markup——每组三份近似拷贝;`HouseGameScreen.tsx:547-584` 还内联重写了现成的 `NumericKeypad`;`GameScreen` 内部 spatial 网格的 cell-class 逻辑又有三份内联拷贝(:246-256、:276-311、:357-386),而 `SpatialGrid.tsx` 组件闲置。
- **问题**:任何规则修改(比如加 miss 判定、改反馈时长)要同步改三处,已经出现分叉(见 #12 的 missed 各引擎口径不一)。
- **最小修复**:重排时抽一个引擎核心(useGameEngine:状态机 + 回合推进 + summary)和一组共享 UI(NumericKeypad 复用、进度条、键盘 hook)。这是架构重排的最大单体收益,见第五节。

### 18. 前端重复 UI 与几处"对用户说谎"的小 bug
- **是什么/问题**(均已核实):
  - 历史列表渲染 3 份(`RightPanel.tsx:109-151`、`RankScreen.tsx:77-117`、`ProfileScreen.tsx:218-255`)已开始分叉(时间颜色不一致);modeEmoji/label 映射 3 份;游客登录 CTA 卡 5 份;开关组件 markup 5 份;HomeScreen 8 个几乎相同的 −/值/+ 步进器(抽一个 Stepper 省 ~120 行);语言切换逻辑 2 份。
  - 5 处游客 CTA 用 `<a href>` 全页刷新(丢 SPA 状态),应换 `<Link>`。
  - `AdminScreen.tsx:289-293` 把 `/api/admin/me` 的原始错误 body JSON 直接渲染到页面——调试遗留,泄露接口内部;`StoreScreen.tsx:29` 每次购买故意 `setTimeout` 250ms 假加载,:38-39 把网络错误也映射成"已拥有"提示,报错误导用户;`AdminScreen` 所有写操作用 `window.prompt/confirm`,手机上很难用。
  - 默认配置漂移:`gameStore.ts:543-548` 初始 `house.eventCount: 6`,而两处 setAuthProfile 重置块(:639-644、:683-688,本身互为 90 行近似拷贝)写的是 `5`——登录/退出后默认值和首装不一样。
  - 雷达图第 6 维键名错位:`InstructionScreen.tsx:163` 用 `speed`,两个语言包里定义的都是 `reaction` → 中英文都渲染出原始 key 路径。
  - `ResultPage.tsx:24-28` 在渲染期调用 `navigate()`(React 反模式,应放 useEffect)。
  - `MouseGameScreen.tsx:490` 的暂停按钮是个空函数——死控件。

---

## 三、Nice to Have(小性能、动画细节)

### 19. 动画层细节问题(本次审计重点之一)
- `HouseGameScreen.tsx:464-477`:framer `opacity` 4 个关键帧对 `times` 3 个值,离开动画时序错乱,人物"提前显形"泄露信息;:454 静态 `translateY(-50%)` 会被 framer 接管 transform 后抹掉,每个人物都整体下移半个身位;:465 动画 `left`(触发 layout)而非 transform x。
- `MouseGameScreen.tsx:238-255`:推动画每帧 `setSlideProgress` setState,整屏 60fps 重渲染 800ms——低端机掉帧,应改 motion value 或直接写 style。
- 进度条动画用 `width`(三处:`MouseGameScreen.tsx:497-499` framer、`GameScreen.tsx:211-216`、`HouseGameScreen.tsx:329-340` CSS),换 `scaleX` transform 更顺滑。
- `GameScreen.tsx:181` 的 `animate-scale-in` 在 tailwind.config 里没定义(keyframes 只有 fade-in/slide-up/pulse-soft)——静默无动画;`CampaignMapNode.tsx:57` 的 `animate-[ping_2s_ease-out_infinite]` 任意值写法能否发出 ping 关键帧存疑,需浏览器里看一眼。
- 语义性小问题:HouseGameScreen 的 AnimatePresence 包裹的 mover 没有 `exit`(包装无意义)、移除用 framer 回调 + setTimeout 双机制;spatial 反馈格用无限 `animate-pulse` 表达本应有限的反馈;`CampaignResultScreen`(死代码)里的 exit 动画永不触发。

### 20. 后端小重复(纯减法)
- `_lib/auth.ts:38-119`:三份几乎相同的 50 行 HTML 邮件模板(验证/重置/登录),抽一个 `otpEmail(title, otp, note)` 函数省 ~90 行。
- `parseBody`(buy.ts、session.ts、display-name.ts 各一份)、`getUrl`(admin/leaderboard/campaign/email 各一份)、`isRecord`(http.ts 有一份,leaderboard 又写一份)、`clampInt`(session.ts、campaign、前端 5 处)——`_lib/http.ts` 已经存在,归拢进去。
- `computeBrainLevel` 服务端两份(`session.ts:101`、`checkin.ts:8`)+ 前端一份;`recoverEnergy` 服务端两份(session.ts、profile.ts)。抽 `_lib/game-rules.ts` 前后端各留一份入口。
- campaign 内容三份:DB 种子 + `api/campaign/[...path].ts:15-90` 硬编码 90 行 fallback + 前端。fallback 建议降级为空列表 + 报错,内容以 DB 为准。
- `getBanStatus` 在 buy/session/checkin 各自再查一次 user 表,而 `requireSessionUser` 刚 join 过——把 `bannedUntil` 加进那次 join 一次查完。

---

## 四、UI 升级清单(应你要求单独汇总,按收益排序)

1. **结果页没有奖励反馈是最大的 UX 缺口**(Must #5):结算动画/数字(XP、币、升级、解锁)是这类游戏的核心多巴胺,先恢复 `rewards` 渲染,有余力再把 326 行的 `CampaignResultScreen` 复活成通用结算页。
2. **色彩体系二选一**:目前 tailwind zen/sage 色板和 index.css CSS 变量并存且后者零消费,campaign 地图又大量手调 hex(`CampaignMapView.tsx:252-261` 10 组主题对象、:410-642 一堆 `border-[#ece8dc]`/`bg-[#fdfcf8]`;`CampaignMapNode.tsx:48-122`)。要么把变量真正用起来(为将来主题/深色模式留路),要么删掉变量层,全站统一到 tailwind 色板。现在是最差的中间态。
3. **间距/圆角/字号没有 scale**:rounded-lg/xl/2xl/[2rem]/[2.5rem] 与 text-[8px]~[11px] 随意出现(`AdminScreen.tsx:426-435`、`CampaignMapView.tsx:439-478`、`BrainRankCard.tsx:86-149`)。在 tailwind.config 定 3 档圆角、3 档小字号 token,重排时统一替换。
4. **组件级收敛**:Stepper、Toggle、GuestCTA、HistoryList、TabSwitcher 各抽一个(见 #18),RightPanel 和 RankScreen 变成同一组件的两种密度。
5. **移动端**:`ProfileScreen.tsx:146-175` 的 `grid-cols-4` 统计块在 <360px 挤爆(缺 `grid-cols-2` 回退);`CampaignMapView.tsx:488` 固定 `h-[520px]/sm:h-[700px]` + 绝对定位节点在矮屏会裁切;AdminScreen 的 prompt/confirm 流程手机不可用。
6. **i18n 补齐**(Must #7)与雷达图第 6 维键名修复(#18)是英文用户可见度最高的两处。

---

## 五、架构重排建议(先删后并,顺序即收益)

1. **第一波:纯删除**(#16 全部 + 死 i18n key),~1000 行,零风险,立刻降低后续每一步的成本。
2. **第二波:定数据所有权**。原则:**服务端拥有的东西,前端只做只读缓存;guest 才有本地持久化**。落到 gameStore(现 1442 行、10 种职责):删导航切片、删本地解锁引擎(~240 行,服务端 `data.unlocks` 已回写)、删本地 XP/币/里程碑/brainStats 的"影子计算"(保留 optimistic 显示所需的最小版本)、体力只留一份存储(现在 localStorage 里存了两份:按用户 key + zustand blob)。拆成三个小 store:`configStore`(nextConfig + gameConfigs,guest 持久化)、`sessionStore`(lastSummary/lastUnlocks/activeCampaignRun,不持久化)、经济切片退化为 `/api/user/profile` 的读缓存。
3. **第三波:把 `kickoffSessionSync`(~150 行手写 HTTP 队列)挪出 store**,进 `lib/api/`,顺带处理 #2 的并发语义。
4. **第四波:引擎统一**(#17):一个共享引擎核心 + 三个模式只写"出题/判题"差异。做了这步,miss/时限(#12)、暂停(#3)、后台暂停(#11)只需要修一次。
5. **第五波:pages/screens 两层收拢**:TrainPage 挂三个引擎再选一个的写法(`TrainPage.tsx:21-23`)换成模式注册表;单调用方的 screen wrapper 直接合并。campaign 服务端补上结果写入(#5 的后一半)。
6. 视觉重排(第四节)放在最后——先让数据通路单一路径,再动皮。

---

## 已检查、确认健康的地方(不用动)

- 输入防重复:三引擎的二次提交守卫、Enter 与按钮双触发防护、键盘监听清理,全部正确。
- MouseGame 的 rAF 取消与完成守卫、ResizeObserver 断开、各阶段计时器清理(除 #7 提到的 `useHouseGame.ts:262` 一处)均正确;TrainPage 自动开局的 ref 防 StrictMode 双调用正确。
- 离线同步队列的设计(指数退避、不可重试错误集合、失败后 profile 对账)本身是好的,问题只在它长在 store 里。
- 管理端审计日志(before/after + IP/UA)和禁封事务写得规范。

## Lean 估算

删除/合并潜力:**约 -1600 ~ -2000 行**(死文件 ~700、gameStore 影子逻辑 ~400、mocks/userData ~200、i18n 死 key ~90×2 语言、邮件模板 ~90、主题空壳与小重复 ~150),依赖可移除 **0 个**(全在用)。

## 未检查 / 未验证

- 未运行应用,所有结论来自静态阅读;`CampaignMapNode.tsx:57` 的 ping 动画是否真的播放需浏览器确认。
- 未逐行读:`api/_lib/db/schema/*` 全部、`api/user/profile.ts` 前 233 行与结尾 brainStats 重算细节、`scripts/bootstrap-admin.ts`、AdminScreen/SettingsScreen 的全部行(只核对引用与关键行为)。
- 未做:性能剖析、无障碍(键盘可达性只发现 `CampaignMapNode.tsx:80-81` 一处)、安全渗透测试。
