import { useState, useEffect, useRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

export type CampaignNodeStatus = "locked" | "unlocked" | "completed";

interface CampaignMapNodeProps {
  id: number;
  x: number;
  y: number;
  status: CampaignNodeStatus;
  stars: number;
  isBoss?: boolean;
  themeColor?: string;
  onClick: (id: number) => void;
  lockedHint?: ReactNode;
}

export function CampaignMapNode({ id, x, y, status, stars, isBoss, themeColor = "#7a9584", onClick, lockedHint }: CampaignMapNodeProps) {
  const { t } = useTranslation();
  const isLocked = status === "locked";
  const [showLockedHint, setShowLockedHint] = useState(false);
  const hintRef = useRef<HTMLDivElement>(null);

  // Dismiss tooltip on outside click
  useEffect(() => {
    if (!showLockedHint) return;
    const handler = (e: MouseEvent) => {
      if (hintRef.current && !hintRef.current.contains(e.target as Node)) {
        setShowLockedHint(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showLockedHint]);

  // Auto-hide after 2.5s
  useEffect(() => {
    if (!showLockedHint) return;
    const timer = setTimeout(() => setShowLockedHint(false), 2500);
    return () => clearTimeout(timer);
  }, [showLockedHint]);
  const isCompleted = status === "completed";
  const isUnlocked = status === "unlocked";

  const sizeClass = isBoss ? "w-20 h-20" : "w-14 h-14";
  const fontSize = isBoss ? "text-2xl" : "text-lg";

  let containerClass = "bg-[#fdfcf8] border-2 border-[#e6e2d6] shadow-sm";
  let textClass = "text-[#d6d3c4]";
  let outerRing: ReactNode = null;

  if (isUnlocked) {
    containerClass = "bg-white border-4 shadow-xl z-20";
    textClass = "font-bold";
    outerRing = (
      <>
        <div className="absolute inset-[-8px] rounded-full border-2 opacity-30 animate-[ping_2s_ease-out_infinite]" style={{ borderColor: themeColor }} />
        <div className="absolute inset-[-14px] rounded-full border opacity-10 animate-[pulse_3s_ease-in-out_infinite]" style={{ borderColor: themeColor }} />
      </>
    );
  } else if (isCompleted) {
    containerClass = "border-4 border-white shadow-md z-10";
    textClass = "text-white font-bold";
  } else if (isLocked) {
    containerClass = "bg-[#f4f1ea] border border-[#e6e2d6]";
    textClass = "text-[#d1ccc0]";
  }

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105 z-10"
      style={{ left: `${x}%`, top: `${y}%` }}
      onClick={() => {
        if (isLocked && lockedHint) {
          setShowLockedHint((v) => !v);
        } else {
          onClick(id);
        }
      }}
      role="button"
      tabIndex={0}
    >
      {outerRing}

      <div
        className={`${sizeClass} rounded-full flex items-center justify-center relative ${containerClass} transition-all duration-500`}
        style={
          isUnlocked
            ? { borderColor: themeColor, color: themeColor }
            : isCompleted
              ? { backgroundColor: themeColor }
              : {}
        }
      >
        {isLocked ? (
          <div className="w-2 h-2 bg-[#d1ccc0] rounded-full" />
        ) : (
          <span className={`${fontSize} ${textClass}`} style={isCompleted ? {} : { color: isUnlocked ? themeColor : undefined }}>
            {id}
          </span>
        )}

        {isBoss && !isLocked && (
          <div className="absolute -top-3 bg-slate-800 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm border border-slate-600 tracking-wider">
            {t("campaign.bossLabel")}
          </div>
        )}
      </div>

      {!isLocked && stars > 0 && (
        <div className="absolute -bottom-4 bg-white px-2 py-0.5 rounded-full shadow-md border border-[#ece8dc] flex gap-0.5 items-center z-30">
          {[1, 2, 3].map((starIdx) => (
            <svg key={starIdx} className={`w-3 h-3 ${starIdx <= stars ? "text-yellow-400 fill-current" : "text-[#e6e2d6] fill-current"}`} viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
      )}

      {/* Vertical connection line */}
      {!isLocked && (
        <div className="absolute top-full w-px h-6 bg-[#d6d3c4] opacity-60" />
      )}

      {isLocked && lockedHint && showLockedHint ? (
        <div
          ref={hintRef}
          className="absolute top-full mt-3 px-3 py-2 rounded-xl text-[11px] bg-slate-800 text-white shadow-lg max-w-[220px] text-center whitespace-nowrap animate-[fadeIn_0.15s_ease-out]"
        >
          {lockedHint}
        </div>
      ) : null}
    </div>
  );
}

