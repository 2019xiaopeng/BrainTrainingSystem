import React, { useEffect, useState } from 'react';
import { GameResult } from '../types';

interface ResultViewProps {
  result: GameResult;
  onNext: () => void;
  onRetry: () => void;
  onExit: () => void;
}

const ResultView: React.FC<ResultViewProps> = ({ result, onNext, onRetry, onExit }) => {
  const [visibleStars, setVisibleStars] = useState(0);

  useEffect(() => {
    // Animate stars one by one
    let timer: any;
    if (visibleStars < result.stars) {
      timer = setTimeout(() => {
        setVisibleStars(prev => prev + 1);
      }, 400);
    }
    return () => clearTimeout(timer);
  }, [visibleStars, result.stars]);

  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#faf8ef] relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
         <svg width="100%" height="100%">
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid)" />
         </svg>
      </div>

      <div className="z-10 bg-[#fdfcf8] p-8 rounded-[2rem] shadow-xl border border-white max-w-sm w-full text-center relative">
        {/* Header Icon */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2">
            <div className={`
                w-24 h-24 rounded-full flex items-center justify-center border-8 border-[#faf8ef] shadow-lg text-5xl
                ${result.passed ? 'bg-[#7a9584] text-white' : 'bg-slate-300 text-slate-500'}
            `}>
                {result.passed ? '🧠' : '💭'}
            </div>
        </div>

        <div className="mt-12 mb-2">
            <h2 className="text-2xl font-bold text-slate-800">
                {result.passed ? '神经连接已建立' : '连接不稳定'}
            </h2>
            <p className="text-[#a8a29e] text-sm mt-1">
                {result.passed ? '认知功能优化完毕。' : '集中注意力，再次尝试。'}
            </p>
        </div>

        {/* Stars */}
        <div className="flex justify-center gap-3 my-8 h-12">
            {[1, 2, 3].map((star) => (
                <svg 
                    key={star}
                    className={`
                        w-12 h-12 transition-all duration-500 transform
                        ${star <= visibleStars 
                            ? 'text-yellow-400 fill-current scale-100 rotate-0 drop-shadow-sm' 
                            : 'text-[#e6e2d6] fill-[#f5f2e9] scale-90 rotate-12'}
                    `}
                    viewBox="0 0 24 24"
                >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
            ))}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-[#f5f2e9] rounded-2xl p-4 border border-[#ece8dc]">
                <div className="text-xs text-[#a8a29e] font-bold mb-1">准确率</div>
                <div className="text-2xl font-bold text-slate-700">{Math.round(result.accuracy)}%</div>
            </div>
            <div className="bg-[#f5f2e9] rounded-2xl p-4 border border-[#ece8dc]">
                <div className="text-xs text-[#a8a29e] font-bold mb-1">经验获取</div>
                <div className="text-2xl font-bold text-slate-700">+{result.passed ? result.stars * 50 : 10}</div>
            </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
            {result.passed ? (
                <button 
                    onClick={onNext}
                    className="w-full py-4 rounded-2xl bg-[#7a9584] text-white font-bold shadow-lg shadow-green-900/10 hover:bg-[#688573] transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2"
                >
                    <span>下一协议</span>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </button>
            ) : (
                <button 
                    onClick={onRetry}
                    className="w-full py-4 rounded-2xl bg-[#3f3f46] text-white font-bold shadow-lg hover:bg-[#27272a] transition-all"
                >
                    再试一次
                </button>
            )}
            
            <button 
                onClick={onExit}
                className="w-full py-3 rounded-2xl border border-[#e6e2d6] text-[#a8a29e] hover:bg-[#faf8ef] font-medium"
            >
                返回地图
            </button>
        </div>
      </div>
    </div>
  );
};

export default ResultView;