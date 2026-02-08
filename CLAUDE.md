# CLAUDE.md - Brain Flow Project Context

> **Note**: This file serves as the primary context anchor for the Brain Flow project. It summarizes architectural decisions, design guidelines, and current progress to ensure continuity across sessions.

## 1. Project Overview
- **Name**: Brain Flow (脑力心流)
- **Type**: Commercial Web-based Brain Training Game (SaaS/F2P)
- **Core Concept**: Scientific N-Back training variants wrapped in a "Minimalist Zen" aesthetic (inspired by *2048*).
- **Platform**: Web (Mobile-first responsive).
- **Business Model**: Freemium with Energy system (Stamina) and IAP for Points/Themes.

## 2. Design Guidelines (Crucial)
- **Aesthetic**: **Minimalist Zen**. Clean lines, generous whitespace, Morandi color palette (low saturation).
- **UX Goal**: Induce "Flow" state. Zero distractions during gameplay. Smooth, organic animations.
- **Copyright Compliance**: 
  - STRICTLY AVOID specific assets/likenesses from Nintendo's *Brain Age/Devil Training*.
  - No "Professor" characters.
  - Use abstract geometry, pure typography, and elemental effects instead of skeuomorphic designs.

## 3. Tech Stack
- **Build Tool**: Vite
- **Framework**: React 19+
- **Language**: TypeScript 5.9 (strict mode)
- **Styling**: Tailwind CSS 3 (Utility-first) + CSS Variables for theming
- **State Management**: Zustand 5 (Lightweight, for game loop & N-Back queues)
  - **Persistence**: Zustand persist middleware → localStorage (`brain-flow-storage`)
  - **Data Structure**:
    - `sessionHistory`: Last 50 game sessions (timestamp, nLevel, accuracy, score, mode, avgReactionTimeMs)
    - `userProfile`: { totalScore, totalXP, maxNLevel, daysStreak, lastPlayedDate, brainStats, auth, brainPoints, energy, checkIn, ownedItems }
    - `gameConfigs`: Per-mode saved configurations (numeric, spatial, mouse, house)
    - `brainStats`: Six-dimension radar { memory, focus, math, observation, workingMemory, speed }
    - `auth`: AuthProfile placeholder { status, displayName, avatarUrl, linkedProviders }
    - `energy`: EnergyState { current, max, lastUpdated, unlimitedUntil }
    - `checkIn`: CheckInState { lastCheckInDate, consecutiveDays }
    - `brainPoints`: number (in-game currency earned from sessions)
    - `ownedItems`: string[] (permanent item IDs)
- **Routing**: react-router-dom v7 (BrowserRouter)
- **Internationalization**: i18next + react-i18next (zh/en)
- **Theming**: Fixed Light (Zen) theme — CSS Variables only for `:root/.theme-light` (dark/warm removed)
- **Animation**: Framer Motion 12, Tailwind keyframes
- **Charts**: Recharts (radar chart, theme-adaptive Morandi colors)
- **Icons**: Lucide React
- **Testing**: Vitest + React Testing Library
- **Deployment**: Vercel (with SPA rewrites via `vercel.json`)
- **Backend (Future)**: Node.js / Supabase / Firebase (for Auth & Leaderboards)

## 4. Core Gameplay Modules (MVP)
1.  **Numeric Flow (数字心流)**: Delayed recall of arithmetic answers (2-Back魔鬼计算模式) — **Implemented**
2.  **Spatial Flow (空间心流)**: Grid position tracking with configurable sizes (3×3, 4×4, 5×5) + N-Back — **Implemented with phased interaction**
3.  **Mouse Flow (鼠标心流 / Devilish Mice)**: Animated mouse path tracking on 4×4 grid + N-Back — **Implemented**
4.  **House Flow (人来人往)**: Dynamic people counting - observe enter/leave events and recall final count — **Implemented**

## 5. Development Roadmap & Status
- **Phase 1: Planning**
    - [x] Concept Definition
    - [x] PRD Drafted (`project_brain_training_prd.md`)
- **Phase 2: Foundation**
    - [x] Project Initialization (Vite/React/TS)
    - [x] Tailwind Configuration (Theme setup)
    - [x] Core Game Engine (N-Back Logic Hook)
- **Phase 3: MVP Implementation**
    - [x] Numeric Flow Prototype (Delayed Recall / "魔鬼计算"模式)
    - [x] Spatial Flow Prototype with Configurable Grid Sizes (3×3, 4×4, 5×5)
    - [x] Mouse Flow Prototype (Animated mouse path tracking on 4×4 grid)
    - [x] Phased Interaction for Spatial Mode (Display Phase → Input Phase)
    - [x] Basic UI Shell (Home, Game, Result) — Componentized architecture with layout/game/screens structure
    - [x] Multi-Mode Support — Numeric, Spatial & Mouse modes with mode selector
- **Phase 4: Architecture Upgrade**
    - [x] react-router-dom multi-level routing (`/`, `/train/:mode`, `/result`, `/profile`)
    - [x] Responsive 3-column layout (Sidebar + Stage + Dashboard) — `MainLayout.tsx`
    - [x] i18n framework (i18next + react-i18next, zh/en locale files)
    - [x] Theme Context (light/dark/warm) with CSS Variables
    - [x] ProfileScreen page
    - [x] Sidebar + RightPanel + MobileNav components
    - [x] SPA routing support (vercel.json rewrites)
    - [x] Local Storage Persistence (User Profile + Game Configs)
    - [x] Energy System (5 max, 4h recovery, lazy calculation)
    - [x] Brain Points economy (earned from training, spent in store)
    - [x] Daily Check-in system (streak rewards)
    - [x] Virtual Store page (/store route)
    - [x] Instruction/Help page (/instruction route)
    - [x] Theme simplified to fixed light (dark/warm removed)
    - [x] Full i18n coverage for all game components (useTranslation in all screens/game components)
    - [x] 3-column layout persists during gameplay (sidebars always visible on desktop)
- **Phase 5: Profile & Dashboard** (NEW)
    - [x] Brain Rank system (LV1-7 段位, XP 进度条, Morandi 渐变卡片)
    - [x] Six-dimension Brain Radar Chart (recharts, Morandi palette, theme-adaptive)
    - [x] Activity Heatmap (GitHub-style 365-day contribution grid with tooltips)
    - [x] Auth Section UI (Guest/User status, WeChat/Google link placeholders)
    - [x] Enhanced Dashboard (RightPanel) with History + Leaderboard tabs + CheckInWidget
    - [x] Mock data system for demo UI (mocks/userData.ts — 365-day generators)
    - [x] Sidebar integration (compact BrainRank card + mini radar + EnergyBar)
    - [x] Full i18n for profile/radar/heatmap/auth sections (zh+en)
    - [x] Extended type system: BrainStats, BrainRankLevel, AuthProfile
    - [x] XP calculation formula: `20 * (nCoeff + modeCoeff) * accuracy%`
    - [x] Dynamic brain stats update per session
- **Phase 6: Backend Services**
    - [ ] **Auth System**: Supabase Auth + WeChat/Google OAuth + Account Linking.
    - [ ] **Payment Gateway**: Adapter pattern for Stripe/WeChat Pay.
    - [ ] **Cloud Sync**: PostgreSQL schema migration & Edge Functions.

## 6. Common Commands (Anticipated)
*Commands to be available after initialization:*
- `npm run dev` - Start local dev server
- `npm run build` - Production build
- `npm run preview` - Preview production build
- `npm run test` - Run unit tests
- `npm run lint` - Linting

## 7. Code Conventions
- **Functional Components**: Use React Functional Components with Hooks.
- **Strict Typing**: No `any`. Define interfaces for all Game States and Props.
- **Component Structure**: 
  - `/components/ui`: Reusable atomic components (Buttons, Cards).
  - `/components/game`: Specific game logic components.
  - `/hooks`: Custom hooks for game logic (e.g., `useNBack`).
- **Naming**: PascalCase for components, camelCase for functions/vars.
## 8. Current Implementation Notes (Numeric Flow)
**Game Mode**: "Delayed Recall" (延迟回忆) — inspired by "Devilish Calculations" (魔鬼计算)

**Gameplay Flow**:
1. Round 0: Show equation `3 + 2`. Player **memorizes** answer (5). No input yet.
2. Round 1: Show equation `1 + 4`. Player memorizes (5). If 1-Back, player **inputs answer for Round 0** → 5.
3. Round N: Show new equation. Player inputs answer for equation from `N` rounds ago.

**Key Differences from Standard N-Back**:
- **Input Type**: Numeric answer (0-99) instead of Match/No-Match button.
- **UI Language**: Simplified Chinese (简体中文).
- **Warmup Phase**: First `N` rounds are memory-only (no input required).
- **Equation Generation**: Random `+`, `-`, `×` with positive results (2-56 range).

**UI Features**:
- Large equation display card with "Zen" aesthetic (莫兰迪色系).
- Touch-friendly numeric keypad (0-9, backspace, submit).
- Real-time feedback on previous answer correctness.
- Progress bar and score tracking.
- Debug panel showing N-back target (for testing).

## 9. Component Architecture
**Current Structure** (as of Phase 5 — Profile & Dashboard upgrade):

```
src/
├── App.tsx                          # BrowserRouter + Routes (/, /train/:mode, /result, /profile, /store, /instruction)
├── main.tsx                         # Entry: i18n init + ThemeProvider + App
├── index.css                        # Tailwind + CSS theme variables (light only)
├── i18n/
│   ├── config.ts                    # i18next initialization
│   └── locales/
│       ├── zh.json                  # Chinese translations (~200 keys)
│       └── en.json                  # English translations (~200 keys)
├── contexts/
│   └── ThemeContext.tsx             # Fixed light theme provider (toggle removed)
├── layouts/
│   └── MainLayout.tsx               # Responsive 3-column layout + <Outlet/>
├── mocks/
│   └── userData.ts                  # Comprehensive mock data (365-day history, brain stats, heatmap, leaderboard, profile)
├── components/
│   ├── ui/
│   │   └── Card.tsx                 # Reusable base card component (cn() utility, padding variants)
│   ├── economy/
│   │   ├── EnergyBar.tsx            # Energy bar with recovery countdown timer
│   │   └── CheckInWidget.tsx        # Daily check-in widget with streak display + reward animation
│   ├── layout/
│   │   ├── LayoutShell.tsx          # (Legacy) single-column layout wrapper
│   │   ├── Sidebar.tsx              # Desktop left sidebar (EnergyBar + BrainRank + mini radar + nav + lang)
│   │   ├── RightPanel.tsx           # Desktop right panel (CheckIn + History + Leaderboard tabs)
│   │   └── MobileNav.tsx            # Mobile bottom navigation bar (Home/Store/Profile/Help)
│   ├── profile/
│   │   ├── BrainRankCard.tsx        # Brain Rank card (LV badge, XP progress bar, compact/full modes)
│   │   ├── RadarChartWidget.tsx     # Six-dimension radar chart (recharts, Morandi light-only)
│   │   ├── ActivityHeatmap.tsx      # GitHub-style 365-day activity heatmap with tooltips & month labels
│   │   └── AuthSection.tsx          # Auth status + WeChat/Google link placeholders
│   ├── pages/
│   │   ├── HomePage.tsx             # Route wrapper: HomeScreen + navigate
│   │   ├── TrainPage.tsx            # Route wrapper: engine start + GameScreen/MouseGameScreen
│   │   └── ResultPage.tsx           # Route wrapper: ResultScreen + navigate
│   ├── screens/
│   │   ├── HomeScreen.tsx           # Config UI (mode/param selection, 4 game modes, full i18n)
│   │   ├── GameScreen.tsx           # N-Back game (numeric + spatial, i18n)
│   │   ├── MouseGameScreen.tsx      # Mouse game (independent engine, i18n)
│   │   ├── HouseGameScreen.tsx      # House game (people counting, SVG + Framer Motion, i18n)
│   │   ├── ResultScreen.tsx         # Post-game statistics (i18n)
│   │   ├── ProfileScreen.tsx        # Full profile page (BrainRank, radar, 365-day heatmap, history, economy widgets, auth)
│   │   ├── StoreScreen.tsx          # Virtual store (Brain Points purchase, animated feedback)
│   │   └── InstructionScreen.tsx    # Help page (N-Back mechanism, rank table, radar explanation, energy system)
│   └── game/
│       ├── AnswerCountdown.tsx      # SVG circular countdown
│       ├── NumericKeypad.tsx        # 0-9 input keypad
│       ├── SpatialGrid.tsx          # NxN grid (legacy, not actively used)
│       ├── StatusBar.tsx            # Game top bar (quit/pause/progress)
│       └── StimulusCard.tsx         # Equation display card
├── hooks/
│   ├── useNBack.ts               # Core N-Back engine (numeric + spatial)
│   ├── useMouseGame.ts           # Mouse game engine
│   ├── useHouseGame.ts           # House game engine (people counting)
│   └── useSoundEffects.ts        # Audio hook (click/correct/wrong)
├── lib/
│   └── utils.ts                  # cn() utility (clsx + twMerge)
├── store/
│   ├── gameStore.ts              # Zustand global store v3 (persisted) — includes economy actions
│   └── mockData.ts               # [LEGACY] Old mock data — use mocks/userData.ts instead
└── types/
    └── game.ts                   # All TypeScript type definitions (BrainStats, BrainRank, AuthProfile, EnergyState, CheckInState, StoreProduct)
```

**Routing Architecture**:
- `/` → `HomePage` → `HomeScreen` (config + start)
- `/train/:mode` → `TrainPage` (engine management + GameScreen/MouseGameScreen)
- `/result` → `ResultPage` → `ResultScreen` (stats + replay)
- `/profile` → `ProfileScreen` (user stats + history + economy widgets)
- `/store` → `StoreScreen` (virtual store with Brain Points)
- `/instruction` → `InstructionScreen` (help & game explanations)

**Layout Strategy**:
- Desktop (lg+): 3-column grid — Sidebar(250px) | Stage(flex) | RightPanel(300px)
- Mobile: Single column + fixed bottom nav (MobileNav)
- Game mode (`/train/*`): 3-column persists; sidebars always visible on desktop

## 10. Multi-Mode Architecture
**Supported Game Modes**:
- `'numeric'`: Math equation delayed recall (数字心流)
- `'spatial'`: Dynamic grid position memory with configurable sizes (空间心流)
- `'mouse'`: Animated mouse path tracking on 4×4 grid (鼠标心流 / Devilish Mice)
- `'house'`: Dynamic people counting with enter/leave events (人来人往 / House Flow)

**Type System** (Discriminated Union):
```typescript
type GameMode = 'numeric' | 'spatial' | 'mouse' | 'house';

type Stimulus = NumericStimulus | SpatialStimulus | MouseStimulus;

interface NumericStimulus {
  type: 'numeric';
  index: number;
  equation: string;
  answer: number;
  presentedAt: number;
}

interface SpatialStimulus {
  type: 'spatial';
  index: number;
  gridIndex: number;
  presentedAt: number;
}

interface MouseStimulus {
  type: 'mouse';
  index: number;
  start: number;     // Starting cell (0-15)
  path: number[];    // Intermediate cells
  end: number;       // Ending cell (0-15)
  presentedAt: number;
}
```

**Mode-Specific Components**:
- `StimulusCard.tsx` → Numeric mode (equation display)
- `SpatialGrid.tsx` → Spatial mode (dynamic NxN interactive grid with phased interaction)
- `MouseGameScreen.tsx` → Mouse mode (full-screen animated mouse/cat grid)
- `HouseGameScreen.tsx` → House mode (SVG house with animated people enter/leave)
- `GameScreen.tsx` → Renders appropriate component based on `config.mode`

**User Experience**:
- Mode selector on HomeScreen (🔢 数字心流 / 🎯 空间心流 / 🐭 魔鬼老鼠 / 🏠 人来人往)
- House mode features:
  - SVG house background (`/pic/house.svg`) with animated people (`/pic/people1-3.svg`)
  - Configurable initial people (1-10), event count (3-20), speed (slow/normal/fast), rounds (1-10)
  - Framer Motion AnimatePresence for enter/leave animations (spring physics)
  - Floating +/- text indicators during events
  - Number keypad for answer input (0-9, Backspace, Enter)
  - Sound effects (click on events, correct/wrong on answers)
  - Phase flow: idle → showing (2s) → events (timer-driven) → answering → feedback (1.5s) → next/finished
  - HouseSpeed map: easy=1500ms, normal=1000ms, fast=500ms per event
  - Asset preloading on mount
- Mouse mode features:
  - 4×4 fixed grid with animated mouse character (SVG)
  - Configurable path length (2/3/4 steps)
  - Random walk via adjacency (Up/Down/Left/Right)
  - Animation: STEP_DURATION=350ms per cell, PAUSE_AT_END=400ms
  - Display area (amber border, top) shows animated mouse movement
  - Answer area (zen border, bottom) for clicking remembered end position
  - Auto-submit on timeout if cell selected
- Spatial mode features:
  - Configurable grid sizes (3×3, 4×4, 5×5)
  - Phased interaction: Display phase (1s, locked) → Input phase (enabled)
  - Active cell highlight (teal-500, pulse animation)
  - Click feedback (green/red flash)
  - Status indicators ("观察位置..." / "✓ 可以点击")
  - Touch-friendly responsive grid
  - Grid remains visible during answer phase

## 11. Spatial Flow Mode Refinement

### User Feedback Issues (Resolved)
**Issue 1**: Display and Input areas are the same, causing confusion about when to click.
- **Solution**: Implemented phased interaction with two distinct phases:
  1. **Stimulus Display Phase** (1 second): Stimulus highlighted (teal-500, pulse), input locked (pointer-events disabled)
  2. **Input Phase** (remaining time): Stimulus cleared, input enabled with visual cue (green border, "✓ 可以点击" status text)

**Issue 2**: Fixed 3×3 grid is limiting for difficulty scaling.
- **Solution**: Added configurable grid sizes (3×3, 4×4, 5×5) with:
  - Dynamic CSS grid columns: `grid-cols-${gridSize}`
  - Adaptive cell spacing: `gap-3` for 3×3, `gap-2` for 4×4/5×5
  - Container sizing: `max-w-sm` (3×3), `max-w-md` (4×4), `max-w-lg` (5×5)
  - Grid size selector on HomeScreen (only visible in spatial mode)

### Implementation Details

**Type System**:
```typescript
interface NBackConfig {
  nLevel: number;
  totalRounds: number;
  mode: GameMode;
  gridSize: number;  // NEW: 3, 4, or 5
  stimulusDuration: number;
}

interface SpatialStimulus {
  type: 'spatial';
  gridIndex: number;  // Dynamic range: 0 to (gridSize² - 1)
  presentedAt: number;
}
```

**State Management**:
```typescript
// useNBack.ts
const [isStimulusVisible, setIsStimulusVisible] = useState(true);

function generateSpatialPosition(gridSize: number): number {
  const maxIndex = gridSize * gridSize - 1;
  return Math.floor(Math.random() * (maxIndex + 1));
}
```

**Phased Interaction Flow**:
1. GameScreen useEffect triggers on new round:
   - Sets `isStimulusVisible = true` (locks input)
   - Starts 1-second timer
   - Timer expires → Sets `isStimulusVisible = false` (enables input)

2. SpatialGrid component:
   - Calculates `canInput = !isPaused && !isWarmup && !isStimulusVisible`
   - Applies conditional styling:
     - Input locked: `bg-zen-100 cursor-not-allowed opacity-70`
     - Input enabled: `border-2 border-zen-200 hover:border-teal-400 cursor-pointer`
   - Shows status indicator: "观察位置..." (locked) / "✓ 可以点击" (enabled)

**Component Updates**:
- **SpatialGrid.tsx**: 
  - Added `gridSize` and `isStimulusVisible` props
  - Dynamic grid layout with `grid-cols-${gridSize}`
  - Input locking with `canInput` calculation
  - Visual feedback: Border color changes, status text
  
- **GameScreen.tsx**: 
  - Added `STIMULUS_DISPLAY_DURATION = 1000` constant
  - useEffect for stimulus visibility timing
  - Passes `gridSize` and `isStimulusVisible` to SpatialGrid

- **HomeScreen.tsx**: 
  - Added `gridSize` state and `initialGridSize` prop
  - Grid size selector (3×3, 4×4, 5×5 buttons) - conditional on spatial mode
  - Updated `onStart` callback to include gridSize parameter

- **App.tsx**: 
  - Updated `handleStart` to accept and pass `gridSize`
  - Added `initialGridSize={nextConfig.gridSize}` to HomeScreen props

### User Experience Flow
1. **Configuration**: User selects spatial mode → Grid size selector appears
2. **Stimulus Display**: Grid cell highlights with pulse animation, status shows "观察位置..."
3. **Input Phase** (after 1s): Highlight clears, border turns teal on hover, status shows "✓ 可以点击"
4. **Click Feedback**: Brief color flash (green/red) based on correctness
5. **Next Round**: Cycle repeats with new grid position

### Technical Benefits
- **No Overlap Confusion**: Clear visual separation between display and input states
- **Scalable Difficulty**: Grid size increases spatial complexity (9 → 16 → 25 cells)
- **Type Safety**: Grid index range checked at generation time: `0 to (gridSize² - 1)`
- **Responsive**: Grid adapts container size based on gridSize for mobile compatibility

## 12. Metagame & Persistence
**localStorage Key**: `brain-flow-storage`

**Data Structure**:
```typescript
interface UserProfile {
  totalScore: number;           // Accumulative points
  totalXP: number;              // Experience points for rank system
  maxNLevel: number;            // Highest N-Back passed with ≥80% accuracy
  daysStreak: number;           // Consecutive days played
  lastPlayedDate: string | null; // ISO date for streak calculation
  brainStats: BrainStats;       // Six-dimension radar data
  auth: AuthProfile;            // Authentication profile (placeholder)
  brainPoints: number;          // In-game currency
  energy: EnergyState;          // Energy system state
  checkIn: CheckInState;        // Check-in system state
  ownedItems: string[];         // Permanent item IDs from store
}

interface BrainStats {
  memory: number;               // 0-100, from max N-levels
  focus: number;                // 0-100, rolling average accuracy
  math: number;                 // 0-100, numeric mode performance
  observation: number;          // 0-100, spatial + mouse mode
  workingMemory: number;        // 0-100, house + high N-back
  speed: number;                // 0-100, inverted reaction time
}

interface AuthProfile {
  status: 'guest' | 'authenticated';
  displayName: string;
  avatarUrl: string | null;
  linkedProviders: AuthProvider[];  // 'guest' | 'email' | 'google' | 'wechat'
}

interface SessionHistoryEntry {
  timestamp: number;
  nLevel: number;
  accuracy: number;             // Percentage (0-100)
  score: number;                // Points = (accuracy × nLevel × totalRounds) / 10
  totalRounds: number;
  mode: GameMode;               // Which game mode
  avgReactionTimeMs?: number;   // Average reaction time
}
```

**Score Formula**: `(accuracy × nLevel × totalRounds) / 10`
- Example: 90% accuracy, 3-Back, 20 rounds = 540 points

**XP Formula**: `20 × (nCoeff + modeCoeff) × accuracy%`
- nCoeff: `1 + (N-1) × 0.2`
- modeCoeff: 1.0 (short) / 1.5 (long sessions)

**Brain Rank Levels** (from PRD §3.1):
| Level | Title (zh) | Title (en) | XP Required |
|-------|-----------|------------|-------------|
| LV1 | 见习 | Novice | 0 |
| LV2 | 觉醒 | Awakened | 500 |
| LV3 | 敏捷 | Agile | 2,500 |
| LV4 | 逻辑 | Logical | 10,000 |
| LV5 | 深邃 | Profound | 25,000 |
| LV6 | 大师 | Master | 50,000 |
| LV7 | 超凡 | Transcendent | 80,000 |

**Streak Logic**:
- Same day = no change
- Next day = increment by 1
- Gap > 1 day = reset to 1

## 13. Profile & Dashboard System (Phase 5)

### Profile Screen Components
- **BrainRankCard**: Gradient card showing LV badge, XP progress bar (animated via Framer Motion), next level preview. Supports compact (sidebar) and full (profile page) modes.
- **RadarChartWidget**: Six-dimension recharts RadarChart with Morandi light palette. Supports compact mode for sidebar display.
- **ActivityHeatmap**: GitHub-style 365-day heatmap grid with month labels and hover tooltips (date, count, XP). Morandi green 5-level color scale.
- **AuthSection**: Current login status (Guest/User) + placeholder buttons for WeChat/Google account linking. SVG icons for providers.

### Economy Components
- **EnergyBar**: Gradient progress bar showing `current/max` energy. Recovery countdown timer (HH:MM:SS). Uses Zustand selector for precision updates.
- **CheckInWidget**: Daily check-in button with streak display. Framer Motion `AnimatePresence` reward notification. Auto-hides after 3 seconds.
- **StoreScreen**: Virtual store with `STORE_PRODUCTS` card grid. Brain Points balance. Purchase flow with loading spinner + success/failure feedback. Consumable/permanent item tags.
- **InstructionScreen**: Help page with 4 sections: N-Back mechanism (visual 1-Back example), LV1-7 rank table, six-dimension radar explanation (with icons), energy system explanation.

### Dashboard (RightPanel) Components
- **CheckInWidget**: Displayed at top of panel for daily engagement.
- **History Tab**: Last 5 sessions with mode emoji, N-level, accuracy, score, date, and avg reaction time.
- **Leaderboard Tab**: Tab switcher (2-Back / 3-Back) showing mock ranked entries with avg time and accuracy badges.

### Mock Data System (`mocks/userData.ts`)
- `generateMockYearlyHistory(count)`: Generates realistic session history across 365 days with time-biased distribution.
- `generateMockRecentHistory(count)`: Lightweight 30-day history generator.
- `MOCK_BRAIN_STATS` / `MOCK_BEGINNER_STATS` / `MOCK_ADVANCED_STATS`: Tiered brain stats presets.
- `generateYearlyHeatmap(history)`: Converts session history to 365-day { date, count, xp } array.
- `MOCK_LEADERBOARD_2BACK` / `MOCK_LEADERBOARD_3BACK`: Ranked mock entries.
- `MOCK_USER_PROFILE`: Complete user profile with economy fields.
- UI shows mock data when no real data exists, with "示例数据" hint.

### Sidebar Integration
- EnergyBar widget displayed in card container.
- Compact BrainRankCard + mini RadarChartWidget.
- Navigation: Home, Profile, Store, Instruction + language toggle.
- Theme toggle removed (fixed light theme).

## 14. Economy System (Phase 5.5)

### Energy System
- **Max energy**: 5 (constant `ENERGY_MAX`)
- **Recovery**: 1 point every 4 hours (constant `ENERGY_RECOVERY_INTERVAL_MS`)
- **Lazy calculation**: `calculateRecoveredEnergy()` runs on demand (not cron-based)
- **Unlimited energy**: `unlimitedUntil` timestamp for future promotions
- **UI**: `EnergyBar` component with gradient bar + countdown timer

### Brain Points (Currency)
- **Earned**: `Math.round(score * 0.5)` per training session (in `saveSession`)
- **Spent**: In virtual store for items
- **Display**: Sidebar stats, ProfileScreen stats grid, StoreScreen balance

### Check-in System
- **Daily check-in**: Once per day (ISO date comparison)
- **Streak tracking**: `consecutiveDays` increments on consecutive days, resets on gaps
- **Rewards**: Tiered — base 50 XP + 50 BP; 3-day streak 50 XP + 100 BP; 7+ day streak 50 XP + 300 BP
- **UI**: `CheckInWidget` with claim button, streak display, reward animation

### Store Products
| ID | Type | Price | Effect |
|---|---|---|---|
| `energy_1` | Consumable | 100 BP | +1 Energy |
| `energy_5` | Consumable | 450 BP | +5 Energy (full) |
| `streak_saver` | Consumable | 500 BP | Restore broken streak |
| `premium_report` | Permanent | 1000 BP | Unlock detailed analysis |

### Zustand Store v3
- Store version bumped to 3 with migration logic for new economy fields
- Uses `(set, get)` pattern for actions that need to read state (e.g., `consumeEnergy`, `purchaseProduct`)
- Economy actions: `recalculateEnergy`, `consumeEnergy`, `addEnergy`, `performCheckIn`, `purchaseProduct`, `addBrainPoints`

### Theme Simplification
- Removed light/dark/warm theme switching entirely
- `ThemeContext` simplified to fixed `'light'` theme
- All `dark:` Tailwind classes removed from every component
- `index.css` cleaned: only `:root/.theme-light` CSS variables remain
- Sidebar theme toggle button removed

**Features Implemented**:
- ✅ Profile card on HomeScreen (max level, total score, streak)
- ✅ Achievement badges on ResultScreen ("🏆 新纪录", "⭐ 新难度解锁")
- ✅ CSS-only bar chart (last 5 sessions accuracy)
- ✅ Recent sessions list with scores
- ✅ History comparison logic