import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { HomePage } from './components/pages/HomePage';
import { TrainPage } from './components/pages/TrainPage';
import { ResultPage } from './components/pages/ResultPage';

// Secondary screens are split into on-demand chunks; the core play path (Home/Train/Result) stays eager
const ProfileScreenLazy = lazy(() =>
  import('./components/screens/ProfileScreen').then(m => ({ default: m.ProfileScreen }))
);
const SettingsScreenLazy = lazy(() =>
  import('./components/screens/SettingsScreen').then(m => ({ default: m.SettingsScreen }))
);
const RankScreenLazy = lazy(() =>
  import('./components/screens/RankScreen').then(m => ({ default: m.RankScreen }))
);

/** Quiet centered placeholder while a lazy route chunk loads */
function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 rounded-full bg-zen-100" />
    </div>
  );
}

// ================================================================
// Brain Flow - 脑力心流 (guest-only arcade)
// ================================================================

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          {/* 首页 - 模式选择 + 配置 */}
          <Route path="/" element={<HomePage />} />
          {/* 训练 - 游戏进行中 */}
          <Route path="/train/:mode" element={<TrainPage />} />
          {/* 结果 */}
          <Route path="/result" element={<ResultPage />} />
          {/* 个人档案 */}
          <Route
            path="/profile"
            element={
              <Suspense fallback={<RouteFallback />}>
                <ProfileScreenLazy />
              </Suspense>
            }
          />
          {/* 历史（移动端承载右栏内容） */}
          <Route
            path="/rank"
            element={
              <Suspense fallback={<RouteFallback />}>
                <RankScreenLazy />
              </Suspense>
            }
          />
          {/* 设置 */}
          <Route
            path="/settings"
            element={
              <Suspense fallback={<RouteFallback />}>
                <SettingsScreenLazy />
              </Suspense>
            }
          />
          {/* 帮助说明 */}
          <Route path="/instruction" element={<Navigate to="/settings?tab=help" replace />} />
          {/* 404 回退 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
