import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Link2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type { AuthProfile } from '../../types/game';
import { signOut, signIn } from '../../lib/auth/client';
import { useGameStore } from '../../store/gameStore';

interface AuthSectionProps {
  auth?: AuthProfile;
}

/**
 * AuthSection — 认证状态 + 绑定入口（占位 UI）
 */
export function AuthSection({ auth }: AuthSectionProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const inventory = useGameStore((s) => s.userProfile.inventory);
  const setProfile = useGameStore.setState;
  const renameCount = Math.max(0, Number(inventory?.rename_card ?? 0) || 0);
  const [renameOpen, setRenameOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [renameSubmitting, setRenameSubmitting] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  
  // Fallback for undefined auth (should not happen with migration, but safe guard)
  const safeAuth: AuthProfile = auth || {
    status: 'guest',
    displayName: 'Guest',
    avatarUrl: null,
    linkedProviders: ['guest'],
  };
  
  const isGuest = safeAuth.status === 'guest';
  const needsEmailVerification = !isGuest && safeAuth.email && safeAuth.emailVerified === false;

  const handleSignOut = async () => {
    await signOut();
    navigate('/profile', { replace: true });
  };

  const handleGoogle = async () => {
    await signIn.social({ provider: 'google', callbackURL: '/profile' });
  };

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-zen-200/50">
      {/* Current status */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-zen-100 flex items-center justify-center">
          {safeAuth.avatarUrl ? (
            <img src={safeAuth.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <User className="w-5 h-5 text-zen-500" />
          )}
        </div>
        <div>
          <div className="font-medium text-zen-700">{safeAuth.displayName}</div>
          <div className={`text-xs ${isGuest ? 'text-amber-500' : 'text-green-600'}`}>
            {isGuest ? t('profile.auth.guest') : t('profile.auth.authenticated')}
          </div>
        </div>
      </div>

      {needsEmailVerification && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
          <div className="font-medium">邮箱未验证</div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="text-amber-800">{safeAuth.email}</span>
            <div className="flex items-center gap-2">
              <Link className="text-amber-800 hover:underline" to={`/verify-email?email=${encodeURIComponent(safeAuth.email!)}`}>
                去验证
              </Link>
              <button
                type="button"
                className="shrink-0 px-2 py-1 rounded-md bg-amber-600 text-white hover:bg-amber-700 transition-colors"
                onClick={async () => {
                  await fetch('/api/auth/email-otp/send-verification-otp', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ email: safeAuth.email!, type: 'email-verification' }),
                  });
                }}
              >
                重发
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link accounts */}
      <div className="space-y-2">
        <div className="text-xs text-zen-500 mb-2 flex items-center gap-1">
          <Link2 className="w-3 h-3" />
          {t('profile.auth.linkAccounts')}
        </div>

        {/* Google Button */}
        <button
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border border-zen-200 hover:bg-zen-50 transition-colors text-sm text-zen-600"
          onClick={handleGoogle}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span>{t('profile.auth.linkGoogle')}</span>
          {safeAuth.linkedProviders.includes('google') && (
            <span className="ml-auto text-green-500 text-xs">✓</span>
          )}
        </button>
      </div>

      {isGuest ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link
              className="text-center rounded-lg bg-zen-800 text-white px-4 py-2 text-sm hover:bg-zen-900 transition-colors"
              to="/signin?callback=%2Fprofile"
            >
              登录
            </Link>
            <Link
              className="text-center rounded-lg border border-zen-200 text-zen-700 px-4 py-2 text-sm hover:bg-zen-50 transition-colors"
              to="/signup?callback=%2Fprofile"
            >
              注册
            </Link>
          </div>
          <p className="text-xs text-zen-400 mt-3 text-center">
            {t('profile.auth.guestWarning')}
          </p>
        </>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            className="rounded-lg border border-zen-200 text-zen-700 px-4 py-2 text-sm hover:bg-zen-50 transition-colors"
            onClick={() => {
              setRenameError(null);
              setRenameOpen(true);
              setDisplayName(safeAuth.displayName);
            }}
          >
            改名
          </button>
          <Link
            className="text-center rounded-lg border border-zen-200 text-zen-700 px-4 py-2 text-sm hover:bg-zen-50 transition-colors"
            to="/change-password"
          >
            修改密码
          </Link>
        </div>
      )}

      {!isGuest && renameOpen && (
        <div className="mt-3 rounded-lg border border-zen-200 bg-zen-50 px-3 py-3 space-y-2">
          <div className="text-xs text-zen-600">修改显示名称（需消耗 1 张改名卡）</div>
          <input
            className="w-full rounded-lg border border-zen-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zen-200"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={renameSubmitting}
            placeholder="2-20 字"
          />
          {renameError && <div className="text-xs text-red-600">{renameError}</div>}
          {renameCount <= 0 && (
            <div className="text-xs text-zen-500">
              改名卡不足，可前往 <Link className="text-zen-700 hover:underline" to="/store">商城</Link> 购买。
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
              取消
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
                    body: JSON.stringify({ displayName }),
                  });
                  if (!resp.ok) {
                    const data = await resp.json().catch(() => null);
                    const code = String((data as { error?: unknown } | null)?.error ?? '');
                    if (code === 'no_rename_card') setRenameError('改名卡不足，请先购买');
                    else if (code === 'invalid_display_name') setRenameError('名称长度需为 2-20');
                    else setRenameError('修改失败，请稍后再试');
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
                  setRenameError('网络错误，请稍后再试');
                } finally {
                  setRenameSubmitting(false);
                }
              }}
            >
              确认改名
            </button>
          </div>
        </div>
      )}

      {!isGuest && (
        <div className="mt-3">
          <button
            className="w-full rounded-lg border border-zen-200 text-zen-700 px-4 py-2 text-sm hover:bg-zen-50 transition-colors"
            onClick={handleSignOut}
          >
            退出登录
          </button>
        </div>
      )}
    </div>
  );
}
