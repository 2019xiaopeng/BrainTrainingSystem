import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import { ResultScreen } from '../screens/ResultScreen';

/**
 * ResultPage - 结果路由页
 * 从 store 读取 lastSummary 展示结果
 */
export function ResultPage() {
  const navigate = useNavigate();
  const { lastSummary, sessionHistory, userProfile, nextConfig, lastUnlocks, lastRewards } = useGameStore();

  const handlePlayAgain = useCallback(() => {
    // 直接 navigate 到上次的训练模式
    const mode = lastSummary?.config.mode || nextConfig.mode;
    navigate(`/train/${mode}`, { replace: true });
  }, [lastSummary, nextConfig.mode, navigate]);

  const handleBackHome = useCallback(() => {
    navigate('/', { replace: true });
  }, [navigate]);

  if (!lastSummary) {
    // 没有结果数据，返回首页
    navigate('/', { replace: true });
    return null;
  }

  return (
    <ResultScreen
      summary={lastSummary}
      sessionHistory={sessionHistory}
      userProfile={userProfile}
      unlockIds={lastUnlocks}
      rewards={lastRewards}
      onPlayAgain={handlePlayAgain}
      onBackHome={handleBackHome}
    />
  );
}
