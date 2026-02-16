import { useMemo, useState, type ComponentType } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, HelpCircle, Lock, Settings as SettingsIcon, User } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { InstructionScreen } from './InstructionScreen';
import { signOut } from '../../lib/auth/client';
import { AuthSection } from '../profile/AuthSection';
import { CheckInWidget } from '../economy/CheckInWidget';

type SettingsTab = 'profile' | 'security' | 'notifications' | 'help';

function useTab(): SettingsTab {
  const location = useLocation();
  return useMemo(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'security' || tab === 'notifications' || tab === 'help' || tab === 'profile') return tab;
    if (tab === 'accounts') return 'security';
    return 'profile';
  }, [location.search]);
}

export function SettingsScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const tab = useTab();
  const setTab = (next: SettingsTab) => navigate(`/settings?tab=${encodeURIComponent(next)}`, { replace: true });

  const auth = useGameStore((s) => s.userProfile.auth);
  const inventory = useGameStore((s) => s.userProfile.inventory);
  const setProfile = useGameStore.setState;

  const isGuest = (auth?.status ?? 'guest') === 'guest';
  const displayName = auth?.displayName ?? 'Guest';
  const avatarUrl = auth?.avatarUrl ?? null;
  const email = auth?.email ?? '';
  const emailVerified = auth?.emailVerified ?? false;
  const renameCount = Math.max(0, Number(inventory?.rename_card ?? 0) || 0);

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(displayName);
  const [renameSubmitting, setRenameSubmitting] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  const [emailNotifications, setEmailNotifications] = useState<boolean>(() => {
    const raw = localStorage.getItem('brain-flow-email-notifications');
    if (raw === '0') return false;
    if (raw === '1') return true;
    return true;
  });

  const tabs: Array<{ key: SettingsTab; label: string; icon: ComponentType<{ className?: string }> }> = [
    { key: 'profile', label: t('settings.tabs.profile'), icon: User },
    { key: 'security', label: t('settings.tabs.security'), icon: Lock },
    { key: 'notifications', label: t('settings.tabs.notifications'), icon: Bell },
    { key: 'help', label: t('settings.tabs.help'), icon: HelpCircle },
  ];

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
          <div className="w-10 h-10 rounded-full bg-zen-100 flex items-center justify-center overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-10 h-10 object-cover" />
            ) : (
              <User className="w-5 h-5 text-zen-500" />
            )}
          </div>
          <div className="min-w-0">
            <div className="font-medium text-zen-700 truncate">{displayName}</div>
            <div className="text-xs text-zen-400 truncate">
              {isGuest ? t('profile.auth.guest') : email || t('profile.auth.authenticated')}
            </div>
          </div>
          {!isGuest && (
            <div className="ml-auto text-xs">
              <span className={`px-2 py-1 rounded-md border ${emailVerified ? 'bg-green-50 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                {emailVerified ? t('settings.emailVerified') : t('settings.emailNotVerified')}
              </span>
            </div>
          )}
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
          {!isGuest && <CheckInWidget />}
          <div className="bg-white rounded-xl p-4 border border-zen-200/50 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-zen-700">{t('settings.profile.displayName')}</div>
                <div className="text-xs text-zen-400">{t('settings.profile.renameHint')}</div>
              </div>
              <button
                type="button"
                className="px-3 py-2 rounded-lg border border-zen-200 text-zen-700 text-xs hover:bg-zen-50 transition-colors disabled:opacity-60"
                disabled={isGuest}
                onClick={() => {
                  setRenameError(null);
                  setRenameOpen((v) => !v);
                  setRenameValue(displayName);
                }}
              >
                {t('settings.profile.rename')}
              </button>
            </div>

            {renameOpen && !isGuest && (
              <div className="mt-3 space-y-2">
                <input
                  className="w-full rounded-lg border border-zen-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zen-200"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  disabled={renameSubmitting}
                  placeholder={t('settings.profile.renamePlaceholder')}
                />
                {renameError && <div className="text-xs text-red-600">{renameError}</div>}
                {renameCount <= 0 && (
                  <div className="text-xs text-zen-500">
                    {t('settings.profile.renameNeedCard')}{' '}
                    <Link className="text-zen-700 hover:underline" to="/store">
                      {t('settings.profile.goStore')}
                    </Link>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-zen-200 text-zen-700 px-4 py-2 text-sm hover:bg-zen-50 transition-colors disabled:opacity-60"
                    disabled={renameSubmitting}
                    onClick={() => {
                      setRenameOpen(false);
                      setRenameError(null);
                    }}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-sage-600 text-white px-4 py-2 text-sm hover:bg-sage-700 transition-colors disabled:opacity-60"
                    disabled={renameSubmitting || renameCount <= 0}
                    onClick={async () => {
                      setRenameError(null);
                      setRenameSubmitting(true);
                      try {
                        const resp = await fetch('/api/user/display-name', {
                          method: 'POST',
                          headers: { 'content-type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({ displayName: renameValue }),
                        });
                        if (!resp.ok) {
                          const data = await resp.json().catch(() => null);
                          const code = String((data as { error?: unknown } | null)?.error ?? '');
                          if (code === 'no_rename_card') setRenameError(t('settings.profile.renameNoCard'));
                          else if (code === 'invalid_display_name') setRenameError(t('settings.profile.renameInvalid'));
                          else setRenameError(t('settings.profile.renameFailed'));
                          return;
                        }
                        const data = (await resp.json()) as { displayName?: unknown; inventory?: unknown };
                        setProfile((s) => ({
                          userProfile: {
                            ...s.userProfile,
                            auth: { ...s.userProfile.auth, displayName: String(data.displayName ?? s.userProfile.auth.displayName) },
                            inventory:
                              data.inventory && typeof data.inventory === 'object'
                                ? (data.inventory as Record<string, number>)
                                : s.userProfile.inventory,
                          },
                        }));
                        setRenameOpen(false);
                      } catch {
                        setRenameError(t('settings.profile.renameNetworkError'));
                      } finally {
                        setRenameSubmitting(false);
                      }
                    }}
                  >
                    {t('settings.profile.renameConfirm')}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl p-4 border border-zen-200/50 shadow-sm">
            <div className="text-sm font-medium text-zen-700">{t('settings.profile.avatar')}</div>
            <div className="text-xs text-zen-400 mt-1">{t('settings.profile.avatarHint')}</div>
          </div>
        </div>
      )}

      {tab === 'security' && (
        <div className="space-y-3">
          {isGuest ? (
            <div className="bg-white rounded-xl p-4 border border-zen-200/50 shadow-sm space-y-3">
              <div className="text-sm font-medium text-zen-700">{t('settings.security.title')}</div>
              <div className="text-sm text-zen-500">登录后可修改密码、验证邮箱并绑定第三方账号</div>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  className="text-center rounded-lg bg-zen-800 text-white px-4 py-2 text-sm hover:bg-zen-900 transition-colors"
                  to="/signin?callback=%2Fsettings%3Ftab%3Dsecurity"
                >
                  {t('profile.auth.goSignin')}
                </Link>
                <Link
                  className="text-center rounded-lg border border-zen-200 text-zen-700 px-4 py-2 text-sm hover:bg-zen-50 transition-colors"
                  to="/signup?callback=%2Fsettings%3Ftab%3Dsecurity"
                >
                  {t('profile.auth.goSignup')}
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-4 border border-zen-200/50 shadow-sm space-y-3">
              <div className="text-sm font-medium text-zen-700">{t('settings.security.title')}</div>
              <div className={`grid ${email && !emailVerified ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
                <Link
                  className="text-center rounded-lg border border-zen-200 px-4 py-2 text-sm hover:bg-zen-50 transition-colors text-zen-700"
                  to="/change-password"
                >
                  {t('settings.security.changePassword')}
                </Link>
                {email && !emailVerified ? (
                  <Link
                    className="text-center rounded-lg border border-zen-200 px-4 py-2 text-sm hover:bg-zen-50 transition-colors text-zen-700"
                    to={`/verify-email?email=${encodeURIComponent(email)}&callback=${encodeURIComponent('/settings?tab=security')}`}
                  >
                    {t('settings.security.verifyEmail')}
                  </Link>
                ) : emailVerified ? (
                  <div className="text-center rounded-lg bg-green-50 border border-green-200 text-green-700 px-4 py-2 text-sm">
                    {t('settings.emailVerified')}
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                className="w-full rounded-lg border border-zen-200 text-zen-700 px-4 py-2 text-sm hover:bg-zen-50 transition-colors"
                onClick={async () => {
                  await signOut();
                  navigate('/settings?tab=security', { replace: true });
                }}
              >
                {t('settings.security.signOut')}
              </button>
            </div>
          )}

          <AuthSection auth={auth} variant="link-only" />
        </div>
      )}

      {tab === 'notifications' && (
        <div className="space-y-3">
          <div className="bg-white rounded-xl p-4 border border-zen-200/50 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-medium text-zen-700">{t('settings.notifications.weeklyReport')}</div>
                <div className="text-xs text-zen-400">{t('settings.notifications.weeklyReportHint')}</div>
              </div>
              <button
                type="button"
                className={`w-12 h-7 rounded-full p-1 transition-colors ${emailNotifications ? 'bg-sage-500' : 'bg-zen-200'}`}
                onClick={() => {
                  const next = !emailNotifications;
                  setEmailNotifications(next);
                  localStorage.setItem('brain-flow-email-notifications', next ? '1' : '0');
                }}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${emailNotifications ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'help' && <InstructionScreen />}
    </div>
  );
}
