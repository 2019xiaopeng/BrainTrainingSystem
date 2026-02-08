import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { HomeScreen } from '../screens/HomeScreen';
import { HOUSE_SPEED_MAP, MOUSE_DIFFICULTY_MAP } from '../../types/game';
import type { GameMode, MouseGameConfig, HouseGameConfig, MouseDifficultyLevel, HouseSpeed } from '../../types/game';

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
      
      // 保存配置到 store，TrainPage 会读取
      if (mode === 'mouse' && mouseConfig) {
        const difficulty =
          (Object.keys(MOUSE_DIFFICULTY_MAP) as MouseDifficultyLevel[]).find(
            (k) => MOUSE_DIFFICULTY_MAP[k].pushes === mouseConfig.numPushes
          ) ?? 'easy';

        updateGameConfig('mouse', {
          count: mouseConfig.numMice,
          grid: [mouseConfig.cols, mouseConfig.rows],
          difficulty,
          rounds: mouseConfig.totalRounds,
        });
      }

      if (mode === 'house' && houseConfig) {
        const speed =
          (Object.keys(HOUSE_SPEED_MAP) as HouseSpeed[]).find((k) => {
            const [min, max] = HOUSE_SPEED_MAP[k].delayRange;
            return min === houseConfig.delayRange[0] && max === houseConfig.delayRange[1];
          }) ?? 'easy';

        updateGameConfig('house', {
          initialPeople: houseConfig.initialPeople,
          eventCount: houseConfig.eventCount,
          speed,
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
