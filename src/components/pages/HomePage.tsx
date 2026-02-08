import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import { HomeScreen } from '../screens/HomeScreen';
import type { GameMode, MouseGameConfig, HouseGameConfig } from '../../types/game';

/**
 * HomePage - 首页路由页
 * 桥接 HomeScreen 与路由导航
 */
export function HomePage() {
  const navigate = useNavigate();
  const { setNextConfig, userProfile, nextConfig } = useGameStore();

  const handleStart = useCallback(
    (nLevel: number, rounds: number, mode: GameMode, gridSize: number, _mouseConfig?: MouseGameConfig, _houseConfig?: HouseGameConfig) => {
      // 保存配置到 store，TrainPage 会读取
      setNextConfig({ nLevel, totalRounds: rounds, mode, gridSize });
      navigate(`/train/${mode}`);
    },
    [setNextConfig, navigate]
  );

  return (
    <HomeScreen
      initialMode={nextConfig.mode}
      userProfile={userProfile}
      onStart={handleStart}
    />
  );
}
