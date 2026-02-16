import { useTranslation } from 'react-i18next';
import { User, Link2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { AuthProfile } from '../../types/game';
import { signIn } from '../../lib/auth/client';

interface AuthSectionProps {
  auth?: AuthProfile;
  variant?: 'full' | 'link-only';
}

/**
 * AuthSection — 认证状态 + 绑定入口（占位 UI）
 */
export function AuthSection({ auth, variant = 'full' }: AuthSectionProps) {
  const { t } = useTranslation();
  
  // Fallback for undefined auth (should not happen with migration, but safe guard)
  const safeAuth: AuthProfile = auth || {
    status: 'guest',
    displayName: 'Guest',
    avatarUrl: null,
    linkedProviders: ['guest'],
  };
  
  const isGuest = safeAuth.status === 'guest';
  const needsEmailVerification = !isGuest && safeAuth.email && safeAuth.emailVerified === false;

  const handleGoogle = async () => {
    await signIn.social({ provider: 'google', callbackURL: '/settings?tab=security' });
  };

  if (variant === 'link-only') {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm border border-zen-200/50 space-y-3">
        <div>
          <div className="text-sm font-medium text-zen-700">{t('settings.tabs.accounts')}</div>
          <div className="text-xs text-zen-400">{t('settings.accounts.hint')}</div>
        </div>

        {isGuest ? (
          <div className="text-sm text-zen-500">{t('settings.accounts.loginRequired')}</div>
        ) : (
          <div className="space-y-2">
            <div className="text-xs text-zen-500 flex items-center gap-1">
              <Link2 className="w-3 h-3" />
              {t('profile.auth.linkAccounts')}
            </div>

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
              {safeAuth.linkedProviders.includes('google') && <span className="ml-auto text-green-500 text-xs">✓</span>}
            </button>
          </div>
        )}
      </div>
    );
  }

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
    </div>
  );
}
