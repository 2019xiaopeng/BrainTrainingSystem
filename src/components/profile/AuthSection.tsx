import { useTranslation } from 'react-i18next';
import { User, Link2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type { AuthProfile } from '../../types/game';
import { signOut, signIn } from '../../lib/auth/client';

interface AuthSectionProps {
  auth?: AuthProfile;
}

/**
 * AuthSection — 认证状态 + 绑定入口（占位 UI）
 */
export function AuthSection({ auth }: AuthSectionProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // Fallback for undefined auth (should not happen with migration, but safe guard)
  const safeAuth: AuthProfile = auth || {
    status: 'guest',
    displayName: 'Guest',
    avatarUrl: null,
    linkedProviders: ['guest'],
  };
  
  const isGuest = safeAuth.status === 'guest';

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
        <button
          className="mt-4 w-full rounded-lg border border-zen-200 text-zen-700 px-4 py-2 text-sm hover:bg-zen-50 transition-colors"
          onClick={handleSignOut}
        >
          退出登录
        </button>
      )}
    </div>
  );
}
