import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';

function useEmailFromQuery() {
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

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const callbackURL = useCallbackURL();
  const defaultEmail = useEmailFromQuery();
  const [email, setEmail] = useState(defaultEmail);
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sendOtp = async () => {
    const resp = await fetch('/api/auth/email-otp/send-verification-otp', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, type: 'email-verification' }),
    });
    if (!resp.ok) throw new Error('发送失败');
  };

  const verifyOtp = async () => {
    const resp = await fetch('/api/auth/email-otp/verify-email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
    if (!resp.ok) throw new Error('验证码错误或已过期');
    const data = (await resp.json().catch(() => null)) as { status?: unknown };
    if (!data || data.status !== true) throw new Error('验证码错误或已过期');
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-zen-800">邮箱验证</h1>
        <p className="text-sm text-zen-500">输入邮箱并完成 6 位验证码验证。</p>
      </div>

      <Card className="p-6 space-y-4">
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

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="rounded-lg border border-zen-200 text-zen-700 px-4 py-2 text-sm hover:bg-zen-50 transition-colors disabled:opacity-60"
            disabled={submitting || !email}
            onClick={async () => {
              setError(null);
              setMessage(null);
              setSubmitting(true);
              try {
                await sendOtp();
                setMessage('验证码已发送，请查收。');
              } catch (e) {
                setError((e as Error)?.message || '发送失败');
              } finally {
                setSubmitting(false);
              }
            }}
          >
            发送验证码
          </button>
          <button
            type="button"
            className="rounded-lg bg-zen-800 text-white px-4 py-2 text-sm hover:bg-zen-900 transition-colors disabled:opacity-60"
            disabled={submitting || otp.length !== 6 || !email}
            onClick={async () => {
              setError(null);
              setMessage(null);
              setSubmitting(true);
              try {
                await verifyOtp();
                setMessage('验证成功，请登录。');
                setTimeout(
                  () =>
                    navigate(`/signin?callback=${encodeURIComponent(callbackURL)}`, {
                      replace: true,
                    }),
                  600
                );
              } catch (e) {
                setError((e as Error)?.message || '验证失败');
              } finally {
                setSubmitting(false);
              }
            }}
          >
            验证
          </button>
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
            disabled={submitting}
          />
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}
        {message && <div className="text-sm text-green-700">{message}</div>}
      </Card>

      <div className="mt-4 text-sm text-zen-500 text-center">
        <Link className="text-zen-700 hover:underline" to={`/signin?callback=${encodeURIComponent(callbackURL)}`}>
          返回登录
        </Link>
      </div>
    </div>
  );
}

