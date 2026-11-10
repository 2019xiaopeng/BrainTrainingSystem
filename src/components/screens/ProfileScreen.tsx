import { lazy, Suspense, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { BrainRankCard } from '../profile/BrainRankCard';
import { ActivityHeatmap } from '../profile/ActivityHeatmap';
import { generateYearlyHeatmap } from '../../lib/heatmap';
import { Trophy, Target, Flame, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';

// Shares the same on-demand chunk as the sidebar mini chart
const RadarChartWidget = lazy(() =>
  import('../profile/RadarChartWidget').then(m => ({ default: m.RadarChartWidget }))
);

/**
 * ProfileScreen - 个人档案页面（本地数据）
 * 包含: Brain Rank, Stats, Radar, 365天 Heatmap, History
 */
export function ProfileScreen() {
  const { t } = useTranslation();
  const { userProfile, sessionHistory } = useGameStore();
  const hasRealData = sessionHistory.length > 0;

  const heatmapData = useMemo(() => generateYearlyHeatmap(sessionHistory), [sessionHistory]);

  // Pagination for History
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  const sortedHistory = useMemo(() => [...sessionHistory].reverse(), [sessionHistory]);
  const totalPages = Math.max(1, Math.ceil(sortedHistory.length / ITEMS_PER_PAGE));

  const currentSessions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedHistory.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedHistory, currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Mode label mapping
  const modeEmoji: Record<string, string> = {
    numeric: '🔢', spatial: '🎯', mouse: '🐭', house: '🏠', reaction: '⚡', numberMemory: '🧠',
    sequence: '🧩', stroop: '🎨', mathSprint: '🧮',
  };
  const modeLabels: Record<string, string> = {
    numeric: t('home.numeric'),
    spatial: t('home.spatial'),
    mouse: t('home.mouse'),
    house: t('home.house'),
    reaction: t('home.reaction'),
    numberMemory: t('home.numberMemory'),
    sequence: t('home.sequence'),
    stroop: t('home.stroop'),
    mathSprint: t('home.mathSprint'),
  };

  return (
    <div className="space-y-6 pt-4 pb-8">
      {/* Page title */}
      <h1 className="text-2xl font-light text-zen-700">
        {t('profile.title')}
      </h1>

      {/* Brain Rank Card */}
      <BrainRankCard
        totalXP={userProfile.totalXP}
        completedMilestones={userProfile.completedMilestones || []}
      />

      {/* Stats summary row */}
      <div className="grid grid-cols-3 gap-3">
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
        <Suspense fallback={<div className="h-[280px] rounded-lg bg-zen-50" />}>
          <RadarChartWidget stats={userProfile.brainStats} />
        </Suspense>
      </div>

      {/* Activity Heatmap (365 days) */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-zen-200/50">
        <h2 className="text-sm font-medium text-zen-600 mb-3">
          {t('profile.activityHeatmap')}
        </h2>
        <ActivityHeatmap data={heatmapData} />
      </div>

      {/* History with Pagination */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-zen-200/50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-zen-600">
            {t('profile.history')}
          </h2>
          {sortedHistory.length > 0 && (
            <div className="text-xs text-zen-400">
              {t('common.total')} {sortedHistory.length}
            </div>
          )}
        </div>

        {sortedHistory.length === 0 ? (
          <div className="text-center py-8 text-zen-400">
            <p className="text-sm">{t('profile.noHistory')}</p>
            <p className="text-xs mt-1">{t('profile.startFirst')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              {currentSessions.map((session, idx) => (
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 pt-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-1 rounded-md text-zen-500 hover:bg-zen-100 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-xs text-zen-500 font-medium">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded-md text-zen-500 hover:bg-zen-100 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
