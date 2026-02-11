import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { authClient, signIn } from '../../lib/auth/client';

function useCallbackURL() {
  const location = useLocation();
  return useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('callback') || '/profile';
  }, [location.search]);
}

export function SignInPage() {
  const navigate = useNavigate();
  const callbackURL = useCallbackURL();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);

    try {
      localStorage.setItem('brain-flow-auth-intent', 'signin');
      const res = await signIn.email({
        email,
        password,
        rememberMe: true,
        callbackURL,
      });

      if (res?.error) {
        const msg = res.error.message || '登录失败';
        setError(msg);
        if (String(msg).toLowerCase().includes('verify')) {
          setInfo('你的邮箱尚未验证。已为你发送验证邮件，请查收。');
        }
        return;
      }

      navigate(callbackURL, { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogle = async () => {
    setError(null);
    localStorage.setItem('brain-flow-auth-intent', 'signin');
    const res = await signIn.social({
      provider: 'google',
      callbackURL,
    });
    if (res?.error) setError(res.error.message || 'Google 登录暂不可用');
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-zen-800">登录</h1>
        <p className="text-sm text-zen-500">使用邮箱密码登录，或使用 Google</p>
      </div>

      <Card className="p-6">
        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-zen-200 px-4 py-2.5 text-sm text-zen-700 hover:bg-zen-50 transition-colors"
          onClick={onGoogle}
          disabled={submitting}
        >
          <span>使用 Google 登录</span>
        </button>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-zen-200/60" />
          <div className="text-xs text-zen-400">或</div>
          <div className="h-px flex-1 bg-zen-200/60" />
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="block text-xs text-zen-500 mb-1">邮箱</label>
            <input
              className="w-full rounded-lg border border-zen-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zen-200"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
              required
              disabled={submitting}
            />
          </div>

          <div>
            <label className="block text-xs text-zen-500 mb-1">密码</label>
            <input
              className="w-full rounded-lg border border-zen-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zen-200"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              required
              disabled={submitting}
            />
          </div>

          <div className="flex justify-end">
            <Link
              className="text-xs text-zen-500 hover:text-zen-700 hover:underline"
              to={`/forgot-password?callback=${encodeURIComponent(callbackURL)}`}
            >
              忘记密码？
            </Link>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}
          {info && (
            <div className="text-sm text-zen-600">
              {info}{' '}
              <button
                type="button"
                className="text-zen-700 hover:underline"
                onClick={async () => {
                  const { error: e } = await authClient.sendVerificationEmail({
                    email,
                    callbackURL,
                  });
                  if (e) setError(e.message || '发送失败');
                  else setInfo('验证邮件已发送，请查收。');
                }}
                disabled={submitting || !email}
              >
                重新发送
              </button>
            </div>
          )}

          <button
            className="w-full rounded-lg bg-zen-800 text-white px-4 py-2.5 text-sm hover:bg-zen-900 transition-colors disabled:opacity-60"
            disabled={submitting}
            type="submit"
          >
            {submitting ? '登录中…' : '登录'}
          </button>
        </form>
      </Card>

      <div className="mt-4 text-sm text-zen-500 text-center">
        还没有账号？{' '}
        <Link className="text-zen-700 hover:underline" to={`/signup?callback=${encodeURIComponent(callbackURL)}`}>
          去注册
        </Link>
      </div>
    </div>
  );
}
