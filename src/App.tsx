import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { HomePage } from './components/pages/HomePage';
import { TrainPage } from './components/pages/TrainPage';
import { ResultPage } from './components/pages/ResultPage';
import { ProfileScreen } from './components/screens/ProfileScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { RankScreen } from './components/screens/RankScreen';

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
          <Route path="/profile" element={<ProfileScreen />} />
          {/* 历史（移动端承载右栏内容） */}
          <Route path="/rank" element={<RankScreen />} />
          {/* 设置 */}
          <Route path="/settings" element={<SettingsScreen />} />
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
