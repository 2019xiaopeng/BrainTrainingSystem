import React from 'react';
import { NodeStatus } from '../types';

interface MapNodeProps {
  id: number;
  x: number;
  y: number;
  status: NodeStatus;
  stars: number;
  isBoss?: boolean;
  onClick: (id: number) => void;
}

const MapNode: React.FC<MapNodeProps> = ({ id, x, y, status, stars, isBoss, onClick }) => {
  const isLocked = status === NodeStatus.LOCKED;
  const isCompleted = status === NodeStatus.COMPLETED;
  const isUnlocked = status === NodeStatus.UNLOCKED; // Current active level
  
  // Base size
  const sizeClass = isBoss ? 'w-20 h-20' : 'w-14 h-14';
  const fontSize = isBoss ? 'text-2xl' : 'text-lg';
  
  // Status styling - Adjusted for Warm Theme (#faf8ef)
  let containerClass = 'bg-[#fdfcf8] border-2 border-[#e6e2d6] shadow-sm';
  let textClass = 'text-[#d6d3c4]';
  let outerRing = '';
  
  if (isUnlocked) {
    // Active Level: Sage Green with Warm White BG
    containerClass = 'bg-[#ffffff] border-4 border-[#7a9584] shadow-xl text-[#7a9584] z-20';
    textClass = 'text-[#7a9584] font-bold';
    // Double ring animation
    outerRing = (
      <>
        <div className="absolute inset-[-8px] rounded-full border-2 border-[#7a9584] opacity-30 animate-[ping_2s_ease-out_infinite]"></div>
        <div className="absolute inset-[-14px] rounded-full border border-[#7a9584] opacity-10 animate-[pulse_3s_ease-in-out_infinite]"></div>
      </>
    ) as any;
  } else if (isCompleted) {
    // Completed: Solid Sage Green
    containerClass = 'bg-[#7a9584] border-4 border-[#ffffff] shadow-md z-10';
    textClass = 'text-white font-bold';
  } else if (isLocked) {
    // Locked: Warm Grey
    containerClass = 'bg-[#f4f1ea] border border-[#e6e2d6]';
    textClass = 'text-[#d1ccc0]';
  }

  return (
    <div 
      className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105 z-10 group"
      style={{ left: `${x}%`, top: `${y}%` }}
      onClick={() => !isLocked && onClick(id)}
    >
      {/* Outer Rings for Active State */}
      {outerRing}

      {/* Main Node Circle */}
      <div className={`
        ${sizeClass} rounded-full flex items-center justify-center relative
        ${containerClass} transition-all duration-500
      `}>
        {isLocked ? (
          <div className="w-2 h-2 bg-[#d1ccc0] rounded-full"></div>
        ) : (
          <span className={`${fontSize} ${textClass}`}>{id}</span>
        )}
        
        {/* Boss Badge */}
        {isBoss && !isLocked && (
            <div className="absolute -top-3 bg-slate-800 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm border border-slate-600 tracking-wider">
                核心
            </div>
        )}
      </div>

      {/* Star Rating - Moved lower to avoid overlap */}
      {!isLocked && stars > 0 && (
        <div className="absolute -bottom-4 bg-white px-2 py-0.5 rounded-full shadow-md border border-slate-100 flex gap-0.5 items-center z-30 transform transition-transform">
          {[1, 2, 3].map((starIdx) => (
            <svg 
              key={starIdx}
              className={`w-3 h-3 ${starIdx <= stars ? 'text-yellow-400 fill-current' : 'text-slate-200 fill-current'}`}
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
      )}

      {/* Vertical connection line to ground element */}
      {!isLocked && (
          <div className="absolute top-full w-px h-6 bg-[#d6d3c4] opacity-60"></div>
      )}
    </div>
  );
};

export default MapNode;