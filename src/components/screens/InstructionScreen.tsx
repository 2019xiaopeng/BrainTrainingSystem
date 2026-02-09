import { useTranslation } from 'react-i18next';
import { Card } from '../ui/Card';
import { BRAIN_RANK_LEVELS } from '../../types/game';
import { Brain, HelpCircle, Award, BarChart3, Zap, Target, Flame, Eye, Database, Timer } from 'lucide-react';

/**
 * InstructionScreen — 帮助与说明页面
 * 包含: N-Back 机制图文解说, LV1-LV7 等级表, 雷达图六维含义
 */
export function InstructionScreen() {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh';

  return (
    <div className="space-y-6 pt-4 pb-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-light text-zen-700 flex items-center justify-center gap-2">
          <HelpCircle className="w-6 h-6" />
          {t('instruction.title')}
        </h1>
        <p className="text-xs text-zen-400 mt-1">{t('instruction.subtitle')}</p>
      </div>

      {/* Section 1: N-Back Mechanism */}
      <Card>
        <h2 className="text-lg font-medium text-zen-700 flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-sage-600" />
          {t('instruction.nback.title')}
        </h2>

        <div className="space-y-4 text-sm text-zen-600">
          <p>{t('instruction.nback.intro')}</p>

          {/* Visual example */}
          <div className="bg-zen-50 rounded-xl p-4 border border-zen-200/50">
            <h3 className="text-sm font-medium text-zen-500 mb-3">{t('instruction.nback.example')}</h3>
            <div className="space-y-2">
              {/* Timeline visual */}
              <div className="flex items-center gap-2 text-xs">
                <div className="w-16 text-zen-400 text-right">{t('instruction.nback.round')} 1:</div>
                <div className="flex-1 bg-sage-100 rounded-lg p-2 text-center font-mono text-sage-700 border border-sage-200/50">
                  3 + 2 = ?
                </div>
                <div className="w-24 text-zen-400">{t('instruction.nback.remember')}</div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-16 text-zen-400 text-right">{t('instruction.nback.round')} 2:</div>
                <div className="flex-1 bg-sage-100 rounded-lg p-2 text-center font-mono text-sage-700 border border-sage-200/50">
                  1 + 4 = ?
                </div>
                <div className="w-24 text-amber-600 font-medium">→ {t('instruction.nback.input')} 5</div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-16 text-zen-400 text-right">{t('instruction.nback.round')} 3:</div>
                <div className="flex-1 bg-sage-100 rounded-lg p-2 text-center font-mono text-sage-700 border border-sage-200/50">
                  4 + 4 = ?
                </div>
                <div className="w-24 text-amber-600 font-medium">→ {t('instruction.nback.input')} 8</div>
              </div>
            </div>
            <p className="text-xs text-zen-400 mt-2">{t('instruction.nback.exampleHint')}</p>
          </div>

          {/* Game modes */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-white rounded-lg p-3 border border-zen-200/50">
              <div className="text-lg mb-1">🔢</div>
              <div className="text-sm font-medium text-zen-700">{t('home.numeric')}</div>
              <p className="text-xs text-zen-400 mt-1">{t('instruction.modes.numeric')}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-zen-200/50">
              <div className="text-lg mb-1">🎯</div>
              <div className="text-sm font-medium text-zen-700">{t('home.spatial')}</div>
              <p className="text-xs text-zen-400 mt-1">{t('instruction.modes.spatial')}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-zen-200/50">
              <div className="text-lg mb-1">🐭</div>
              <div className="text-sm font-medium text-zen-700">{t('home.mouse')}</div>
              <p className="text-xs text-zen-400 mt-1">{t('instruction.modes.mouse')}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-zen-200/50">
              <div className="text-lg mb-1">🏠</div>
              <div className="text-sm font-medium text-zen-700">{t('home.house')}</div>
              <p className="text-xs text-zen-400 mt-1">{t('instruction.modes.house')}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Section 2: Brain Rank LV1-LV7 */}
      <Card>
        <h2 className="text-lg font-medium text-zen-700 flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-amber-500" />
          {t('instruction.rank.title')}
        </h2>

        <p className="text-sm text-zen-500 mb-4">{t('instruction.rank.desc')}</p>

        <div className="space-y-2">
          {BRAIN_RANK_LEVELS.map((rank) => (
            <div
              key={rank.level}
              className="flex items-center gap-3 p-3 rounded-lg bg-zen-50 border border-zen-200/30"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm ${
                rank.level <= 2 ? 'bg-gradient-to-br from-zen-300 to-zen-400' :
                rank.level <= 4 ? 'bg-gradient-to-br from-sage-400 to-sage-500' :
                rank.level <= 6 ? 'bg-gradient-to-br from-amber-400 to-amber-500' :
                'bg-gradient-to-br from-rose-400 to-rose-500'
              }`}>
                LV{rank.level}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-zen-700">
                  {isZh ? rank.titleZh : rank.titleEn}
                </div>
                <div className="text-xs text-zen-400">
                  {rank.xpRequired === 0
                    ? t('instruction.rank.initial')
                    : t('instruction.rank.xpRequired', { xp: rank.xpRequired.toLocaleString() })
                  }
                </div>
                {rank.milestones && rank.milestones.length > 0 && (
                  <div className="text-sm text-zen-500 mt-1 flex items-center gap-1">
                    <span className="opacity-60">🎯</span>
                    <span>
                      {rank.milestones.map((m, i) => (
                        <span key={m}>
                          {i > 0 && (rank.milestoneLogic === 'OR' ? ' / ' : ', ')}
                          {t(`instruction.rank.milestone.${m}`)}
                        </span>
                      ))}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-zen-400 mt-3">
          {t('instruction.rank.formula')}
        </p>
      </Card>

      {/* Section 3: Six-Dimension Radar */}
      <Card>
        <h2 className="text-lg font-medium text-zen-700 flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-teal-500" />
          {t('instruction.radar.title')}
        </h2>

        <p className="text-sm text-zen-500 mb-4">{t('instruction.radar.desc')}</p>

        <div className="space-y-3">
          {[
            { icon: Brain, key: 'memory', color: 'text-purple-500 bg-purple-50' },
            { icon: Target, key: 'focus', color: 'text-sage-600 bg-sage-50' },
            { icon: Zap, key: 'math', color: 'text-amber-500 bg-amber-50' },
            { icon: Eye, key: 'observation', color: 'text-teal-500 bg-teal-50' },
            { icon: Database, key: 'loadCapacity', color: 'text-blue-500 bg-blue-50' },
            { icon: Timer, key: 'reaction', color: 'text-red-500 bg-red-50' },
          ].map(({ icon: Icon, key, color }) => (
            <div key={key} className="flex items-start gap-3 p-3 rounded-lg bg-zen-50 border border-zen-200/30">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-medium text-zen-700">
                  {t(`instruction.radar.${key}.name`)}
                </div>
                <p className="text-xs text-zen-400 mt-0.5">
                  {t(`instruction.radar.${key}.desc`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Section 4: Energy System */}
      <Card>
        <h2 className="text-lg font-medium text-zen-700 flex items-center gap-2 mb-4">
          <Flame className="w-5 h-5 text-orange-500" />
          {t('instruction.energy.title')}
        </h2>

        <div className="space-y-2 text-sm text-zen-500">
          <p>{t('instruction.energy.desc1')}</p>
          <p>{t('instruction.energy.desc2')}</p>
          <p>{t('instruction.energy.desc3')}</p>
        </div>
      </Card>
    </div>
  );
}
