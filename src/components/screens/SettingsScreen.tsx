import { useMemo, useState, type ComponentType } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HelpCircle, Settings as SettingsIcon, User, Trash2 } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { InstructionScreen } from './InstructionScreen';

type SettingsTab = 'profile' | 'help';

function useTab(): SettingsTab {
  const location = useLocation();
  return useMemo(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'help') return 'help';
    return 'profile';
  }, [location.search]);
}

export function SettingsScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const tab = useTab();
  const setTab = (next: SettingsTab) => navigate(`/settings?tab=${encodeURIComponent(next)}`, { replace: true });

  const sessionCount = useGameStore((s) => s.sessionHistory.length);
  const resetLocalData = useGameStore((s) => s.resetLocalData);
  const [confirmReset, setConfirmReset] = useState(false);

  const tabs: Array<{ key: SettingsTab; label: string; icon: ComponentType<{ className?: string }> }> = [
    { key: 'profile', label: t('settings.tabs.profile'), icon: User },
    { key: 'help', label: t('settings.tabs.help'), icon: HelpCircle },
  ];

  const handleReset = () => {
    resetLocalData();
    setConfirmReset(false);
  };

  return (
    <div className="space-y-4 pt-2 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium text-zen-700 flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-zen-400" />
          {t('nav.settings')}
        </h1>
      </div>

      <div className="bg-white rounded-xl p-4 border border-zen-200/50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-zen-100 flex items-center justify-center">
            <User className="w-5 h-5 text-zen-500" />
          </div>
          <div className="min-w-0">
            <div className="font-medium text-zen-700 truncate">{t('profile.auth.guest')}</div>
            <div className="text-xs text-zen-400">
              {t('settings.localDataCount', { count: sessionCount })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
              tab === key
                ? 'bg-sage-100 text-sage-700 border-sage-200'
                : 'bg-white text-zen-500 border-zen-200/50 hover:bg-zen-50'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="space-y-3">
          <div className="bg-white rounded-xl p-4 border border-zen-200/50 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-medium text-zen-700 flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-zen-400" />
                  {t('settings.resetData')}
                </div>
                <div className="text-xs text-zen-400 mt-1">{t('settings.resetDataHint')}</div>
              </div>
              <button
                type="button"
                onClick={() => (confirmReset ? handleReset() : setConfirmReset(true))}
                className={`shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  confirmReset
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'border border-zen-200 text-zen-700 hover:bg-zen-50'
                }`}
              >
                {confirmReset ? t('settings.resetDataConfirm') : t('settings.resetData')}
              </button>
            </div>
            {confirmReset && (
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="mt-2 text-xs text-zen-400 hover:text-zen-600"
              >
                {t('common.cancel')}
              </button>
            )}
          </div>
        </div>
      )}

      {tab === 'help' && <InstructionScreen />}
    </div>
  );
}
