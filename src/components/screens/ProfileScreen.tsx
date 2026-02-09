import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { BrainRankCard } from '../profile/BrainRankCard';
import { RadarChartWidget } from '../profile/RadarChartWidget';
import { ActivityHeatmap } from '../profile/ActivityHeatmap';
import { AuthSection } from '../profile/AuthSection';
import { EnergyBar } from '../economy/EnergyBar';
import { CheckInWidget } from '../economy/CheckInWidget';
import { generateYearlyHeatmap } from '../../mocks/userData';
import { Trophy, Target, Flame, BarChart3, Coins } from 'lucide-react';

/**
 * ProfileScreen - 完整个人档案页面
 * 包含: Brain Rank, Stats, Radar, 365天 Heatmap, History, Auth
 */
export function ProfileScreen() {
  const { t } = useTranslation();
  const { userProfile, sessionHistory } = useGameStore();

  // Ensure auth profile exists (migration fallback)
  const authProfile = userProfile.auth || {
    status: 'guest' as const,
    displayName: 'Guest',
    avatarUrl: null,
    linkedProviders: ['guest' as const],
  };
  const isGuest = authProfile.status === 'guest';
  const hasRealData = sessionHistory.length > 0;

  const heatmapData = useMemo(
    () => generateYearlyHeatmap(sessionHistory),
    [sessionHistory]
  );

  const recentSessions = useMemo(
    () => [...sessionHistory].reverse().slice(0, 10),
    [sessionHistory]
  );

  // Mode label mapping
  const modeEmoji: Record<string, string> = {
    numeric: '🔢', spatial: '🎯', mouse: '🐭', house: '🏠',
  };
  const modeLabels: Record<string, string> = {
    numeric: t('home.numeric'),
    spatial: t('home.spatial'),
    mouse: t('home.mouse'),
    house: t('home.house'),
  };

  return (
    <div className="space-y-6 pt-4 pb-8">
      {/* Page title */}
      <h1 className="text-2xl font-light text-zen-700">
        {t('profile.title')}
      </h1>

      {/* Energy & Check-in row (mobile only - sidebar has these on desktop) */}
      <div className="lg:hidden space-y-3">
        <div className="bg-white rounded-xl p-4 border border-zen-200/50 shadow-sm">
          <EnergyBar />
        </div>
        {!isGuest && <CheckInWidget />}
      </div>

      {isGuest ? (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-zen-200/50">
          <div className="text-sm font-medium text-zen-700 mb-1">
            {t('profile.auth.guest')}
          </div>
          <div className="text-xs text-zen-500">
            {t('profile.auth.guestLockHint')}
          </div>
          <div className="mt-3 flex gap-2">
            <a
              href="/signup"
              className="px-3 py-2 rounded-lg bg-sage-500 text-white text-xs font-medium hover:bg-sage-600 transition-colors"
            >
              {t('profile.auth.goSignup')}
            </a>
            <a
              href="/signin"
              className="px-3 py-2 rounded-lg bg-zen-100 text-zen-700 text-xs font-medium hover:bg-zen-200 transition-colors"
            >
              {t('profile.auth.goSignin')}
            </a>
          </div>
        </div>
      ) : (
        <>
          {/* Brain Rank Card */}
          <BrainRankCard
            totalXP={userProfile.totalXP ?? 0}
            completedMilestones={userProfile.completedMilestones || []}
          />

          {/* Stats summary row */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-zen-200/50">
              <Trophy className="w-5 h-5 mx-auto mb-1.5 text-amber-500" />
              <div className="text-xl font-mono font-bold text-zen-700">
                {userProfile.maxNLevel || '-'}
              </div>
              <div className="text-xs text-zen-400 mt-0.5">{t('home.maxLevel')}</div>
            </div>
            <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-zen-200/50">
              <Target className="w-5 h-5 mx-auto mb-1.5 text-sage-500" />
              <div className="text-xl font-mono font-bold text-zen-700">
                {userProfile.totalScore.toLocaleString()}
              </div>
              <div className="text-xs text-zen-400 mt-0.5">{t('home.totalScore')}</div>
            </div>
            <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-zen-200/50">
              <Flame className="w-5 h-5 mx-auto mb-1.5 text-orange-500" />
              <div className="text-xl font-mono font-bold text-zen-700">
                {userProfile.daysStreak}
              </div>
              <div className="text-xs text-zen-400 mt-0.5">{t('home.streakDays')}</div>
            </div>
            <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-zen-200/50">
              <Coins className="w-5 h-5 mx-auto mb-1.5 text-amber-600" />
              <div className="text-xl font-mono font-bold text-zen-700">
                {(userProfile.brainCoins ?? 0).toLocaleString()}
              </div>
              <div className="text-xs text-zen-400 mt-0.5">{t('profile.brainPoints')}</div>
            </div>
          </div>

          {/* Brain Radar Chart */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-zen-200/50">
            <h2 className="text-sm font-medium text-zen-600 mb-2 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              {t('profile.brainRadar')}
            </h2>
            {!hasRealData && (
              <p className="text-xs text-zen-400 mb-2 italic">
                {t('profile.startFirst')}
              </p>
            )}
            <RadarChartWidget stats={userProfile.brainStats} />
          </div>

          {/* Activity Heatmap (365 days) */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-zen-200/50">
            <h2 className="text-sm font-medium text-zen-600 mb-3">
              {t('profile.activityHeatmap')}
            </h2>
            <ActivityHeatmap data={heatmapData} />
          </div>

          {/* Recent History (10 entries) */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-zen-200/50">
            <h2 className="text-sm font-medium text-zen-600 mb-3">
              {t('profile.history')}
            </h2>
            {recentSessions.length === 0 ? (
              <div className="text-center py-8 text-zen-400">
                <p className="text-sm">{t('profile.noHistory')}</p>
                <p className="text-xs mt-1">{t('profile.startFirst')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentSessions.map((session, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg bg-zen-50 border border-zen-100 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base">{modeEmoji[session.mode || 'numeric']}</span>
                      <div>
                        <span className="font-mono text-zen-700 font-medium">
                          {session.nLevel}-Back
                        </span>
                        <span className="text-xs text-zen-400 ml-1.5">
                          {modeLabels[session.mode || 'numeric']}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-medium ${
                          session.accuracy >= 80
                            ? 'text-green-600'
                            : session.accuracy >= 50
                            ? 'text-amber-500'
                            : 'text-red-500'
                        }`}
                      >
                        {session.accuracy}%
                      </span>
                      <span className="text-xs text-zen-400">+{session.score}</span>
                      <span className="text-xs text-zen-300">
                        {new Date(session.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Auth Section */}
      <AuthSection auth={authProfile} />
    </div>
  );
}
