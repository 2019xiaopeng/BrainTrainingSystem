// ============================================================
// Brain Flow - House Game Engine Hook (人来人往 / House Flow)
// ============================================================
//
// Dynamic Running Counter game:
// - House starts with N people
// - Events of people entering/leaving occur
// - Player must track and report final count
//
// Phases: idle → showing → events → answering → feedback → (next round or finished)

import { useCallback, useRef, useState } from 'react';
import type {
  HouseGameConfig,
  HouseEvent,
  HouseRoundResult,
  SessionSummary,
} from '../types/game';

// Re-use the NBack summary structure for compatibility with ResultScreen
function buildHouseSummary(
  config: HouseGameConfig,
  roundResults: HouseRoundResult[],
  startTime: number,
  endTime: number,
): SessionSummary {
  const correctCount = roundResults.filter(r => r.isCorrect).length;
  const incorrectCount = roundResults.filter(r => !r.isCorrect && r.userAnswer !== null).length;
  const missedCount = roundResults.filter(r => r.userAnswer === null).length;
  const accuracy = roundResults.length > 0
    ? Math.round((correctCount / roundResults.length) * 1000) / 10
    : 0;

  return {
    config: {
      nLevel: 1,
      totalRounds: config.totalRounds,
      stimulusDuration: 0,
      interStimulusInterval: 0,
      stimulusType: 'number',
      mode: 'house',
      gridSize: 0,
    },
    rounds: roundResults.map((r, i) => ({
      targetStimulusIndex: i,
      correctAnswer: r.correctCount,
      userAnswer: r.userAnswer,
      isCorrect: r.isCorrect,
      reactionTimeMs: null,
    })),
    totalRounds: roundResults.length,
    correctCount,
    incorrectCount,
    missedCount,
    hits: correctCount,
    misses: missedCount,
    falseAlarms: incorrectCount,
    correctRejects: 0,
    accuracy,
    avgReactionTimeMs: 0,
    durationMs: endTime - startTime,
  };
}

/** Generate random atomic events for one round */
function generateEvents(
  initialPeople: number,
  eventCount: number,
  delayRange: [number, number],
): HouseEvent[] {
  const events: HouseEvent[] = [];
  let currentCount = initialPeople;
  const maxPeople = 15; // Soft cap to prevent overflow

  for (let i = 0; i < eventCount; i++) {
    // Determine possible actions
    const canLeave = currentCount > 0;
    
    // Probabilities
    const isCrowded = currentCount >= 8;
    const isSparse = currentCount <= 3;
    
    let enterCount = 0;
    let leaveCount = 0;

    // Decide if we do Enter, Leave, or Both (Concurrent)
    const rand = Math.random();
    
    // 20% chance of concurrent (if possible), 40% enter, 40% leave
    // Adjusted by crowding
    let actionType: 'enter' | 'leave' | 'both' = 'enter';

    if (canLeave) {
      if (rand < 0.2) actionType = 'both';
      else if (rand < 0.6) actionType = isCrowded ? 'leave' : 'enter';
      else actionType = isSparse ? 'enter' : 'leave';
    } else {
      actionType = 'enter';
    }

    // Helper to get random count (1-5)
    // 1: 40%, 2: 30%, 3: 20%, 4-5: 10%
    const getCount = (limit: number) => {
      const r = Math.random();
      let c = 1;
      if (r > 0.4) c = 2;
      if (r > 0.7) c = 3;
      if (r > 0.9) c = Math.random() < 0.5 ? 4 : 5;
      return Math.min(c, limit);
    };

    if (actionType === 'enter' || actionType === 'both') {
      const maxEnter = maxPeople - currentCount + (actionType === 'both' ? 1 : 0); 
      if (maxEnter > 0) {
        enterCount = getCount(maxEnter);
      }
    }

    if (actionType === 'leave' || actionType === 'both') {
      const maxLeave = currentCount;
      if (maxLeave > 0) {
        leaveCount = getCount(maxLeave);
      }
    }

    // Constraint: enterCount != leaveCount if both > 0
    if (enterCount > 0 && leaveCount > 0 && enterCount === leaveCount) {
      // Adjust one of them
      if (Math.random() < 0.5) {
        // Change enter
        enterCount = enterCount === 1 ? 2 : 1; 
      } else {
        // Change leave
        leaveCount = leaveCount === 1 ? 2 : 1;
      }
    }
    
    // Ensure we don't go negative (double check)
    if (currentCount - leaveCount < 0) {
      leaveCount = currentCount;
    }

    // If both became 0 for some reason, force an enter
    if (enterCount === 0 && leaveCount === 0) {
      enterCount = 1;
    }

    // Random delay based on speed setting
    const [minDelay, maxDelay] = delayRange;
    const delayMs = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

    events.push({ index: i, enterCount, leaveCount, delayMs });
    
    // Update tracking count
    currentCount = currentCount - leaveCount + enterCount;
  }

  return events;
}

// ---- Phase type ----
export type HousePhase = 'idle' | 'showing' | 'events' | 'answering' | 'revealing' | 'feedback' | 'finished';

// ---- Hook Return Type ----
export interface UseHouseGameReturn {
  phase: HousePhase;
  config: HouseGameConfig;
  /** Current round (0-based) */
  currentRound: number;
  /** Initial people count for current round */
  initialPeople: number;
  /** Atomic events for the current round */
  events: HouseEvent[];
  /** Index of current event being animated (-1 = not started) */
  currentEventIndex: number;
  /** Round results so far */
  roundResults: HouseRoundResult[];
  /** Last round result (for feedback) */
  lastRoundResult: HouseRoundResult | null;
  /** Final session summary */
  summary: SessionSummary | null;
  /** The correct final count for the current round */
  correctCount: number;

  // Actions
  startGame: (config: HouseGameConfig) => void;
  /** Called when the "showing" phase intro is done, start events */
  startEvents: () => void;
  /** Advance to next event (called by animation timer) */
  advanceEvent: () => void;
  /** Submit answer for current round */
  submitAnswer: (answer: number) => void;
  /** Finish reveal animation and finalize round result */
  finishReveal: () => void;
  /** Move to next round after feedback */
  nextRound: () => void;
  resetGame: () => void;
}

export function useHouseGame(): UseHouseGameReturn {
  const [phase, setPhase] = useState<HousePhase>('idle');
  const [config, setConfig] = useState<HouseGameConfig>({
    initialPeople: 3,
    eventCount: 5,
    delayRange: [1200, 2000],
    totalRounds: 3,
  });
  const [currentRound, setCurrentRound] = useState(0);
  const [initialPeople, setInitialPeople] = useState(3);
  const [events, setEvents] = useState<HouseEvent[]>([]);
  const [currentEventIndex, setCurrentEventIndex] = useState(-1);
  const [roundResults, setRoundResults] = useState<HouseRoundResult[]>([]);
  const [lastRoundResult, setLastRoundResult] = useState<HouseRoundResult | null>(null);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [pendingAnswer, setPendingAnswer] = useState<number | null>(null);

  const startTimeRef = useRef(0);

  /** Set up a new round */
  const setupRound = useCallback((cfg: HouseGameConfig, roundIdx: number) => {
    const init = cfg.initialPeople;
    const evts = generateEvents(init, cfg.eventCount, cfg.delayRange);

    // Calculate correct final count
    let count = init;
    for (const e of evts) {
      count = count - e.leaveCount + e.enterCount;
    }

    setInitialPeople(init);
    setEvents(evts);
    setCurrentEventIndex(-1);
    setCorrectCount(count);
    setCurrentRound(roundIdx);
    setLastRoundResult(null);
    setPendingAnswer(null);
    setPhase('showing');
  }, []);

  const startGame = useCallback((cfg: HouseGameConfig) => {
    setConfig(cfg);
    setRoundResults([]);
    setSummary(null);
    startTimeRef.current = Date.now();
    setupRound(cfg, 0);
  }, [setupRound]);

  const startEvents = useCallback(() => {
    if (phase !== 'showing') return;
    setPhase('events');
    setCurrentEventIndex(0);
  }, [phase]);

  const advanceEvent = useCallback(() => {
    if (phase !== 'events') return;

    const nextIdx = currentEventIndex + 1;
    if (nextIdx >= events.length) {
      // All events done, go to answering
      // Add a small delay after last event before showing keypad
      setTimeout(() => setPhase('answering'), 1000);
      return;
    }

    setCurrentEventIndex(nextIdx);
  }, [phase, currentEventIndex, events]);

  const submitAnswer = useCallback((answer: number) => {
    if (phase !== 'answering') return;
    setPendingAnswer(answer);
    setPhase('revealing');
  }, [phase, correctCount, events, initialPeople]);

  const finishReveal = useCallback(() => {
    if (phase !== 'revealing' || pendingAnswer === null) return;

    const isCorrect = pendingAnswer === correctCount;
    const result: HouseRoundResult = {
      correctCount,
      userAnswer: pendingAnswer,
      isCorrect,
      events,
      initialPeople,
    };

    setLastRoundResult(result);
    setRoundResults(prev => [...prev, result]);
    setPhase('feedback');
  }, [phase, pendingAnswer, correctCount, events, initialPeople]);

  const nextRound = useCallback(() => {
    if (phase !== 'feedback') return;

    const nextRoundIdx = currentRound + 1;
    if (nextRoundIdx >= config.totalRounds) {
      // Game finished
      const endTime = Date.now();
      setPhase('finished');

      // Build summary with all results including the just-added one
      setRoundResults(prev => {
        const finalSummary = buildHouseSummary(config, prev, startTimeRef.current, endTime);
        setSummary(finalSummary);
        return prev;
      });
    } else {
      setupRound(config, nextRoundIdx);
    }
  }, [phase, currentRound, config, setupRound]);

  const resetGame = useCallback(() => {
    setPhase('idle');
    setEvents([]);
    setCurrentEventIndex(-1);
    setRoundResults([]);
    setLastRoundResult(null);
    setSummary(null);
    setCorrectCount(0);
    setPendingAnswer(null);
  }, []);

  return {
    phase,
    config,
    currentRound,
    initialPeople,
    events,
    currentEventIndex,
    roundResults,
    lastRoundResult,
    summary,
    correctCount,
    startGame,
    startEvents,
    advanceEvent,
    submitAnswer,
    finishReveal,
    nextRound,
    resetGame,
  };
}
