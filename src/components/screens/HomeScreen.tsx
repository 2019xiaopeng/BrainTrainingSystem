import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import type { UserProfile, GameMode, MouseDifficultyLevel, MouseGridPreset, HouseSpeed } from '../../types/game';
import { MOUSE_GRID_PRESETS, MOUSE_DIFFICULTY_MAP, buildMouseGameConfig, buildHouseGameConfig } from '../../types/game';
import type { MouseGameConfig, HouseGameConfig } from '../../types/game';
import { CampaignMapView } from '../campaign/CampaignMapView';

interface HomeScreenProps {
  initialMode: GameMode;
  initialHomeView?: 'training' | 'campaign';
  userProfile: UserProfile;
  onStart: (nLevel: number, rounds: number, mode: GameMode, gridSize: number, mouseConfig?: MouseGameConfig, houseConfig?: HouseGameConfig) => void;
}

/**
 * HomeScreen - 首页配置界面（支持多模式选择）
 */
export function HomeScreen({ initialMode, initialHomeView = 'training', userProfile, onStart }: HomeScreenProps) {
  const { t } = useTranslation();
  const { gameConfigs, updateGameConfig, setActiveCampaignRun, lastCampaignUpdate } = useGameStore();
  const [mode, setMode] = useState<GameMode>(initialMode);
  const [homeView, setHomeView] = useState<'training' | 'campaign'>(initialHomeView);

  // Separate config state for numeric mode (use saved config or defaults)
  const [numericNLevel, setNumericNLevel] = useState(gameConfigs.numeric.nLevel);
  const [numericRounds, setNumericRounds] = useState(gameConfigs.numeric.rounds);
  
  // Separate config state for spatial mode (use saved config or defaults)
  const [spatialNLevel, setSpatialNLevel] = useState(gameConfigs.spatial.nLevel);
  const [spatialRounds, setSpatialRounds] = useState(gameConfigs.spatial.rounds);
  const [gridSize, setGridSize] = useState(gameConfigs.spatial.gridSize);

  // Mouse mode config state (use saved config or defaults)
  const [mouseCount, setMouseCount] = useState(gameConfigs.mouse.count);
  const [mouseGrid, setMouseGrid] = useState<MouseGridPreset>(gameConfigs.mouse.grid);
  const [mouseDifficulty, setMouseDifficulty] = useState<MouseDifficultyLevel>(gameConfigs.mouse.difficulty);
  const [mouseRounds, setMouseRounds] = useState(gameConfigs.mouse.rounds);

  // House mode config state (with fallback defaults for backward compatibility)
  const [houseInitial, setHouseInitial] = useState(() => Math.max(3, Math.min(gameConfigs.house?.initialPeople ?? 3, 7)));
  const [houseEvents, setHouseEvents] = useState(() => Math.max(5, Math.min(gameConfigs.house?.eventCount ?? 5, 15)));
  const [houseSpeed, setHouseSpeed] = useState<HouseSpeed>((gameConfigs.house?.speed as HouseSpeed) ?? 'easy');
  const [houseRounds, setHouseRounds] = useState(() => Math.max(3, Math.min(gameConfigs.house?.rounds ?? 3, 5)));

  // Determine current N-Back config based on mode
  const nLevel = mode === 'numeric' ? numericNLevel : spatialNLevel;
  const rounds = mode === 'numeric' ? numericRounds : spatialRounds;
  
  // Sync changes to localStorage
  useEffect(() => {
    updateGameConfig('numeric', { nLevel: numericNLevel, rounds: numericRounds });
  }, [numericNLevel, numericRounds, updateGameConfig]);

  useEffect(() => {
    updateGameConfig('spatial', { nLevel: spatialNLevel, rounds: spatialRounds, gridSize });
  }, [spatialNLevel, spatialRounds, gridSize, updateGameConfig]);

  useEffect(() => {
    updateGameConfig('mouse', { count: mouseCount, grid: mouseGrid, difficulty: mouseDifficulty, rounds: mouseRounds });
  }, [mouseCount, mouseGrid, mouseDifficulty, mouseRounds, updateGameConfig]);

  useEffect(() => {
    updateGameConfig('house', { initialPeople: houseInitial, eventCount: houseEvents, speed: houseSpeed, rounds: houseRounds });
  }, [houseInitial, houseEvents, houseSpeed, houseRounds, updateGameConfig]);

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
    } else if (mode === 'house') {
      const hConfig = buildHouseGameConfig(houseInitial, houseEvents, houseSpeed, houseRounds);
      onStart(1, houseRounds, mode, 0, undefined, hConfig);
    } else {
      onStart(nLevel, rounds, mode, gridSize);
    }
  };

  return (
    <div className="space-y-6 pt-8">
      <div className="text-center">
        <h1 className="text-4xl font-light text-zen-700 tracking-wider">{t('app.title')}</h1>
        <p className="text-sm text-zen-400 mt-2">{t('app.subtitle')}</p>
      </div>

      {/* View Tab Switcher: 自由训练 / 闯关模式 */}
      <div className="flex gap-2 bg-zen-100 rounded-xl p-1">
        <button
          onClick={() => setHomeView('training')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
            homeView === 'training'
              ? 'bg-white text-sage-700 shadow-sm'
              : 'text-zen-500 hover:text-zen-700'
          }`}
        >
          {t('home.freeTraining')}
        </button>
        <button
          onClick={() => setHomeView('campaign')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
            homeView === 'campaign'
              ? 'bg-white text-sage-700 shadow-sm'
              : 'text-zen-500 hover:text-zen-700'
          }`}
        >
          {t('home.campaignMode')}
        </button>
      </div>

      {homeView === 'campaign' && (
        <CampaignMapView
          userProfile={userProfile}
          onStart={onStart}
          onSetActiveCampaignRun={setActiveCampaignRun}
          lastCampaignUpdate={lastCampaignUpdate}
        />
      )}

      {homeView === 'training' && (<>

      {/* Profile Summary Card */}
      <div className="bg-gradient-to-br from-sage-400 to-sage-500 rounded-2xl p-6 shadow-lg text-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">{t('home.profile')}</h2>
          {userProfile.daysStreak > 0 && (
            <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium">
              {t('home.streak', { days: userProfile.daysStreak })}
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
            <div className="text-2xl font-mono font-bold">{userProfile.maxNLevel || '-'}</div>
            <div className="text-xs text-white/80 mt-1">{t('home.maxLevel')}</div>
          </div>
          <div className=" bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
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
            onClick={() => setMode('numeric')}
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
            onClick={() => setMode('spatial')}
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
            onClick={() => setMode('mouse')}
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
            onClick={() => setMode('house')}
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
                  onClick={() => {
                    if (mode === 'numeric') {
                      setNumericNLevel((n) => Math.max(1, n - 1));
                    } else {
                      setSpatialNLevel((n) => Math.max(1, n - 1));
                    }
                  }}
                  disabled={nLevel <= 1}
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
              <label className="text-sm text-zen-500 w-28">{t('home.rounds')}</label>
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
                <label className="text-sm text-zen-500 w-28">{t('home.gridSize')}</label>
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
                <div className="font-medium mb-1">{t('home.configError')}</div>
                <p>{t('home.configErrorMsg', { n: nLevel, rounds })}</p>
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
              <label className="text-sm text-zen-500 font-medium">{t('home.mouseGrid')}</label>
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
              <label className="text-sm text-zen-500 font-medium">{t('home.mouseDifficulty')}</label>
              <div className="grid grid-cols-4 gap-2">
                {(Object.entries(MOUSE_DIFFICULTY_MAP) as [MouseDifficultyLevel, { label: string; pushes: number }][]).map(
                  ([key]) => (
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
                      {t(`difficulty.${key}`)}
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
                  onClick={() => setMouseRounds((r) => Math.max(3, r - 1))}
                  disabled={mouseRounds <= 3}
                  className="w-9 h-9 rounded-lg bg-zen-100 text-zen-600 hover:bg-zen-200 active:scale-95 transition-all
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-zen-100"
                >
                  −
                </button>
                <span className="text-2xl font-mono text-zen-700 w-12 text-center">{mouseRounds}</span>
                <button
                  onClick={() => setMouseRounds((r) => Math.min(5, r + 1))}
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
                  onClick={() => setHouseInitial((n) => Math.max(3, n - 1))}
                  disabled={houseInitial <= 3}
                  className="w-9 h-9 rounded-lg bg-zen-100 text-zen-600 hover:bg-zen-200 active:scale-95 transition-all
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-zen-100"
                >
                  −
                </button>
                <span className="text-2xl font-mono text-zen-700 w-12 text-center">{houseInitial}</span>
                <button
                  onClick={() => setHouseInitial((n) => Math.min(7, n + 1))}
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
                  onClick={() => setHouseEvents((n) => Math.max(5, n - 1))}
                  disabled={houseEvents <= 5}
                  className="w-9 h-9 rounded-lg bg-zen-100 text-zen-600 hover:bg-zen-200 active:scale-95 transition-all
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-zen-100"
                >
                  −
                </button>
                <span className="text-2xl font-mono text-zen-700 w-12 text-center">{houseEvents}</span>
                <button
                  onClick={() => setHouseEvents((n) => Math.min(15, n + 1))}
                  disabled={houseEvents >= 15}
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
                    onClick={() => setHouseSpeed(speed)}
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
                  onClick={() => setHouseRounds((n) => Math.max(3, n - 1))}
                  disabled={houseRounds <= 3}
                  className="w-9 h-9 rounded-lg bg-zen-100 text-zen-600 hover:bg-zen-200 active:scale-95 transition-all
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-zen-100"
                >
                  −
                </button>
                <span className="text-2xl font-mono text-zen-700 w-12 text-center">{houseRounds}</span>
                <button
                  onClick={() => setHouseRounds((n) => Math.min(5, n + 1))}
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
              ? t('home.numericHelp', { n: nLevel })
              : mode === 'spatial'
              ? t('home.spatialHelp', { grid: gridSize, n: nLevel })
              : mode === 'mouse'
              ? t('home.mouseHelp', { 
                  mice: effectiveMouseCount, 
                  cats: mouseGrid[0] * mouseGrid[1] - effectiveMouseCount,
                  grid: `${mouseGrid[0]}×${mouseGrid[1]}`,
                  pushes: MOUSE_DIFFICULTY_MAP[mouseDifficulty].pushes
                })
              : t('home.houseHelp', {
                  initial: houseInitial,
                  events: houseEvents,
                  speed: t(`speed.${houseSpeed}`)
                })
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
          ? t('home.startMouse', { difficulty: t(`difficulty.${mouseDifficulty}`), rounds: mouseRounds })
          : mode === 'house'
          ? t('home.startHouse', { speed: t(`speed.${houseSpeed}`), rounds: houseRounds })
          : t('home.startNBack', { n: nLevel, mode: mode === 'numeric' ? t('home.numeric') : t('home.spatial'), rounds })
        }
      </button>

      </>)}
    </div>
  );
}
