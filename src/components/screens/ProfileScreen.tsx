import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';

/**
 * ProfileScreen - 个人档案页面
 */
export function ProfileScreen() {
  const { t } = useTranslation();
  const { userProfile, sessionHistory } = useGameStore();

  const recentSessions = [...sessionHistory].reverse().slice(0, 20);

  return (
    <div className="space-y-6 pt-8">
      <h1 className="text-3xl font-light text-zen-700 text-center">{t('profile.title')}</h1>

      {/* 统计卡片 */}
      <div className="bg-gradient-to-br from-sage-400 to-sage-500 rounded-2xl p-6 shadow-lg text-white">
        <h2 className="text-lg font-medium mb-4">{t('profile.stats')}</h2>
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

      {/* 历史记录 */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-zen-200">
        <h2 className="text-lg font-medium text-zen-600 mb-4">{t('profile.history')}</h2>
        {recentSessions.length === 0 ? (
          <div className="text-center py-8 text-zen-400">
            <p className="text-sm">{t('profile.noHistory')}</p>
            <p className="text-xs mt-1">{t('profile.startFirst')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentSessions.map((session, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-zen-50 border border-zen-100 text-sm">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-zen-700 font-medium">{session.nLevel}-Back</span>
                  <span className="text-zen-400">{session.totalRounds} {t('game.round', { current: '', total: '' }).includes('题') ? '题' : 'rounds'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-medium ${session.accuracy >= 80 ? 'text-green-600' : session.accuracy >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
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
    </div>
  );
}
