# CLAUDE.md - Brain Flow Project Context

> Primary context anchor for the Brain Flow project. Read this before working in the repo.

## 1. Project Overview

- **Name**: Brain Flow (脑力心流)
- **Type**: Overseas casual brain-training mini-game arcade (出海小游戏矩阵)
- **Platform**: Web, mobile-first, static SPA on Vercel — **no backend**
- **Current phase**: Arcade pivot (2026-11). Roadmap: `docs/pivot-roadmap-2026-11.md`
- **History**: Full audit of the pre-pivot codebase (auth/economy/campaign era) is in `docs/code-audit-2026-11-09.md`. All removed systems live in git history on `master`; the arcade lives on branch `v6-arcade`.

## 2. Product Direction (decided)

- **Guest-only**: no login, no accounts. Everything is local (localStorage).
- **Niche**: brain/cognitive mini-games (memory / reaction / focus / math). Keyword-driven game selection (Google autocomplete evidence in the roadmap doc).
- **Distribution**: game portals (Poki/CrazyGames/GameDistribution) + SEO site with a landing page per game.
- **Explicitly cut** (do not re-add without asking): auth, energy, brain coins, store, check-in, campaign, admin, server leaderboard, unlock gating. All game parameters are freely adjustable.

## 3. Tech Stack

- Vite 7, React 19, TypeScript 5.9 strict (no `any`)
- Tailwind CSS 3 — zen/sage palette (fixed light theme)
- Zustand 5 + persist → localStorage key `brain-flow-storage` (version 8)
- react-router-dom v7, i18next (zh/en), Framer Motion 12, Recharts, Lucide
- Deploy: Vercel static SPA (`vercel.json` rewrite to index.html)

## 4. Commands

- `npm run dev` / `npm run build` (tsc + vite) / `npm run preview` / `npm run lint`
- No test framework yet (roadmap E-item: add Vitest for game/economy pure functions). No env vars needed.

## 5. Architecture

```
src/
├── App.tsx                 # Routes: / /train/:mode /result /profile /rank /settings (/instruction → /settings?tab=help)
├── main.tsx                # i18n init + ThemeProvider + App
├── store/gameStore.ts      # Single store: nextConfig, gameConfigs, sessionHistory(50),
│                           #   userProfile {totalScore,totalXP,maxNLevel,daysStreak,lastPlayedDate,brainStats,completedMilestones}
│                           # Actions: setNextConfig, updateGameConfig, saveSession, resetLocalData
├── types/game.ts           # All game types + BRAIN_RANK_LEVELS + mouse/house builders
├── hooks/                  # useNBack (numeric+spatial), useMouseGame, useHouseGame, useSoundEffects
├── lib/                    # cn(), heatmap.ts (generateYearlyHeatmap)
├── layouts/MainLayout.tsx  # Desktop 3-col (Sidebar 250px | stage | RightPanel 300px); mobile 1-col + bottom nav
└── components/
    ├── pages/              # HomePage / TrainPage / ResultPage (route wrappers)
    ├── screens/            # HomeScreen, GameScreen, MouseGameScreen, HouseGameScreen, ResultScreen,
    │                       # ProfileScreen, RankScreen, SettingsScreen, InstructionScreen (help tab)
    ├── game/               # StimulusCard, NumericKeypad, AnswerCountdown, StatusBar, SpatialGrid(unused)
    ├── profile/            # BrainRankCard, RadarChartWidget, ActivityHeatmap
    ├── layout/             # Sidebar, RightPanel, MobileNav
    └── ui/Card.tsx
```

**Adding a new game** (the intended pattern until engine unification):
1. Config type + builder in `types/game.ts`, add mode to `GameMode` and `GameConfigs`
2. Engine hook in `hooks/` following useMouseGame/useHouseGame shape (idle→play→feedback→finished + SessionSummary)
3. Screen in `components/screens/`, wire into `TrainPage` + `HomeScreen` mode grid + i18n keys
4. ResultScreen works as-is if the summary fits `SessionSummary`

## 6. Core Formulas (single source: `store/gameStore.ts`)

- Score: `(accuracy × nLevel × totalRounds) / 10`
- XP: `20 × (nCoeff + modeCoeff) × accuracy%`, nCoeff `1+(N−1)×0.2`, modeCoeff 1.5 if rounds ≥ 20
- Brain rank LV1-7 from XP + milestones (table in `types/game.ts` BRAIN_RANK_LEVELS)
- Six-dimension brain stats heuristic in `gameStore.updateBrainStats` (memory/focus/math/observation/loadCapacity/reaction)

## 7. Known Issues (from audit; items 1-4 FIXED on v6-game-core 2026-11-09 — do NOT re-audit from scratch)

1. ✅ FIXED — pause soft-lock: `useNBack.pauseGame` now remembers the pre-pause phase (`phaseBeforePauseRef`) and `resumeGame` restores it
2. ✅ FIXED — engine-object effect deps: game screens keep the engine in a ref (`engineRef`) and their timer/sound effects depend only on scalars; `TrainPage` uses per-field `useGameStore` selectors. Mover spawning in `HouseGameScreen` is idempotent (deterministic ids + `spawnedEventSeqRef`), so re-renders can no longer duplicate movers/sounds
3. ✅ FIXED — hidden-tab desync: `lib/scheduleVisible.ts` (setTimeout that re-checks `document.hidden` every 500ms) guards every House/Mouse/N-Back advance timer; the Mouse push rAF clamps its frame delta so hidden time doesn't fast-forward it; N-Back additionally auto-pauses on `visibilitychange`
4. ✅ FIXED — answer deadline: numeric mode has a 10s deadline (`ANSWER_DEADLINE_MS`), `AnswerCountdown` is wired into `GameScreen`, and `useNBack.markRoundMissed` records the round as missed (`missedCount` / `result.timeout` now show real numbers). The previously unreachable miss branch in `advanceToNext` was removed
5. OPEN — three engines duplicate the same state machine (unify in roadmap E2)
6. OPEN — `SpatialGrid.tsx` still unused (dead component; `AnswerCountdown` is now used by `GameScreen`)
7. OPEN — orphan i18n keys from deleted features (~100 per locale) — cleanup deferred, harmless

## 8. Conventions

- Functional components + hooks; strict typing; types centralized in `types/game.ts`
- `components/ui` atomic, `components/game` game-specific, logic in `hooks/`
- PascalCase components, camelCase vars; conventional commits; end commit messages with the Claude Code attribution line
- UI text via i18n keys (zh + en) — never hardcode Chinese in new code
