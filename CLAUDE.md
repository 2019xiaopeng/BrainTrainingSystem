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
- **Framework**: React 18+
- **Language**: TypeScript
- **Styling**: Tailwind CSS (Utility-first for rapid, clean UI)
- **State Management**: Zustand (Lightweight, for game loop & N-Back queues)
- **Testing**: Vitest + React Testing Library
- **Backend (Future)**: Node.js / Supabase / Firebase (for Auth & Leaderboards)

## 4. Core Gameplay Modules (MVP)
1.  **Numeric Flow**: Simple arithmetic + N-Back memory.
2.  **Spatial Flow**: Grid position tracking (3x3/4x4) + N-Back.
3.  **Verbal Flow**: Rapid reading + Keyword recall.

## 5. Development Roadmap & Status
- **Phase 1: Planning**
    - [x] Concept Definition
    - [x] PRD Drafted (`project_brain_training_prd.md`)
- **Phase 2: Foundation**
    - [ ] Project Initialization (Vite/React/TS)
    - [ ] Tailwind Configuration (Theme setup)
    - [ ] Core Game Engine (N-Back Logic Hook)
- **Phase 3: MVP Implementation**
    - [ ] Numeric Flow Prototype
    - [ ] Basic UI Shell (Home, Game, Result)
- **Phase 4: Metagame**
    - [ ] Energy System
    - [ ] Local Storage Persistence (User Profile)

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
