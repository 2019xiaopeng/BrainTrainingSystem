import { useCallback, useEffect } from 'react';
import { useNBack } from './hooks/useNBack';
import { useMouseGame } from './hooks/useMouseGame';
import { useGameStore } from './store/gameStore';
import { LayoutShell } from './components/layout/LayoutShell';
import { HomeScreen } from './components/screens/HomeScreen';
import { GameScreen } from './components/screens/GameScreen';
import { MouseGameScreen } from './components/screens/MouseGameScreen';
import { ResultScreen } from './components/screens/ResultScreen';
import type { GameMode, MouseGameConfig } from './types/game';

// ================================================================
// Brain Flow - 脑力心流主应用（多模式支持）
// ================================================================

function App() {
  const { currentView, goToGame, goToResult, goHome, nextConfig, setNextConfig, saveSession, lastSummary, sessionHistory, userProfile } =
    useGameStore();
  const nbackEngine = useNBack();
  const mouseEngine = useMouseGame();

  // 判断当前是否鼠标模式
  const isMouseMode = nextConfig.mode === 'mouse';

  // N-Back 游戏结束时导航到结果页
  useEffect(() => {
    if (!isMouseMode && nbackEngine.phase === 'finished' && nbackEngine.summary) {
      saveSession(nbackEngine.summary);
      goToResult(nbackEngine.summary);
    }
  }, [isMouseMode, nbackEngine.phase, nbackEngine.summary, saveSession, goToResult]);

  // Mouse 游戏结束时导航到结果页
  useEffect(() => {
    if (isMouseMode && mouseEngine.phase === 'finished' && mouseEngine.summary) {
      saveSession(mouseEngine.summary);
      goToResult(mouseEngine.summary);
    }
  }, [isMouseMode, mouseEngine.phase, mouseEngine.summary, saveSession, goToResult]);

  // 主页 - 开始游戏
  const handleStart = useCallback(
    (nLevel: number, rounds: number, mode: GameMode, gridSize: number, mouseConfig?: MouseGameConfig) => {
      setNextConfig({ nLevel, totalRounds: rounds, mode, gridSize });
      if (mode === 'mouse' && mouseConfig) {
        mouseEngine.startGame(mouseConfig);
      } else {
        nbackEngine.startGame({ nLevel, totalRounds: rounds, mode, gridSize });
      }
      goToGame();
    },
    [nbackEngine, mouseEngine, goToGame, setNextConfig]
  );

  // 退出游戏
  const handleQuit = useCallback(() => {
    if (isMouseMode) {
      mouseEngine.resetGame();
    } else {
      nbackEngine.resetGame();
    }
    goHome();
  }, [isMouseMode, nbackEngine, mouseEngine, goHome]);

  // 再来一局
  const handlePlayAgain = useCallback(() => {
    if (lastSummary) {
      if (lastSummary.config.mode === 'mouse') {
        mouseEngine.resetGame();
        // Rebuild MouseGameConfig from the mouseEngine's config
        mouseEngine.startGame(mouseEngine.mouseConfig);
      } else {
        nbackEngine.resetGame();
        nbackEngine.startGame(lastSummary.config);
      }
      goToGame();
    }
  }, [nbackEngine, mouseEngine, goToGame, lastSummary]);

  // ---- 路由逻辑 ----
  if (currentView === 'home') {
    return (
      <LayoutShell variant="home">
        <HomeScreen
          initialMode={nextConfig.mode}
          userProfile={userProfile}
          onStart={handleStart}
        />
      </LayoutShell>
    );
  }

  if (currentView === 'game') {
    // Mouse mode uses its own screen
    if (isMouseMode && mouseEngine.phase !== 'finished') {
      return (
        <LayoutShell variant="game">
          <MouseGameScreen engine={mouseEngine} onQuit={handleQuit} />
        </LayoutShell>
      );
    }
    // N-Back modes
    if (!isMouseMode && nbackEngine.phase !== 'finished') {
      return (
        <LayoutShell variant="game">
          <GameScreen engine={nbackEngine} onQuit={handleQuit} />
        </LayoutShell>
      );
    }
  }

  if (currentView === 'result' && lastSummary) {
    return (
      <LayoutShell variant="result">
        <ResultScreen 
          summary={lastSummary} 
          sessionHistory={sessionHistory}
          userProfile={userProfile}
          onPlayAgain={handlePlayAgain} 
          onBackHome={handleQuit} 
        />
      </LayoutShell>
    );
  }

  // 回退
  return (
    <LayoutShell variant="home">
      <div className="flex items-center justify-center min-h-[50vh]">
        <button onClick={goHome} className="text-zen-500 hover:text-zen-700 transition">
          返回首页
        </button>
      </div>
    </LayoutShell>
  );
}

export default App;
