import React, { useState } from 'react';
import { generateRewardImage } from '../services/geminiService';

interface RewardGeneratorProps {
  prompt: string;
  onClose: () => void;
  onSave: (imageData: string) => void;
}

const RewardGenerator: React.FC<RewardGeneratorProps> = ({ prompt, onClose, onSave }) => {
  const [status, setStatus] = useState<'idle' | 'generating' | 'done'>('idle');
  const [size, setSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [imageData, setImageData] = useState<string | null>(null);

  const handleGenerate = async () => {
    setStatus('generating');
    try {
      const data = await generateRewardImage(prompt, size);
      if (data) {
        setImageData(data);
        setStatus('done');
      } else {
        setStatus('idle'); 
        alert("生成图片失败。");
      }
    } catch (e) {
      console.error(e);
      setStatus('idle');
      alert("连接错误。");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-white/50">
        <div className="p-8">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-light text-slate-800 mb-1">
              视觉奖励
            </h3>
            <p className="text-slate-400 text-sm">
               将你的思维状态具象化
            </p>
          </div>

          {/* Configuration */}
          {status === 'idle' && (
            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                <p className="text-slate-400 text-xs font-bold uppercase mb-2">生成关键词</p>
                <p className="text-slate-600 italic text-sm">"{prompt}"</p>
              </div>

              <div>
                <label className="text-slate-400 text-xs uppercase tracking-wider mb-3 block text-center">清晰度</label>
                <div className="flex justify-center gap-3">
                  {(['1K', '2K', '4K'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      className={`
                        px-6 py-2 rounded-lg font-bold text-sm border transition-all
                        ${size === s 
                          ? 'bg-slate-800 border-slate-800 text-white shadow-md' 
                          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}
                      `}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button onClick={onClose} className="flex-1 py-3 text-slate-400 hover:text-slate-600 text-sm font-medium">跳过</button>
                <button 
                  onClick={handleGenerate}
                  className="flex-1 py-3 bg-[#7a9584] hover:bg-[#688573] rounded-xl font-bold text-white shadow-lg shadow-green-900/10"
                >
                  生成
                </button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {status === 'generating' && (
            <div className="py-12 flex flex-col items-center justify-center">
              <div className="relative w-16 h-16 mb-6">
                <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                <div className="absolute inset-0 border-t-4 border-[#7a9584] rounded-full animate-spin"></div>
              </div>
              <p className="text-slate-500 animate-pulse text-sm font-medium">思维同步中...</p>
            </div>
          )}

          {/* Result State */}
          {status === 'done' && imageData && (
            <div className="space-y-4 animate-fadeIn">
              <div className="aspect-square w-full rounded-xl overflow-hidden shadow-inner bg-slate-100 border border-slate-200">
                <img src={imageData} alt="Reward" className="w-full h-full object-cover" />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => { onSave(imageData); onClose(); }}
                  className="w-full py-3 bg-slate-800 rounded-xl font-bold text-white hover:bg-slate-700 shadow-lg"
                >
                  保存至相册
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RewardGenerator;