import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';

function useEmail() {
  const location = useLocation();
  return useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('email') || '';
  }, [location.search]);
}

function useCallbackURL() {
  const location = useLocation();
  return useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('callback') || '/profile';
  }, [location.search]);
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const defaultEmail = useEmail();
  const callbackURL = useCallbackURL();
  const [email, setEmail] = useState(defaultEmail);
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!email) {
      setError('请输入邮箱');
      return;
    }
    if (otp.length !== 6) {
      setError('请输入 6 位验证码');
      return;
    }
    if (password.length < 8) {
      setError('密码至少 8 位');
      return;
    }
    if (password !== confirm) {
      setError('两次输入的密码不一致');
      return;
    }
    setSubmitting(true);
    try {
      const resp = await fetch('/api/auth/email-otp/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, otp, password }),
      });
      if (!resp.ok) {
        setError('验证码错误或已过期');
        return;
      }
      setMessage('密码已重置，请重新登录。');
      setTimeout(() => navigate(`/signin?callback=${encodeURIComponent(callbackURL)}`, { replace: true }), 800);
    } catch {
      setError('请求失败，请检查网络后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-zen-800">重置密码</h1>
        <p className="text-sm text-zen-500">输入邮箱与 6 位验证码以重置密码。</p>
      </div>

      <Card className="p-6">
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
            <label className="block text-xs text-zen-500 mb-1">6 位验证码</label>
            <input
              className="w-full rounded-lg border border-zen-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zen-200 tracking-[0.25em]"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\s/g, ''))}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              disabled={submitting}
            />
          </div>

          <div>
            <label className="block text-xs text-zen-500 mb-1">新密码</label>
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
            <label className="block text-xs text-zen-500 mb-1">确认新密码</label>
            <input
              className="w-full rounded-lg border border-zen-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zen-200"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              type="password"
              autoComplete="new-password"
              required
              disabled={submitting}
            />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}
          {message && <div className="text-sm text-green-700">{message}</div>}

          <button
            className="w-full rounded-lg bg-zen-800 text-white px-4 py-2.5 text-sm hover:bg-zen-900 transition-colors disabled:opacity-60"
            disabled={submitting}
            type="submit"
          >
            {submitting ? '提交中…' : '重置密码'}
          </button>
        </form>
      </Card>

      <div className="mt-4 text-sm text-zen-500 text-center">
        <Link className="text-zen-700 hover:underline" to={`/signin?callback=${encodeURIComponent(callbackURL)}`}>
          返回登录
        </Link>
      </div>
    </div>
  );
}
