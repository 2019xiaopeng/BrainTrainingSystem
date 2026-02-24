-- ============================================================
-- Migration: Campaign V2 - 10 Episodes, 50 Levels
-- ============================================================
-- Replaces the original 5-episode/25-level campaign with a
-- progressive 10-episode/50-level design.
-- Focus: numeric/spatial N progression up to N=5.
-- All levels start with 10 rounds base.
-- ============================================================

-- Step 1: Clear old data (safe: DELETE, not DROP)
DELETE FROM "user_campaign_level_results";
DELETE FROM "user_campaign_state";
DELETE FROM "campaign_levels";
DELETE FROM "campaign_episodes";

-- Step 2: Insert 10 episodes
INSERT INTO "campaign_episodes" ("id", "title", "description", "story_text", "order", "is_active")
VALUES
  (1,  '觉醒',   '基础回路上线',     '系统重启中…欢迎回来。让我们从最基础的记忆与追踪开始。', 1,  true),
  (2,  '扩张',   '双重记忆通道',     '新的输入通道接入。双重回忆开始了，保持稳定。', 2,  true),
  (3,  '分化',   '多维追踪',         '你将面对多种协议的切换压力。策略比蛮力更重要。', 3,  true),
  (4,  '并行',   '三重负载',         '负载升高到三重。心流初现，在速度与准确之间找到平衡。', 4,  true),
  (5,  '深潜',   '深度追踪',         '更大的网格，更深的记忆。你的空间感知正在觉醒。', 5,  true),
  (6,  '蜕变',   '四重回忆',         '四重回忆的门槛。越过它，你将进入全新的认知层次。', 6,  true),
  (7,  '统御',   '全局掌控',         '多维度同时运转，你需要统御全局。这是大师之路的起点。', 7,  true),
  (8,  '共振',   '五重共振',         '五重回忆——人类工作记忆的极限边界。进入共振态。', 8,  true),
  (9,  '超越',   '超越极限',         '已知的边界不再能定义你。持续突破，向更高处攀登。', 9,  true),
  (10, '飞升',   '毕业试炼',         '最终的门槛。完成它，你将拥有持续专注的超凡能力。', 10, true);

-- Step 3: Insert 50 levels (5 per episode)
-- Map positions: y goes from 85 (bottom) to 15 (top) for 5 levels per episode
-- Boss levels are always the 5th level in each episode

INSERT INTO "campaign_levels" ("id", "episode_id", "order_in_episode", "title", "game_mode", "config", "pass_rule", "boss", "map_position", "is_active")
VALUES
  -- ========== Episode 1: 觉醒 (N=1 introduction) ==========
  (1,  1, 1, '数字心流 · 入门',      'numeric', '{"nLevel":1,"rounds":10}',                                               '{"minAccuracy":60}',  false, '{"x":50,"y":85}', true),
  (2,  1, 2, '空间心流 · 入门',      'spatial', '{"gridSize":3,"nLevel":1,"rounds":10}',                                  '{"minAccuracy":60}',  false, '{"x":30,"y":70}', true),
  (3,  1, 3, '魔鬼老鼠 · 入门',      'mouse',   '{"count":3,"grid":[4,3],"difficulty":"easy","rounds":3}',                 '{"minAccuracy":60}',  false, '{"x":70,"y":55}', true),
  (4,  1, 4, '人来人往 · 入门',      'house',   '{"speed":"easy","initialPeople":3,"eventCount":6,"rounds":3}',            '{"minAccuracy":60}',  false, '{"x":40,"y":35}', true),
  (5,  1, 5, '核心校准 · 入门',      'numeric', '{"nLevel":1,"rounds":10}',                                               '{"minAccuracy":90}',  true,  '{"x":50,"y":15}', true),

  -- ========== Episode 2: 扩张 (numeric N=2) ==========
  (6,  2, 1, '双重回忆 · 数字',      'numeric', '{"nLevel":2,"rounds":10}',                                               '{"minAccuracy":60}',  false, '{"x":50,"y":85}', true),
  (7,  2, 2, '稳定推进 · 空间',      'spatial', '{"gridSize":3,"nLevel":1,"rounds":15}',                                  '{"minAccuracy":60}',  false, '{"x":30,"y":70}', true),
  (8,  2, 3, '追踪推进 · 老鼠',      'mouse',   '{"count":4,"grid":[4,3],"difficulty":"easy","rounds":3}',                 '{"minAccuracy":60}',  false, '{"x":70,"y":55}', true),
  (9,  2, 4, '节律推进 · 人来人往',   'house',   '{"speed":"easy","initialPeople":4,"eventCount":8,"rounds":3}',            '{"minAccuracy":60}',  false, '{"x":40,"y":35}', true),
  (10, 2, 5, '核心校准 · N2',        'numeric', '{"nLevel":2,"rounds":10}',                                               '{"minAccuracy":90}',  true,  '{"x":50,"y":15}', true),

  -- ========== Episode 3: 分化 (spatial N=2, mouse medium) ==========
  (11, 3, 1, '双重追踪 · 空间',      'spatial', '{"gridSize":3,"nLevel":2,"rounds":10}',                                  '{"minAccuracy":60}',  false, '{"x":50,"y":85}', true),
  (12, 3, 2, '耐力延展 · 数字',      'numeric', '{"nLevel":2,"rounds":15}',                                               '{"minAccuracy":60}',  false, '{"x":30,"y":70}', true),
  (13, 3, 3, '分支解锁 · 老鼠',      'mouse',   '{"count":4,"grid":[4,3],"difficulty":"medium","rounds":3}',               '{"minAccuracy":60}',  false, '{"x":70,"y":55}', true),
  (14, 3, 4, '分支解锁 · 人来人往',   'house',   '{"speed":"normal","initialPeople":4,"eventCount":9,"rounds":3}',          '{"minAccuracy":60}',  false, '{"x":40,"y":35}', true),
  (15, 3, 5, '核心突破 · 空间',      'spatial', '{"gridSize":3,"nLevel":2,"rounds":10}',                                  '{"minAccuracy":90}',  true,  '{"x":50,"y":15}', true),

  -- ========== Episode 4: 并行 (numeric N=3) ==========
  (16, 4, 1, '三重回忆 · 数字',      'numeric', '{"nLevel":3,"rounds":10}',                                               '{"minAccuracy":60}',  false, '{"x":50,"y":85}', true),
  (17, 4, 2, '稳定推进 · 空间 II',   'spatial', '{"gridSize":3,"nLevel":2,"rounds":15}',                                  '{"minAccuracy":60}',  false, '{"x":30,"y":70}', true),
  (18, 4, 3, '追踪升级 · 老鼠',      'mouse',   '{"count":5,"grid":[4,3],"difficulty":"medium","rounds":4}',               '{"minAccuracy":60}',  false, '{"x":70,"y":55}', true),
  (19, 4, 4, '负载推进 · 人来人往',   'house',   '{"speed":"normal","initialPeople":5,"eventCount":10,"rounds":3}',         '{"minAccuracy":60}',  false, '{"x":40,"y":35}', true),
  (20, 4, 5, '核心校准 · N3',        'numeric', '{"nLevel":3,"rounds":10}',                                               '{"minAccuracy":90}',  true,  '{"x":50,"y":15}', true),

  -- ========== Episode 5: 深潜 (spatial N=3, 4×4 grid) ==========
  (21, 5, 1, '三重追踪 · 空间',      'spatial', '{"gridSize":3,"nLevel":3,"rounds":10}',                                  '{"minAccuracy":60}',  false, '{"x":50,"y":85}', true),
  (22, 5, 2, '耐力延展 · 数字 II',   'numeric', '{"nLevel":3,"rounds":15}',                                               '{"minAccuracy":60}',  false, '{"x":30,"y":70}', true),
  (23, 5, 3, '网格解锁 · 4×4',       'spatial', '{"gridSize":4,"nLevel":1,"rounds":10}',                                  '{"minAccuracy":60}',  false, '{"x":70,"y":55}', true),
  (24, 5, 4, '挑战升级 · 老鼠',      'mouse',   '{"count":5,"grid":[5,4],"difficulty":"medium","rounds":4}',               '{"minAccuracy":60}',  false, '{"x":40,"y":35}', true),
  (25, 5, 5, '核心突破 · 4×4',       'spatial', '{"gridSize":4,"nLevel":2,"rounds":10}',                                  '{"minAccuracy":90}',  true,  '{"x":50,"y":15}', true),

  -- ========== Episode 6: 蜕变 (numeric N=4) ==========
  (26, 6, 1, '四重回忆 · 数字',      'numeric', '{"nLevel":4,"rounds":10}',                                               '{"minAccuracy":60}',  false, '{"x":50,"y":85}', true),
  (27, 6, 2, '深度追踪 · 空间',      'spatial', '{"gridSize":4,"nLevel":2,"rounds":15}',                                  '{"minAccuracy":60}',  false, '{"x":30,"y":70}', true),
  (28, 6, 3, '高压推进 · 老鼠',      'mouse',   '{"count":5,"grid":[5,4],"difficulty":"hard","rounds":4}',                 '{"minAccuracy":60}',  false, '{"x":70,"y":55}', true),
  (29, 6, 4, '快速反应 · 人来人往',   'house',   '{"speed":"fast","initialPeople":5,"eventCount":12,"rounds":4}',           '{"minAccuracy":60}',  false, '{"x":40,"y":35}', true),
  (30, 6, 5, '核心校准 · N4',        'numeric', '{"nLevel":4,"rounds":10}',                                               '{"minAccuracy":90}',  true,  '{"x":50,"y":15}', true),

  -- ========== Episode 7: 统御 (spatial 4×4 N=3, 5×5 grid) ==========
  (31, 7, 1, '三重追踪 · 4×4',       'spatial', '{"gridSize":4,"nLevel":3,"rounds":10}',                                  '{"minAccuracy":60}',  false, '{"x":50,"y":85}', true),
  (32, 7, 2, '耐力延展 · 数字 III',  'numeric', '{"nLevel":4,"rounds":15}',                                               '{"minAccuracy":60}',  false, '{"x":30,"y":70}', true),
  (33, 7, 3, '极限网格 · 5×5',       'spatial', '{"gridSize":5,"nLevel":1,"rounds":10}',                                  '{"minAccuracy":60}',  false, '{"x":70,"y":55}', true),
  (34, 7, 4, '极限推进 · 老鼠',      'mouse',   '{"count":6,"grid":[5,4],"difficulty":"hard","rounds":5}',                 '{"minAccuracy":60}',  false, '{"x":40,"y":35}', true),
  (35, 7, 5, '核心突破 · 5×5',       'spatial', '{"gridSize":5,"nLevel":2,"rounds":10}',                                  '{"minAccuracy":90}',  true,  '{"x":50,"y":15}', true),

  -- ========== Episode 8: 共振 (numeric N=5) ==========
  (36, 8, 1, '五重回忆 · 数字',      'numeric', '{"nLevel":5,"rounds":10}',                                               '{"minAccuracy":60}',  false, '{"x":50,"y":85}', true),
  (37, 8, 2, '深度追踪 · 5×5',       'spatial', '{"gridSize":5,"nLevel":2,"rounds":15}',                                  '{"minAccuracy":60}',  false, '{"x":30,"y":70}', true),
  (38, 8, 3, '地狱老鼠 · 入门',      'mouse',   '{"count":6,"grid":[6,5],"difficulty":"hard","rounds":5}',                 '{"minAccuracy":60}',  false, '{"x":70,"y":55}', true),
  (39, 8, 4, '极限人潮 · 人来人往',   'house',   '{"speed":"fast","initialPeople":6,"eventCount":15,"rounds":4}',           '{"minAccuracy":60}',  false, '{"x":40,"y":35}', true),
  (40, 8, 5, '核心校准 · N5',        'numeric', '{"nLevel":5,"rounds":10}',                                               '{"minAccuracy":90}',  true,  '{"x":50,"y":15}', true),

  -- ========== Episode 9: 超越 (higher rounds, harder variants) ==========
  (41, 9, 1, '五重追踪 · 空间',      'spatial', '{"gridSize":5,"nLevel":3,"rounds":10}',                                  '{"minAccuracy":60}',  false, '{"x":50,"y":85}', true),
  (42, 9, 2, '耐力巅峰 · 数字',      'numeric', '{"nLevel":5,"rounds":15}',                                               '{"minAccuracy":60}',  false, '{"x":30,"y":70}', true),
  (43, 9, 3, '地狱试炼 · 老鼠',      'mouse',   '{"count":7,"grid":[6,5],"difficulty":"hell","rounds":5}',                 '{"minAccuracy":60}',  false, '{"x":70,"y":55}', true),
  (44, 9, 4, '终极人潮 · 人来人往',   'house',   '{"speed":"fast","initialPeople":7,"eventCount":18,"rounds":5}',           '{"minAccuracy":60}',  false, '{"x":40,"y":35}', true),
  (45, 9, 5, '终极突破 · 数字',      'numeric', '{"nLevel":5,"rounds":20}',                                               '{"minAccuracy":90}',  true,  '{"x":50,"y":15}', true),

  -- ========== Episode 10: 飞升 (graduation) ==========
  (46, 10, 1, '毕业试炼 · 数字',     'numeric', '{"nLevel":5,"rounds":20}',                                               '{"minAccuracy":60}',  false, '{"x":50,"y":85}', true),
  (47, 10, 2, '毕业试炼 · 空间',     'spatial', '{"gridSize":5,"nLevel":3,"rounds":15}',                                  '{"minAccuracy":60}',  false, '{"x":30,"y":70}', true),
  (48, 10, 3, '毕业试炼 · 老鼠',     'mouse',   '{"count":7,"grid":[6,5],"difficulty":"hell","rounds":5}',                 '{"minAccuracy":60}',  false, '{"x":70,"y":55}', true),
  (49, 10, 4, '毕业试炼 · 人来人往',  'house',   '{"speed":"fast","initialPeople":7,"eventCount":18,"rounds":5}',           '{"minAccuracy":60}',  false, '{"x":40,"y":35}', true),
  (50, 10, 5, '最终校准',            'numeric', '{"nLevel":5,"rounds":25}',                                               '{"minAccuracy":90}',  true,  '{"x":50,"y":15}', true);
