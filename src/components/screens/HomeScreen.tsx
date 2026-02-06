import { useState } from 'react';
import type { UserProfile, GameMode, MouseDifficultyLevel, MouseGridPreset } from '../../types/game';
import { MOUSE_GRID_PRESETS, MOUSE_DIFFICULTY_MAP, buildMouseGameConfig } from '../../types/game';
import type { MouseGameConfig } from '../../types/game';

interface HomeScreenProps {
  initialNLevel: number;
  initialRounds: number;
  initialMode: GameMode;
  initialGridSize: number;
  userProfile: UserProfile;
  onStart: (nLevel: number, rounds: number, mode: GameMode, gridSize: number, mouseConfig?: MouseGameConfig) => void;
}

/**
 * HomeScreen - 首页配置界面（支持多模式选择）
 */
export function HomeScreen({ initialNLevel, initialRounds, initialMode, initialGridSize, userProfile, onStart }: HomeScreenProps) {
  const [mode, setMode] = useState<GameMode>(initialMode);

  // Separate config state for numeric mode
  const [numericNLevel, setNumericNLevel] = useState(initialMode === 'numeric' ? initialNLevel : 2);
  const [numericRounds, setNumericRounds] = useState(initialMode === 'numeric' ? initialRounds : 10);
  
  // Separate config state for spatial mode
  const [spatialNLevel, setSpatialNLevel] = useState(initialMode === 'spatial' ? initialNLevel : 2);
  const [spatialRounds, setSpatialRounds] = useState(initialMode === 'spatial' ? initialRounds : 10);
  const [gridSize, setGridSize] = useState(initialGridSize);

  // Mouse mode config state
  const [mouseCount, setMouseCount] = useState(3);
  const [mouseGrid, setMouseGrid] = useState<MouseGridPreset>([4, 3]);
  const [mouseDifficulty, setMouseDifficulty] = useState<MouseDifficultyLevel>('easy');
  const [mouseRounds, setMouseRounds] = useState(5);

  // Determine current N-Back config based on mode
  const nLevel = mode === 'numeric' ? numericNLevel : spatialNLevel;
  const rounds = mode === 'numeric' ? numericRounds : spatialRounds;
  
  // Validate N-Back config
  const isNBackMode = mode === 'numeric' || mode === 'spatial';
  const isConfigValid = isNBackMode ? nLevel < rounds : true;

  // Mouse config validation: mice must fit in grid
  const maxMice = mouseGrid[0] * mouseGrid[1] - 1;
  const effectiveMouseCount = Math.min(mouseCount, maxMice);

  const handleStart = () => {
    if (mode === 'mouse') {
      const mConfig = buildMouseGameConfig(effectiveMouseCount, mouseGrid, mouseDifficulty, mouseRounds);
      onStart(1, mouseRounds, mode, mouseGrid[0], mConfig);
    } else {
      onStart(nLevel, rounds, mode, gridSize);
    }
  };

  return (
    <div className="space-y-6 pt-8">
      <div className="text-center">
        <h1 className="text-4xl font-light text-zen-700 tracking-wider">脑力心流</h1>
        <p className="text-sm text-zen-400 mt-2">Brain Training System</p>
      </div>

      {/* Profile Summary Card */}
      <div className="bg-gradient-to-br from-sage-400 to-sage-500 rounded-2xl p-6 shadow-lg text-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">个人档案</h2>
          {userProfile.daysStreak > 0 && (
            <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium">
              🔥 {userProfile.daysStreak} 天连续
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
            <div className="text-2xl font-mono font-bold">{userProfile.maxNLevel || '-'}</div>
            <div className="text-xs text-white/80 mt-1">最高等级</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
            <div className="text-2xl font-mono font-bold">{userProfile.totalScore}</div>
            <div className="text-xs text-white/80 mt-1">累计积分</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
            <div className="text-2xl font-mono font-bold">{userProfile.daysStreak}</div>
            <div className="text-xs text-white/80 mt-1">连续天数</div>
          </div>
        </div>
      </div>

      {/* 游戏模式选择 */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-zen-200">
        <h2 className="text-lg font-medium text-zen-600 mb-4">游戏模式</h2>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setMode('numeric')}
            className={`p-4 rounded-xl border-2 transition-all ${
              mode === 'numeric'
                ? 'border-sage-500 bg-sage-50'
                : 'border-zen-200 bg-white hover:border-sage-300'
            }`}
          >
            <div className="text-2xl mb-1">🔢</div>
            <div className="font-medium text-zen-700 text-sm">数字心流</div>
            <div className="text-xs text-zen-400 mt-1">延迟回忆算式</div>
          </button>
          
          <button
            onClick={() => setMode('spatial')}
            className={`p-4 rounded-xl border-2 transition-all ${
              mode === 'spatial'
                ? 'border-teal-500 bg-teal-50'
                : 'border-zen-200 bg-white hover:border-teal-300'
            }`}
          >
            <div className="text-2xl mb-1">🎯</div>
            <div className="font-medium text-zen-700 text-sm">空间心流</div>
            <div className="text-xs text-zen-400 mt-1">记忆网格位置</div>
          </button>

          <button
            onClick={() => setMode('mouse')}
            className={`p-4 rounded-xl border-2 transition-all ${
              mode === 'mouse'
                ? 'border-amber-500 bg-amber-50'
                : 'border-zen-200 bg-white hover:border-amber-300'
            }`}
          >
            <div className="text-2xl mb-1">🐭</div>
            <div className="font-medium text-zen-700 text-sm">魔鬼老鼠</div>
            <div className="text-xs text-zen-400 mt-1">追踪推挤位置</div>
          </button>
        </div>
      </div>

      {/* 配置面板 */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-zen-200 space-y-4">
        <h2 className="text-lg font-medium text-zen-600">训练配置</h2>

        {/* ===== N-Back 模式配置 ===== */}
        {isNBackMode && (
          <>
            <div className="flex items-center gap-4">
              <label className="text-sm text-zen-500 w-28">N 值 (回溯):</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (mode === 'numeric') {
                      setNumericNLevel((n) => Math.max(2, n - 1));
                    } else {
                      setSpatialNLevel((n) => Math.max(2, n - 1));
                    }
                  }}
                  disabled={nLevel <= 2}
                  className="w-9 h-9 rounded-lg bg-zen-100 text-zen-600 hover:bg-zen-200 active:scale-95 transition-all
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-zen-100"
                >
                  −
                </button>
                <span className="text-2xl font-mono text-zen-700 w-10 text-center">{nLevel}</span>
                <button
                  onClick={() => {
                    if (mode === 'numeric') {
                      setNumericNLevel((n) => Math.min(Math.min(12, numericRounds - 1), n + 1));
                    } else {
                      setSpatialNLevel((n) => Math.min(Math.min(12, spatialRounds - 1), n + 1));
                    }
                  }}
                  disabled={nLevel >= Math.min(12, rounds - 1)}
                  className="w-9 h-9 rounded-lg bg-zen-100 text-zen-600 hover:bg-zen-200 active:scale-95 transition-all
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-zen-100"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="text-sm text-zen-500 w-28">题目数量:</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (mode === 'numeric') {
                      setNumericRounds((r) => Math.max(5, r - 5));
                    } else {
                      setSpatialRounds((r) => Math.max(5, r - 5));
                    }
                  }}
                  className="w-9 h-9 rounded-lg bg-zen-100 text-zen-600 hover:bg-zen-200 active:scale-95 transition-all"
                >
                  −
                </button>
                <span className="text-2xl font-mono text-zen-700 w-12 text-center">{rounds}</span>
                <button
                  onClick={() => {
                    if (mode === 'numeric') {
                      setNumericRounds((r) => Math.min(30, r + 5));
                    } else {
                      setSpatialRounds((r) => Math.min(30, r + 5));
                    }
                  }}
                  className="w-9 h-9 rounded-lg bg-zen-100 text-zen-600 hover:bg-zen-200 active:scale-95 transition-all"
                >
                  +
                </button>
              </div>
            </div>

            {/* 网格大小选择（仅空间模式） */}
            {mode === 'spatial' && (
              <div className="flex items-center gap-4">
                <label className="text-sm text-zen-500 w-28">网格大小:</label>
                <div className="flex gap-2">
                  {[3, 4, 5].map((size) => (
                    <button
                      key={size}
                      onClick={() => setGridSize(size)}
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
                <div className="font-medium mb-1">⚠️ 配置错误</div>
                <p>N 值必须小于题目数量！当前 N={nLevel}，题目={rounds}</p>
              </div>
            )}
          </>
        )}

        {/* ===== 魔鬼老鼠 配置 ===== */}
        {mode === 'mouse' && (
          <>
            {/* 老鼠个数 */}
            <div className="flex items-center gap-4">
              <label className="text-sm text-zen-500 font-medium w-28">🐭 老鼠个数</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMouseCount((n) => Math.max(3, n - 1))}
                  disabled={mouseCount <= 3}
                  className="w-9 h-9 rounded-lg bg-zen-100 text-zen-600 hover:bg-zen-200 active:scale-95 transition-all
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-zen-100"
                >
                  −
                </button>
                <span className="text-2xl font-mono text-zen-700 w-12 text-center">{effectiveMouseCount}</span>
                <button
                  onClick={() => setMouseCount((n) => Math.min(Math.min(9, maxMice), n + 1))}
                  disabled={mouseCount >= maxMice || mouseCount >= 9}
                  className="w-9 h-9 rounded-lg bg-zen-100 text-zen-600 hover:bg-zen-200 active:scale-95 transition-all
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-zen-100"
                >
                  +
                </button>
              </div>
            </div>

            {/* 网格大小 */}
            <div className="space-y-2">
              <label className="text-sm text-zen-500 font-medium">📐 网格大小</label>
              <div className="flex gap-2">
                {MOUSE_GRID_PRESETS.map(({ label, value }) => (
                  <button
                    key={label}
                    onClick={() => {
                      setMouseGrid(value);
                      // Auto-clamp mouse count if grid is too small
                      const newMax = value[0] * value[1] - 1;
                      if (mouseCount > newMax) setMouseCount(Math.min(7, newMax));
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
              <label className="text-sm text-zen-500 font-medium">💪 难度等级</label>
              <div className="grid grid-cols-4 gap-2">
                {(Object.entries(MOUSE_DIFFICULTY_MAP) as [MouseDifficultyLevel, { label: string; pushes: number }][]).map(
                  ([key, { label, pushes }]) => (
                    <button
                      key={key}
                      onClick={() => setMouseDifficulty(key)}
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
              <label className="text-sm text-zen-500 w-28">挑战轮数:</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMouseRounds((r) => Math.max(3, r - 1))}
                  className="w-9 h-9 rounded-lg bg-zen-100 text-zen-600 hover:bg-zen-200 active:scale-95 transition-all"
                >
                  −
                </button>
                <span className="text-2xl font-mono text-zen-700 w-12 text-center">{mouseRounds}</span>
                <button
                  onClick={() => setMouseRounds((r) => Math.min(20, r + 1))}
                  className="w-9 h-9 rounded-lg bg-zen-100 text-zen-600 hover:bg-zen-200 active:scale-95 transition-all"
                >
                  +
                </button>
              </div>
            </div>
          </>
        )}

        {/* 玩法说明 */}
        <div className="bg-sage-50 rounded-lg p-3 text-xs text-sage-700 border border-sage-200">
          <div className="font-medium mb-1">🧠 玩法说明</div>
          <p>
            {mode === 'numeric' 
              ? `屏幕会依次显示算式。你需要记住每道题的答案，并在 ${nLevel} 轮后输入那道题的答案。`
              : mode === 'spatial'
              ? `屏幕会在${gridSize}×${gridSize}网格中高亮位置。你需要记住每轮的位置，并在 ${nLevel} 轮后点击那个位置。`
              : `${effectiveMouseCount}只老鼠和${mouseGrid[0] * mouseGrid[1] - effectiveMouseCount}只猫在${mouseGrid[0]}×${mouseGrid[1]}网格中。记住老鼠位置后，猫会${MOUSE_DIFFICULTY_MAP[mouseDifficulty].pushes}次从边缘推入，挤动一整行/列。你需要追踪老鼠最终位置并找出它们。`
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
          ? `开始 魔鬼老鼠 ${MOUSE_DIFFICULTY_MAP[mouseDifficulty].label} (${mouseRounds} 轮)`
          : `开始 ${nLevel}-Back ${mode === 'numeric' ? '数字' : '空间'}训练 (${rounds} 题)`
        }
      </button>
    </div>
  );
}
