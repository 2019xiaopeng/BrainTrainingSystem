import { useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useNBack } from '../../hooks/useNBack';
import { useMouseGame } from '../../hooks/useMouseGame';
import { useHouseGame } from '../../hooks/useHouseGame';
import { useGameStore } from '../../store/gameStore';
import { GameScreen } from '../screens/GameScreen';
import { MouseGameScreen } from '../screens/MouseGameScreen';
import { HouseGameScreen } from '../screens/HouseGameScreen';
import { buildMouseGameConfig, buildHouseGameConfig } from '../../types/game';
import type { GameMode, HouseSpeed } from '../../types/game';

/**
 * TrainPage - 训练路由页
 * 从 URL params 读取 mode，协调引擎 start/finish
 */
export function TrainPage() {
  const { mode } = useParams<{ mode: string }>();
  const navigate = useNavigate();
  const { nextConfig, saveSession, gameConfigs } = useGameStore();
  const nbackEngine = useNBack();
  const mouseEngine = useMouseGame();
  const houseEngine = useHouseGame();
  const hasStarted = useRef(false);

  const gameMode = (mode as GameMode) || nextConfig.mode;
  const isMouseMode = gameMode === 'mouse';
  const isHouseMode = gameMode === 'house';

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
    } else {
      nbackEngine.startGame(nextConfig);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // N-Back 完成 → 保存并跳转结果页
  useEffect(() => {
    if (!isMouseMode && !isHouseMode && nbackEngine.phase === 'finished' && nbackEngine.summary) {
      saveSession(nbackEngine.summary);
      navigate('/result', { replace: true });
    }
  }, [isMouseMode, isHouseMode, nbackEngine.phase, nbackEngine.summary, saveSession, navigate]);

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
  if (isHouseMode) {
    if (houseEngine.phase === 'idle' || houseEngine.phase === 'finished') return null;
    return <HouseGameScreen engine={houseEngine} onQuit={handleQuit} />;
  }

  if (isMouseMode) {
    if (mouseEngine.phase === 'idle' || mouseEngine.phase === 'finished') return null;
    return <MouseGameScreen engine={mouseEngine} onQuit={handleQuit} />;
  }

  if (nbackEngine.phase === 'idle' || nbackEngine.phase === 'finished') return null;
  return <GameScreen engine={nbackEngine} onQuit={handleQuit} />;
}
