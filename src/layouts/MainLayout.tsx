import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { RightPanel } from '../components/layout/RightPanel';
import { MobileNav } from '../components/layout/MobileNav';

/**
 * MainLayout - 响应式三栏布局（游戏中保持三栏结构）
 * Mobile: 单列 + 底部导航（游戏中隐藏导航）
 * Desktop (lg+): Sidebar(250px) | Stage(flex) | Dashboard(300px) —— 始终可见
 *
 * One <Outlet/> only: the desktop/mobile shells are the same tree with
 * lg: variants. (The old twin-shell layout mounted every page twice —
 * two engines, double side effects, double session saves.)
 */
export function MainLayout() {
  const location = useLocation();
  const isGameActive = location.pathname.startsWith('/train/');

  return (
    <div className="min-h-screen bg-zen-50 text-zen-800 transition-colors duration-300 lg:flex lg:h-screen lg:overflow-hidden">
      <aside className="hidden lg:block w-[250px] h-screen flex-shrink-0 border-r border-zen-200/50 overflow-hidden">
        <Sidebar />
      </aside>

      <main className="flex-1 p-4 pb-20 overflow-y-auto overflow-x-hidden zen-scrollbar lg:h-screen lg:p-6 lg:pb-6">
        <div className="max-w-lg lg:max-w-2xl mx-auto animate-fade-in">
          <Outlet />
        </div>
      </main>

      <aside className="hidden lg:block w-[300px] h-screen flex-shrink-0 border-l border-zen-200/50 overflow-hidden">
        <RightPanel />
      </aside>

      {/* 底部导航 - 仅移动端，游戏中隐藏 */}
      {!isGameActive && (
        <div className="lg:hidden">
          <MobileNav />
        </div>
      )}
    </div>
  );
}
