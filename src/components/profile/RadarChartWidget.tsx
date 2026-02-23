import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import type { BrainStats } from '../../types/game';

interface RadarChartWidgetProps {
  stats: BrainStats;
  /** Compact mode for sidebar */
  compact?: boolean;
}

/**
 * RadarChartWidget — 六维脑力雷达图
 * 使用莫兰迪配色 Zen 主题
 */
export function RadarChartWidget({ stats, compact = false }: RadarChartWidgetProps) {
  const { t } = useTranslation();

  const data = [
    { dimension: t('profile.radar.memory'), value: stats.memory, fullMark: 100 },
    { dimension: t('profile.radar.focus'), value: stats.focus, fullMark: 100 },
    { dimension: t('profile.radar.math'), value: stats.math, fullMark: 100 },
    { dimension: t('profile.radar.observation'), value: stats.observation, fullMark: 100 },
    { dimension: t('profile.radar.loadCapacity'), value: stats.loadCapacity, fullMark: 100 },
    { dimension: t('profile.radar.speed'), value: stats.speed, fullMark: 100 },
  ];

  // Morandi palette colors (Zen light theme)
  const c = { fill: '#95a795', stroke: '#627361', grid: '#dbd7cf', text: '#5c5145', tick: '#8d7f6d' };
  const chartSize = compact ? 200 : 280;

  const allZero = Object.values(stats).every(v => v === 0);

  if (allZero) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-zen-400">
        <div className="text-4xl mb-2">🧠</div>
        <p className="text-sm">{t('profile.noRadarData')}</p>
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <ResponsiveContainer width="100%" height={chartSize}>
        <RadarChart cx="50%" cy="50%" outerRadius={compact ? '70%' : '75%'} data={data}>
          <PolarGrid stroke={c.grid} strokeOpacity={0.6} />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{
              fontSize: compact ? 10 : 12,
              fill: c.tick,
              fontWeight: 500,
            }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fontSize: 9, fill: c.tick }}
            tickCount={5}
            axisLine={false}
          />
          <Radar
            name={t('profile.brainRadar')}
            dataKey="value"
            stroke={c.stroke}
            fill={c.fill}
            fillOpacity={0.35}
            strokeWidth={2}
            animationDuration={1200}
            animationEasing="ease-out"
          />
          {!compact && <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: `1px solid ${c.grid}`,
              borderRadius: '8px',
              fontSize: '12px',
              color: c.text,
            }}
            formatter={(value) => [`${value ?? 0}`, '']}
          />}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
