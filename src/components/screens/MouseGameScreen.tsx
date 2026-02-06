// ============================================================
// Brain Flow - Devilish Mice (魔鬼老鼠) Game Screen
// ============================================================
//
// ★ 双层传送带动画模型 (Two-Layer Conveyor Belt):
//
//   固定尺寸外框 (decorative border) = 视口裁剪边界
//     ├─ 底层 Animal Layer (z:1, overflow:visible 但被外框 clip)
//     │   - 推挤时: 行/列图片匀速平移一格
//     │   - 入场猫从边框外匀速滑入, 穿过边框可见
//     │   - 出场图片匀速穿过边框滑出
//     │
//     └─ 表层 Cover Layer (z:2, overflow:hidden = 网格区域)
//         - 方块到达网格边缘被裁剪 → "方块永远不出画幅"
//
//   外框 overflow:hidden → 猫从边框边缘走入/走出, 不会凭空出现

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { UseMouseGameReturn } from '../../hooks/useMouseGame';
import { computePushDetails, type PushDetail } from '../../hooks/useMouseGame';
import type { GridCell, MouseRoundResult } from '../../types/game';
import { StatusBar } from '../game/StatusBar';

// ---- Constants ----
const CELL_GAP = 6;
const PUSH_SLIDE_MS = 800;       // 每次推挤匀速时长
const COVER_ANIM_MS = 600;       // 盖子关闭动画
const FEEDBACK_MS = 3000;        // 结果展示
const BORDER_PAD = 20;           // 网格到装饰边框的距离 (px), 也是猫进出的缓冲区

interface MouseGameScreenProps {
  engine: UseMouseGameReturn;
  onQuit: () => void;
}

// ====================================================================
// AnimalImage
// ====================================================================
function AnimalImage({ content, size }: { content: 'mouse' | 'cat'; size: number }) {
  const src = content === 'mouse' ? '/pic/mouse.svg' : '/pic/cat.svg';
  const fallback = content === 'mouse' ? '🐭' : '🐱';
  return (
    <div className="flex items-center justify-center" style={{ width: size, height: size }}>
      <img
        src={src}
        alt={content}
        className="w-3/4 h-3/4 object-contain drop-shadow-sm"
        onError={(e) => {
          const img = e.target as HTMLImageElement;
          img.style.display = 'none';
          img.parentElement!.innerHTML = `<span class="text-2xl">${fallback}</span>`;
        }}
      />
    </div>
  );
}

// ====================================================================
// CoverBlock: 可点击遮蔽方块 (answering阶段)
// ====================================================================
function CoverBlock({ size, isSelected, isAnswering, onClick }: {
  size: number;
  isSelected: boolean;
  isAnswering: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!isAnswering}
      className={`
        rounded-xl relative flex items-center justify-center transition-all duration-150
        ${isAnswering ? 'cursor-pointer active:scale-95' : 'cursor-default'}
        ${isSelected
          ? 'bg-gradient-to-br from-sage-100 to-sage-200 shadow-md'
          : 'bg-gradient-to-br from-zen-300 to-zen-400 shadow-inner hover:brightness-105'}
      `}
      style={{
        width: size,
        height: size,
        boxShadow: isSelected
          ? `inset 0 0 0 2px rgb(107 142 107), 0 2px 8px rgba(107,142,107,0.25)`
          : undefined,
      }}
    >
      {isSelected ? (
        <div className="w-5 h-5 bg-sage-500 rounded-full flex items-center justify-center shadow-sm">
          <span className="text-white text-[10px] font-bold leading-none">✓</span>
        </div>
      ) : (
        <div className="w-7 h-7 rounded-lg bg-zen-200/50 flex items-center justify-center">
          <span className="text-zen-500 text-xs font-bold select-none">?</span>
        </div>
      )}
    </button>
  );
}

// ====================================================================
// StaticCover: 不可交互遮蔽方块 (pushing阶段)
// ====================================================================
function StaticCover({ size }: { size: number }) {
  return (
    <div
      className="rounded-xl bg-gradient-to-br from-zen-300 to-zen-400 shadow-inner flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <div className="w-7 h-7 rounded-lg bg-zen-200/50 flex items-center justify-center">
        <span className="text-zen-500 text-xs font-bold select-none">?</span>
      </div>
    </div>
  );
}

// ====================================================================
// FeedbackCell: 结果展示格子
// ====================================================================
function FeedbackCell({ cell, size, isMouseHere, wasSelected }: {
  cell: GridCell;
  size: number;
  isMouseHere: boolean;
  wasSelected: boolean;
}) {
  let style = 'border border-zen-200 bg-white';
  if (isMouseHere && wasSelected) style = 'border-2 border-green-400 bg-green-50';
  else if (isMouseHere && !wasSelected) style = 'border-2 border-amber-400 bg-amber-50 animate-pulse';
  else if (!isMouseHere && wasSelected) style = 'border-2 border-red-400 bg-red-50';

  return (
    <div
      className={`rounded-xl flex items-center justify-center shadow-sm ${style}`}
      style={{ width: size, height: size }}
    >
      <AnimalImage content={cell.content} size={size} />
    </div>
  );
}

// ====================================================================
// 主组件
// ====================================================================
export function MouseGameScreen({ engine, onQuit }: MouseGameScreenProps) {
  const {
    phase, puzzle, currentRound, totalRounds, mouseConfig,
    currentPushIndex, roundResults,
    onRevealComplete, onCoverComplete, onPushAnimComplete,
    submitAnswer, onFeedbackComplete,
  } = engine;

  const { cols, rows, revealDuration, numMice } = mouseConfig;

  // ---- Cell sizing ----
  const outerRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(70);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth - BORDER_PAD * 2;
      const size = Math.floor((w - (cols - 1) * CELL_GAP) / cols);
      setCellSize(Math.min(Math.max(size, 40), 85));
    };
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    return () => obs.disconnect();
  }, [cols]);

  const step = cellSize + CELL_GAP;
  const gridW = cols * cellSize + (cols - 1) * CELL_GAP;
  const gridH = rows * cellSize + (rows - 1) * CELL_GAP;

  // 外框尺寸: 固定, 所有阶段一致
  const frameW = gridW + BORDER_PAD * 2;
  const frameH = gridH + BORDER_PAD * 2;

  // ---- Precompute push details ----
  const pushDetails: PushDetail[] = useMemo(() => {
    if (!puzzle) return [];
    return computePushDetails(puzzle.initialCells, cols, rows, puzzle.pushOps);
  }, [puzzle, cols, rows]);

  // ---- Static grid ----
  const staticGrid: GridCell[] = useMemo(() => {
    if (!puzzle) return [];
    if (phase === 'revealing' || phase === 'covering') return puzzle.initialCells;
    return puzzle.finalCells;
  }, [puzzle, phase]);

  // ---- State ----
  const [countdown, setCountdown] = useState(3);
  const [selectedCells, setSelectedCells] = useState<Set<number>>(new Set());

  // ---- rAF push animation 0→1 ----
  const [slideProgress, setSlideProgress] = useState(0);
  const slideStartRef = useRef(0);
  const rafRef = useRef(0);
  const phasePushDoneRef = useRef(false);

  // ---- Phase: Revealing ----
  useEffect(() => {
    if (phase !== 'revealing') return;
    setSelectedCells(new Set());
    setSlideProgress(0);
    phasePushDoneRef.current = false;

    const totalSec = Math.ceil(revealDuration / 1000);
    setCountdown(totalSec);
    const intervals: ReturnType<typeof setTimeout>[] = [];
    for (let s = 1; s < totalSec; s++) {
      intervals.push(setTimeout(() => setCountdown(totalSec - s), s * 1000));
    }
    const timer = setTimeout(onRevealComplete, revealDuration);
    return () => { clearTimeout(timer); intervals.forEach(clearTimeout); };
  }, [phase, revealDuration, onRevealComplete, currentRound]);

  // ---- Phase: Covering ----
  useEffect(() => {
    if (phase !== 'covering') return;
    const timer = setTimeout(onCoverComplete, COVER_ANIM_MS);
    return () => clearTimeout(timer);
  }, [phase, onCoverComplete, currentRound]);

  // ---- Phase: Pushing (rAF, 零间隔连续) ----
  useEffect(() => {
    if (phase !== 'pushing' || !puzzle) return;

    phasePushDoneRef.current = false;
    slideStartRef.current = performance.now();
    setSlideProgress(0);

    let cancelled = false;

    function tick(now: number) {
      if (cancelled) return;
      const t = Math.min((now - slideStartRef.current) / PUSH_SLIDE_MS, 1);
      setSlideProgress(t);

      if (t >= 1) {
        if (!phasePushDoneRef.current) {
          phasePushDoneRef.current = true;
          // 零间隔直接下一步
          onPushAnimComplete();
        }
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => { cancelled = true; cancelAnimationFrame(rafRef.current); };
  }, [phase, currentPushIndex, puzzle, onPushAnimComplete, currentRound]);

  // ---- Phase: Feedback ----
  useEffect(() => {
    if (phase !== 'feedback') return;
    const timer = setTimeout(onFeedbackComplete, FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [phase, onFeedbackComplete, currentRound]);

  // ---- Handlers ----
  const handleCellClick = useCallback((idx: number) => {
    if (phase !== 'answering') return;
    setSelectedCells((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }, [phase]);

  const handleConfirm = useCallback(() => {
    if (phase !== 'answering') return;
    submitAnswer(Array.from(selectedCells));
  }, [phase, selectedCells, submitAnswer]);

  // ---- Computed ----
  const lastResult: MouseRoundResult | undefined = roundResults[roundResults.length - 1];
  const totalCorrectMice = roundResults.reduce((s, r) => s + r.correctCount, 0);
  const totalMiceAll = roundResults.reduce((s, r) => s + r.totalMice, 0);

  // ---- Phase text ----
  let phaseText = '';
  let phaseSubtext = '';
  if (phase === 'revealing') {
    phaseText = '👀 记住老鼠的位置！';
    phaseSubtext = `共 ${numMice} 只老鼠`;
  } else if (phase === 'covering') {
    phaseText = '🚪 门关上了...';
    phaseSubtext = '记住它们在哪里';
  } else if (phase === 'pushing') {
    phaseText = '🐱 猫来了！';
    phaseSubtext = '猫正在推挤老鼠...';
  } else if (phase === 'answering') {
    phaseText = '🐭 老鼠在哪里？';
    phaseSubtext = '找出剩下的老鼠位置';
  } else if (phase === 'feedback') {
    if (lastResult && lastResult.correctCount === lastResult.totalMice && lastResult.wrongSelections === 0) {
      phaseText = '🎉 完美！';
    } else if (lastResult && lastResult.correctCount > 0) {
      phaseText = `找到 ${lastResult.correctCount} / ${lastResult.totalMice} 只老鼠`;
    } else {
      phaseText = '😿 再接再厉！';
    }
  }

  // ---- Helpers ----
  const gridPos = (flatIdx: number) => ({
    x: (flatIdx % cols) * step,
    y: Math.floor(flatIdx / cols) * step,
  });

  const entryPos = (side: 'left' | 'right' | 'top' | 'bottom', lineIdx: number) => {
    if (side === 'left') return { x: -step, y: lineIdx * step };
    if (side === 'right') return { x: cols * step, y: lineIdx * step };
    if (side === 'top') return { x: lineIdx * step, y: -step };
    return { x: lineIdx * step, y: rows * step };
  };

  const pushVec = (side: 'left' | 'right' | 'top' | 'bottom') => {
    if (side === 'left') return { dx: step, dy: 0 };
    if (side === 'right') return { dx: -step, dy: 0 };
    if (side === 'top') return { dx: 0, dy: step };
    return { dx: 0, dy: -step };
  };

  // ==================================================================
  // RENDER: 推挤动画 (双层)
  // 所有坐标 相对于网格原点 (BORDER_PAD, BORDER_PAD)
  // ==================================================================
  const renderPushAnimation = () => {
    if (!puzzle || pushDetails.length === 0) return null;
    const detail = pushDetails[currentPushIndex];
    if (!detail) return null;

    const { push, beforeGrid, enteringCell, lineIndices } = detail;
    const { side, lineIndex } = push;
    const vec = pushVec(side);
    const t = slideProgress;
    const offX = vec.dx * t;
    const offY = vec.dy * t;
    const affectedSet = new Set(lineIndices);

    const animalEls: React.JSX.Element[] = [];
    const coverEls: React.JSX.Element[] = [];

    // 网格内所有 cell
    for (let i = 0; i < beforeGrid.length; i++) {
      const cell = beforeGrid[i];
      const pos = gridPos(i);
      const affected = affectedSet.has(i);
      const x = pos.x + (affected ? offX : 0);
      const y = pos.y + (affected ? offY : 0);

      animalEls.push(
        <div key={`a-${cell.id}`} className="absolute will-change-transform"
          style={{ transform: `translate(${x}px,${y}px)`, width: cellSize, height: cellSize }}>
          <AnimalImage content={cell.content} size={cellSize} />
        </div>,
      );
      coverEls.push(
        <div key={`c-${cell.id}`} className="absolute will-change-transform"
          style={{ transform: `translate(${x}px,${y}px)`, width: cellSize, height: cellSize }}>
          <StaticCover size={cellSize} />
        </div>,
      );
    }

    // 入场猫
    const ep = entryPos(side, lineIndex);
    animalEls.push(
      <div key={`a-enter-${enteringCell.id}`} className="absolute will-change-transform"
        style={{ transform: `translate(${ep.x + vec.dx * t}px,${ep.y + vec.dy * t}px)`, width: cellSize, height: cellSize }}>
        <AnimalImage content="cat" size={cellSize} />
      </div>,
    );
    coverEls.push(
      <div key={`c-enter-${enteringCell.id}`} className="absolute will-change-transform"
        style={{ transform: `translate(${ep.x + vec.dx * t}px,${ep.y + vec.dy * t}px)`, width: cellSize, height: cellSize }}>
        <StaticCover size={cellSize} />
      </div>,
    );

    return (
      <>
        {/* ① Animal Layer: z:1, overflow visible (但被外框 overflow:hidden 裁到边框) */}
        <div className="absolute" style={{
          left: BORDER_PAD, top: BORDER_PAD,
          width: gridW, height: gridH,
          zIndex: 1, overflow: 'visible',
        }}>
          {animalEls}
        </div>

        {/* ② Cover Layer: z:2, overflow:hidden = 精确网格区域 */}
        <div className="absolute" style={{
          left: BORDER_PAD, top: BORDER_PAD,
          width: gridW, height: gridH,
          zIndex: 2, overflow: 'hidden',
        }}>
          {coverEls}
        </div>
      </>
    );
  };

  // ==================================================================
  // RENDER: 静态网格
  // ==================================================================
  const renderStaticGrid = () => {
    if (!puzzle) return null;
    const isRevealing = phase === 'revealing';
    const isCovering = phase === 'covering';
    const isAnswering = phase === 'answering';
    const isFeedback = phase === 'feedback';

    return staticGrid.map((cell, i) => {
      const pos = gridPos(i);
      const x = BORDER_PAD + pos.x;
      const y = BORDER_PAD + pos.y;

      if (isFeedback) {
        return (
          <div key={`fb-${i}`} className="absolute" style={{ left: x, top: y }}>
            <FeedbackCell cell={cell} size={cellSize}
              isMouseHere={puzzle.mousePositions.includes(i)}
              wasSelected={selectedCells.has(i)} />
          </div>
        );
      }
      if (isRevealing) {
        return (
          <div key={`open-${i}`} className="absolute" style={{ left: x, top: y }}>
            <div className="rounded-xl bg-white shadow-md border border-zen-200 flex items-center justify-center"
              style={{ width: cellSize, height: cellSize }}>
              <AnimalImage content={cell.content} size={cellSize} />
            </div>
          </div>
        );
      }
      if (isCovering) {
        return (
          <div key={`cov-${i}`} className="absolute" style={{ left: x, top: y }}>
            <div className="relative" style={{ width: cellSize, height: cellSize, perspective: 400 }}>
              <div className="absolute inset-0 rounded-xl bg-white shadow-md border border-zen-200 flex items-center justify-center">
                <AnimalImage content={cell.content} size={cellSize} />
              </div>
              <motion.div
                initial={{ rotateY: 90 }}
                animate={{ rotateY: 0 }}
                transition={{ duration: COVER_ANIM_MS / 1000, ease: 'linear' }}
                className="absolute inset-0 rounded-xl bg-gradient-to-br from-zen-300 to-zen-400 shadow-inner flex items-center justify-center"
                style={{ backfaceVisibility: 'hidden' }}>
                <div className="w-7 h-7 rounded-lg bg-zen-200/50 flex items-center justify-center">
                  <span className="text-zen-500 text-xs font-bold select-none">?</span>
                </div>
              </motion.div>
            </div>
          </div>
        );
      }
      if (isAnswering) {
        return (
          <div key={`ans-${i}`} className="absolute" style={{ left: x, top: y }}>
            <CoverBlock size={cellSize} isSelected={selectedCells.has(i)}
              isAnswering onClick={() => handleCellClick(i)} />
          </div>
        );
      }
      return (
        <div key={`def-${i}`} className="absolute" style={{ left: x, top: y }}>
          <StaticCover size={cellSize} />
        </div>
      );
    });
  };

  // ==================================================================
  // 主渲染
  // ==================================================================
  if (!puzzle && phase !== 'idle' && phase !== 'finished') return null;
  const isPushing = phase === 'pushing';

  return (
    <div className="space-y-4">
      {/* 顶栏 */}
      <StatusBar onQuit={onQuit} onPauseToggle={() => {}} isPaused={false}
        currentRound={currentRound + 1} totalRounds={totalRounds}
        nLevel={mouseConfig.numPushes} />

      {/* 进度条 */}
      <div className="w-full h-1.5 bg-zen-200 rounded-full overflow-hidden">
        <motion.div className="h-full bg-amber-400" initial={{ width: 0 }}
          animate={{ width: `${((currentRound + (phase === 'feedback' ? 1 : 0)) / totalRounds) * 100}%` }}
          transition={{ duration: 0.3 }} />
      </div>

      {/* 阶段指示器 */}
      <div className="text-center py-1">
        <AnimatePresence mode="wait">
          <motion.div key={`${phase}-${currentRound}-${currentPushIndex}`}
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }} className="text-xl font-medium text-zen-700">
            {phaseText}
          </motion.div>
        </AnimatePresence>
        {phaseSubtext && <div className="text-sm text-zen-400 mt-1">{phaseSubtext}</div>}
      </div>

      {/* ============================================================
          网格区域 - 固定尺寸外框, 所有阶段一致, 绝不跳动
          外框 overflow:hidden = 裁剪边界
          猫从边框边缘一点点走入/走出
          ============================================================ */}
      <div ref={outerRef} className="flex justify-center">
        <div
          className="relative bg-gradient-to-br from-amber-50 to-zen-100 rounded-2xl border-2 border-amber-200/60 shadow-lg overflow-hidden"
          style={{ width: frameW, height: frameH }}
        >
          {/* 倒计时 */}
          <AnimatePresence>
            {phase === 'revealing' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute flex items-center justify-center pointer-events-none"
                style={{ left: BORDER_PAD, top: BORDER_PAD, width: gridW, height: gridH, zIndex: 40 }}>
                <motion.div key={countdown}
                  initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.3, opacity: 0 }}
                  className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                  <span className="text-3xl font-bold text-white drop-shadow-lg">{countdown}</span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 推挤动画 或 静态网格 */}
          {isPushing ? renderPushAnimation() : renderStaticGrid()}
        </div>
      </div>

      {/* 作答控件 */}
      {phase === 'answering' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="space-y-3 px-4">
          <div className="text-center text-sm text-zen-500">
            已选择 <span className="font-bold text-zen-700">{selectedCells.size}</span> 个位置
          </div>
          <button onClick={handleConfirm} disabled={selectedCells.size === 0}
            className="w-full py-3.5 rounded-xl font-medium transition-all
              disabled:bg-zen-200 disabled:text-zen-400 disabled:cursor-not-allowed
              enabled:bg-amber-500 enabled:text-white enabled:hover:bg-amber-600 enabled:active:scale-[0.97] shadow-sm">
            {selectedCells.size === 0 ? '请点击选择老鼠位置' : '确认答案 ✓'}
          </button>
        </motion.div>
      )}

      {/* 反馈结果 */}
      <AnimatePresence>
        {phase === 'feedback' && lastResult && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }} className="text-center">
            <div className={`inline-block px-6 py-2 rounded-full text-sm font-medium ${
              lastResult.correctCount === lastResult.totalMice && lastResult.wrongSelections === 0
                ? 'bg-green-100 text-green-700'
                : lastResult.correctCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
            }`}>
              🐭 找到 {lastResult.correctCount}/{lastResult.totalMice} 只
              {lastResult.wrongSelections > 0 && ` · 误选 ${lastResult.wrongSelections}`}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 得分信息 */}
      <div className="bg-zen-100/50 backdrop-blur-sm rounded-xl p-3 font-mono text-xs text-zen-600 text-center">
        找到老鼠: {totalCorrectMice} / {totalMiceAll}
        {roundResults.length > 0 && (
          <> · 准确率: {totalMiceAll > 0 ? Math.round((totalCorrectMice / totalMiceAll) * 100) : 0}%</>
        )}
      </div>
    </div>
  );
}
