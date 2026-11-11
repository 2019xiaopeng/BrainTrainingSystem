import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GAME_CATALOG } from '../../lib/games';
import { useGameStore } from '../../store/gameStore';
import type { GameMode, MouseDifficultyLevel } from '../../types/game';
import { getBrainRank, MOUSE_GRID_PRESETS, MOUSE_DIFFICULTY_MAP, buildMouseGameConfig, buildHouseGameConfig } from '../../types/game';
import type { MouseGameConfig, HouseGameConfig } from '../../types/game';

/** Minimum rounds so that at least one answer round exists after the N-round warmup */
const requiredMinRoundsForN = (n: number) => {
  const candidates = [5, 10, 15, 20, 25, 30];
  const target = n + 1;
  return candidates.find((r) => r >= target) ?? 30;
};

const clampToStep = (value: number, min: number, max: number, step: number) => {
  const clamped = Math.max(min, Math.min(value, max));
  return min + Math.floor((clamped - min) / step) * step;
};

interface HomeScreenProps {
  initialMode: GameMode;
  onStart: (nLevel: number, rounds: number, mode: GameMode, gridSize: number, mouseConfig?: MouseGameConfig, houseConfig?: HouseGameConfig) => void;
}

/**
 * HomeScreen - 首页配置界面（多模式选择，所有参数自由调节）
 */
export function HomeScreen({ initialMode, onStart }: HomeScreenProps) {
  const { t } = useTranslation();
  const { gameConfigs, userProfile } = useGameStore();
  const updateGameConfig = useGameStore((s) => s.updateGameConfig);
  const [mode, setModeLocal] = useState<GameMode>(initialMode);

  const brainLevel = getBrainRank(userProfile.totalXP, userProfile.completedMilestones || []).level;

  // Numeric mode config
  const numericNLevel = gameConfigs.numeric.nLevel;
  const numericRounds = gameConfigs.numeric.rounds;
  // Spatial mode config
  const spatialNLevel = gameConfigs.spatial.nLevel;
  const spatialRounds = gameConfigs.spatial.rounds;
  const gridSize = gameConfigs.spatial.gridSize;
  // Mouse mode config
  const { count: mouseCount, grid: mouseGrid, difficulty: mouseDifficulty, rounds: mouseRounds } = gameConfigs.mouse;
  // House mode config
  const { initialPeople: houseInitial, eventCount: houseEvents, speed: houseSpeed, rounds: houseRounds } = gameConfigs.house;

  const isNBackMode = mode === 'numeric' || mode === 'spatial';
  const maxMice = mouseGrid[0] * mouseGrid[1] - 1;
  const effectiveMouseCount = Math.min(mouseCount, maxMice);

  const numericMinRounds = requiredMinRoundsForN(numericNLevel);
  const spatialMinRounds = requiredMinRoundsForN(spatialNLevel);

  // Keep rounds within [minRounds, 30] on a 5-step when N changes or user steps
  const updateNLevel = (n: number) => {
    if (mode === 'numeric') {
      updateGameConfig('numeric', { nLevel: n, rounds: Math.max(requiredMinRoundsForN(n), numericRounds) });
    } else {
      updateGameConfig('spatial', { nLevel: n, rounds: Math.max(requiredMinRoundsForN(n), spatialRounds) });
    }
  };

  const updateRounds = (r: number) => {
    if (mode === 'numeric') {
      updateGameConfig('numeric', { rounds: clampToStep(r, numericMinRounds, 30, 5) });
    } else {
      updateGameConfig('spatial', { rounds: clampToStep(r, spatialMinRounds, 30, 5) });
    }
  };

  const isConfigValid = isNBackMode
    ? (mode === 'numeric' ? numericNLevel < numericRounds : spatialNLevel < spatialRounds)
    : true;

  const handleStart = () => {
    if (mode === 'mouse') {
      const mConfig = buildMouseGameConfig(effectiveMouseCount, mouseGrid, mouseDifficulty, mouseRounds);
      onStart(1, mouseRounds, mode, mouseGrid[0], mConfig);
    } else if (mode === 'house') {
      const hConfig = buildHouseGameConfig(houseInitial, houseEvents, houseSpeed, houseRounds);
      onStart(1, houseRounds, mode, 0, undefined, hConfig);
    } else if (mode === 'numeric') {
      onStart(numericNLevel, numericRounds, mode, 3);
    } else if (mode === 'spatial') {
      onStart(spatialNLevel, spatialRounds, mode, gridSize);
    } else if (mode === 'reaction') {
      onStart(1, gameConfigs.reaction.trials, mode, 0);
    } else if (mode === 'numberMemory') {
      onStart(1, gameConfigs.numberMemory.startDigits, mode, 0);
    } else if (mode === 'sequence') {
      onStart(1, 1, mode, gameConfigs.sequence.gridSize);
    } else if (mode === 'stroop') {
      onStart(1, gameConfigs.stroop.durationSec, mode, 0);
    } else {
      // colorPerception / hippocampus: endless-level games, no numeric config
      onStart(1, 1, mode, 0);
    }
  };

  return (
    <div className="space-y-6 pt-8">
      <div className="text-center">
        <h1 className="text-4xl font-light text-zen-700 tracking-wider">{t('app.title')}</h1>
        <p className="text-sm text-zen-400 mt-2">{t('app.subtitle')}</p>
      </div>

      {/* Profile Summary Card */}
      <div className="bg-gradient-to-br from-sage-400 to-sage-500 rounded-2xl p-6 shadow-lg text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-medium">{t('home.profile')}</h2>
            <div className="px-2 py-0.5 rounded-full bg-white/20 text-xs font-bold tracking-wide whitespace-nowrap">
              LV{brainLevel}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
            <div className="text-2xl font-mono font-bold">{userProfile.maxNLevel || '-'}</div>
            <div className="text-xs text-white/80 mt-1">{t('home.maxLevel')}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
            <div className="text-2xl font-mono font-bold">{userProfile.totalScore}</div>
            <div className="text-xs text-white/80 mt-1">{t('home.totalScore')}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
            <div className="text-2xl font-mono font-bold">{userProfile.daysStreak}</div>
            <div className="text-xs text-white/80 mt-1">{t('home.streakDays')}</div>
          </div>
        </div>
      </div>

      {/* 游戏模式选择 */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-zen-200">
        <h2 className="text-lg font-medium text-zen-600 mb-4">{t('home.gameMode')}</h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setModeLocal('numeric')}
            className={`p-4 rounded-xl border-2 transition-all ${
              mode === 'numeric'
                ? 'border-sage-500 bg-sage-50'
                : 'border-zen-200 bg-white hover:border-sage-300'
            }`}
          >
            <div className="text-2xl mb-1">🔢</div>
            <div className="font-medium text-zen-700 text-sm">{t('home.numeric')}</div>
            <div className="text-xs text-zen-400 mt-1">{t('home.numericDesc')}</div>
          </button>

          <button
            onClick={() => setModeLocal('spatial')}
            className={`p-4 rounded-xl border-2 transition-all ${
              mode === 'spatial'
                ? 'border-teal-500 bg-teal-50'
                : 'border-zen-200 bg-white hover:border-teal-300'
            }`}
          >
            <div className="text-2xl mb-1">🎯</div>
            <div className="font-medium text-zen-700 text-sm">{t('home.spatial')}</div>
            <div className="text-xs text-zen-400 mt-1">{t('home.spatialDesc')}</div>
          </button>

          <button
            onClick={() => setModeLocal('mouse')}
            className={`p-4 rounded-xl border-2 transition-all ${
              mode === 'mouse'
                ? 'border-amber-500 bg-amber-50'
                : 'border-zen-200 bg-white hover:border-amber-300'
            }`}
          >
            <div className="text-2xl mb-1">🐭</div>
            <div className="font-medium text-zen-700 text-sm">{t('home.mouse')}</div>
            <div className="text-xs text-zen-400 mt-1">{t('home.mouseDesc')}</div>
          </button>

          <button
            onClick={() => setModeLocal('house')}
            className={`p-4 rounded-xl border-2 transition-all ${
              mode === 'house'
                ? 'border-purple-500 bg-purple-50'
                : 'border-zen-200 bg-white hover:border-purple-300'
            }`}
          >
            <div className="text-2xl mb-1">🏠</div>
            <div className="font-medium text-zen-700 text-sm">{t('home.house')}</div>
            <div className="text-xs text-zen-400 mt-1">{t('home.houseDesc')}</div>
          </button>

          <button
            onClick={() => setModeLocal('reaction')}
            className={`p-4 rounded-xl border-2 transition-all ${
              mode === 'reaction'
                ? 'border-rose-400 bg-rose-50'
                : 'border-zen-200 bg-white hover:border-rose-300'
            }`}
          >
            <div className="text-2xl mb-1">⚡</div>
            <div className="font-medium text-zen-700 text-sm">{t('home.reaction')}</div>
            <div className="text-xs text-zen-400 mt-1">{t('home.reactionDesc')}</div>
          </button>

          <button
            onClick={() => setModeLocal('numberMemory')}
            className={`p-4 rounded-xl border-2 transition-all ${
              mode === 'numberMemory'
                ? 'border-indigo-400 bg-indigo-50'
                : 'border-zen-200 bg-white hover:border-indigo-300'
            }`}
          >
            <div className="text-2xl mb-1">🧠</div>
            <div className="font-medium text-zen-700 text-sm">{t('home.numberMemory')}</div>
            <div className="text-xs text-zen-400 mt-1">{t('home.numberMemoryDesc')}</div>
          </button>

          <button
            onClick={() => setModeLocal('sequence')}
            className={`p-4 rounded-xl border-2 transition-all ${
              mode === 'sequence'
                ? 'border-cyan-500 bg-cyan-50'
                : 'border-zen-200 bg-white hover:border-cyan-300'
            }`}
          >
            <div className="text-2xl mb-1">🧩</div>
            <div className="font-medium text-zen-700 text-sm">{t('home.sequence')}</div>
            <div className="text-xs text-zen-400 mt-1">{t('home.sequenceDesc')}</div>
          </button>

          <button
            onClick={() => setModeLocal('stroop')}
            className={`p-4 rounded-xl border-2 transition-all ${
              mode === 'stroop'
                ? 'border-pink-400 bg-pink-50'
                : 'border-zen-200 bg-white hover:border-pink-300'
            }`}
          >
            <div className="text-2xl mb-1">🎨</div>
            <div className="font-medium text-zen-700 text-sm">{t('home.stroop')}</div>
            <div className="text-xs text-zen-400 mt-1">{t('home.stroopDesc')}</div>
          </button>

          <button
            onClick={() => setModeLocal('colorPerception')}
            className={`p-4 rounded-xl border-2 transition-all ${
              mode === 'colorPerception'
                ? 'border-lime-500 bg-lime-50'
                : 'border-zen-200 bg-white hover:border-lime-300'
            }`}
          >
            <div className="text-2xl mb-1">🌈</div>
            <div className="font-medium text-zen-700 text-sm">{t('home.colorPerception')}</div>
            <div className="text-xs text-zen-400 mt-1">{t('home.colorPerceptionDesc')}</div>
          </button>

          <button
            onClick={() => setModeLocal('hippocampus')}
            className={`p-4 rounded-xl border-2 transition-all ${
              mode === 'hippocampus'
                ? 'border-lime-500 bg-lime-50'
                : 'border-zen-200 bg-white hover:border-lime-300'
            }`}
          >
            <div className="text-2xl mb-1">🔢</div>
            <div className="font-medium text-zen-700 text-sm">{t('home.hippocampus')}</div>
            <div className="text-xs text-zen-400 mt-1">{t('home.hippocampusDesc')}</div>
          </button>
        </div>
      </div>

      {/* 配置面板 */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-zen-200 space-y-4">
        <h2 className="text-lg font-medium text-zen-600">{t('home.config')}</h2>

        {/* ===== N-Back 模式配置 ===== */}
        {isNBackMode && (
          <>
            <div className="flex items-center gap-4">
              <label className="text-sm text-zen-500 w-28">{t('home.nLevel')}</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateNLevel(Math.max(1, (mode === 'numeric' ? numericNLevel : spatialNLevel) - 1))}
                  disabled={(mode === 'numeric' ? numericNLevel : spatialNLevel) <= 1}
                  className="w-9 h-9 rounded-lg bg-zen-100 text-zen-600 hover:bg-zen-200 active:scale-95 transition-all
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-zen-100"
                >
                  −
                </button>
                <span className="text-2xl font-mono text-zen-700 w-10 text-center">
                  {mode === 'numeric' ? numericNLevel : spatialNLevel}
                </span>
                <button
                  onClick={() => updateNLevel(Math.min(12, (mode === 'numeric' ? numericNLevel : spatialNLevel) + 1))}
                  disabled={(mode === 'numeric' ? numericNLevel : spatialNLevel) >= 12}
                  className="w-9 h-9 rounded-lg bg-zen-100 text-zen-600 hover:bg-zen-200 active:scale-95 transition-all
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-zen-100"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="text-sm text-zen-500 w-28">{t('home.rounds')}</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateRounds((mode === 'numeric' ? numericRounds : spatialRounds) - 5)}
                  disabled={(mode === 'numeric' ? numericRounds : spatialRounds) <= (mode === 'numeric' ? numericMinRounds : spatialMinRounds)}
                  className="w-9 h-9 rounded-lg bg-zen-100 text-zen-600 hover:bg-zen-200 active:scale-95 transition-all
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-zen-100"
                >
                  −
                </button>
                <span className="text-2xl font-mono text-zen-700 w-12 text-center">
                  {mode === 'numeric' ? numericRounds : spatialRounds}
                </span>
                <button
                  onClick={() => updateRounds((mode === 'numeric' ? numericRounds : spatialRounds) + 5)}
                  disabled={(mode === 'numeric' ? numericRounds : spatialRounds) >= 30}
                  className="w-9 h-9 rounded-lg bg-zen-100 text-zen-600 hover:bg-zen-200 active:scale-95 transition-all
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-zen-100"
                >
                  +
                </button>
              </div>
            </div>

            {/* 网格大小选择（仅空间模式） */}
            {mode === 'spatial' && (
              <div className="flex items-center gap-4">
                <label className="text-sm text-zen-500 w-28">{t('home.gridSize')}</label>
                <div className="flex gap-2">
                  {[3, 4, 5].map((size) => (
                    <button
                      key={size}
                      onClick={() => updateGameConfig('spatial', { gridSize: size })}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        gridSize === size
                          ? 'bg-teal-500 text-white shadow-sm'
                          : 'bg-zen-100 text-zen-600 hover:bg-zen-200'
                      }`}
                    >
                      {size}×{size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!isConfigValid && (
              <div className="bg-red-50 rounded-lg p-3 text-xs text-red-700 border border-red-200">
                <div className="font-medium mb-1">{t('home.configError')}</div>
                <p>{t('home.configErrorMsg', {
                  n: mode === 'numeric' ? numericNLevel : spatialNLevel,
                  rounds: mode === 'numeric' ? numericRounds : spatialRounds,
                })}</p>
              </div>
            )}
          </>
        )}

        {/* ===== 魔鬼老鼠 配置 ===== */}
        {mode === 'mouse' && (
          <>
            {/* 老鼠个数 */}
            <div className="flex items-center gap-4">
              <label className="text-sm text-zen-500 font-medium w-28">{t('home.mouseCount')}</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateGameConfig('mouse', { count: Math.max(3, mouseCount - 1) })}
                  disabled={mouseCount <= 3}
                  className="w-9 h-9 rounded-lg bg-zen-100 text-zen-600 hover:bg-zen-200 active:scale-95 transition-all
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-zen-100"
                >
                  −
                </button>
                <span className="text-2xl font-mono text-zen-700 w-12 text-center">{effectiveMouseCount}</span>
                <button
                  onClick={() => updateGameConfig('mouse', { count: Math.min(Math.min(9, maxMice), mouseCount + 1) })}
                  disabled={mouseCount >= Math.min(9, maxMice)}
                  className="w-9 h-9 rounded-lg bg-zen-100 text-zen-600 hover:bg-zen-200 active:scale-95 transition-all
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-zen-100"
                >
                  +
                </button>
              </div>
            </div>

            {/* 网格大小 */}
            <div className="space-y-2">
              <label className="text-sm text-zen-500 font-medium">{t('home.mouseGrid')}</label>
              <div className="flex gap-2">
                {MOUSE_GRID_PRESETS.map(({ label, value }) => (
                  <button
                    key={label}
                    onClick={() => {
                      updateGameConfig('mouse', { grid: value });
                      const newMax = value[0] * value[1] - 1;
                      if (mouseCount > newMax) updateGameConfig('mouse', { count: Math.min(7, newMax) });
                    }}
                    className={`flex-1 py-2.5 rounded-lg font-medium transition-all text-sm ${
                      mouseGrid[0] === value[0] && mouseGrid[1] === value[1]
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'bg-zen-100 text-zen-600 hover:bg-amber-100'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 难度等级 */}
            <div className="space-y-2">
              <label className="text-sm text-zen-500 font-medium">{t('home.mouseDifficulty')}</label>
              <div className="grid grid-cols-4 gap-2">
                {(Object.entries(MOUSE_DIFFICULTY_MAP) as [MouseDifficultyLevel, { label: string; pushes: number }][]).map(
                  ([key, { label }]) => (
                    <button
                      key={key}
                      onClick={() => updateGameConfig('mouse', { difficulty: key })}
                      className={`py-3 rounded-lg font-medium transition-all ${
                        mouseDifficulty === key
                          ? key === 'hell'
                            ? 'bg-red-500 text-white shadow-sm'
                            : 'bg-amber-500 text-white shadow-sm'
                          : 'bg-zen-100 text-zen-600 hover:bg-amber-100'
                      }`}
                    >
                      {label}
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* 挑战轮数 */}
            <div className="flex items-center gap-4">
              <label className="text-sm text-zen-500 w-28">{t('home.mouseRounds')}</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateGameConfig('mouse', { rounds: Math.max(3, mouseRounds - 1) })}
                  disabled={mouseRounds <= 3}
                  className="w-9 h-9 rounded-lg bg-zen-100 text-zen-600 hover:bg-zen-200 active:scale-95 transition-all
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-zen-100"
                >
                  −
                </button>
                <span className="text-2xl font-mono text-zen-700 w-12 text-center">{mouseRounds}</span>
                <button
                  onClick={() => updateGameConfig('mouse', { rounds: Math.min(5, mouseRounds + 1) })}
                  disabled={mouseRounds >= 5}
                  className="w-9 h-9 rounded-lg bg-zen-100 text-zen-600 hover:bg-zen-200 active:scale-95 transition-all
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-zen-100"
                >
                  +
                </button>
              </div>
            </div>
          </>
        )}

        {/* ===== 人来人往 配置 ===== */}
        {mode === 'house' && (
          <>
            {/* 初始人数 */}
            <div className="flex items-center gap-4">
              <label className="text-sm text-zen-500 font-medium w-28">{t('home.houseInitial')}</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateGameConfig('house', { initialPeople: Math.max(3, houseInitial - 1) })}
                  disabled={houseInitial <= 3}
                  className="w-9 h-9 rounded-lg bg-zen-100 text-zen-600 hover:bg-zen-200 active:scale-95 transition-all
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-zen-100"
                >
                  −
                </button>
                <span className="text-2xl font-mono text-zen-700 w-12 text-center">{houseInitial}</span>
                <button
                  onClick={() => updateGameConfig('house', { initialPeople: Math.min(7, houseInitial + 1) })}
                  disabled={houseInitial >= 7}
                  className="w-9 h-9 rounded-lg bg-zen-100 text-zen-600 hover:bg-zen-200 active:scale-95 transition-all
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-zen-100"
                >
                  +
                </button>
              </div>
            </div>

            {/* 事件数量 */}
            <div className="flex items-center gap-4">
              <label className="text-sm text-zen-500 font-medium w-28">{t('home.houseEvents')}</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateGameConfig('house', { eventCount: Math.max(6, houseEvents - 3) })}
                  disabled={houseEvents <= 6}
                  className="w-9 h-9 rounded-lg bg-zen-100 text-zen-600 hover:bg-zen-200 active:scale-95 transition-all
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-zen-100"
                >
                  −
                </button>
                <span className="text-2xl font-mono text-zen-700 w-12 text-center">{houseEvents}</span>
                <button
                  onClick={() => updateGameConfig('house', { eventCount: Math.min(24, houseEvents + 3) })}
                  disabled={houseEvents >= 24}
                  className="w-9 h-9 rounded-lg bg-zen-100 text-zen-600 hover:bg-zen-200 active:scale-95 transition-all
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-zen-100"
                >
                  +
                </button>
              </div>
            </div>

            {/* 速度选择 */}
            <div className="space-y-2">
              <label className="text-sm text-zen-500 font-medium">{t('home.houseSpeed')}</label>
              <div className="flex gap-2">
                {(['easy', 'normal', 'fast'] as const).map((speed) => (
                  <button
                    key={speed}
                    onClick={() => updateGameConfig('house', { speed })}
                    className={`flex-1 py-2.5 rounded-lg font-medium transition-all text-sm ${
                      houseSpeed === speed
                        ? 'bg-purple-500 text-white shadow-sm'
                        : 'bg-zen-100 text-zen-600 hover:bg-purple-100'
                    }`}
                  >
                    {t(`speed.${speed}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* 轮次数量 */}
            <div className="flex items-center gap-4">
              <label className="text-sm text-zen-500 font-medium w-28">{t('home.houseRounds')}</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateGameConfig('house', { rounds: Math.max(3, houseRounds - 1) })}
                  disabled={houseRounds <= 3}
                  className="w-9 h-9 rounded-lg bg-zen-100 text-zen-600 hover:bg-zen-200 active:scale-95 transition-all
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-zen-100"
                >
                  −
                </button>
                <span className="text-2xl font-mono text-zen-700 w-12 text-center">{houseRounds}</span>
                <button
                  onClick={() => updateGameConfig('house', { rounds: Math.min(5, houseRounds + 1) })}
                  disabled={houseRounds >= 5}
                  className="w-9 h-9 rounded-lg bg-zen-100 text-zen-600 hover:bg-zen-200 active:scale-95 transition-all
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-zen-100"
                >
                  +
                </button>
              </div>
            </div>
          </>
        )}

        {/* 玩法说明 */}
        <div className="bg-sage-50 rounded-lg p-3 text-xs text-sage-700 border border-sage-200">
          <div className="font-medium mb-1">{t('home.howToPlay')}</div>
          <p>
            {mode === 'numeric'
              ? t('home.numericHelp', { n: numericNLevel })
              : mode === 'spatial'
              ? t('home.spatialHelp', { grid: gridSize, n: spatialNLevel })
              : mode === 'mouse'
              ? t('home.mouseHelp', {
                  mice: effectiveMouseCount,
                  cats: mouseGrid[0] * mouseGrid[1] - effectiveMouseCount,
                  grid: `${mouseGrid[0]}×${mouseGrid[1]}`,
                  pushes: MOUSE_DIFFICULTY_MAP[mouseDifficulty].pushes
                })
              : mode === 'house'
              ? t('home.houseHelp', {
                  initial: houseInitial,
                  events: houseEvents,
                  speed: t(`speed.${houseSpeed}`)
                })
              : mode === 'reaction'
              ? t('home.reactionHelp')
              : mode === 'numberMemory'
              ? t('home.numberMemoryHelp')
              : mode === 'sequence'
              ? t('home.sequenceHelp')
              : mode === 'stroop'
              ? t('home.stroopHelp')
              : mode === 'colorPerception'
              ? t('home.colorPerceptionHelp')
              : t('home.hippocampusHelp')
            }
          </p>
        </div>
      </div>

      {/* 开始按钮 */}
      <button
        onClick={handleStart}
        disabled={!isConfigValid}
        className="w-full py-4 rounded-xl bg-sage-500 text-white text-lg font-medium
                   hover:bg-sage-600 active:scale-[0.98] transition-all shadow-sm
                   disabled:bg-zen-300 disabled:cursor-not-allowed disabled:hover:bg-zen-300"
      >
        {mode === 'mouse'
          ? t('home.startMouse', { difficulty: MOUSE_DIFFICULTY_MAP[mouseDifficulty].label, rounds: mouseRounds })
          : mode === 'house'
          ? t('home.startHouse', { speed: t(`speed.${houseSpeed}`), rounds: houseRounds })
          : mode === 'reaction'
          ? t('home.startReaction')
          : mode === 'numberMemory'
          ? t('home.startNumberMemory')
          : mode === 'sequence'
          ? t('home.startSequence')
          : mode === 'stroop'
          ? t('home.startStroop')
          : mode === 'colorPerception'
          ? t('home.startColorPerception')
          : mode === 'hippocampus'
          ? t('home.startHippocampus')
          : t('home.startNBack', {
              n: mode === 'numeric' ? numericNLevel : spatialNLevel,
              mode: mode === 'numeric' ? t('home.numeric') : t('home.spatial'),
              rounds: mode === 'numeric' ? numericRounds : spatialRounds,
            })
        }
      </button>

      {/* 全部游戏目录（SEO 内链） */}
      <section className="bg-white rounded-xl p-6 shadow-sm border border-zen-200">
        <h2 className="text-lg font-medium text-zen-600 mb-4">{t('gameLanding.allGames')}</h2>
        <div className="grid grid-cols-3 gap-3">
          {GAME_CATALOG.map((g) => (
            <Link
              key={g.slug}
              to={`/games/${g.slug}`}
              className="p-3 rounded-xl border border-zen-200 text-center
                         hover:border-sage-300 hover:bg-sage-50 transition-all"
            >
              <div className="text-2xl mb-1" aria-hidden="true">{g.emoji}</div>
              <div className="text-xs text-zen-600">{t(g.titleKey)}</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
