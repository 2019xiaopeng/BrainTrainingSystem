import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { HomePage } from './components/pages/HomePage';
import { TrainPage } from './components/pages/TrainPage';
import { ResultPage } from './components/pages/ResultPage';
import { SignInPage } from './components/pages/SignInPage';
import { SignUpPage } from './components/pages/SignUpPage';
import { ProfileScreen } from './components/screens/ProfileScreen';
import { StoreScreen } from './components/screens/StoreScreen';
import { InstructionScreen } from './components/screens/InstructionScreen';
import { RankScreen } from './components/screens/RankScreen';

// ================================================================
// Brain Flow - 脑力心流 (Phase 4: Router-based Architecture)
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
          {/* 登录/注册 */}
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          {/* 个人档案 */}
          <Route path="/profile" element={<ProfileScreen />} />
          {/* 排行榜/历史（移动端承载右栏内容） */}
          <Route path="/rank" element={<RankScreen />} />
          {/* 商城 */}
          <Route path="/store" element={<StoreScreen />} />
          {/* 帮助说明 */}
          <Route path="/instruction" element={<InstructionScreen />} />
          {/* 404 回退 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
