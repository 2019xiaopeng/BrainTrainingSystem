import React, { useState, useEffect, useRef } from 'react';
import { LevelConfig, GameResult, GameType } from '../types';

interface GameViewProps {
  level: LevelConfig;
  onComplete: (result: GameResult) => void;
  onExit: () => void;
}

// --- SUB-COMPONENTS FOR SPECIFIC GAMES ---

// 1. NUMERIC FLOW
const NumericGame = ({ level, onResult }: { level: LevelConfig, onResult: (correct: boolean) => void }) => {
  const [round, setRound] = useState(1);
  const [history, setHistory] = useState<number[]>([]); // Answers history
  const [currentProblem, setCurrentProblem] = useState<{a:number, b:number, ans:number} | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showTutorialHint, setShowTutorialHint] = useState(false); // For Round 2 tutorial

  // Generate problem
  const nextRound = () => {
    const a = Math.floor(Math.random() * 9);
    const b = Math.floor(Math.random() * (9 - a));
    const ans = a + b;
    setCurrentProblem({ a, b, ans });
    setInputValue('');
    setFeedback(null);
    setShowTutorialHint(false);

    // Tutorial Round 1 logic: Auto advance after showing
    if (level.tutorial && round === 1) {
      setTimeout(() => {
        setHistory([ans]);
        setRound(2);
      }, 3000);
    }
  };

  useEffect(() => { nextRound(); }, []);

  // UseEffect to trigger next round in tutorial 1 is handled above in nextRound logic for simplicity,
  // but react strict mode might double fire, so better to separate.
  useEffect(() => {
     if (level.tutorial && round === 1 && currentProblem) {
         // Force "Remember this" UI
     }
     if (level.tutorial && round === 2) {
         setShowTutorialHint(true);
     }
  }, [round, currentProblem]);

  const handleSubmit = () => {
    if (!currentProblem) return;

    // In N-Back 1, we match the answer from 1 step ago.
    // History[0] is the answer to Round 1. We are in Round 2.
    // So target is history[round - 1 - n].
    // Tutorial: Round 2 (index 1). Target is Round 1 (index 0).
    const targetIndex = history.length - level.n;
    
    // Tutorial override logic
    if (level.tutorial && round === 1) return; // Cannot submit in observation round

    const val = parseInt(inputValue);
    const target = history[targetIndex];

    const isCorrect = val === target;
    setFeedback(isCorrect ? 'correct' : 'wrong');

    setTimeout(() => {
        setHistory(prev => [...prev, currentProblem.ans]);
        onResult(isCorrect);
        setRound(r => r + 1);
        nextRound();
    }, 1000);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full">
       <div className="text-6xl font-light text-slate-800 mb-12 flex gap-4">
          <span>{currentProblem?.a}</span>
          <span className="text-slate-400">+</span>
          <span>{currentProblem?.b}</span>
       </div>

       {level.tutorial && round === 1 && (
           <div className="absolute inset-0 bg-[#faf8ef]/90 flex flex-col items-center justify-center z-10 backdrop-blur-sm">
               <div className="text-6xl font-bold text-[#7a9584] mb-4 animate-bounce">{currentProblem?.ans}</div>
               <p className="text-slate-500 font-bold">记住这个答案</p>
           </div>
       )}

       <div className="relative">
           {showTutorialHint && (
               <div className="absolute -top-16 left-1/2 -translate-x-1/2 text-nowrap text-sm bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full animate-bounce font-bold shadow-sm">
                   输入第 1 轮的答案 ({history[history.length - level.n]})
               </div>
           )}
           <input 
             type="number" 
             value={inputValue}
             onChange={e => setInputValue(e.target.value)}
             className={`text-center text-4xl p-4 border-b-2 border-slate-300 w-40 focus:outline-none focus:border-[#7a9584] bg-transparent font-bold
                ${feedback === 'correct' ? 'text-green-500 border-green-500' : ''}
                ${feedback === 'wrong' ? 'text-red-500 border-red-500' : ''}
             `}
             placeholder="?"
             autoFocus
           />
       </div>

       <div className="grid grid-cols-3 gap-4 mt-12">
          {[1,2,3,4,5,6,7,8,9,0].map(n => (
              <button 
                key={n} 
                onClick={() => setInputValue(n.toString())}
                className="w-16 h-16 rounded-2xl bg-white border border-[#ece8dc] text-2xl font-bold text-slate-600 shadow-sm active:bg-slate-50 hover:border-[#d6d3c4] transition-all"
              >
                  {n}
              </button>
          ))}
       </div>
       
       <button onClick={handleSubmit} className="mt-12 px-12 py-4 bg-[#7a9584] text-white rounded-2xl shadow-lg font-bold text-lg active:scale-95 transition-transform">
           提交
       </button>
    </div>
  )
};

// 2. SPATIAL FLOW (Refined)
const SpatialGame = ({ level, onResult }: { level: LevelConfig, onResult: (correct: boolean) => void }) => {
    const [sequence, setSequence] = useState<number[]>([]);
    const [step, setStep] = useState(0);
    const [activeCell, setActiveCell] = useState<number | null>(null);
    const [feedback, setFeedback] = useState<'hit' | 'miss' | null>(null);

    // Initialize
    useEffect(() => {
        const seq = Array.from({length: level.trials + level.n}, () => Math.floor(Math.random() * 9));
        setSequence(seq);
    }, [level]);

    // Loop
    useEffect(() => {
        if (sequence.length === 0) return;
        if (step >= sequence.length) return; // End handled by parent

        setActiveCell(sequence[step]);
        setFeedback(null);

        const timer = setTimeout(() => {
            setActiveCell(null);
            setTimeout(() => {
                setStep(s => s + 1);
            }, 500); 
        }, level.interval || 2000);

        return () => clearTimeout(timer);
    }, [step, sequence]);

    const handleInput = (cellIdx: number) => {
        if (step < level.n) return; // Tutorial constraint: Don't click yet

        const target = sequence[step - level.n];
        const isCorrect = cellIdx === target;
        setFeedback(isCorrect ? 'hit' : 'miss');
        onResult(isCorrect);
    };

    return (
        <div className="flex flex-col items-center justify-center h-full">
            {level.tutorial && step < level.n && (
                <div className="absolute top-24 bg-slate-800 text-white px-6 py-2 rounded-full z-20 animate-pulse font-bold shadow-lg">
                    观察并记忆位置
                </div>
            )}
            {level.tutorial && step === level.n && !feedback && (
                <div className="absolute top-24 bg-[#7a9584] text-white px-6 py-2 rounded-full z-20 animate-bounce font-bold shadow-lg">
                    点击 {level.n} 回合前亮起的位置！
                </div>
            )}

            <div className="grid grid-cols-3 gap-4 p-6 bg-white rounded-3xl shadow-xl border border-[#ece8dc] relative">
                {Array.from({ length: 9 }).map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => handleInput(idx)}
                        disabled={step < level.n}
                        className={`
                            w-20 h-20 rounded-2xl transition-all duration-200 border-2
                            ${activeCell === idx ? 'bg-[#7a9584] border-[#7a9584] shadow-[0_0_20px_rgba(122,149,132,0.6)] scale-105 z-10' : 'bg-[#faf8ef] border-[#f5f2e9]'}
                            ${feedback === 'hit' && idx === sequence[step-level.n] ? 'bg-green-500 border-green-500' : ''}
                            ${feedback === 'miss' && idx !== sequence[step-level.n] ? 'bg-red-100 border-red-200' : ''}
                            ${level.tutorial && step === level.n && idx === sequence[step-level.n] ? 'ring-4 ring-yellow-400 ring-offset-2' : ''} 
                        `}
                    >
                        {/* Ghost Icon for tutorial hint */}
                        {level.tutorial && step === level.n && idx === sequence[step-level.n] && (
                            <span className="text-3xl opacity-50">📍</span>
                        )}
                    </button>
                ))}
            </div>
            
            <div className="mt-12 text-[#9ca3af] text-sm font-bold tracking-widest uppercase">
                {step < level.n ? "记忆阶段" : "回忆阶段"}
            </div>
        </div>
    );
}

// 3. MOUSE GAME
const MouseGame = ({ level, onResult }: { level: LevelConfig, onResult: (correct: boolean) => void }) => {
    const [phase, setPhase] = useState<'SHOW' | 'MOVE' | 'INPUT'>('SHOW');
    const [micePositions, setMicePositions] = useState<number[]>([]);
    const [targetPositions, setTargetPositions] = useState<number[]>([]);
    const [userSelections, setUserSelections] = useState<number[]>([]);

    const GRID_W = 4;
    const GRID_H = 3;

    const startRound = () => {
        setPhase('SHOW');
        setUserSelections([]);
        // Init random positions
        const starts = Array.from({length: level.n}, () => Math.floor(Math.random() * (GRID_W * GRID_H)));
        setMicePositions(starts);
        
        setTimeout(() => {
            setPhase('MOVE');
            // Calc targets (random move)
            const ends = starts.map(p => {
                // Simple logic: move to random neighbor or stay
                // For simplicity in this demo: just random new pos
                return Math.floor(Math.random() * (GRID_W * GRID_H));
            });
            setTargetPositions(ends);

            // Animate (Wait for move simulation)
            setTimeout(() => {
                setMicePositions(ends); // Actually move them state-wise
                setPhase('INPUT');
            }, 2000); // 2s movement
        }, 1500); // 1.5s preview
    };

    useEffect(() => { startRound(); }, []);

    const handleCellClick = (idx: number) => {
        if (phase !== 'INPUT') return;
        if (userSelections.includes(idx)) return;

        const newSelections = [...userSelections, idx];
        setUserSelections(newSelections);

        if (newSelections.length === level.n) {
            // Check result
            const correctCount = newSelections.filter(s => targetPositions.includes(s)).length;
            const success = correctCount === level.n;
            onResult(success);
            
            setTimeout(startRound, 1500);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full">
            {phase === 'SHOW' && <div className="text-xl font-bold text-slate-700 mb-6 animate-pulse">记住初始位置</div>}
            {phase === 'MOVE' && <div className="text-xl font-bold text-slate-700 mb-6">追踪移动中...</div>}
            {phase === 'INPUT' && <div className="text-xl font-bold text-[#7a9584] mb-6">它们去哪了？</div>}

            <div className="grid grid-cols-4 gap-3 bg-[#e6e2d6] p-4 rounded-2xl relative overflow-hidden">
                {/* Overlay Mask for Tutorial Phase 2/Hard Mode */}
                {!level.tutorial && phase === 'MOVE' && (
                    <div className="absolute inset-0 bg-slate-800 z-10 flex items-center justify-center opacity-90 text-white rounded-xl">
                        <span className="animate-pulse font-bold">追踪隐形信号...</span>
                    </div>
                )}

                {Array.from({ length: 12 }).map((_, idx) => {
                    const isMouseHere = phase !== 'INPUT' && micePositions.includes(idx);
                    const isSelected = userSelections.includes(idx);
                    const isTarget = phase === 'INPUT' && userSelections.length === level.n && targetPositions.includes(idx); // Reveal on end

                    return (
                        <div 
                            key={idx}
                            onClick={() => handleCellClick(idx)}
                            className={`
                                w-16 h-16 bg-[#faf8ef] rounded-xl flex items-center justify-center text-2xl border-2 transition-all
                                ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-[#faf8ef]'}
                                ${isTarget ? 'bg-green-100 ring-2 ring-green-500' : ''}
                            `}
                        >
                            {isMouseHere && <span className="animate-bounce">🐭</span>}
                            {isSelected && !isTarget && <span>❓</span>}
                            {phase === 'INPUT' && isTarget && <span>🐭</span>} {/* Reveal */}
                        </div>
                    )
                })}
            </div>
        </div>
    );
};

// 4. HOUSE GAME
const HouseGame = ({ level, onResult }: { level: LevelConfig, onResult: (correct: boolean) => void }) => {
    const [count, setCount] = useState(3); // Initial people
    const [displayCount, setDisplayCount] = useState<number | null>(3);
    const [delta, setDelta] = useState<number | null>(null);
    const [phase, setPhase] = useState<'WATCH' | 'INPUT'>('WATCH');
    const [eventIdx, setEventIdx] = useState(0);
    const [inputValue, setInputValue] = useState('');

    const events = [2, -1, 3, -2, 1]; // Fixed sequence for demo or random
    const currentEvents = events.slice(0, level.trials);

    useEffect(() => {
        if (eventIdx >= currentEvents.length) {
            setPhase('INPUT');
            setDisplayCount(null); // Hide answer
            return;
        }

        const runEvent = () => {
            setDelta(null);
            // 1. Pause showing current count (Tutorial) or just wait
            setTimeout(() => {
                // 2. Show Delta
                const d = currentEvents[eventIdx];
                setDelta(d);
                setCount(c => c + d);
                
                // Tutorial: Update display count to show math
                if (level.tutorial) {
                    setDisplayCount(c => (c||0) + d);
                } else {
                    setDisplayCount(null); // Hide in real game
                }

                // 3. Clear delta and next
                setTimeout(() => {
                    setDelta(null);
                    setEventIdx(i => i + 1);
                }, 2000);

            }, 1000);
        };
        runEvent();
    }, [eventIdx, level.tutorial]);

    const submit = () => {
        const correct = parseInt(inputValue) === count;
        onResult(correct);
    };

    return (
        <div className="flex flex-col items-center justify-center h-full">
            <div className="relative w-64 h-64 bg-white border-4 border-slate-700 rounded-t-full flex items-end justify-center overflow-hidden mb-8 shadow-2xl">
                {/* House Graphic */}
                <div className="absolute inset-x-0 bottom-0 h-4 bg-slate-200"></div>
                
                {/* Door */}
                <div className={`w-20 h-32 bg-slate-600 rounded-t-lg transition-all duration-500 ${delta !== null ? 'scale-x-110 bg-slate-500' : ''}`}></div>

                {/* People inside representation (abstract) */}
                <div className="absolute top-10 text-4xl font-bold text-slate-300">
                    {phase === 'WATCH' && level.tutorial ? displayCount : '?'} 
                    <span className="text-sm block text-center text-slate-400 mt-1">人数</span>
                </div>

                {/* Animation Overlay */}
                {delta !== null && (
                    <div className={`
                        absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                        text-6xl font-bold animate-ping
                        ${delta > 0 ? 'text-green-500' : 'text-red-500'}
                    `}>
                        {delta > 0 ? `+${delta}` : delta}
                    </div>
                )}
            </div>

            {phase === 'WATCH' && <div className="text-slate-500 animate-pulse font-bold">观察进出...</div>}

            {phase === 'INPUT' && (
                <div className="flex flex-col items-center gap-4 animate-fadeIn">
                    <p className="font-bold text-slate-700">现在里面有多少人？</p>
                    <input 
                        type="number" 
                        value={inputValue} 
                        onChange={e => setInputValue(e.target.value)}
                        className="text-center text-3xl p-3 border rounded-xl w-32 focus:border-[#7a9584] focus:outline-none" 
                        autoFocus
                    />
                    <button onClick={submit} className="bg-[#7a9584] text-white px-8 py-3 rounded-xl font-bold shadow-lg">确认</button>
                </div>
            )}
        </div>
    );
};


// --- MAIN CONTROLLER ---

const GameView: React.FC<GameViewProps> = ({ level, onComplete, onExit }) => {
  const [score, setScore] = useState(0);
  const [roundsPlayed, setRoundsPlayed] = useState(0);

  // Unified Result Handler
  const handleRoundResult = (isCorrect: boolean) => {
      if (isCorrect) setScore(s => s + 1);
      
      const nextRound = roundsPlayed + 1;
      setRoundsPlayed(nextRound);

      // Check Completion
      // For some games (Spatial) the component handles the loop, but for others (Numeric/Mouse) we might track here.
      // To simplify: If the specific game component signals "done" or we track rounds here.
      // Let's rely on roundsPlayed check.
      
      const maxRounds = level.trials; 
      
      // We wait a bit before ending to show feedback
      if (nextRound >= maxRounds) {
          setTimeout(() => {
              const accuracy = ((score + (isCorrect ? 1 : 0)) / maxRounds) * 100;
              let stars = 0;
              if (accuracy >= 90) stars = 3;
              else if (accuracy >= 70) stars = 2;
              else if (accuracy >= 50 || level.tutorial) stars = 1; // Tutorial always passes if completed

              onComplete({ accuracy, stars, passed: stars > 0 });
          }, 1000);
      }
  };

  return (
    <div className="flex flex-col h-full bg-[#faf8ef] relative">
      {/* HUD */}
      <div className="flex justify-between items-center p-6 bg-white border-b border-[#ece8dc] shadow-sm z-10">
        <button onClick={onExit} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <div className="flex flex-col items-center">
            <span className="font-bold text-slate-800 text-lg">{level.title}</span>
            <span className="text-xs text-slate-400 uppercase tracking-widest">{level.gameType} 协议</span>
        </div>
        <div className="text-sm font-mono text-[#7a9584] font-bold bg-[#7a9584]/10 px-3 py-1 rounded-full">
            {score} / {level.trials}
        </div>
      </div>

      {/* Game Container */}
      <div className="flex-1 relative overflow-hidden flex flex-col justify-center">
          {level.gameType === GameType.NUMERIC && (
              <NumericGame level={level} onResult={handleRoundResult} />
          )}
          {level.gameType === GameType.SPATIAL && (
              <SpatialGame level={level} onResult={handleRoundResult} />
          )}
          {level.gameType === GameType.MOUSE && (
              <MouseGame level={level} onResult={handleRoundResult} />
          )}
          {level.gameType === GameType.HOUSE && (
              <HouseGame level={level} onResult={handleRoundResult} />
          )}
      </div>
    </div>
  );
};

export default GameView;