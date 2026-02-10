import { NavLink } from 'react-router-dom';
import { Home, User, ShoppingBag, HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { BrainRankCard } from '../profile/BrainRankCard';
import { RadarChartWidget } from '../profile/RadarChartWidget';
import { EnergyBar } from '../economy/EnergyBar';

/**
 * Sidebar - 桌面端左侧栏
 * 包含: Logo, Energy, Brain Rank 卡片, 迷你雷达图, 导航, 语言切换
 */
export function Sidebar() {
  const { t, i18n } = useTranslation();
  const { userProfile } = useGameStore();

  const isGuest = (userProfile.auth?.status ?? 'guest') === 'guest';
  const displayStats = userProfile.brainStats;
  const displayXP = userProfile.totalXP ?? 0;

  const navItems = [
    { to: '/', icon: Home, label: t('nav.home') },
    { to: '/profile', icon: User, label: t('nav.profile') },
    { to: '/store', icon: ShoppingBag, label: t('nav.store') },
    { to: '/instruction', icon: HelpCircle, label: t('nav.instruction') },
  ];

  const toggleLang = () => {
    const next = i18n.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(next);
    localStorage.setItem('brain-flow-lang', next);
  };

  return (
    <div className="flex flex-col h-full p-4 space-y-4">
      {/* Logo */}
      <div className="pt-4 pb-1 text-center">
        <h1 className="text-xl font-light tracking-wider text-zen-700">
          <img src="/pic/title.png" alt="" className="inline-block w-5 h-5 mr-1 -mt-0.5" />
          {t('app.title')}
        </h1>
        <p className="text-xs text-zen-400 mt-0.5">{t('app.subtitle')}</p>
      </div>

      {/* Energy Bar */}
      <div className="bg-white/50 rounded-xl p-3 border border-zen-200/30">
        <EnergyBar />
      </div>

      {isGuest ? (
        <div className="bg-white/50 rounded-xl p-3 border border-zen-200/30">
          <div className="text-xs font-medium text-zen-700 mb-1">{t('profile.auth.guest')}</div>
          <div className="text-xs text-zen-500">{t('profile.auth.guestLockHint')}</div>
          <div className="mt-3 flex gap-2">
            <a
              href="/signup"
              className="flex-1 text-center px-3 py-2 rounded-lg bg-sage-500 text-white text-xs font-medium hover:bg-sage-600 transition-colors"
            >
              {t('profile.auth.goSignup')}
            </a>
            <a
              href="/signin"
              className="flex-1 text-center px-3 py-2 rounded-lg bg-zen-100 text-zen-700 text-xs font-medium hover:bg-zen-200 transition-colors"
            >
              {t('profile.auth.goSignin')}
            </a>
          </div>
        </div>
      ) : (
        <>
          {/* Brain Rank Card (compact) */}
          <BrainRankCard
            totalXP={displayXP}
            completedMilestones={userProfile.completedMilestones || []}
            compact
          />

          {/* Mini Radar Chart */}
          <div className="bg-white/50 rounded-xl p-2 border border-zen-200/30">
            <RadarChartWidget stats={displayStats} compact />
          </div>
        </>
      )}

      {/* 导航菜单 */}
      <nav className="space-y-1 flex-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive
                  ? 'bg-sage-100 text-sage-700 font-medium'
                  : 'text-zen-500 hover:bg-zen-100 hover:text-zen-700'
              }`
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* 底部控制 */}
      <div className="space-y-2 pb-4">
        {/* 语言切换 */}
        <button
          onClick={toggleLang}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-zen-500 hover:bg-zen-100 transition-all"
        >
          🌐 {i18n.language === 'zh' ? 'English' : '中文'}
        </button>
      </div>
    </div>
  );
}
