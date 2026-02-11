import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Card } from '../ui/Card';

function useCallbackURL() {
  const location = useLocation();
  return useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('callback') || '/profile';
  }, [location.search]);
}

export function ForgotPasswordPage() {
  const callbackURL = useCallbackURL();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const resp = await fetch('/api/user/password/reset-request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!resp.ok) {
        setError('请求失败，请稍后再试');
        return;
      }
      setMessage('如果该邮箱已注册，我们会发送重置链接到你的邮箱。');
    } catch {
      setError('请求失败，请检查网络后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-zen-800">找回密码</h1>
        <p className="text-sm text-zen-500">输入邮箱，我们将发送重置链接（功能预留）。</p>
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

          {error && <div className="text-sm text-red-600">{error}</div>}
          {message && <div className="text-sm text-green-700">{message}</div>}

          <button
            className="w-full rounded-lg bg-zen-800 text-white px-4 py-2.5 text-sm hover:bg-zen-900 transition-colors disabled:opacity-60"
            disabled={submitting}
            type="submit"
          >
            {submitting ? '提交中…' : '发送重置链接'}
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

