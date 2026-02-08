import { NavLink } from 'react-router-dom';
import { Home, Brain, User, Sun, Moon, Flame } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { useTheme } from '../../contexts/ThemeContext';
import type { ThemeMode } from '../../contexts/ThemeContext';

const themeIcons: Record<ThemeMode, typeof Sun> = {
  light: Sun,
  dark: Moon,
  warm: Flame,
};

/**
 * Sidebar - 桌面端左侧栏
 * 包含: Logo, 个人档案卡片, 导航菜单, 语言/主题切换
 */
export function Sidebar() {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { userProfile } = useGameStore();
  const ThemeIcon = themeIcons[theme];

  const navItems = [
    { to: '/', icon: Home, label: t('nav.home') },
    { to: '/profile', icon: User, label: t('nav.profile') },
  ];

  const toggleLang = () => {
    const next = i18n.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(next);
    localStorage.setItem('brain-flow-lang', next);
  };

  return (
    <div className="flex flex-col h-full p-4 space-y-6">
      {/* Logo */}
      <div className="pt-4 pb-2 text-center">
        <h1 className="text-xl font-light tracking-wider text-zen-700">
          <Brain className="inline-block w-5 h-5 mr-1 -mt-0.5" />
          {t('app.title')}
        </h1>
        <p className="text-[10px] text-zen-400 mt-0.5">{t('app.subtitle')}</p>
      </div>

      {/* 个人档案迷你卡片 */}
      <div className="bg-gradient-to-br from-sage-400 to-sage-500 rounded-xl p-4 text-white text-center">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <div className="text-lg font-mono font-bold">{userProfile.maxNLevel || '-'}</div>
            <div className="text-white/70">{t('home.maxLevel')}</div>
          </div>
          <div>
            <div className="text-lg font-mono font-bold">{userProfile.totalScore}</div>
            <div className="text-white/70">{t('home.totalScore')}</div>
          </div>
          <div>
            <div className="text-lg font-mono font-bold">{userProfile.daysStreak}</div>
            <div className="text-white/70">{t('home.streakDays')}</div>
          </div>
        </div>
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
        {/* 主题切换 */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-zen-500 hover:bg-zen-100 transition-all"
        >
          <ThemeIcon className="w-4 h-4" />
          {t(`theme.${theme}`)}
        </button>
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
