import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { authClient, signIn, signUp } from '../../lib/auth/client';

function useCallbackURL() {
  const location = useLocation();
  return useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('callback') || '/profile';
  }, [location.search]);
}

export function SignUpPage() {
  const navigate = useNavigate();
  const callbackURL = useCallbackURL();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [gender, setGender] = useState<boolean>(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setSubmitting(true);
    try {
      localStorage.setItem('brain-flow-auth-intent', 'signup');
      type SignUpEmailParams = Parameters<typeof signUp.email>[0];
      type ExtendedSignUpEmailParams = SignUpEmailParams & {
        username: string;
        gender: boolean;
      };

      const payload = {
        name,
        email,
        username,
        gender,
        password,
        callbackURL,
      } as ExtendedSignUpEmailParams;

      const res = await signUp.email(payload);

      if (res?.error) {
        setError(res.error.message || '注册失败');
        return;
      }

      const { error: e } = await authClient.sendVerificationEmail({
        email,
        callbackURL,
      });
      if (e) {
        setError(e.message || '发送验证邮件失败');
        return;
      }
      setInfo('验证邮件已发送，请查收后完成验证。');
      setTimeout(() => navigate(`/signin?callback=${encodeURIComponent(callbackURL)}`, { replace: true }), 700);
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogle = async () => {
    setError(null);
    localStorage.setItem('brain-flow-auth-intent', 'signup');
    const res = await signIn.social({
      provider: 'google',
      callbackURL,
    });
    if (res?.error) setError(res.error.message || 'Google 注册暂不可用');
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-zen-800">注册</h1>
        <p className="text-sm text-zen-500">创建账号后可用于跨设备同步（后续接入）</p>
      </div>

      <Card className="p-6">
        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-zen-200 px-4 py-2.5 text-sm text-zen-700 hover:bg-zen-50 transition-colors"
          onClick={onGoogle}
          disabled={submitting}
        >
          <span>使用 Google 注册</span>
        </button>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-zen-200/60" />
          <div className="text-xs text-zen-400">或</div>
          <div className="h-px flex-1 bg-zen-200/60" />
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="block text-xs text-zen-500 mb-1">昵称</label>
            <input
              className="w-full rounded-lg border border-zen-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zen-200"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
              disabled={submitting}
            />
          </div>

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
            <label className="block text-xs text-zen-500 mb-1">用户名</label>
            <input
              className="w-full rounded-lg border border-zen-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zen-200"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              disabled={submitting}
            />
            <div className="mt-1 text-[11px] text-zen-400">4–10 位，建议英文或数字，小写将自动统一</div>
          </div>

          <div>
            <label className="block text-xs text-zen-500 mb-2">性别</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                  gender ? 'border-zen-800 bg-zen-800 text-white' : 'border-zen-200 text-zen-700 hover:bg-zen-50'
                }`}
                onClick={() => setGender(true)}
                disabled={submitting}
              >
                男
              </button>
              <button
                type="button"
                className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                  !gender ? 'border-zen-800 bg-zen-800 text-white' : 'border-zen-200 text-zen-700 hover:bg-zen-50'
                }`}
                onClick={() => setGender(false)}
                disabled={submitting}
              >
                女
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs text-zen-500 mb-1">密码</label>
            <input
              className="w-full rounded-lg border border-zen-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zen-200"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
              required
              disabled={submitting}
            />
          </div>

          <div>
            <label className="block text-xs text-zen-500 mb-1">确认密码</label>
            <input
              className="w-full rounded-lg border border-zen-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zen-200"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
              required
              disabled={submitting}
            />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}
          {info && <div className="text-sm text-green-700">{info}</div>}

          <button
            className="w-full rounded-lg bg-zen-800 text-white px-4 py-2.5 text-sm hover:bg-zen-900 transition-colors disabled:opacity-60"
            disabled={submitting}
            type="submit"
          >
            {submitting ? '注册中…' : '注册'}
          </button>
        </form>
      </Card>

      <div className="mt-4 text-sm text-zen-500 text-center">
        已有账号？{' '}
        <Link className="text-zen-700 hover:underline" to={`/signin?callback=${encodeURIComponent(callbackURL)}`}>
          去登录
        </Link>
      </div>
    </div>
  );
}
