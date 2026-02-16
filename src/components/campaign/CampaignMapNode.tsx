import type { ReactNode } from "react";

export type CampaignNodeStatus = "locked" | "unlocked" | "completed";

interface CampaignMapNodeProps {
  id: number;
  x: number;
  y: number;
  status: CampaignNodeStatus;
  stars: number;
  isBoss?: boolean;
  onClick: (id: number) => void;
  lockedHint?: ReactNode;
}

export function CampaignMapNode({ id, x, y, status, stars, isBoss, onClick, lockedHint }: CampaignMapNodeProps) {
  const isLocked = status === "locked";
  const isCompleted = status === "completed";
  const isUnlocked = status === "unlocked";

  const sizeClass = isBoss ? "w-16 h-16" : "w-12 h-12";
  const fontSize = isBoss ? "text-xl" : "text-base";

  let containerClass = "bg-white border-2 border-zen-200 shadow-sm";
  let textClass = "text-zen-300";
  let outerRing: ReactNode = null;

  if (isUnlocked) {
    containerClass = "bg-white border-4 border-sage-500 shadow-lg";
    textClass = "text-sage-600 font-bold";
    outerRing = (
      <>
        <div className="absolute inset-[-8px] rounded-full border-2 border-sage-500 opacity-25 animate-[ping_2s_ease-out_infinite]" />
        <div className="absolute inset-[-14px] rounded-full border border-sage-500 opacity-10 animate-[pulse_3s_ease-in-out_infinite]" />
      </>
    );
  } else if (isCompleted) {
    containerClass = "bg-sage-500 border-4 border-white shadow-md";
    textClass = "text-white font-bold";
  } else if (isLocked) {
    containerClass = "bg-zen-100 border border-zen-200";
    textClass = "text-zen-300";
  }

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center cursor-pointer transition-transform duration-300 hover:scale-105 group"
      style={{ left: `${x}%`, top: `${y}%` }}
      onClick={() => onClick(id)}
      role="button"
      tabIndex={0}
    >
      {outerRing}

      <div className={`${sizeClass} rounded-full flex items-center justify-center relative ${containerClass} transition-all duration-500`}>
        {isLocked ? <div className="w-2 h-2 bg-zen-300 rounded-full" /> : <span className={`${fontSize} ${textClass}`}>{id}</span>}

        {isBoss && !isLocked && (
          <div className="absolute -top-2 px-2 py-0.5 rounded-md bg-zen-800 text-white text-[10px] font-bold border border-zen-700">
            核心
          </div>
        )}
      </div>

      {!isLocked && stars > 0 && (
        <div className="absolute -bottom-4 bg-white px-2 py-0.5 rounded-full shadow-md border border-zen-100 flex gap-0.5 items-center z-10">
          {[1, 2, 3].map((starIdx) => (
            <svg
              key={starIdx}
              className={`w-3 h-3 ${starIdx <= stars ? "text-yellow-400 fill-current" : "text-zen-200 fill-current"}`}
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
      )}

      {isLocked && lockedHint ? (
        <div className="absolute top-full mt-3 px-3 py-2 rounded-xl text-[11px] bg-zen-900 text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity max-w-[220px] text-center">
          {lockedHint}
        </div>
      ) : null}
    </div>
  );
}

