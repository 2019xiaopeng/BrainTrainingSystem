import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
  const tutorialKey = `bf_tutorial_v1_${gameMode}`;
  const [tutorialOpen, setTutorialOpen] = useState(() => {
    try {
      return localStorage.getItem(tutorialKey) !== 'seen';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      setTutorialOpen(localStorage.getItem(tutorialKey) !== 'seen');
    } catch {
      setTutorialOpen(false);
    }
  }, [tutorialKey]);

  const tutorial = useMemo(() => {
    if (gameMode === 'numeric') {
      return {
        title: '数字心流 · 引导',
        bullets: ['听声音/看提示后，判断“本轮”是否与 N 轮前相同。', '别抢答：等待刺激出现后再按键。', '冲星技巧：先稳准确率，再提高 N 或题量。'],
      };
    }
    if (gameMode === 'spatial') {
      return {
        title: '空间心流 · 引导',
        bullets: ['关注方块位置是否与 N 轮前一致。', '优先保证不漏点：漏掉会拉低准确率。', '冲星技巧：固定视线中心，用余光捕捉位置变化。'],
      };
    }
    if (gameMode === 'mouse') {
      return {
        title: '魔鬼老鼠 · 引导',
        bullets: ['记住“哪只老鼠”在动，别被假动作带走。', '先学会稳稳点中，再追求速度。', '冲星技巧：遇到高密度局，宁可慢一点也不要点错。'],
      };
    }
    return {
      title: '人来人往 · 引导',
      bullets: ['跟踪每个角色的进出，回答“现在屋里有几个人”。', '注意同时进出/重复进出等扰动事件。', '冲星技巧：把事件分段记忆，每段只记“净变化”。'],
    };
  }, [gameMode]);

  const closeTutorial = useCallback(() => {
    try {
      localStorage.setItem(tutorialKey, 'seen');
    } catch {}
    setTutorialOpen(false);
  }, [tutorialKey]);

  // 自动启动游戏（仅首次mount）
  useEffect(() => {
    if (hasStarted.current) return;
    if (tutorialOpen) return;
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
  }, [tutorialOpen]);

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
    if (houseEngine.phase === 'finished') return null;
    if (houseEngine.phase === 'idle') {
      return tutorialOpen ? <TutorialModal title={tutorial.title} bullets={tutorial.bullets} onClose={closeTutorial} /> : null;
    }
    return (
      <>
        <StageFrame ratio="16 / 9">
          <HouseGameScreen engine={houseEngine} onQuit={handleQuit} />
        </StageFrame>
        {tutorialOpen ? <TutorialModal title={tutorial.title} bullets={tutorial.bullets} onClose={closeTutorial} /> : null}
      </>
    );
  }

  if (isMouseMode) {
    if (mouseEngine.phase === 'finished') return null;
    if (mouseEngine.phase === 'idle') {
      return tutorialOpen ? <TutorialModal title={tutorial.title} bullets={tutorial.bullets} onClose={closeTutorial} /> : null;
    }
    return (
      <>
        <StageFrame ratio="16 / 9">
          <MouseGameScreen engine={mouseEngine} onQuit={handleQuit} />
        </StageFrame>
        {tutorialOpen ? <TutorialModal title={tutorial.title} bullets={tutorial.bullets} onClose={closeTutorial} /> : null}
      </>
    );
  }

  if (nbackEngine.phase === 'finished') return null;
  if (nbackEngine.phase === 'idle') {
    return tutorialOpen ? <TutorialModal title={tutorial.title} bullets={tutorial.bullets} onClose={closeTutorial} /> : null;
  }
  return (
    <>
      <StageFrame ratio="4 / 3">
        <GameScreen engine={nbackEngine} onQuit={handleQuit} />
      </StageFrame>
      {tutorialOpen ? <TutorialModal title={tutorial.title} bullets={tutorial.bullets} onClose={closeTutorial} /> : null}
    </>
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

function TutorialModal(props: { title: string; bullets: string[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur" onClick={props.onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white border border-zen-200 shadow-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="text-xs font-semibold text-sage-600 tracking-widest">首次引导</div>
        <div className="text-2xl font-bold text-zen-800 mt-2">{props.title}</div>
        <div className="mt-4 space-y-2 text-sm text-zen-700">
          {props.bullets.map((b, idx) => (
            <div key={idx} className="flex gap-2">
              <div className="mt-0.5 text-sage-600 font-bold">•</div>
              <div className="min-w-0">{b}</div>
            </div>
          ))}
        </div>
        <button className="mt-6 w-full py-3 rounded-xl bg-sage-600 hover:bg-sage-700 text-white font-semibold" onClick={props.onClose}>
          开始训练
        </button>
      </div>
    </div>
  );
}
