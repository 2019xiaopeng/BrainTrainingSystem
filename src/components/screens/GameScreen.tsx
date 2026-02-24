import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { UseNBackReturn } from '../../hooks/useNBack';
import type { RoundResult } from '../../types/game';
import { StatusBar } from '../game/StatusBar';
import { StimulusCard } from '../game/StimulusCard';
import { NumericKeypad } from '../game/NumericKeypad';
import { useSoundEffects } from '../../hooks/useSoundEffects';

interface GameScreenProps {
  engine: UseNBackReturn;
  onQuit: () => void;
}

/**
 * GameScreen - 游戏主界面（支持多模式）
 */
export function GameScreen({ engine, onQuit }: GameScreenProps) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const { playClick, playCorrect, playWrong } = useSoundEffects();

  const isNumericMode = engine.config.mode === 'numeric';
  const isSpatialMode = engine.config.mode === 'spatial';

  // 提前计算这些值，供 useEffect 使用
  const { currentStimulus, currentIndex, config, results, sequence } = engine;
  const isWarmup = currentIndex < config.nLevel;
  const isShowingQuestion = currentIndex < sequence.length;

  // Spatial mode phased interaction: stimulus display phase → input phase
  // 记忆阶段(playing)：方块持续闪烁整个2.5s
  // 答题阶段(answering)：当前题目方块持续闪烁（让玩家记忆，同时回答N轮前的题）

  // Manage stimulus visibility for spatial mode
  useEffect(() => {
    if (!isSpatialMode) return;
    
    if (engine.phase === 'playing') {
      // 记忆阶段：方块在整个回合内持续可见闪烁
      engine.setStimulusVisible(true);
    } else if (engine.phase === 'answering' && isShowingQuestion) {
      // 答题阶段且还有新题：方块持续可见闪烁（玩家需要记住它）
      engine.setStimulusVisible(true);
    } else if (engine.phase === 'answering' && !isShowingQuestion) {
      // 尾部答题阶段（无新题）：不显示
      engine.setStimulusVisible(false);
    }
  }, [currentIndex, engine.phase, isSpatialMode, isShowingQuestion]);

  // 记忆阶段自动推进计时器（只在playing阶段）
  useEffect(() => {
    if (engine.phase !== 'playing') return;

    const timer = setTimeout(() => {
      engine.advanceToNext();
    }, config.stimulusDuration);

    return () => clearTimeout(timer);
  }, [currentIndex, engine.phase, config.stimulusDuration, engine]);

  // 键盘事件监听（仅 numeric 模式，answering阶段有效）
  useEffect(() => {
    if (!isNumericMode) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // 只在答题阶段且不在暂停状态时响应键盘
      if (engine.phase !== 'answering') return;
      
      // 数字键 0-9
      if (/^[0-9]$/.test(e.key)) {
        if (engine.hasAnsweredThisRound) return;
        playClick();
        setInputValue((prev) => {
          const newValue = prev + e.key;
          return newValue.length <= 2 ? newValue : prev;
        });
        e.preventDefault();
      }
      // Backspace 删除
      else if (e.key === 'Backspace') {
        if (engine.hasAnsweredThisRound) return;
        setInputValue((prev) => prev.slice(0, -1));
        e.preventDefault();
      }
      // Enter 提交
      else if (e.key === 'Enter') {
        if (inputValue === '' || engine.hasAnsweredThisRound) return;
        const answer = parseInt(inputValue, 10);
        if (!isNaN(answer)) {
          engine.submitAnswer(answer);
        }
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [engine, inputValue, isNumericMode, playClick]);

  // 使用 ref 保存最新的状态，避免计时器依赖问题
  const inputValueRef = useRef(inputValue);
  const lastClickedIndexRef = useRef(lastClickedIndex);
  useEffect(() => {
    inputValueRef.current = inputValue;
  }, [inputValue]);
  useEffect(() => {
    lastClickedIndexRef.current = lastClickedIndex;
  }, [lastClickedIndex]);

  // 答题后播放音效并自动延迟推进（答对0.5s，答错1s）
  useEffect(() => {
    if (engine.phase !== 'answering' || !engine.lastSubmitResult) return;

    // 播放音效
    if (engine.lastSubmitResult.isCorrect) {
      playCorrect();
    } else {
      playWrong();
    }

    // 答对展示0.5s，答错展示1s，然后自动进入下一题
    const displayDuration = engine.lastSubmitResult.isCorrect ? 500 : 1000;
    
    const timer = setTimeout(() => {
      engine.advanceToNext();
      setInputValue(''); // 清空输入
      setLastClickedIndex(null); // 清空 spatial 反馈
    }, displayDuration);

    return () => clearTimeout(timer);
  }, [engine.lastSubmitResult, engine.phase, playCorrect, playWrong, engine]);

  const handleNumberInput = useCallback(
    (digit: string) => {
      if (engine.phase !== 'answering' || engine.hasAnsweredThisRound) return;
      playClick();
      setInputValue((prev) => {
        const newValue = prev + digit;
        return newValue.length <= 2 ? newValue : prev;
      });
    },
    [engine.phase, engine.hasAnsweredThisRound, playClick]
  );

  const handleBackspace = useCallback(() => {
    setInputValue((prev) => prev.slice(0, -1));
  }, []);

  const handleSubmit = useCallback(() => {
    if (inputValue === '' || engine.phase !== 'answering') return;
    const answer = parseInt(inputValue, 10);
    if (!isNaN(answer)) {
      engine.submitAnswer(answer);
    }
  }, [inputValue, engine]);

  // Spatial mode: handle grid cell click (点击选择，再次点击确认提交)
  const handleCellClick = useCallback(
    (gridIndex: number) => {
      if (engine.phase !== 'answering' || engine.hasAnsweredThisRound) return;
      if (lastClickedIndex === gridIndex) {
        // 再次点击已选中的方块 = 确认提交
        engine.submitAnswer(gridIndex);
      } else {
        setLastClickedIndex(gridIndex);
      }
    },
    [engine, lastClickedIndex]
  );

  const lastResult: RoundResult | undefined = results[results.length - 1];
  const correctSoFar = results.filter((r) => r.isCorrect).length;

  return (
    <div className="space-y-6">
      {/* 等待开始答题的弹窗 */}
      {engine.phase === 'waitingToAnswer' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md mx-4 animate-scale-in">
            <h2 className="text-2xl font-medium text-zen-700 mb-4 text-center">
              {t('game.memoryDone')}
            </h2>
            <p className="text-zen-500 text-center mb-6">
              {t('game.memoryDoneMsg', { n: config.nLevel })}<br />
              {t('game.readyToAnswer')}
            </p>
            <button
              onClick={engine.startAnswering}
              className="w-full py-4 rounded-xl bg-sage-500 text-white text-lg font-medium
                         hover:bg-sage-600 active:scale-[0.98] transition-all shadow-sm"
            >
              {t('game.startAnswer')}
            </button>
          </div>
        </div>
      )}

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
                    {engine.phase === 'playing' ? t('game.memoryPhase') : t('game.currentQuestion')}
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
              
              {/* 下方：回答区域（仅在answering阶段显示） */}
              {engine.phase === 'answering' && (
              <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-zen-200">
                <div className="text-center">
                  <div className="text-sm text-zen-600 font-medium mb-4">
                    {t('game.clickNBack', { n: config.nLevel })}
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
                        // 答错后显示正确位置，持续闪烁直到确认下一题
                        cellClass += 'bg-green-500 shadow-lg animate-pulse';
                      } else if (isSelected && isAnswered) {
                        // 已提交：显示反馈颜色
                        cellClass += isCorrectAnswer 
                          ? 'bg-green-500 shadow-lg scale-105' 
                          : 'bg-red-500 shadow-lg scale-105';
                      } else if (isSelected && !isAnswered) {
                        // 已选择但未提交：高亮边框
                        cellClass += 'bg-teal-100 border-2 border-teal-500 ring-2 ring-teal-300';
                      } else if (isAnswered) {
                        // 已提交：禁用状态
                        cellClass += 'bg-zen-100 cursor-not-allowed';
                      } else {
                        // 正常可选状态
                        cellClass += 'bg-white border-2 border-zen-200 hover:border-teal-400 hover:bg-teal-50 active:scale-95 cursor-pointer';
                      }
                      
                      return (
                        <button
                          key={i}
                          onClick={() => handleCellClick(i)}
                          disabled={isAnswered}
                          className={cellClass}
                        />
                      );
                    })}
                  </div>
                  
                  {/* 确认答案按钮 */}
                  <button
                    onClick={() => {
                      if (lastClickedIndex !== null && !engine.hasAnsweredThisRound) {
                        engine.submitAnswer(lastClickedIndex);
                      }
                    }}
                    disabled={lastClickedIndex === null || engine.hasAnsweredThisRound}
                    className="w-full py-3 rounded-xl font-medium transition-all
                      disabled:bg-zen-200 disabled:text-zen-400 disabled:cursor-not-allowed
                      enabled:bg-sage-500 enabled:text-white enabled:hover:bg-sage-600 enabled:active:scale-95
                    "
                  >
                    {engine.hasAnsweredThisRound ? t('game.submitted') : (
                      lastClickedIndex === null ? t('game.selectPosition') : t('game.confirmAnswer')
                    )}
                  </button>
                </div>
              </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-zen-200 text-center">
          <div className="text-zen-500 text-lg mb-2">{t('game.answerRemaining')}</div>
          <div className="text-zen-400 text-sm">
            {isNumericMode
              ? t('game.inputNBack', { n: config.nLevel })
              : t('game.clickNBack', { n: config.nLevel })}
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
                {engine.hasAnsweredThisRound ? t('game.submitted') : (
                  lastClickedIndex === null ? t('game.selectPosition') : t('game.confirmAnswer')
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
          {lastResult.isCorrect ? t('game.correct') : t('game.wrong')}
          {lastResult.userAnswer !== null && (
            <span className="text-zen-400 ml-2">
              {t('game.yourAnswer', { user: lastResult.userAnswer, correct: lastResult.correctAnswer })}
            </span>
          )}
          {lastResult.reactionTimeMs && (
            <span className="text-zen-400 ml-2">({lastResult.reactionTimeMs}ms)</span>
          )}
        </div>
      )}

      {/* 得分信息 */}
      <div className="bg-zen-100/50 backdrop-blur-sm rounded-xl p-3 font-mono text-xs text-zen-600 text-center">
        <span>{t('game.score', { correct: correctSoFar, total: results.length })}</span>
      </div>

      {/* 数字键盘（仅 numeric 模式） */}
      {isNumericMode && (
        <NumericKeypad
          value={inputValue}
          onInput={handleNumberInput}
          onBackspace={handleBackspace}
          onSubmit={handleSubmit}
          disabled={engine.hasAnsweredThisRound}
          canInput={engine.phase === 'answering'}
        />
      )}
    </div>
  );
}
