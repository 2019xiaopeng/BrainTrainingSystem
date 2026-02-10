import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface HeatmapDay {
  date: string;
  count: number;
  xp?: number;
}

interface ActivityHeatmapProps {
  data: HeatmapDay[];
  /** Compact mode for sidebar */
  compact?: boolean;
}

/**
 * ActivityHeatmap — GitHub 风格打卡热力图（365 天）
 * Morandi 绿色系 4 级色阶，支持 Tooltip 显示日期 XP
 */
export function ActivityHeatmap({ data, compact = false }: ActivityHeatmapProps) {
  const { t, i18n } = useTranslation();
  const [tooltip, setTooltip] = useState<{ x: number; y: number; day: HeatmapDay } | null>(null);

  // Morandi green color scale (0, 1-2, 3-4, 5-6, 7+)
  const colorScale = ['#f7f6f4', '#d0d9d0', '#b4c2b4', '#95a795', '#627361'];

  const getColor = (count: number) => {
    if (count === 0) return colorScale[0];
    if (count <= 2) return colorScale[1];
    if (count <= 4) return colorScale[2];
    if (count <= 6) return colorScale[3];
    return colorScale[4];
  };

  // Organize into weeks (columns of 7 days)
  const weeks = useMemo(() => {
    const result: HeatmapDay[][] = [];
    let currentWeek: HeatmapDay[] = [];

    // Pad the start to align to weekday
    if (data.length > 0) {
      const firstDayOfWeek = new Date(data[0].date).getDay();
      for (let i = 0; i < firstDayOfWeek; i++) {
        currentWeek.push({ date: '', count: -1 });
      }
    }

    for (const day of data) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        result.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: '', count: -1 });
      }
      result.push(currentWeek);
    }
    return result;
  }, [data]);

  // Month labels
  const monthLabels = useMemo(() => {
    const labels: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, wi) => {
      for (const day of week) {
        if (day.date && day.count >= 0) {
          const date = new Date(day.date);
          const month = date.getMonth();
          if (month !== lastMonth && wi > 0) { // Skip first incomplete week
            const monthName = date.toLocaleString(i18n.language, { month: 'short' });
            labels.push({ label: monthName, weekIndex: wi });
            lastMonth = month;
          }
          break;
        }
      }
    });
    return labels;
  }, [weeks, i18n.language]);

  const totalSessions = data.reduce((sum, d) => sum + Math.max(0, d.count), 0);
  const activeDays = data.filter(d => d.count > 0).length;
  const totalXP = data.reduce((sum, d) => sum + (d.xp || 0), 0);
  const cellSize = compact ? 10 : 12;
  const gap = 2;
  const weekWidth = cellSize + gap;
  const monthRowHeight = compact ? 0 : 16;

  return (
    <div className="relative">
      {/* Header stats */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 text-xs text-zen-500">
          <span>{t('profile.heatmap.sessions', { count: totalSessions })}</span>
          <span>·</span>
          <span>{t('profile.heatmap.activeDays', { count: activeDays })}</span>
          {totalXP > 0 && (
            <>
              <span>·</span>
              <span>{totalXP.toLocaleString()} XP</span>
            </>
          )}
        </div>
      </div>

      <div className="flex">
        {!compact && (
          <div className="flex flex-col flex-shrink-0 pr-2" style={{ gap: `${gap}px`, paddingTop: `${monthRowHeight + 4}px` }}>
            {Array.from({ length: 7 }, (_, di) => {
              const label =
                di === 1
                  ? t('profile.heatmap.weekdays.mon')
                  : di === 3
                    ? t('profile.heatmap.weekdays.wed')
                    : di === 5
                      ? t('profile.heatmap.weekdays.fri')
                      : '';
              return (
                <div
                  key={di}
                  className="text-xs text-zen-400"
                  style={{ height: `${cellSize}px`, lineHeight: `${cellSize}px` }}
                >
                  {label}
                </div>
              );
            })}
          </div>
        )}

        <div className="overflow-x-auto max-w-full pb-1">
          <div
            className="inline-block"
            style={{ width: `${weeks.length * weekWidth - gap}px` }}
          >
            {!compact && (
              <div className="relative h-4 mb-1">
                {monthLabels
                  .filter((label, idx, arr) => (idx === 0 ? true : label.weekIndex - arr[idx - 1].weekIndex >= 3))
                  .map(({ label, weekIndex }, i) => (
                    <span
                      key={`${label}-${weekIndex}-${i}`}
                      className="absolute top-0 text-xs text-zen-400"
                      style={{ left: `${weekIndex * weekWidth}px` }}
                    >
                      {label}
                    </span>
                  ))}
              </div>
            )}

            <div className="flex" style={{ gap: `${gap}px` }}>
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col flex-shrink-0" style={{ gap: `${gap}px` }}>
                  {week.map((day, di) => (
                    <div
                      key={`${wi}-${di}`}
                      className="rounded-sm transition-colors"
                      style={{
                        width: `${cellSize}px`,
                        height: `${cellSize}px`,
                        backgroundColor: day.count < 0 ? 'transparent' : getColor(day.count),
                        border: day.count < 0 ? 'none' : '1px solid rgba(0,0,0,0.05)',
                        cursor: day.count >= 0 ? 'pointer' : 'default',
                      }}
                      onMouseEnter={(e) => {
                        if (day.count >= 0 && day.date) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setTooltip({
                            x: rect.left + rect.width / 2,
                            y: rect.top - 8,
                            day,
                          });
                        }
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none bg-zen-800 text-white text-xs px-2 py-1 rounded shadow-lg"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div>{tooltip.day.date}</div>
          <div>
            {tooltip.day.count} {t('profile.heatmap.sessionLabel')}
            {tooltip.day.xp ? ` · ${tooltip.day.xp} XP` : ''}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-end gap-1 mt-2">
        <span className="text-xs text-zen-400 mr-1">{t('profile.heatmap.less')}</span>
        {colorScale.map((color, i) => (
          <div
            key={i}
            className="rounded-sm"
            style={{
              width: `${cellSize - 2}px`,
              height: `${cellSize - 2}px`,
              backgroundColor: color,
              border: '1px solid rgba(0,0,0,0.05)',
            }}
          />
        ))}
        <span className="text-xs text-zen-400 ml-1">{t('profile.heatmap.more')}</span>
      </div>
    </div>
  );
}
