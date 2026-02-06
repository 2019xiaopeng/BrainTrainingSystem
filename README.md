# Brain Flow - 脑力心流

A minimalist N-Back brain training game with a Zen aesthetic.

## Tech Stack

- **Build Tool**: Vite
- **Framework**: React 18+ 
- **Language**: TypeScript
- **Styling**: Tailwind CSS v3 (with custom Morandi color palette)
- **State Management**: Zustand
- **Utilities**: clsx, tailwind-merge

## Development

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── lib/
│   └── utils.ts          # Utility functions (cn for class merging)
├── App.tsx               # Main app component
├── main.tsx              # Entry point
└── index.css             # Global styles with Tailwind directives

tailwind.config.js        # Custom Zen theme configuration
```

## Design System

The project uses a custom "Minimalist Zen" color palette with three color families:

- **Zen**: Warm grays and earth tones (50-900)
- **Sage**: Soft green-grays (50-900)
- **Dust**: Muted rose-taupes (50-900)

All colors are low-saturation Morandi colors for a calming, focused experience.

## Current Status

✅ Phase 2: Foundation - Complete
- Project initialization
- Tailwind configuration with Zen theme
- Basic app structure

See `CLAUDE.md` for full development roadmap.
