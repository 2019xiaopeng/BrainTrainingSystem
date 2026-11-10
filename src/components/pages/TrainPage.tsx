import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNBack } from '../../hooks/useNBack';
import { useMouseGame } from '../../hooks/useMouseGame';
import { useHouseGame } from '../../hooks/useHouseGame';
import { useGameStore } from '../../store/gameStore';
import { GameScreen } from '../screens/GameScreen';
import { MouseGameScreen } from '../screens/MouseGameScreen';
import { HouseGameScreen } from '../screens/HouseGameScreen';
import { NumberMemoryGameScreen } from '../screens/NumberMemoryGameScreen';
import { buildMouseGameConfig, buildHouseGameConfig } from '../../types/game';
import type { GameMode, HouseSpeed } from '../../types/game';

/**
 * TrainPage - 训练路由页
 * 从 URL params 读取 mode，协调引擎 start/finish
 */
export function TrainPage() {
  const { mode } = useParams<{ mode: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  // 逐字段订阅：避免整个 store 的任何变化都触发重渲染（会放大子组件的 effect 问题）
  const nextConfig = useGameStore((s) => s.nextConfig);
  const saveSession = useGameStore((s) => s.saveSession);
  const gameConfigs = useGameStore((s) => s.gameConfigs);
  const nbackEngine = useNBack();
  const mouseEngine = useMouseGame();
  const houseEngine = useHouseGame();
  const hasStarted = useRef(false);

  const gameMode = (mode as GameMode) || nextConfig.mode;
  const isMouseMode = gameMode === 'mouse';
  const isHouseMode = gameMode === 'house';
  const isReactionMode = gameMode === 'reaction';
  const isNumberMemoryMode = gameMode === 'numberMemory';
  const isArcadeStub = isReactionMode || isNumberMemoryMode;

  // 自动启动游戏（仅首次mount）
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    
    if (isMouseMode) {
      const mc = gameConfigs.mouse;
      const mouseConfig = buildMouseGameConfig(mc.count, mc.grid, mc.difficulty, mc.rounds);
      mouseEngine.startGame(mouseConfig);
    } else if (isHouseMode) {
      const hc = gameConfigs.house;
      const houseConfig = buildHouseGameConfig(hc.initialPeople, hc.eventCount, hc.speed as HouseSpeed, hc.rounds);
      houseEngine.startGame(houseConfig);
    } else if (!isArcadeStub) {
      nbackEngine.startGame(nextConfig);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // N-Back 完成 → 保存并跳转结果页
  useEffect(() => {
    if (!isMouseMode && !isHouseMode && !isArcadeStub && nbackEngine.phase === 'finished' && nbackEngine.summary) {
      saveSession(nbackEngine.summary);
      navigate('/result', { replace: true });
    }
  }, [isMouseMode, isHouseMode, isArcadeStub, nbackEngine.phase, nbackEngine.summary, saveSession, navigate]);

  // Mouse 完成 → 保存并跳转结果页
  useEffect(() => {
    if (isMouseMode && mouseEngine.phase === 'finished' && mouseEngine.summary) {
      saveSession(mouseEngine.summary);
      navigate('/result', { replace: true });
    }
  }, [isMouseMode, mouseEngine.phase, mouseEngine.summary, saveSession, navigate]);

  // House 完成 → 保存并跳转结果页
  useEffect(() => {
    if (isHouseMode && houseEngine.phase === 'finished' && houseEngine.summary) {
      saveSession(houseEngine.summary);
      navigate('/result', { replace: true });
    }
  }, [isHouseMode, houseEngine.phase, houseEngine.summary, saveSession, navigate]);

  // 退出 → 回首页
  const handleQuit = useCallback(() => {
    if (isMouseMode) mouseEngine.resetGame();
    else if (isHouseMode) houseEngine.resetGame();
    else nbackEngine.resetGame();
    navigate('/', { replace: true });
  }, [isMouseMode, isHouseMode, nbackEngine, mouseEngine, houseEngine, navigate]);

  // 渲染
  // 街机新游戏占位（引擎接入后由各自分支替换各自块）
  if (isReactionMode) {
    return <ArcadeComingSoon emoji="⚡" title={t('home.reaction')} onBack={() => navigate('/', { replace: true })} />;
  }

  // 数字记忆：屏幕组件自管引擎生命周期（挂载即开始，结束时自带结果面板）
  if (isNumberMemoryMode) {
    return <NumberMemoryGameScreen />;
  }

  if (isHouseMode) {
    if (houseEngine.phase === 'idle' || houseEngine.phase === 'finished') return null;
    return (
      <StageFrame ratio="16 / 9">
        <HouseGameScreen engine={houseEngine} onQuit={handleQuit} />
      </StageFrame>
    );
  }

  if (isMouseMode) {
    if (mouseEngine.phase === 'idle' || mouseEngine.phase === 'finished') return null;
    return (
      <StageFrame ratio="16 / 9">
        <MouseGameScreen engine={mouseEngine} onQuit={handleQuit} />
      </StageFrame>
    );
  }

  if (nbackEngine.phase === 'idle' || nbackEngine.phase === 'finished') return null;
  return (
    <StageFrame ratio="4 / 3">
      <GameScreen engine={nbackEngine} onQuit={handleQuit} />
    </StageFrame>
  );
}

function ArcadeComingSoon({ emoji, title, onBack }: { emoji: string; title: string; onBack: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="pt-16 pb-8 text-center space-y-5 animate-fade-in">
      <div className="text-5xl">{emoji}</div>
      <h1 className="text-2xl font-light text-zen-700">{title}</h1>
      <p className="text-sm text-zen-400">{t('game.comingSoon')}</p>
      <button
        onClick={onBack}
        className="px-6 py-3 rounded-xl bg-zen-100 text-zen-600 hover:bg-zen-200 transition-all"
      >
        {t('result.backHome')}
      </button>
    </div>
  );
}

function StageFrame({ ratio, children }: { ratio: string; children: ReactNode }) {
  const width =
    ratio === '16 / 9'
      ? 'min(100%, calc((100vh - 180px) * 16 / 9))'
      : 'min(100%, calc((100vh - 180px) * 4 / 3))';

  return (
    <div className="w-full flex justify-center">
      <div style={{ width }} className="min-w-0">
        {children}
      </div>
    </div>
  );
}
