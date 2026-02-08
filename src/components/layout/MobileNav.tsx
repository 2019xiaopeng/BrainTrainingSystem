import { NavLink } from 'react-router-dom';
import { Home, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * MobileNav - 移动端底部导航栏
 */
export function MobileNav() {
  const { t } = useTranslation();

  const items = [
    { to: '/', icon: Home, label: t('nav.home') },
    { to: '/profile', icon: User, label: t('nav.profile') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t border-zen-200 z-40">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-4 py-1 transition-all ${
                isActive ? 'text-sage-600' : 'text-zen-400'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px]">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
