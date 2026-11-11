// ============================================================
// Brain Flow - Color Perception (色觉挑战) Game Engine Hook
// ============================================================
//
// Kuku-Kube-style shade discrimination: a grid of same-colored tiles
// with exactly one slightly different shade — tap it. Every level the
// grid can grow and the shade difference shrinks, pushing perception
// to its limit. Wrong tap ends the run; score = levels cleared.
//
// Personal best lives in localStorage (brain-flow-best:color-perception).

import { useCallback, useEffect, useRef, useState } from 'react';
import { ARCADE_LIVES, knobsFor, normalizeDifficulty, normalizeRunMode } from '../lib/arcadeDifficulty';
import type { NBackConfig, SessionSummary } from '../types/game';
import { useGameStore } from '../store/gameStore';
import { useSoundEffects } from './useSoundEffects';

export type ColorPerceptionPhase = 'idle' | 'playing' | 'finished';

export interface ColorLevel {
  gridSize: number;
  /** Index of the odd tile */
  oddIndex: number;
  /** CSS colors for the normal / odd tiles */
  baseColor: string;
  oddColor: string;
}

export interface ColorPerceptionResult {
  finalLevel: number;
  best: number;
  isNewBest: boolean;
  session: SessionSummary;
}

const BEST_KEY = 'brain-flow-best:color-perception';
/** Lightness gap of the odd tile per level — shrinks to a hard floor */
const deltaForLevel = (level: number): number => Math.max(3, 16 - level);
const gridSizeForLevel = (level: number): number => Math.min(6, 2 + Math.floor((level - 1) / 4));

function levelFor(level: number): ColorLevel {
  const gridSize = gridSizeForLevel(level);
  const total = gridSize * gridSize;
  const hue = Math.floor(Math.random() * 360);
  const sat = 45 + Math.random() * 25;
  const light = 45 + Math.random() * 18;
  const delta = deltaForLevel(level);
  const dir = Math.random() < 0.5 ? -1 : 1;
  const oddLight = Math.max(18, Math.min(88, light + dir * delta));
  return {
    gridSize,
    oddIndex: Math.floor(Math.random() * total),
    baseColor: `hsl(${hue} ${sat.toFixed(1)}% ${light.toFixed(1)}%)`,
    oddColor: `hsl(${hue} ${sat.toFixed(1)}% ${oddLight.toFixed(1)}%)`,
  };
}

function readBest(): number {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    if (raw === null) return 0;
    const v = JSON.parse(raw);
    return typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
  } catch {
    return 0;
  }
}

export function useColorPerceptionGame() {
  // Arcade difficulty system: fixed = 1 life, endless = 3 (miss replays the
  // same level); difficulty sets the starting level
  const runMode = normalizeRunMode(useGameStore((s) => s.arcadeModes.colorPerception?.runMode));
  const lives = ARCADE_LIVES[runMode];
  const knobs = knobsFor('colorPerception', normalizeDifficulty(useGameStore((s) => s.arcadeModes.colorPerception?.difficulty)));

  const [phase, setPhase] = useState<ColorPerceptionPhase>('idle');
  const [level, setLevel] = useState(1);
  const [livesLeft, setLivesLeft] = useState(lives);
  const livesRef = useRef(lives);
  const knobsRef = useRef(knobs);
  // keep refs fresh without writing them during render (React Compiler lint)
  useEffect(() => {
    knobsRef.current = knobs;
  });
  const [current, setCurrent] = useState<ColorLevel>(() => levelFor(1));
  const [wrongFlash, setWrongFlash] = useState(false);
  const [finalLevel, setFinalLevel] = useState(0);
  const [best, setBest] = useState(() => readBest());
  const [isNewBest, setIsNewBest] = useState(false);

  const levelRef = useRef(1);
  const savedRef = useRef(false);
  const { playClick, playWrong, playFinish, playRecord } = useSoundEffects();

  const finish = useCallback(() => {
    const cleared = levelRef.current - 1;
    const prevBest = readBest();
    const newBest = cleared > prevBest;
    if (newBest) {
      try { localStorage.setItem(BEST_KEY, JSON.stringify(cleared)); } catch { /* private mode */ }
    }
    setFinalLevel(cleared);
    setBest(newBest ? cleared : prevBest);
    setIsNewBest(newBest);
    if (newBest) playRecord(); else playFinish();

    const config: NBackConfig = {
      nLevel: 1, totalRounds: cleared, stimulusDuration: 0, interStimulusInterval: 0,
      stimulusType: 'number', mode: 'colorPerception', gridSize: 0,
    };
    const session: SessionSummary = {
      config,
      rounds: [],
      totalRounds: cleared,
      correctCount: cleared, incorrectCount: 1, missedCount: 0,
      hits: cleared, misses: 0, falseAlarms: 1, correctRejects: 0,
      accuracy: 100,
      avgReactionTimeMs: 0,
      durationMs: 0,
      timestamp: Date.now(),
    };
    if (!savedRef.current) {
      savedRef.current = true;
      useGameStore.getState().saveSession(session);
    }
    setPhase('finished');
  }, [playFinish, playRecord]);

  const start = useCallback(() => {
    levelRef.current = Math.max(1, knobsRef.current.startLevel);
    livesRef.current = lives;
    savedRef.current = false;
    setLevel(levelRef.current);
    setLivesLeft(lives);
    setCurrent(levelFor(levelRef.current));
    setWrongFlash(false);
    setFinalLevel(0);
    setIsNewBest(false);
    setPhase('playing');
  }, [lives]);

  const tap = useCallback((index: number) => {
    if (phase !== 'playing') return;
    if (index === current.oddIndex) {
      playClick();
      levelRef.current += 1;
      setLevel(levelRef.current);
      setCurrent(levelFor(levelRef.current));
    } else if (livesRef.current > 1) {
      // endless: lose a life, fresh board at the SAME level
      livesRef.current -= 1;
      setLivesLeft(livesRef.current);
      playWrong();
      setWrongFlash(true);
      setCurrent(levelFor(levelRef.current));
    } else {
      playWrong();
      setWrongFlash(true);
      finish();
    }
  }, [phase, current, finish, playClick, playWrong]);

  // Never fire anything after unmount (sounds are instant, nothing scheduled)
  useEffect(() => () => { savedRef.current = true; }, []);

  return { phase, level, current, wrongFlash, finalLevel, best, isNewBest, livesLeft, start, tap };
}
