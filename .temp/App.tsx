import React, { useState, useEffect, useMemo } from 'react';
import { ViewState, UserProgress, GameResult, NodeStatus, Episode } from './types';
import { INITIAL_PROGRESS, LEVELS, EPISODES, ENERGY_COST_PER_LEVEL } from './constants';
import GameView from './components/GameView';
import GeminiCoach from './components/GeminiCoach';
import RewardGenerator from './components/RewardGenerator';
import ResultView from './components/ResultView';
import MapNode from './components/MapNode';

export default function App() {
  const [view, setView] = useState<ViewState>('MAP'); 
  const [progress, setProgress] = useState<UserProgress>(() => {
    const saved = localStorage.getItem('brain_expedition_progress');
    return saved ? JSON.parse(saved) : INITIAL_PROGRESS;
  });
  
  // UI State
  const [selectedLevelId, setSelectedLevelId] = useState<number | null>(null);
  const [showRewardGen, setShowRewardGen] = useState(false);
  const [lastGameResult, setLastGameResult] = useState<GameResult | null>(null);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [activeEpisodeId, setActiveEpisodeId] = useState(progress.currentEpisodeId);

  useEffect(() => {
    localStorage.setItem('brain_expedition_progress', JSON.stringify(progress));
  }, [progress]);

  // Check for story trigger
  useEffect(() => {
      if (!progress.viewedStories.includes(activeEpisodeId)) {
          setShowStoryModal(true);
      }
  }, [activeEpisodeId, progress.viewedStories]);

  const closeStory = () => {
      setShowStoryModal(false);
      setProgress(p => ({
          ...p,
          viewedStories: [...p.viewedStories, activeEpisodeId]
      }));
  };

  // Derived Stats
  const maxLevel = Math.max(...Object.keys(progress.stars).map(Number), 0) || 1;
  const totalScore = (Object.values(progress.stars) as number[]).reduce((a, b) => a + (b * 100), 0); 

  // Filter levels for current episode
  const currentEpisodeLevels = useMemo(() => {
      return LEVELS.filter(l => l.episodeId === activeEpisodeId);
  }, [activeEpisodeId]);

  // SVG Path Generation for Map
  const mapPath = useMemo(() => {
    if (currentEpisodeLevels.length < 2) return '';
    const sortedLevels = [...currentEpisodeLevels].sort((a, b) => a.id - b.id);
    let d = `M ${sortedLevels[0].position.x} ${sortedLevels[0].position.y}`;
    for (let i = 0; i < sortedLevels.length - 1; i++) {
      const curr = sortedLevels[i];
      const next = sortedLevels[i+1];
      const cp1x = curr.position.x;
      const cp1y = (curr.position.y + next.position.y) / 2;
      const cp2x = next.position.x;
      const cp2y = (curr.position.y + next.position.y) / 2;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.position.x} ${next.position.y}`;
    }
    return d;
  }, [currentEpisodeLevels]);

  const startLevel = (levelId?: number) => {
    const id = levelId || selectedLevelId;
    if (!id) return;
    
    if (progress.energy < ENERGY_COST_PER_LEVEL) {
      alert("脑力值不足！请等待恢复。");
      return;
    }
    setProgress(p => ({ ...p, energy: p.energy - ENERGY_COST_PER_LEVEL }));
    setSelectedLevelId(id); // Set active so GameView gets correct config
    setView('GAME');
  };

  const handleGameComplete = (result: GameResult) => {
    setLastGameResult(result);
    
    if (result.passed) {
       const playedLevelId = selectedLevelId || progress.currentLevelId;
       const currentStars = progress.stars[playedLevelId] || 0;
       const newStars = Math.max(currentStars, result.stars);

       setProgress(p => {
         const newP = {
           ...p,
           stars: { ...p.stars, [playedLevelId]: newStars },
         };
         if (playedLevelId === p.currentLevelId) {
            newP.currentLevelId = Math.min(p.currentLevelId + 1, LEVELS.length);
            const nextLevel = LEVELS.find(l => l.id === newP.currentLevelId);
            if (nextLevel && nextLevel.episodeId > p.currentEpisodeId) {
                newP.currentEpisodeId = nextLevel.episodeId;
            }
         }
         return newP;
       });
    }
    setView('RESULT');
  };

  const handleResultNext = () => {
    const nextLevelId = (selectedLevelId || 0) + 1;
    const nextLevel = LEVELS.find(l => l.id === nextLevelId);
    
    if (nextLevel) {
        if (nextLevel.episodeId !== activeEpisodeId) {
            setActiveEpisodeId(nextLevel.episodeId);
            setView('MAP');
        } else {
            startLevel(nextLevelId);
        }
    } else {
        setView('MAP');
    }
  };

  const getLevelStatus = (levelId: number) => {
    if (progress.stars[levelId] > 0) return NodeStatus.COMPLETED;
    if (levelId === progress.currentLevelId) return NodeStatus.UNLOCKED;
    if (levelId < progress.currentLevelId) return NodeStatus.COMPLETED;
    return NodeStatus.LOCKED;
  };

  const activeLevelConfig = LEVELS.find(l => l.id === (selectedLevelId || progress.currentLevelId)) || LEVELS[0];
  const currentEpisodeData = EPISODES.find(e => e.id === activeEpisodeId);

  return (
    <div className="w-full h-screen bg-[#faf8ef] flex font-sans text-slate-600">
      
      {/* LEFT SIDEBAR (Warm Theme) */}
      <aside className="w-64 bg-[#fdfcf8] border-r border-[#ece8dc] flex flex-col hidden md:flex z-20 shadow-sm">
        <div className="p-8 pb-4">
          <div className="flex items-center gap-3 text-[#7a9584] mb-8">
            <div className="p-2 bg-[#7a9584]/10 rounded-lg">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none tracking-tight text-slate-700">脑力心流</h1>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest">大脑训练系统</span>
            </div>
          </div>
          
          <div className="mb-8 bg-[#f5f2e9] p-4 rounded-2xl border border-[#e6e2d6]">
             <div className="flex justify-between text-xs font-bold mb-2">
                <span className="text-[#8c887e]">脑力值</span>
                <span className="text-[#d97706]">{progress.energy}/{progress.maxEnergy}</span>
             </div>
             <div className="h-2 bg-[#e6e2d6] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] w-[80%] rounded-full shadow-[0_0_10px_rgba(245,158,11,0.3)]"></div>
             </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <NavItem icon="home" label="探索地图" active={view === 'MAP'} onClick={() => setView('MAP')} />
          <NavItem icon="archive" label="成就图鉴" onClick={() => {}} />
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {view === 'MAP' && (
          <div className="flex-1 overflow-y-auto relative scroll-smooth bg-[#faf8ef]">
            <div className="p-6 md:p-12 pb-32 min-h-full">
            
                {/* Header Stats & Episode Selector */}
                <div className="w-full max-w-2xl mx-auto flex items-center justify-between mb-8 z-20 relative">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                        <button 
                            disabled={activeEpisodeId <= 1}
                            onClick={() => setActiveEpisodeId(e => e - 1)}
                            className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-[#ece8dc] hover:border-[#d6d3c4] shadow-sm text-slate-400 hover:text-slate-700 disabled:opacity-30 transition-all"
                        >
                             ◀
                        </button>
                        <h2 className="text-2xl font-bold text-slate-700 tracking-tight">第 {activeEpisodeId} 章</h2>
                        <button 
                            disabled={activeEpisodeId >= EPISODES.length}
                             onClick={() => setActiveEpisodeId(e => e + 1)}
                            className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-[#ece8dc] hover:border-[#d6d3c4] shadow-sm text-slate-400 hover:text-slate-700 disabled:opacity-30 transition-all"
                        >
                             ▶
                        </button>
                    </div>
                    <p className="text-[#8c887e] text-xs font-medium tracking-wide pl-12 border-l-2 border-[#7a9584] ml-3">{currentEpisodeData?.title}</p>
                  </div>
                  
                  <div className="bg-white px-6 py-3 rounded-2xl border border-[#ece8dc] shadow-sm flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-[10px] text-[#9ca3af] uppercase font-bold tracking-wider mb-0.5">累计积分</div>
                        <div className="font-bold text-slate-700 leading-none text-xl">{totalScore}</div>
                      </div>
                  </div>
                </div>

                {/* CAMPAIGN MAP CONTAINER */}
                <div className="relative w-full max-w-xl mx-auto h-[850px] bg-[#fdfcf8] rounded-[2.5rem] border border-[#ece8dc] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.05)] overflow-hidden group">
                    
                    {/* 1. Background Grid Pattern (Subtle) */}
                    <div className="absolute inset-0 opacity-[0.4] pointer-events-none">
                        <svg width="100%" height="100%">
                            <defs>
                                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e6e2d6" strokeWidth="1"/>
                                </pattern>
                            </defs>
                            <rect width="100%" height="100%" fill="url(#grid)" />
                        </svg>
                    </div>

                    {/* 2. Topographic/Brain Contour Lines (Aesthetics) */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none">
                        <svg width="100%" height="100%" viewBox="0 0 400 800" preserveAspectRatio="none">
                            <path d="M0,100 Q100,50 200,100 T400,100" fill="none" stroke="#7a9584" strokeWidth="2" />
                            <path d="M0,200 Q150,150 250,200 T400,180" fill="none" stroke="#7a9584" strokeWidth="2" />
                            <path d="M0,350 Q80,300 180,350 T400,400" fill="none" stroke="#7a9584" strokeWidth="2" />
                            <path d="M0,550 Q120,500 220,550 T400,600" fill="none" stroke="#7a9584" strokeWidth="2" />
                            <path d="M0,700 Q180,650 280,700 T400,750" fill="none" stroke="#7a9584" strokeWidth="2" />
                        </svg>
                    </div>

                    {/* 3. Floating Geometric Particles */}
                    <div className="absolute top-20 left-10 w-4 h-4 rounded-full border border-[#7a9584] opacity-20 animate-[float_6s_ease-in-out_infinite]"></div>
                    <div className="absolute bottom-40 right-20 w-6 h-6 rotate-45 border border-slate-300 opacity-20 animate-[float_8s_ease-in-out_infinite_reverse]"></div>
                    <div className="absolute top-1/2 left-20 w-2 h-2 bg-[#7a9584] rounded-full opacity-10 animate-pulse"></div>

                    {/* 4. Connecting Lines */}
                    <svg className="absolute inset-0 w-full h-full z-0 pointer-events-none overflow-visible">
                        <defs>
                        <linearGradient id="pathGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                            <stop offset="0%" stopColor="#e2e8f0" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="#7a9584" stopOpacity="0.8" />
                        </linearGradient>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                            <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                        </filter>
                        </defs>
                        
                        {/* Shadow Line */}
                        <path 
                            d={mapPath} 
                            fill="none" 
                            stroke="#e6e2d6" 
                            strokeWidth="10"
                            strokeLinecap="round"
                        />
                         {/* Active Signal Line */}
                        <path 
                            d={mapPath} 
                            fill="none" 
                            stroke="#7a9584" 
                            strokeWidth="3"
                            strokeLinecap="round"
                            className="drop-shadow-sm"
                        />
                    </svg>

                    {/* Nodes */}
                    {currentEpisodeLevels.map(level => (
                        <MapNode 
                            key={level.id}
                            id={level.id}
                            x={level.position.x}
                            y={level.position.y}
                            stars={progress.stars[level.id] || 0}
                            status={getLevelStatus(level.id)}
                            isBoss={level.isBoss}
                            onClick={(id) => setSelectedLevelId(id)}
                        />
                    ))}

                    {/* Start/End Markers */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-40">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mb-1"></div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">起点</span>
                    </div>
                </div>
            </div>
          </div>
        )}

        {view === 'GAME' && (
             <GameView 
                level={activeLevelConfig}
                onComplete={handleGameComplete}
                onExit={() => setView('MAP')}
             />
        )}

        {view === 'RESULT' && lastGameResult && (
            <ResultView 
                result={lastGameResult}
                onNext={handleResultNext}
                onRetry={() => startLevel(selectedLevelId || undefined)}
                onExit={() => setView('MAP')}
            />
        )}

        {view === 'COACH' && (
            <div className="absolute inset-0 bg-white z-50">
                 <GeminiCoach progress={progress} onClose={() => setView('MAP')} />
            </div>
        )}
        
        {/* LEVEL DETAIL MODAL */}
        {selectedLevelId && view === 'MAP' && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#57534e]/20 backdrop-blur-sm">
                <div className="bg-[#fdfcf8] rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-fadeIn border border-white/60">
                    <div className="h-32 bg-gradient-to-br from-[#7a9584] to-[#607d6c] relative overflow-hidden flex items-end p-6">
                         {/* Texture overlay */}
                        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')]"></div>
                        
                        <div className="text-white relative z-10 w-full">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="text-[10px] font-mono opacity-90 mb-1 px-2 py-0.5 bg-white/10 rounded inline-block backdrop-blur-sm border border-white/10">
                                        {LEVELS.find(l=>l.id===selectedLevelId)?.gameType} 协议
                                    </div>
                                    <h3 className="text-2xl font-bold tracking-tight">{LEVELS.find(l => l.id === selectedLevelId)?.title}</h3>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-6">
                         {LEVELS.find(l=>l.id===selectedLevelId)?.tutorial && (
                             <div className="bg-[#fffbeb] text-[#92400e] text-xs p-3 rounded-xl mb-5 font-bold border border-[#fcd34d]/30 flex items-center gap-2">
                                 <span>🎓</span> 新手引导课程
                             </div>
                         )}

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-white p-4 rounded-2xl border border-[#ece8dc] text-center shadow-sm">
                                <div className="text-[#9ca3af] text-[10px] font-bold mb-1">难度等级</div>
                                <div className="text-2xl font-bold text-slate-700">N-{LEVELS.find(l => l.id === selectedLevelId)?.n}</div>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-[#ece8dc] text-center shadow-sm">
                                <div className="text-[#9ca3af] text-[10px] font-bold mb-1">回合数</div>
                                <div className="text-2xl font-bold text-slate-700">{LEVELS.find(l => l.id === selectedLevelId)?.trials}</div>
                            </div>
                        </div>
                        
                        <button 
                            onClick={() => startLevel()}
                            className="w-full bg-[#3f3f46] hover:bg-[#27272a] text-white font-bold py-4 rounded-2xl shadow-lg shadow-slate-200 flex items-center justify-center gap-3 transition-all active:scale-95"
                        >
                            <span>开始训练</span>
                            <div className="flex items-center bg-white/10 px-2 py-0.5 rounded text-xs border border-white/10">
                                <span className="text-[#fbbf24] mr-1">⚡</span>
                                {ENERGY_COST_PER_LEVEL}
                            </div>
                        </button>
                        
                        <button 
                            onClick={() => setSelectedLevelId(null)}
                            className="w-full mt-3 py-3 text-[#9ca3af] text-sm hover:text-slate-600 font-medium"
                        >
                            稍后再说
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* STORY MODAL */}
        {showStoryModal && currentEpisodeData && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#292524]/90 backdrop-blur-md">
                <div className="bg-[#1c1917] text-white rounded-[2rem] max-w-lg w-full p-8 border border-[#44403c] shadow-2xl relative overflow-hidden">
                    {/* Decorative Background */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#7a9584] rounded-full blur-[100px] opacity-10 pointer-events-none"></div>

                    <div className="relative z-10">
                        <div className="text-xs font-mono text-[#7a9584] mb-4 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 bg-[#7a9584] rounded-full animate-pulse"></span>
                            接收到新讯息
                        </div>
                        <h2 className="text-3xl font-bold mb-6 tracking-tight">{currentEpisodeData.title}</h2>
                        <div className="w-10 h-1 bg-[#7a9584] mb-6 rounded-full"></div>
                        <p className="text-[#d6d3d1] leading-relaxed whitespace-pre-line mb-10 font-light text-lg">
                            {currentEpisodeData.storyText}
                        </p>
                        <button onClick={closeStory} className="w-full py-4 bg-[#7a9584] hover:bg-[#688573] text-white font-bold rounded-xl transition-colors shadow-[0_0_20px_rgba(122,149,132,0.3)]">
                            确认接入
                        </button>
                    </div>
                </div>
            </div>
        )}

      </main>

      {/* REWARD GENERATOR MODAL */}
      {showRewardGen && lastGameResult && (
        <RewardGenerator 
            prompt={activeLevelConfig.rewardImagePrompt || "Zen brain flow"}
            onClose={() => setShowRewardGen(false)}
            onSave={(img) => {}}
        />
      )}
    </div>
  );
}

const NavItem = ({ icon, label, active, onClick }: any) => {
    return (
        <button 
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${active ? 'bg-white shadow-sm text-[#7a9584] border border-[#ece8dc]' : 'text-[#a8a29e] hover:bg-[#f5f5f4]'}`}
        >
            <span className="tracking-wide">{label}</span>
        </button>
    )
}