// ============================================================
// Brain Flow - Core N-Back Game Engine Hook (Multi-Mode)
// ============================================================

import { useCallback, useRef, useState } from 'react';
import type {
  GamePhase,
  NBackConfig,
  RoundResult,
  SessionSummary,
  Stimulus,
  NumericStimulus,
  SpatialStimulus,
} from '../types/game';
import { DEFAULT_CONFIG } from '../types/game';

// ------------------------------------------------------------
// Helpers (pure functions – no React dependency)
// ------------------------------------------------------------

/**
 * Generate a random simple math equation.
 * Returns { equation: "3 + 5", answer: 8 }
 */
function generateEquation(): { equation: string; answer: number } {
  const operators = ['+', '-', '×'];
  const op = operators[Math.floor(Math.random() * operators.length)];
  
  let a: number, b: number, answer: number;
  
  if (op === '+') {
    a = Math.floor(Math.random() * 8) + 1; // 1-8
    b = Math.floor(Math.random() * 8) + 1;
    answer = a + b;
  } else if (op === '-') {
    // Ensure positive result
    a = Math.floor(Math.random() * 8) + 2; // 2-9
    b = Math.floor(Math.random() * (a - 1)) + 1; // 1 to a-1
    answer = a - b;
  } else { // ×
    a = Math.floor(Math.random() * 7) + 2; // 2-8
    b = Math.floor(Math.random() * 5) + 2; // 2-6
    answer = a * b;
  }
  
  return { equation: `${a} ${op} ${b}`, answer };
}

/**
 * Generate a random grid index for spatial mode
 */
function generateSpatialPosition(gridSize: number): number {
  const maxIndex = gridSize * gridSize - 1;
  return Math.floor(Math.random() * (maxIndex + 1));
}

/**
 * Pre-generate the full stimulus sequence for a session.
 */
export function generateSequence(config: NBackConfig): Stimulus[] {
  const { totalRounds, mode, gridSize } = config;
  const sequence: Stimulus[] = [];

  for (let i = 0; i < totalRounds; i++) {
    if (mode === 'numeric') {
      const { equation, answer } = generateEquation();
      sequence.push({
        type: 'numeric',
        index: i,
        equation,
        answer,
        presentedAt: 0,
      } as NumericStimulus);
    } else if (mode === 'spatial') {
      const gridIndex = generateSpatialPosition(gridSize);
      sequence.push({
        type: 'spatial',
        index: i,
        gridIndex,
        presentedAt: 0,
      } as SpatialStimulus);
    }
  }

  return sequence;
}

/**
 * Build a SessionSummary from the collected round results.
 */
export function buildSummary(
  config: NBackConfig,
  rounds: RoundResult[],
  startTime: number,
  endTime: number,
): SessionSummary {
  let correctCount = 0;
  let incorrectCount = 0;
  let missedCount = 0;
  let totalReactionTime = 0;
  let reactedCount = 0;

  for (const r of rounds) {
    if (r.userAnswer === null) {
      missedCount++;
    } else if (r.isCorrect) {
      correctCount++;
    } else {
      incorrectCount++;
    }

    if (r.reactionTimeMs !== null) {
      totalReactionTime += r.reactionTimeMs;
      reactedCount++;
    }
  }

  const accuracy =
    rounds.length > 0 ? (correctCount / rounds.length) * 100 : 0;
  const avgReactionTimeMs =
    reactedCount > 0 ? totalReactionTime / reactedCount : 0;

  return {
    config,
    rounds,
    totalRounds: rounds.length,
    correctCount,
    incorrectCount,
    missedCount,
    hits: correctCount, // For compatibility
    misses: missedCount,
    falseAlarms: incorrectCount,
    correctRejects: 0,
    accuracy: Math.round(accuracy * 10) / 10,
    avgReactionTimeMs: Math.round(avgReactionTimeMs),
    durationMs: endTime - startTime,
  };
}

// ------------------------------------------------------------
// Hook Return Type
// ------------------------------------------------------------

export interface UseNBackReturn {
  /** Current game lifecycle phase */
  phase: GamePhase;
  /** The full pre-generated stimulus sequence */
  sequence: Stimulus[];
  /** Index of the current round (0-based) */
  currentIndex: number;
  /** The stimulus currently being shown (null when idle / between stimuli) */
  currentStimulus: Stimulus | null;
  /** The N-Back target stimulus (i - N), null if not enough history */
  nBackTarget: Stimulus | null;
  /** All round results so far */
  results: RoundResult[];
  /** Session summary (only populated when finished) */
  summary: SessionSummary | null;
  /** Active config */
  config: NBackConfig;
  /** Whether the user has already answered this round */
  hasAnsweredThisRound: boolean;
  /** Whether stimulus is currently visible (for spatial mode input locking) */
  isStimulusVisible: boolean;
  /** Last submit result (for showing correct/incorrect feedback) */
  lastSubmitResult: { isCorrect: boolean; correctAnswer: number } | null;

  // Actions
  startGame: (overrides?: Partial<NBackConfig>) => void;
  submitAnswer: (answer: number) => void;
  advanceToNext: () => void;
  startAnswering: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: () => void;
  resetGame: () => void;
  setStimulusVisible: (visible: boolean) => void;
}

// ------------------------------------------------------------
// The Hook
// ------------------------------------------------------------

export function useNBack(): UseNBackReturn {
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [config, setConfig] = useState<NBackConfig>(DEFAULT_CONFIG);
  const [sequence, setSequence] = useState<Stimulus[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [hasAnsweredThisRound, setHasAnsweredThisRound] = useState(false);
  const [isStimulusVisible, setIsStimulusVisible] = useState(true);
  const [lastSubmitResult, setLastSubmitResult] = useState<{ isCorrect: boolean; correctAnswer: number } | null>(null);

  // Refs for timing (not reactive – we only read them in callbacks)
  const startTimeRef = useRef<number>(0);
  const stimulusPresentedAtRef = useRef<number>(0);

  // ---- Derived values ----
  const currentStimulus =
    currentIndex >= 0 && currentIndex < sequence.length
      ? sequence[currentIndex]
      : null;

  const nBackTarget =
    currentIndex >= config.nLevel && currentIndex < sequence.length
      ? sequence[currentIndex - config.nLevel]
      : null;

  // ---- Actions ----

  const startGame = useCallback(
    (overrides?: Partial<NBackConfig>) => {
      const merged: NBackConfig = { ...DEFAULT_CONFIG, ...overrides };
      setConfig(merged);

      const seq = generateSequence(merged);
      // Stamp the first stimulus's presentedAt
      const now = Date.now();
      seq[0] = { ...seq[0], presentedAt: now };

      setSequence(seq);
      setCurrentIndex(0);
      setResults([]);
      setSummary(null);
      setHasAnsweredThisRound(false);
      setLastSubmitResult(null);
      startTimeRef.current = now;
      stimulusPresentedAtRef.current = now;
      setPhase('playing');
    },
    [],
  );

  const submitAnswer = useCallback(
    (answer: number) => {
      if (phase !== 'answering' || currentIndex < config.nLevel || hasAnsweredThisRound) return;

      const now = Date.now();
      const targetIndex = currentIndex - config.nLevel;
      const targetStimulus = sequence[targetIndex];
      
      // Determine correct answer based on mode
      let correctAnswer: number;
      let isCorrect: boolean;
      
      if (targetStimulus.type === 'numeric') {
        correctAnswer = targetStimulus.answer;
        isCorrect = answer === correctAnswer;
      } else {
        correctAnswer = targetStimulus.gridIndex;
        isCorrect = answer === correctAnswer;
      }
      
      const reactionTimeMs = now - stimulusPresentedAtRef.current;

      const result: RoundResult = {
        targetStimulusIndex: targetIndex,
        targetEquation: targetStimulus.type === 'numeric' ? targetStimulus.equation : undefined,
        targetGridIndex: targetStimulus.type === 'spatial' ? targetStimulus.gridIndex : undefined,
        correctAnswer,
        userAnswer: answer,
        isCorrect,
        reactionTimeMs,
      };

      setResults((prev) => [...prev, result]);
      setHasAnsweredThisRound(true);
      setLastSubmitResult({ isCorrect, correctAnswer });
    },
    [phase, currentIndex, sequence, config.nLevel, hasAnsweredThisRound],
  );

  const advanceToNext = useCallback(() => {
    // 记忆阶段：只在playing状态下推进
    if (phase === 'playing') {
      const nextIndex = currentIndex + 1;
      
      // 检查是否记忆阶段结束（已经展示了N题）
      if (nextIndex >= config.nLevel) {
        // 记忆阶段结束，等待开始答题
        setPhase('waitingToAnswer');
        setCurrentIndex(nextIndex);
        return;
      }
      
      // 继续记忆阶段
      const now = Date.now();
      setSequence((prev) => {
        const updated = [...prev];
        updated[nextIndex] = { ...updated[nextIndex], presentedAt: now };
        return updated;
      });
      stimulusPresentedAtRef.current = now;
      setCurrentIndex(nextIndex);
      setIsStimulusVisible(true);
      return;
    }
    
    // 答题阶段：只在answering状态下推进
    if (phase !== 'answering') return;

    // If the user didn't answer and we're past the warmup rounds, record a miss
    // 只要 currentIndex >= config.nLevel，就应该记录miss（包括回答阶段）
    const targetIndex = currentIndex - config.nLevel;
    // 检查是否已经有该目标题目的结果（防止自动提交后重复记录）
    const alreadyAnswered = results.some(r => r.targetStimulusIndex === targetIndex);
    
    if (!hasAnsweredThisRound && !alreadyAnswered && currentIndex >= config.nLevel && targetIndex < sequence.length) {
      const targetStimulus = sequence[targetIndex];
      
      // Determine correct answer based on mode
      const correctAnswer = targetStimulus.type === 'numeric' 
        ? targetStimulus.answer 
        : targetStimulus.gridIndex;
      
      const missResult: RoundResult = {
        targetStimulusIndex: targetIndex,
        targetEquation: targetStimulus.type === 'numeric' ? targetStimulus.equation : undefined,
        targetGridIndex: targetStimulus.type === 'spatial' ? targetStimulus.gridIndex : undefined,
        correctAnswer,
        userAnswer: null,
        isCorrect: false,
        reactionTimeMs: null,
      };
      setResults((prev) => [...prev, missResult]);
    }

    const nextIndex = currentIndex + 1;
    // 计算实际需要回答的题目数量（原始题目数）
    const actualQuestions = config.totalRounds;
    // 游戏需要运行的总轮数：原始题目数 + N（让玩家有机会回答最后N道题）
    const totalRoundsWithAnswerPhase = actualQuestions + config.nLevel;

    if (nextIndex >= totalRoundsWithAnswerPhase) {
      // Game finished - 所有题目（包括最后N道）都已被回答
      const endTime = Date.now();
      setPhase('finished');
      setCurrentIndex(nextIndex);

      // Build summary with final results
      setResults((prevResults) => {
        const finalSummary = buildSummary(
          config,
          prevResults,
          startTimeRef.current,
          endTime,
        );
        setSummary(finalSummary);
        return prevResults;
      });
    } else if (nextIndex >= sequence.length) {
      // 已经展示完所有题目，现在是回答阶段（不再显示新题目）
      // 但玩家仍需要回答最后N道题
      stimulusPresentedAtRef.current = Date.now();
      setCurrentIndex(nextIndex);
      setHasAnsweredThisRound(false);
      setIsStimulusVisible(true); // 重置stimulus可见性
      setLastSubmitResult(null); // 重置提交结果
    } else {
      // Advance to next question in answering phase
      const now = Date.now();
      setSequence((prev) => {
        const updated = [...prev];
        updated[nextIndex] = { ...updated[nextIndex], presentedAt: now };
        return updated;
      });
      stimulusPresentedAtRef.current = now;
      setCurrentIndex(nextIndex);
      setHasAnsweredThisRound(false);
      setIsStimulusVisible(true); // 重置stimulus可见性，为下一轮做准备
      setLastSubmitResult(null); // 重置提交结果
    }
  }, [phase, currentIndex, sequence, config, hasAnsweredThisRound, results]);

  const pauseGame = useCallback(() => {
    if (phase === 'playing' || phase === 'answering') setPhase('paused');
  }, [phase]);

  const startAnswering = useCallback(() => {
    if (phase === 'waitingToAnswer') {
      setPhase('answering');
      stimulusPresentedAtRef.current = Date.now();
    }
  }, [phase]);

  const resumeGame = useCallback(() => {
    if (phase === 'paused') {
      stimulusPresentedAtRef.current = Date.now();
      // 恢复到answering状态（因为playing阶段不应该暂停）
      setPhase('answering');
    }
  }, [phase]);

  const endGame = useCallback(() => {
    const endTime = Date.now();
    setPhase('finished');
    setResults((prevResults) => {
      const finalSummary = buildSummary(
        config,
        prevResults,
        startTimeRef.current,
        endTime,
      );
      setSummary(finalSummary);
      return prevResults;
    });
  }, [config]);

  const resetGame = useCallback(() => {
    setPhase('idle');
    setSequence([]);
    setCurrentIndex(-1);
    setResults([]);
    setSummary(null);
    setHasAnsweredThisRound(false);
    setIsStimulusVisible(true);
    setLastSubmitResult(null);
  }, []);

  const setStimulusVisible = useCallback((visible: boolean) => {
    setIsStimulusVisible(visible);
  }, []);

  return {
    phase,
    sequence,
    currentIndex,
    currentStimulus,
    nBackTarget,
    results,
    summary,
    config,
    hasAnsweredThisRound,
    isStimulusVisible,
    lastSubmitResult,
    startGame,
    submitAnswer,
    advanceToNext,
    startAnswering,
    pauseGame,
    resumeGame,
    endGame,
    resetGame,
    setStimulusVisible,
  };
}
