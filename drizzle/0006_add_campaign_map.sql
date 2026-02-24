CREATE TABLE IF NOT EXISTS "campaign_episodes" (
  "id" integer PRIMARY KEY,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "story_text" text NOT NULL,
  "order" integer NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS "campaign_levels" (
  "id" integer PRIMARY KEY,
  "episode_id" integer NOT NULL,
  "order_in_episode" integer NOT NULL,
  "title" text NOT NULL,
  "game_mode" text NOT NULL,
  "config" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "pass_rule" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "boss" boolean NOT NULL DEFAULT false,
  "map_position" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "is_active" boolean NOT NULL DEFAULT true
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_campaign_levels_episode_order" ON "campaign_levels" ("episode_id", "order_in_episode");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'campaign_levels_episode_id_fkey'
  ) THEN
    ALTER TABLE "campaign_levels"
      ADD CONSTRAINT "campaign_levels_episode_id_fkey"
      FOREIGN KEY ("episode_id") REFERENCES "campaign_episodes"("id") ON DELETE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "user_campaign_state" (
  "user_id" text PRIMARY KEY,
  "current_episode_id" integer NOT NULL,
  "current_level_id" integer NOT NULL,
  "viewed_episode_story_ids" integer[],
  "updated_at" timestamp NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_campaign_state_user_id_fkey'
  ) THEN
    ALTER TABLE "user_campaign_state"
      ADD CONSTRAINT "user_campaign_state_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "user_campaign_level_results" (
  "user_id" text NOT NULL,
  "level_id" integer NOT NULL,
  "best_stars" integer NOT NULL DEFAULT 0,
  "best_accuracy" integer NOT NULL DEFAULT 0,
  "best_score" integer,
  "cleared_at" timestamp,
  "updated_at" timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY ("user_id", "level_id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_campaign_level_results_user_id_fkey'
  ) THEN
    ALTER TABLE "user_campaign_level_results"
      ADD CONSTRAINT "user_campaign_level_results_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_campaign_level_results_level_id_fkey'
  ) THEN
    ALTER TABLE "user_campaign_level_results"
      ADD CONSTRAINT "user_campaign_level_results_level_id_fkey"
      FOREIGN KEY ("level_id") REFERENCES "campaign_levels"("id") ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_user_campaign_level_results_user_cleared_at" ON "user_campaign_level_results" ("user_id", "cleared_at" DESC);

INSERT INTO "campaign_episodes" ("id", "title", "description", "story_text", "order", "is_active")
VALUES
  (1, '觉醒', '基础回路上线', '系统重启中…欢迎回来。让我们从最基础的记忆与追踪开始。', 1, true),
  (2, '扩张', '耐力与稳定性', '新的输入通道接入。保持稳定，别让噪声扰乱节律。', 2, true),
  (3, '分化', '多分支策略', '你将面对多种协议的切换压力。策略比蛮力更重要。', 3, true),
  (4, '并行', '负载提升', '负载升高，心流出现。你需要在速度与准确之间找到平衡。', 4, true),
  (5, '飞升', '毕业前夜', '最后的门槛。完成它，你将拥有持续专注的能力。', 5, true)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "campaign_levels" ("id", "episode_id", "order_in_episode", "title", "game_mode", "config", "pass_rule", "boss", "map_position", "is_active")
VALUES
  (1,  1, 1, '数字心流 · 入门', 'numeric', '{"nLevel":1,"rounds":5}'::jsonb, '{"minAccuracy":60}'::jsonb, false, '{"x":50,"y":85}'::jsonb, true),
  (2,  1, 2, '空间心流 · 入门', 'spatial', '{"gridSize":3,"nLevel":1,"rounds":5}'::jsonb, '{"minAccuracy":60}'::jsonb, false, '{"x":30,"y":70}'::jsonb, true),
  (3,  1, 3, '魔鬼老鼠 · 入门', 'mouse', '{"count":3,"grid":[4,3],"difficulty":"easy","rounds":3}'::jsonb, '{"minAccuracy":60}'::jsonb, false, '{"x":70,"y":55}'::jsonb, true),
  (4,  1, 4, '人来人往 · 入门', 'house', '{"speed":"easy","initialPeople":3,"eventCount":6,"rounds":3}'::jsonb, '{"minAccuracy":60}'::jsonb, false, '{"x":40,"y":35}'::jsonb, true),
  (5,  1, 5, '核心校准 · 数字', 'numeric', '{"nLevel":1,"rounds":10}'::jsonb, '{"minAccuracy":90}'::jsonb, true,  '{"x":50,"y":15}'::jsonb, true),

  (6,  2, 1, '强度推进 · 数字', 'numeric', '{"nLevel":2,"rounds":10}'::jsonb, '{"minAccuracy":90}'::jsonb, false, '{"x":50,"y":85}'::jsonb, true),
  (7,  2, 2, '稳定推进 · 空间', 'spatial', '{"gridSize":3,"nLevel":1,"rounds":10}'::jsonb, '{"minAccuracy":90}'::jsonb, false, '{"x":30,"y":70}'::jsonb, true),
  (8,  2, 3, '追踪推进 · 老鼠', 'mouse', '{"count":3,"grid":[4,3],"difficulty":"easy","rounds":3}'::jsonb, '{"minAccuracy":90}'::jsonb, false, '{"x":70,"y":55}'::jsonb, true),
  (9,  2, 4, '节律推进 · 人来人往', 'house', '{"speed":"easy","initialPeople":3,"eventCount":6,"rounds":3}'::jsonb, '{"minAccuracy":90}'::jsonb, false, '{"x":40,"y":35}'::jsonb, true),
  (10, 2, 5, '核心校准 · 空间', 'spatial', '{"gridSize":3,"nLevel":2,"rounds":10}'::jsonb, '{"minAccuracy":90}'::jsonb, true,  '{"x":50,"y":15}'::jsonb, true),

  (11, 3, 1, '耐力延展 · 数字', 'numeric', '{"nLevel":2,"rounds":15}'::jsonb, '{"minAccuracy":60}'::jsonb, false, '{"x":50,"y":85}'::jsonb, true),
  (12, 3, 2, '耐力延展 · 空间', 'spatial', '{"gridSize":3,"nLevel":2,"rounds":15}'::jsonb, '{"minAccuracy":60}'::jsonb, false, '{"x":30,"y":70}'::jsonb, true),
  (13, 3, 3, '分支解锁 · 老鼠', 'mouse', '{"count":4,"grid":[4,3],"difficulty":"medium","rounds":4}'::jsonb, '{"minAccuracy":90}'::jsonb, false, '{"x":70,"y":55}'::jsonb, true),
  (14, 3, 4, '分支解锁 · 人来人往', 'house', '{"speed":"normal","initialPeople":4,"eventCount":9,"rounds":4}'::jsonb, '{"minAccuracy":90}'::jsonb, false, '{"x":40,"y":35}'::jsonb, true),
  (15, 3, 5, '核心突破 · 数字', 'numeric', '{"nLevel":3,"rounds":10}'::jsonb, '{"minAccuracy":90}'::jsonb, true,  '{"x":50,"y":15}'::jsonb, true),

  (16, 4, 1, '网格解锁 · 空间', 'spatial', '{"gridSize":3,"nLevel":3,"rounds":10}'::jsonb, '{"minAccuracy":90}'::jsonb, false, '{"x":50,"y":85}'::jsonb, true),
  (17, 4, 2, '并行推进 · 老鼠', 'mouse', '{"count":5,"grid":[5,4],"difficulty":"medium","rounds":4}'::jsonb, '{"minAccuracy":90}'::jsonb, false, '{"x":30,"y":70}'::jsonb, true),
  (18, 4, 3, '负载推进 · 人来人往', 'house', '{"speed":"normal","initialPeople":5,"eventCount":12,"rounds":4}'::jsonb, '{"minAccuracy":90}'::jsonb, false, '{"x":70,"y":55}'::jsonb, true),
  (19, 4, 4, '耐力延展 · 数字 II', 'numeric', '{"nLevel":3,"rounds":15}'::jsonb, '{"minAccuracy":60}'::jsonb, false, '{"x":40,"y":35}'::jsonb, true),
  (20, 4, 5, '核心校准 · 4×4', 'spatial', '{"gridSize":4,"nLevel":1,"rounds":10}'::jsonb, '{"minAccuracy":90}'::jsonb, true,  '{"x":50,"y":15}'::jsonb, true),

  (21, 5, 1, '毕业预热 · 老鼠', 'mouse', '{"count":6,"grid":[5,4],"difficulty":"hard","rounds":5}'::jsonb, '{"minAccuracy":60}'::jsonb, false, '{"x":50,"y":85}'::jsonb, true),
  (22, 5, 2, '毕业预热 · 人来人往', 'house', '{"speed":"fast","initialPeople":6,"eventCount":15,"rounds":5}'::jsonb, '{"minAccuracy":60}'::jsonb, false, '{"x":30,"y":70}'::jsonb, true),
  (23, 5, 3, '强度拉满 · 数字', 'numeric', '{"nLevel":4,"rounds":10}'::jsonb, '{"minAccuracy":60}'::jsonb, false, '{"x":70,"y":55}'::jsonb, true),
  (24, 5, 4, '稳定拉满 · 空间', 'spatial', '{"gridSize":4,"nLevel":2,"rounds":10}'::jsonb, '{"minAccuracy":60}'::jsonb, false, '{"x":40,"y":35}'::jsonb, true),
  (25, 5, 5, '毕业试炼 · 人来人往', 'house', '{"speed":"fast","initialPeople":7,"eventCount":18,"rounds":5}'::jsonb, '{"minAccuracy":90}'::jsonb, true,  '{"x":50,"y":15}'::jsonb, true)
ON CONFLICT ("id") DO NOTHING;

