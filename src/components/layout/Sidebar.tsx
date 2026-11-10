import { lazy, Suspense } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, User, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { BrainRankCard } from '../profile/BrainRankCard';

// recharts (~48KB gzip) stays out of the initial payload; the sidebar chart loads on demand
const RadarChartWidget = lazy(() =>
  import('../profile/RadarChartWidget').then(m => ({ default: m.RadarChartWidget }))
);

/**
 * Sidebar - 桌面端左侧栏
 * 包含: Logo, Brain Rank 卡片, 迷你雷达图, 导航, 语言切换
 */
export function Sidebar() {
  const { t, i18n } = useTranslation();
  const { userProfile } = useGameStore();

  const navItems = [
    { to: '/', icon: Home, label: t('nav.home') },
    { to: '/profile', icon: User, label: t('nav.profile') },
    { to: '/settings', icon: Settings, label: t('nav.settings') },
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

      {/* Brain Rank Card (compact) */}
      <BrainRankCard
        totalXP={userProfile.totalXP}
        completedMilestones={userProfile.completedMilestones || []}
        compact
      />

      {/* Mini Radar Chart — skeleton matches compact chart height (200px) to avoid layout shift */}
      <div className="bg-white/50 rounded-xl p-2 border border-zen-200/30">
        <Suspense fallback={<div className="h-[200px] rounded-lg bg-zen-100/60" />}>
          <RadarChartWidget stats={userProfile.brainStats} compact />
        </Suspense>
      </div>

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
