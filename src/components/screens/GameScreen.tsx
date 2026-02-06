import { useCallback, useEffect, useRef, useState } from 'react';
import type { UseNBackReturn } from '../../hooks/useNBack';
import type { RoundResult } from '../../types/game';
import { StatusBar } from '../game/StatusBar';
import { StimulusCard } from '../game/StimulusCard';
import { NumericKeypad } from '../game/NumericKeypad';
import { AnswerCountdown } from '../game/AnswerCountdown';
import { useSoundEffects } from '../../hooks/useSoundEffects';

interface GameScreenProps {
  engine: UseNBackReturn;
  onQuit: () => void;
}

/**
 * GameScreen - 游戏主界面（支持多模式）
 */
export function GameScreen({ engine, onQuit }: GameScreenProps) {
  const [inputValue, setInputValue] = useState('');
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const { playClick, playCorrect, playWrong } = useSoundEffects();

  const isNumericMode = engine.config.mode === 'numeric';
  const isSpatialMode = engine.config.mode === 'spatial';

  // 提前计算这些值，供 useEffect 使用
  const { currentStimulus, currentIndex, config, results, sequence } = engine;
  const isWarmup = currentIndex < config.nLevel;
  const isShowingQuestion = currentIndex < sequence.length;

  // Spatial mode phased interaction: stimulus display phase (1s) → input phase
  const STIMULUS_DISPLAY_DURATION = 1000; // 1 second

  // Manage stimulus visibility for spatial mode phased interaction
  useEffect(() => {
    if (isSpatialMode && engine.phase === 'playing' && isShowingQuestion) {
      // Show stimulus at the start of each round
      engine.setStimulusVisible(true);
      
      // Hide after display duration
      const timer = setTimeout(() => {
        engine.setStimulusVisible(false);
      }, STIMULUS_DISPLAY_DURATION);

      return () => clearTimeout(timer);
    }
  }, [currentIndex, engine.phase, isSpatialMode, isShowingQuestion]); // 简化依赖项

  // 键盘事件监听（仅 numeric 模式）
  useEffect(() => {
    if (!isNumericMode) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // 只在游戏进行中且不在暂停状态时响应键盘
      if (engine.phase !== 'playing') return;
      
      // 数字键 0-9
      if (/^[0-9]$/.test(e.key)) {
        if (engine.currentIndex < engine.config.nLevel || engine.hasAnsweredThisRound) return;
        setInputValue((prev) => {
          const newValue = prev + e.key;
          return newValue.length <= 2 ? newValue : prev;
        });
        e.preventDefault();
      }
      // Backspace 删除
      else if (e.key === 'Backspace') {
        setInputValue((prev) => prev.slice(0, -1));
        e.preventDefault();
      }
      // Enter 提交
      else if (e.key === 'Enter') {
        if (inputValue === '' || engine.currentIndex < engine.config.nLevel) return;
        const answer = parseInt(inputValue, 10);
        if (!isNaN(answer)) {
          engine.submitAnswer(answer);
        }
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [engine, inputValue, isNumericMode]);

  // 使用 ref 保存最新的状态，避免计时器依赖问题
  const inputValueRef = useRef(inputValue);
  const lastClickedIndexRef = useRef(lastClickedIndex);
  useEffect(() => {
    inputValueRef.current = inputValue;
  }, [inputValue]);
  useEffect(() => {
    lastClickedIndexRef.current = lastClickedIndex;
  }, [lastClickedIndex]);

  // 结果展示计时器：提交答案后延迟推进
  useEffect(() => {
    if (engine.phase !== 'playing' || !engine.lastSubmitResult) return;

    // 播放音效
    if (engine.lastSubmitResult.isCorrect) {
      playCorrect();
    } else {
      playWrong();
    }

    // 正确答案展示 0.5s，错误答案展示 1s
    const displayDuration = engine.lastSubmitResult.isCorrect ? 500 : 1000;
    
    const timer = setTimeout(() => {
      engine.advanceToNext();
      setInputValue(''); // 清空输入
      setLastClickedIndex(null); // 清空 spatial 反馈
    }, displayDuration);

    return () => clearTimeout(timer);
  }, [engine.lastSubmitResult, engine.phase, playCorrect, playWrong, engine]);

  // 自动推进计时器（带自动提交逻辑）
  useEffect(() => {
    if (engine.phase !== 'playing') return;
    // 如果已经提交答案，不启动自动推进计时器（由结果展示计时器接管）
    if (engine.hasAnsweredThisRound) return;

    const timer = setTimeout(() => {
      // 在 warmup 阶段，直接推进，不做任何提交
      if (currentIndex < config.nLevel) {
        engine.advanceToNext();
        setInputValue('');
        setLastClickedIndex(null);
        return;
      }

      // 非warmup阶段的处理
      // Numeric mode: 检查是否有输入值
      if (isNumericMode) {
        if (inputValueRef.current !== '') {
          // 有输入但未确认，自动提交
          const answer = parseInt(inputValueRef.current, 10);
          if (!isNaN(answer)) {
            engine.submitAnswer(answer);
            return; // 让结果展示计时器处理推进
          }
        }
        // 完全没有输入，记录为错误并展示1s
        // 但要确保不是warmup刚结束的第一题（此时targetIndex可能<0或刚好是0）
        const targetIndex = currentIndex - config.nLevel;
        if (targetIndex >= 0 && targetIndex < engine.sequence.length) {
          const targetStimulus = engine.sequence[targetIndex];
          if (targetStimulus && targetStimulus.type === 'numeric') {
            engine.submitAnswer(-999); // 提交一个明显错误的答案
            return; // 让结果展示计时器处理推进
          }
        }
      }
      // Spatial mode: 检查是否已选择
      else if (isSpatialMode) {
        if (lastClickedIndexRef.current !== null) {
          // 已选择但未确认，自动提交
          engine.submitAnswer(lastClickedIndexRef.current);
          return; // 让结果展示计时器处理推进
        }
        // 完全没有选择，记录为错误并展示1s
        const targetIndex = currentIndex - config.nLevel;
        if (targetIndex >= 0 && targetIndex < engine.sequence.length) {
          const targetStimulus = engine.sequence[targetIndex];
          if (targetStimulus && targetStimulus.type === 'spatial') {
            engine.submitAnswer(-1); // 提交一个无效的网格索引
            return; // 让结果展示计时器处理推进
          }
        }
      }
      
      // 其他情况直接推进
      engine.advanceToNext();
      setInputValue('');
      setLastClickedIndex(null);
    }, config.stimulusDuration);

    return () => clearTimeout(timer);
  }, [currentIndex, engine.phase, engine.hasAnsweredThisRound, isNumericMode, isSpatialMode, config.nLevel, config.stimulusDuration, engine]);

  const handleNumberInput = useCallback(
    (digit: string) => {
      if (engine.currentIndex < engine.config.nLevel || engine.hasAnsweredThisRound) return;
      playClick();
      setInputValue((prev) => {
        const newValue = prev + digit;
        return newValue.length <= 2 ? newValue : prev;
      });
    },
    [engine.currentIndex, engine.config.nLevel, engine.hasAnsweredThisRound, playClick]
  );

  const handleBackspace = useCallback(() => {
    setInputValue((prev) => prev.slice(0, -1));
  }, []);

  const handleSubmit = useCallback(() => {
    if (inputValue === '' || engine.currentIndex < engine.config.nLevel) return;
    const answer = parseInt(inputValue, 10);
    if (!isNaN(answer)) {
      engine.submitAnswer(answer);
    }
  }, [inputValue, engine]);

  // Spatial mode: handle grid cell click (只选择，不提交)
  const handleCellClick = useCallback(
    (gridIndex: number) => {
      if (engine.currentIndex < engine.config.nLevel || engine.hasAnsweredThisRound) return;
      setLastClickedIndex(gridIndex);
    },
    [engine]
  );

  const lastResult: RoundResult | undefined = results[results.length - 1];
  const correctSoFar = results.filter((r) => r.isCorrect).length;
  const canInput = currentIndex >= config.nLevel;

  return (
    <div className="space-y-6">
      {/* 顶栏 */}
      <StatusBar
        onQuit={onQuit}
        onPauseToggle={engine.phase === 'paused' ? engine.resumeGame : engine.pauseGame}
        isPaused={engine.phase === 'paused'}
        currentRound={currentIndex + 1}
        totalRounds={config.totalRounds + config.nLevel}
        nLevel={config.nLevel}
      />

      {/* 进度条 */}
      <div className="w-full h-1.5 bg-zen-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-sage-400 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / (config.totalRounds + config.nLevel)) * 100}%` }}
        />
      </div>

      {/* 模式特定内容区域 */}
      {isShowingQuestion ? (
        <>
          {/* Numeric Mode: 算式卡片 */}
          {isNumericMode && currentStimulus?.type === 'numeric' && (
            <StimulusCard
              stimulus={currentStimulus}
              isPaused={engine.phase === 'paused'}
              isWarmup={isWarmup}
            />
          )}
          
          {/* Spatial Mode: 上下分离设计 */}
          {isSpatialMode && currentStimulus?.type === 'spatial' && (
            <div className="space-y-4">
              {/* 上方：展示区域（只显示，不可点击） */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-teal-400">
                <div className="text-center">
                  <div className="text-sm text-teal-600 font-medium mb-4">
                    {isWarmup ? '记忆阶段' : (
                      engine.isStimulusVisible ? '观察位置' : '请在下方点击答案'
                    )}
                  </div>
                  <div 
                    className="grid mx-auto"
                    style={{ 
                      gridTemplateColumns: `repeat(${config.gridSize}, minmax(0, 1fr))`,
                      maxWidth: config.gridSize === 3 ? '240px' : config.gridSize === 4 ? '280px' : '320px',
                      gap: config.gridSize >= 4 ? '8px' : '12px'
                    }}
                  >
                    {Array.from({ length: config.gridSize * config.gridSize }, (_, i) => (
                      <div
                        key={i}
                        className={`aspect-square rounded-lg transition-all ${
                          engine.isStimulusVisible && i === currentStimulus.gridIndex
                            ? 'bg-teal-500 shadow-lg scale-105 animate-pulse'
                            : 'bg-zen-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              
              {/* 下方：回答区域（始终显示，但warmup阶段禁用） */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-zen-200 relative">
                {/* 右上角倒计时 */}
                {!isWarmup && !engine.hasAnsweredThisRound && (
                  <div className="absolute top-4 right-4">
                    <AnswerCountdown
                      duration={config.stimulusDuration}
                      roundIndex={currentIndex}
                      isPaused={engine.phase === 'paused'}
                    />
                  </div>
                )}
                
                <div className="text-center">
                  <div className="text-sm text-zen-600 font-medium mb-4">
                    {isWarmup ? '请记住位置' : `点击 ${config.nLevel} 轮前的位置`}
                  </div>
                  <div 
                    className="grid mx-auto mb-4"
                    style={{ 
                      gridTemplateColumns: `repeat(${config.gridSize}, minmax(0, 1fr))`,
                      maxWidth: config.gridSize === 3 ? '240px' : config.gridSize === 4 ? '280px' : '320px',
                      gap: config.gridSize >= 4 ? '8px' : '12px'
                    }}
                  >
                    {Array.from({ length: config.gridSize * config.gridSize }, (_, i) => {
                      const isSelected = lastClickedIndex === i;
                      const isAnswered = engine.hasAnsweredThisRound;
                      const isCorrectAnswer = lastResult?.isCorrect;
                      const isCorrectCell = lastResult && i === lastResult.correctAnswer;
                      
                      // 显示反馈：仅在提交后显示，选中但未提交不显示错误
                      let cellClass = 'aspect-square rounded-lg transition-all ';
                      if (isAnswered && isCorrectCell && !isCorrectAnswer) {
                        // 答错后显示正确位置
                        cellClass += 'bg-green-500 shadow-lg animate-pulse';
                      } else if (isSelected && isAnswered) {
                        // 已提交：显示反馈颜色
                        cellClass += isCorrectAnswer 
                          ? 'bg-green-500 shadow-lg scale-105' 
                          : 'bg-red-500 shadow-lg scale-105';
                      } else if (isSelected && !isAnswered) {
                        // 已选择但未提交：高亮边框
                        cellClass += 'bg-teal-100 border-2 border-teal-500 ring-2 ring-teal-300';
                      } else if (isWarmup || isAnswered) {
                        // warmup或已提交：禁用状态
                        cellClass += 'bg-zen-100 cursor-not-allowed';
                      } else {
                        // 正常可选状态
                        cellClass += 'bg-white border-2 border-zen-200 hover:border-teal-400 hover:bg-teal-50 active:scale-95 cursor-pointer';
                      }
                      
                      return (
                        <button
                          key={i}
                          onClick={() => !isWarmup && !isAnswered && setLastClickedIndex(i)}
                          disabled={isWarmup || isAnswered || engine.phase === 'paused'}
                          className={cellClass}
                        />
                      );
                    })}
                  </div>
                  
                  {/* 确认按钮 */}
                  {!isWarmup && (
                    <button
                      onClick={() => {
                        if (lastClickedIndex !== null && !engine.hasAnsweredThisRound) {
                          engine.submitAnswer(lastClickedIndex);
                        }
                      }}
                      disabled={lastClickedIndex === null || engine.hasAnsweredThisRound || engine.phase === 'paused'}
                      className="w-full py-3 rounded-xl font-medium transition-all
                        disabled:bg-zen-200 disabled:text-zen-400 disabled:cursor-not-allowed
                        enabled:bg-sage-500 enabled:text-white enabled:hover:bg-sage-600 enabled:active:scale-95
                      "
                    >
                      {engine.hasAnsweredThisRound ? '已提交' : (
                        lastClickedIndex === null ? '请选择位置' : '确认答案'
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-zen-200 text-center relative">
          {/* 右上角倒计时 (空间模式) */}
          {isSpatialMode && !engine.hasAnsweredThisRound && (
            <div className="absolute top-4 right-4">
              <AnswerCountdown
                duration={config.stimulusDuration}
                roundIndex={currentIndex}
                isPaused={engine.phase === 'paused'}
              />
            </div>
          )}
          
          <div className="text-zen-500 text-lg mb-2">请回答剩余题目</div>
          <div className="text-zen-400 text-sm">
            {isNumericMode
              ? `输入 ${config.nLevel} 轮前的答案`
              : `点击 ${config.nLevel} 轮前的位置`}
          </div>
          
          {/* Spatial mode: 在回答阶段也显示网格 */}
          {isSpatialMode && (
            <div className="mt-6 space-y-4">
              <div 
                className="grid mx-auto"
                style={{ 
                  gridTemplateColumns: `repeat(${config.gridSize}, minmax(0, 1fr))`,
                  maxWidth: config.gridSize === 3 ? '240px' : config.gridSize === 4 ? '280px' : '320px',
                  gap: config.gridSize >= 4 ? '8px' : '12px'
                }}
              >
                {Array.from({ length: config.gridSize * config.gridSize }, (_, i) => {
                  const isSelected = lastClickedIndex === i;
                  const isAnswered = engine.hasAnsweredThisRound;
                  const isCorrectCell = lastResult && i === lastResult.correctAnswer;
                  
                  let cellClass = 'aspect-square rounded-lg transition-all ';
                  if (isAnswered && isCorrectCell && !lastResult.isCorrect) {
                    // 答错后显示正确位置
                    cellClass += 'bg-green-500 shadow-lg animate-pulse';
                  } else if (isSelected && isAnswered) {
                    cellClass += lastResult?.isCorrect 
                      ? 'bg-green-500 shadow-lg' 
                      : 'bg-red-500 shadow-lg';
                  } else if (isSelected && !isAnswered) {
                    cellClass += 'bg-teal-100 border-2 border-teal-500 ring-2 ring-teal-300';
                  } else if (isAnswered) {
                    cellClass += 'bg-zen-100 cursor-not-allowed';
                  } else {
                    cellClass += 'bg-white border-2 border-zen-200 hover:border-teal-400 hover:bg-teal-50 active:scale-95 cursor-pointer';
                  }
                  
                  return (
                    <button
                      key={i}
                      onClick={() => !isAnswered && handleCellClick(i)}
                      disabled={isAnswered || engine.phase === 'paused'}
                      className={cellClass}
                    />
                  );
                })}
              </div>
              
              {/* 确认按钮 */}
              <button
                onClick={() => {
                  if (lastClickedIndex !== null && !engine.hasAnsweredThisRound) {
                    engine.submitAnswer(lastClickedIndex);
                  }
                }}
                disabled={lastClickedIndex === null || engine.hasAnsweredThisRound || engine.phase === 'paused'}
                className="w-full max-w-xs mx-auto block py-3 rounded-xl font-medium transition-all
                  disabled:bg-zen-200 disabled:text-zen-400 disabled:cursor-not-allowed
                  enabled:bg-sage-500 enabled:text-white enabled:hover:bg-sage-600 enabled:active:scale-95
                "
              >
                {engine.hasAnsweredThisRound ? '已提交' : (
                  lastClickedIndex === null ? '请选择位置' : '确认答案'
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 上一题反馈 */}
      {lastResult && (
        <div
          className={`text-center text-sm font-medium transition-all animate-fade-in
            ${lastResult.isCorrect ? 'text-green-600' : 'text-red-500'}`}
        >
          {lastResult.isCorrect ? '✓ 正确' : '✗ 错误'}
          {lastResult.userAnswer !== null && (
            <span className="text-zen-400 ml-2">
              你的答案: {lastResult.userAnswer} · 正确答案: {lastResult.correctAnswer}
            </span>
          )}
          {lastResult.reactionTimeMs && (
            <span className="text-zen-400 ml-2">({lastResult.reactionTimeMs}ms)</span>
          )}
        </div>
      )}

      {/* 得分信息 */}
      <div className="bg-zen-100/50 backdrop-blur-sm rounded-xl p-3 font-mono text-xs text-zen-600 text-center">
        <span>得分: {correctSoFar} / {results.length}</span>
      </div>

      {/* 数字键盘（仅 numeric 模式） */}
      {isNumericMode && (
        <NumericKeypad
          value={inputValue}
          onInput={handleNumberInput}
          onBackspace={handleBackspace}
          onSubmit={handleSubmit}
          disabled={engine.hasAnsweredThisRound}
          canInput={canInput}
        />
      )}
    </div>
  );
}
