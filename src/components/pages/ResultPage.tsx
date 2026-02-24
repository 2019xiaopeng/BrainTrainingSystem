import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import { ResultScreen } from '../screens/ResultScreen';
import { CampaignResultScreen } from '../screens/CampaignResultScreen';

/**
 * ResultPage - 结果路由页
 * 从 store 读取 lastSummary 展示结果
 * 如果有 activeCampaignRun + lastCampaignUpdate，展示闯关结算页
 */
export function ResultPage() {
  const navigate = useNavigate();
  const { lastSummary, sessionHistory, userProfile, nextConfig, lastUnlocks, activeCampaignRun, lastCampaignUpdate, lastRewards, setActiveCampaignRun } = useGameStore();

  const handlePlayAgain = useCallback(() => {
    const mode = lastSummary?.config.mode || nextConfig.mode;
    navigate(`/train/${mode}`, { replace: true });
  }, [lastSummary, nextConfig.mode, navigate]);

  const handleBackHome = useCallback(() => {
    useGameStore.getState().goHome();
    navigate('/', { replace: true });
  }, [navigate]);

  // Campaign-specific handlers
  const handleNextLevel = useCallback(() => {
    const campaign = lastCampaignUpdate as { nextLevelId?: number; nextEpisodeId?: number } | null;
    const run = activeCampaignRun;
    if (!campaign?.nextLevelId || !campaign?.nextEpisodeId || !run) {
      handleBackHome();
      return;
    }
    // Clear campaign run so the map can set it again
    setActiveCampaignRun(null);
    navigate('/?view=campaign', { replace: true });
  }, [lastCampaignUpdate, activeCampaignRun, handleBackHome, setActiveCampaignRun, navigate]);

  const handleRetry = useCallback(() => {
    const mode = lastSummary?.config.mode || nextConfig.mode;
    // Keep the same campaign run active for retry
    navigate(`/train/${mode}`, { replace: true });
  }, [lastSummary, nextConfig.mode, navigate]);

  const handleBackToMap = useCallback(() => {
    setActiveCampaignRun(null);
    navigate('/?view=campaign', { replace: true });
  }, [setActiveCampaignRun, navigate]);

  if (!lastSummary) {
    navigate('/', { replace: true });
    return null;
  }

  // Check if this is a campaign result
  const campaignUpdate = lastCampaignUpdate as {
    levelId: number;
    stars: number;
    prevBestStars: number;
    passed: boolean;
    isFirstClear: boolean;
    starBonusCoins: number;
    firstClearBonus: number;
    nextLevelId: number | null;
    nextEpisodeId: number | null;
  } | null;

  if (activeCampaignRun && campaignUpdate && typeof campaignUpdate === 'object' && 'stars' in campaignUpdate) {
    return (
      <CampaignResultScreen
        summary={lastSummary}
        campaignUpdate={campaignUpdate}
        lastRewards={lastRewards}
        activeCampaignRun={activeCampaignRun}
        onNextLevel={handleNextLevel}
        onRetry={handleRetry}
        onBackToMap={handleBackToMap}
      />
    );
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
