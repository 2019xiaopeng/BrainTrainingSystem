import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { useGameStore } from '../../store/gameStore';
import { authClient } from '../../lib/auth/client';

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const auth = useGameStore((s) => s.userProfile.auth);
  const isGuest = (auth?.status ?? 'guest') === 'guest';

  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (isGuest) {
      setError('请先登录');
      return;
    }
    if (password.length < 8) {
      setError('新密码至少 8 位');
      return;
    }
    if (password !== confirm) {
      setError('两次输入的新密码不一致');
      return;
    }
    setSubmitting(true);
    try {
      const { error: e } = await authClient.changePassword({
        currentPassword,
        newPassword: password,
        revokeOtherSessions: true,
      });
      if (e) {
        setError(e.message || '修改失败，请稍后再试');
        return;
      }
      setMessage('密码已更新');
      setTimeout(() => navigate('/profile', { replace: true }), 800);
    } catch {
      setError('请求失败，请检查网络后重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (isGuest) {
    return (
      <div className="max-w-md mx-auto">
        <div className="mb-4">
          <h1 className="text-xl font-semibold text-zen-800">修改密码</h1>
          <p className="text-sm text-zen-500">此功能需要登录。</p>
        </div>
        <Card className="p-6">
          <div className="text-sm text-zen-600">请先登录后再修改密码。</div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link
              className="text-center rounded-lg bg-zen-800 text-white px-4 py-2 text-sm hover:bg-zen-900 transition-colors"
              to="/signin?callback=%2Fchange-password"
            >
              去登录
            </Link>
            <Link
              className="text-center rounded-lg border border-zen-200 text-zen-700 px-4 py-2 text-sm hover:bg-zen-50 transition-colors"
              to="/profile"
            >
              返回
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-zen-800">修改密码</h1>
        <p className="text-sm text-zen-500">更新你的登录密码（功能预留）。</p>
      </div>

      <Card className="p-6">
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="block text-xs text-zen-500 mb-1">当前密码</label>
            <input
              className="w-full rounded-lg border border-zen-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zen-200"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
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
            {submitting ? '提交中…' : '确认修改'}
          </button>
        </form>
      </Card>

      <div className="mt-4 text-sm text-zen-500 text-center">
        <Link className="text-zen-700 hover:underline" to="/profile">
          返回个人档案
        </Link>
      </div>
    </div>
  );
}
