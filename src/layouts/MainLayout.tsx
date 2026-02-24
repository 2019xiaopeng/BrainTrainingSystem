import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { RightPanel } from '../components/layout/RightPanel';
import { MobileNav } from '../components/layout/MobileNav';

/**
 * MainLayout - 响应式三栏布局（游戏中保持三栏结构）
 * Mobile: 单列 + 底部导航（游戏中隐藏导航）
 * Desktop (lg+): Sidebar(250px) | Stage(flex) | Dashboard(300px) —— 始终可见
 */
export function MainLayout() {
  const location = useLocation();
  const isGameActive = location.pathname.startsWith('/train/');

  return (
    <div className="min-h-screen bg-zen-50 text-zen-800 transition-colors duration-300">
      {/* Desktop 三栏布局 —— 始终保持三栏，游戏中也不隐藏 */}
      <div className="hidden lg:flex min-h-screen">
        <aside className="w-[250px] flex-shrink-0 border-r border-zen-200/50 overflow-y-auto">
          <Sidebar />
        </aside>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-2xl p-6 animate-fade-in">
            <Outlet />
          </div>
        </main>

        <aside className="w-[300px] flex-shrink-0 border-l border-zen-200/50 overflow-y-auto">
          <RightPanel />
        </aside>
      </div>

      {/* Mobile 单列布局 */}
      <div className="lg:hidden flex flex-col min-h-screen">
        <main className="flex-1 p-4 pb-20 overflow-y-auto">
          <div className="max-w-lg mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
        {/* 底部导航 - 游戏中隐藏 */}
        {!isGameActive && <MobileNav />}
      </div>
    </div>
  );
}
