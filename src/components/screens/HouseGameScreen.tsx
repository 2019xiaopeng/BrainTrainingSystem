// ============================================================
// HouseGameScreen - 人来人往 (House Flow) 游戏界面
// ============================================================
//
// Animation Model:
//   1. Peek: show initial people centered in game area (~2.2s)
//   2. House drops from above (y: -112% → 0%), covering center 60% width
//   3. Events: people slide LEFT→RIGHT
//      - Enter: left -14% → left 50% (hidden behind house via z-index)
//      - Leave: left 50% → left 114% (emerge from house, slide off right)
//      - Both can happen simultaneously per event tick
//   4. Answering: keypad below game area (no overlap)
//   5. House rises (y: 0% → -112%), revealing correct people count
//   6. NO "+N"/"-N" hints anywhere — player must count visually
//
// People images:
//   - 1 person:  people1.svg
//   - 2 people:  people2.svg
//   - 3 people:  three people.svg

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { UseHouseGameReturn } from '../../hooks/useHouseGame';
import { useSoundEffects } from '../../hooks/useSoundEffects';

interface HouseGameScreenProps {
  engine: UseHouseGameReturn;
  onQuit: () => void;
}

// ---- Asset paths ----
const ASSETS = [
  '/pic/house.svg',
  '/pic/people1.svg',
  '/pic/people2.svg',
  '/pic/people3.svg',
  '/pic/three%20people.svg',
];

// Single person variants (for initial & reveal display)
const PERSON_VARIANTS = ['/pic/people1.svg', '/pic/people2.svg', '/pic/people3.svg'];

// Group images keyed by count (for walking movers)
const GROUP_SVGS: Record<1 | 2 | 3, string> = {
  1: '/pic/people1.svg',
  2: '/pic/people2.svg',
  3: '/pic/three%20people.svg',
};

// ---- Timing constants ----
const PEEK_MS = 2200;           // Time to observe initial people
const HOUSE_DROP_MS = 800;      // House slide-down duration
const HOUSE_RISE_MS = 800;      // House slide-up duration
const MOVER_DURATION_S = 1.0;   // People slide animation (seconds)
const FEEDBACK_MS = 2000;       // Feedback display time

// ---- Types ----
type Scene = 'peek' | 'houseDrop' | 'covered' | 'houseRise' | 'revealed';

interface Mover {
  id: number;
  direction: 'enter' | 'leave';
  icons: string[];
  yOffset: number; // vertical variation (percent)
}

// Helper to get random person icon
const getRandomPerson = () => PERSON_VARIANTS[Math.floor(Math.random() * PERSON_VARIANTS.length)];

// Helper to build icon set for a given count
const buildMoverIcons = (count: number): string[] => {
  if (count <= 0) return [];
  if (count === 1) return [getRandomPerson()];
  if (count === 2) return [getRandomPerson(), getRandomPerson()];
  if (count === 3) return ['/pic/three%20people.svg']; // Explicit 3-person group
  
  // For > 3 (fallback), mix of 3-person group and singles
  const icons: string[] = [];
  let remaining = count;
  while (remaining >= 3) {
    icons.push('/pic/three%20people.svg');
    remaining -= 3;
  }
  while (remaining > 0) {
    icons.push(getRandomPerson());
    remaining--;
  }
  return icons;
};

// ---- Preload ----
function preloadAssets() {
  ASSETS.forEach(src => {
    const img = new Image();
    img.src = src;
  });
  ['/music/click.wav', '/music/correct.mp3', '/music/wrong.mp3'].forEach(src => {
    const a = new Audio();
    a.preload = 'auto';
    a.src = src;
  });
}

// ====================================================================
// Main Component
// ====================================================================
export function HouseGameScreen({ engine, onQuit }: HouseGameScreenProps) {
  const { t } = useTranslation();
  const { playClick, playCorrect, playWrong } = useSoundEffects();

  const [scene, setScene] = useState<Scene>('peek');
  const [movers, setMovers] = useState<Mover[]>([]);
  const [inputValue, setInputValue] = useState('');
  const moverIdRef = useRef(0);
  const eventTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const removeMover = useCallback((id: number) => {
    setMovers((prev) => prev.filter((m) => m.id !== id));
  }, []);

  // Preload on mount
  useEffect(() => { preloadAssets(); }, []);

  // ── Reset on round / phase change ──────────────────────────────
  useEffect(() => {
    setInputValue('');
    setMovers([]);
    if (engine.phase === 'showing') setScene('peek');
  }, [engine.phase, engine.currentRound]);

  // ── Phase: showing → peek → houseDrop → covered + startEvents ──
  useEffect(() => {
    if (engine.phase !== 'showing') return;

    const t1 = setTimeout(() => setScene('houseDrop'), PEEK_MS);
    const t2 = setTimeout(() => {
      setScene('covered');
      engine.startEvents();
    }, PEEK_MS + HOUSE_DROP_MS);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [engine.phase, engine.currentRound, engine]);

  // ── Phase: events → create movers + schedule advancement ───────
  useEffect(() => {
    if (engine.phase !== 'events') return;
    const currentEvent = engine.events[engine.currentEventIndex];
    if (!currentEvent) return;

    playClick();

    // Create enter mover
    if (currentEvent.enterCount > 0) {
      moverIdRef.current += 1;
      const id = moverIdRef.current;
      // Target ~45% from top (center is 50%, so -5% offset)
      const yOffset = -5 + Math.random() * 8;
      
      setMovers(prev => [...prev, {
        id,
        direction: 'enter',
        icons: buildMoverIcons(currentEvent.enterCount),
        yOffset,
      }]);
      
      setTimeout(() => removeMover(id), Math.round(MOVER_DURATION_S * 1000 + 120));
    }

    // Create leave mover
    if (currentEvent.leaveCount > 0) {
      moverIdRef.current += 1;
      const id = moverIdRef.current;
      // Target ~45% from top (center is 50%, so -5% offset)
      const yOffset = -5 + Math.random() * 8;
      
      setMovers(prev => [...prev, {
        id,
        direction: 'leave',
        icons: buildMoverIcons(currentEvent.leaveCount),
        yOffset,
      }]);
      
      setTimeout(() => removeMover(id), Math.round(MOVER_DURATION_S * 1000 + 120));
    }

    // Schedule next event based on dynamic delay
    eventTimerRef.current = setTimeout(() => {
      engine.advanceEvent();
    }, currentEvent.delayMs);

    return () => {
      if (eventTimerRef.current) clearTimeout(eventTimerRef.current);
    };
  }, [engine.phase, engine.currentEventIndex, engine, playClick, removeMover]);

  // ── Phase: revealing → house rise → revealed + finishReveal ────
  useEffect(() => {
    if (engine.phase !== 'revealing') return;
    setScene('houseRise');

    const timer = setTimeout(() => {
      setScene('revealed');
      engine.finishReveal();
    }, HOUSE_RISE_MS);

    return () => clearTimeout(timer);
  }, [engine.phase, engine]);

  // ── Phase: feedback → auto-advance after delay ─────────────────
  useEffect(() => {
    if (engine.phase !== 'feedback') return;

    if (engine.lastRoundResult?.isCorrect) playCorrect();
    else playWrong();

    const timer = setTimeout(() => engine.nextRound(), FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [engine.phase, engine, playCorrect, playWrong, engine.lastRoundResult]);

  // ── Keyboard support (answering phase) ─────────────────────────
  useEffect(() => {
    if (engine.phase !== 'answering') return;

    const handleKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        setInputValue(prev => prev.length < 2 ? prev + e.key : prev);
        playClick();
        e.preventDefault();
      } else if (e.key === 'Backspace') {
        setInputValue(prev => prev.slice(0, -1));
        e.preventDefault();
      } else if (e.key === 'Enter' && inputValue !== '') {
        const answer = parseInt(inputValue, 10);
        if (!isNaN(answer)) engine.submitAnswer(answer);
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [engine.phase, inputValue, engine, playClick]);

  // ── Input handlers ─────────────────────────────────────────────
  const handleNumberInput = useCallback((digit: string) => {
    if (engine.phase !== 'answering') return;
    playClick();
    setInputValue(prev => prev.length < 2 ? prev + digit : prev);
  }, [engine.phase, playClick]);

  const handleBackspace = useCallback(() => {
    setInputValue(prev => prev.slice(0, -1));
  }, []);

  const handleSubmit = useCallback(() => {
    if (inputValue === '' || engine.phase !== 'answering') return;
    const answer = parseInt(inputValue, 10);
    if (!isNaN(answer)) engine.submitAnswer(answer);
  }, [inputValue, engine]);

  // ── Computed values ────────────────────────────────────────────
  const correctSoFar = engine.roundResults.filter(r => r.isCorrect).length;

  const initialPeopleIcons = useMemo(
    () => Array.from({ length: engine.initialPeople }, (_, i) => ({
      id: i,
      svg: PERSON_VARIANTS[i % 3],
    })),
    [engine.initialPeople],
  );

  // Group people for final reveal: use 3-person groups if count > 6
  const correctPeopleIcons = useMemo(() => {
    const count = engine.correctCount;
    const icons: { id: number; svg: string }[] = [];
    let remaining = count;
    
    // If total > 6, prioritize using groups of 3
    if (count > 6) {
      while (remaining >= 3) {
        icons.push({ id: icons.length, svg: GROUP_SVGS[3] });
        remaining -= 3;
      }
    }
    
    // Fill remainder with singles
    while (remaining > 0) {
      // If we have 2 left, use group of 2? Or 2 singles? 
      // User asked for "three people picture", implying group logic.
      // Let's stick to singles for remainder for clarity unless it's exactly 2?
      // Actually, standardizing on singles for remainder is safer visually.
      icons.push({ id: icons.length, svg: PERSON_VARIANTS[icons.length % 3] });
      remaining--;
    }
    return icons;
  }, [engine.correctCount]);

  // House visible when scene is 'houseDrop' or 'covered'
  const houseY = (scene === 'houseDrop' || scene === 'covered') ? '0%' : '-112%';

  // ================================================================
  // Render
  // ================================================================
  return (
    <div className="space-y-3">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between">
        <button
          onClick={onQuit}
          className="text-sm text-zen-400 hover:text-zen-600 transition"
        >
          {t('game.quit')}
        </button>
        <span className="text-xs font-mono text-zen-400">
          {t('house.roundLabel', {
            current: engine.currentRound + 1,
            total: engine.config.totalRounds,
          })}
        </span>
        <div className="text-xs text-zen-400">
          {engine.phase === 'events' && t('house.eventProgress', {
            current: engine.currentEventIndex + 1,
            total: engine.events.length,
          })}
        </div>
      </div>

      {/* ── Progress Bar ── */}
      <div className="w-full h-1.5 bg-zen-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-400 transition-all duration-300"
          style={{
            width: `${(
              (engine.currentRound +
                (engine.phase === 'feedback' || engine.phase === 'finished' ? 1 : 0))
              / engine.config.totalRounds
            ) * 100}%`,
          }}
        />
      </div>

      {/* ── Status Message (ABOVE game area — no overlap) ── */}
      <div className="text-center min-h-[36px] flex items-center justify-center">
        <AnimatePresence mode="wait">
          {engine.phase === 'showing' && scene === 'peek' && (
            <motion.div
              key="peek-msg"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="inline-block bg-amber-100 text-amber-800 px-4 py-1.5 rounded-full text-sm font-medium"
            >
              {t('house.watching')}
            </motion.div>
          )}
          {engine.phase === 'answering' && (
            <motion.div
              key="answer-msg"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="inline-block bg-amber-100 text-amber-800 px-4 py-1.5 rounded-full text-sm font-medium"
            >
              {t('house.howMany')}
            </motion.div>
          )}
          {engine.phase === 'feedback' && engine.lastRoundResult && (
            <motion.div
              key="feedback-msg"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className={`inline-block px-4 py-1.5 rounded-full text-sm font-medium ${
                engine.lastRoundResult.isCorrect
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-600'
              }`}
            >
              {engine.lastRoundResult.isCorrect
                ? t('house.correctAnswer', { n: engine.correctCount })
                : t('house.wrongAnswer', { n: engine.correctCount })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ════════════════════════════════════════════════════════════
          GAME AREA — The main visual stage
          ════════════════════════════════════════════════════════════ */}
      <div
        className="relative overflow-hidden rounded-2xl shadow-lg border border-zen-200"
        style={{ height: 380 }}
      >
        {/* Background: sky gradient + ground */}
        <div className="absolute inset-0 bg-gradient-to-b from-sky-100 via-sky-50 to-green-100" />
        <div className="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-green-300/60 to-transparent" />

        {/* ── Initial people (peek scene) ── */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          style={{ zIndex: 2, pointerEvents: 'none' }}
          animate={{ opacity: scene === 'peek' ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex flex-wrap justify-center gap-3 max-w-[340px]">
            {initialPeopleIcons.map(p => (
              <motion.img
                key={p.id}
                src={p.svg}
                alt="person"
                className="w-14 h-14 sm:w-16 sm:h-16 object-contain drop-shadow-md"
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: p.id * 0.12, duration: 0.3 }}
              />
            ))}
          </div>
        </motion.div>

        {/* ── Correct people (revealed scene) ── */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          style={{ zIndex: 2, pointerEvents: 'none' }}
          animate={{
            opacity: scene === 'revealed' ? 1 : 0,
            y: scene === 'revealed' ? 0 : 12,
          }}
          transition={{ duration: 0.4, delay: scene === 'revealed' ? 0.15 : 0 }}
        >
          <div className="flex flex-wrap justify-center gap-3 max-w-[380px]">
            {correctPeopleIcons.map(p => (
              <img
                key={p.id}
                src={p.svg}
                alt="person"
                className="w-12 h-12 sm:w-14 sm:h-14 object-contain drop-shadow-md"
              />
            ))}
          </div>
        </motion.div>

        {/* ── Movers (people walking in / out) ──
             z-index 5 → below house (z:10), naturally hidden behind it.
             Enter: slides from left edge → center (behind house).
             Leave: starts behind house → slides to right edge. */}
        <AnimatePresence>
          {movers.map(m => (
            <motion.div
              key={m.id}
              className="absolute"
              style={{
                top: `${50 + m.yOffset}%`, // Center roughly at 50% + offset
                zIndex: 5,
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
              }}
              // Enter: starts off-screen left (-14%), ends at center (48%) [stop earlier]
              // Leave: starts at center (52%), ends off-screen right (114%) [start later]
              initial={{ 
                left: m.direction === 'enter' ? '-14%' : '52%',
                opacity: m.direction === 'leave' ? 0 : 1, 
                scale: m.direction === 'leave' ? 0.8 : 1, 
              }}
              animate={{
                left: m.direction === 'enter' ? '30%' : '114%',
                opacity: m.direction === 'enter' 
                  ? [1, 1, 0] 
                  : [0, 1, 1, 0], 
                scale: m.direction === 'enter' 
                  ? [1, 1, 0.75] // Shrink a bit more on enter
                  : [0.75, 1, 1], // Grow from small on leave
              }}
              transition={{ 
                duration: MOVER_DURATION_S, 
                ease: 'linear',
                times: [0, 0.85, 1] // Fade out/in earlier/later near the door
              }}
              onAnimationComplete={() => removeMover(m.id)}
            >
              <div className="flex items-center -space-x-4"> {/* Negative overlap */}
                {m.icons.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt="person"
                    className="w-14 h-14 sm:w-18 sm:h-18 object-contain drop-shadow-md" 
                  />
                ))}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* ── House Mask ──
             A solid opaque panel covering the center 60% of the game area.
             Slides down from above to cover, slides back up to reveal.
             z-index 10 → above movers, hiding people walking behind it. */}
        <motion.div
          className="absolute overflow-hidden"
          style={{
            left: '25%', // Narrower width (50%)
            width: '50%',
            top: 0,
            bottom: 0,
            zIndex: 10,
          }}
          initial={false}
          animate={{ y: houseY }}
          transition={{
            duration: HOUSE_DROP_MS / 1000,
            ease: [0.4, 0, 0.2, 1],
          }}
        >
          {/* Transparent background - just the house image covers */}
          
          {/* House SVG image centered */}
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              src="/pic/house.svg"
              alt="house"
              className="w-40 h-40 sm:w-56 sm:h-56 object-contain drop-shadow-xl"
            />
          </div>

        </motion.div>
      </div>

      {/* ── Score ── */}
      <div className="bg-zen-100/50 backdrop-blur-sm rounded-xl p-2.5 font-mono text-xs text-zen-600 text-center">
        {t('house.score', { correct: correctSoFar, total: engine.roundResults.length })}
      </div>

      {/* ── Number Keypad (answering phase only) ── */}
      {engine.phase === 'answering' && (
        <motion.div
          className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-zen-200"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="text-center mb-3">
            <div className="text-xs text-zen-400 mb-1">{t('house.enterCount')}</div>
            <div className="text-4xl font-mono text-zen-700 h-12 flex items-center justify-center">
              {inputValue || '_'}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
              <button
                key={d}
                onClick={() => handleNumberInput(d.toString())}
                className="h-14 rounded-xl text-xl font-medium bg-zen-50 text-zen-700
                  hover:bg-zen-100 active:scale-95 active:bg-zen-200
                  transition-all duration-150"
              >
                {d}
              </button>
            ))}
            <button
              onClick={handleBackspace}
              className="h-14 rounded-xl text-sm font-medium bg-red-50 text-red-600
                hover:bg-red-100 active:scale-95 active:bg-red-200
                transition-all duration-150"
            >
              {t('game.delete')}
            </button>
            <button
              onClick={() => handleNumberInput('0')}
              className="h-14 rounded-xl text-xl font-medium bg-zen-50 text-zen-700
                hover:bg-zen-100 active:scale-95 active:bg-zen-200
                transition-all duration-150"
            >
              0
            </button>
            <button
              onClick={handleSubmit}
              disabled={inputValue === ''}
              className="h-14 rounded-xl text-sm font-medium bg-sage-500 text-white
                hover:bg-sage-600 active:scale-95 active:bg-sage-700
                transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {t('game.confirm')}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
