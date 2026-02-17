import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { HomeScreen } from '../screens/HomeScreen';
import type { GameMode, MouseGameConfig, HouseGameConfig, MouseDifficultyLevel, MouseGridPreset, HouseSpeed } from '../../types/game';
import { MOUSE_DIFFICULTY_MAP, HOUSE_SPEED_MAP } from '../../types/game';

/** Reverse-map numPushes → difficulty string */
const pushesToDifficulty = (numPushes: number): MouseDifficultyLevel => {
  for (const [key, val] of Object.entries(MOUSE_DIFFICULTY_MAP)) {
    if (val.pushes === numPushes) return key as MouseDifficultyLevel;
  }
  return 'easy';
};

/** Reverse-map delayRange → speed string */
const delayRangeToSpeed = (delayRange: [number, number]): HouseSpeed => {
  for (const [key, val] of Object.entries(HOUSE_SPEED_MAP)) {
    if (val.delayRange[0] === delayRange[0] && val.delayRange[1] === delayRange[1]) return key as HouseSpeed;
  }
  return 'easy';
};

/**
 * HomePage - 首页路由页
 * 桥接 HomeScreen 与路由导航
 */
export function HomePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { setNextConfig, updateGameConfig, userProfile, nextConfig, recalculateEnergy, consumeEnergy } = useGameStore();

  const handleStart = useCallback(
    (nLevel: number, rounds: number, mode: GameMode, gridSize: number, mouseConfig?: MouseGameConfig, houseConfig?: HouseGameConfig) => {
      // Recalculate energy before checking
      recalculateEnergy();
      
      // Check and consume energy
      if (!consumeEnergy()) {
        alert(t('energy.insufficient'));
        return;
      }
      
      // 保存配置到 store（转换为 store 格式，TrainPage 会读取 store 格式的 key）
      if (mode === 'mouse' && mouseConfig) {
        updateGameConfig('mouse', {
          count: mouseConfig.numMice,
          grid: [mouseConfig.cols, mouseConfig.rows] as MouseGridPreset,
          difficulty: pushesToDifficulty(mouseConfig.numPushes),
          rounds: mouseConfig.totalRounds,
        });
      }
      if (mode === 'house' && houseConfig) {
        updateGameConfig('house', {
          initialPeople: houseConfig.initialPeople,
          eventCount: houseConfig.eventCount,
          speed: delayRangeToSpeed(houseConfig.delayRange),
          rounds: houseConfig.totalRounds,
        });
      }
      setNextConfig({ nLevel, totalRounds: rounds, mode, gridSize });
      navigate(`/train/${mode}`);
    },
    [setNextConfig, updateGameConfig, navigate, t, recalculateEnergy, consumeEnergy]
  );

  return (
    <HomeScreen
      initialMode={nextConfig.mode}
      userProfile={userProfile}
      onStart={handleStart}
    />
  );
}
