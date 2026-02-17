// ============================================================
// Brain Flow - Admin Console (管理员后台)
// Phase 12: RBAC, User Management, Feature Flags, Audit Logs
// ============================================================

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Shield, Users, Flag, ScrollText, Search, Ban, CheckCircle2,
  ChevronLeft, ChevronRight, Download, X, Edit2, Save,
  AlertCircle, Loader2, Eye, ArrowLeft,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────
type Tab = 'users' | 'flags' | 'audit';

type AdminMe = { userId: string; email: string; role: string; isAdmin: boolean };

type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  xp: number;
  brainCoins: number;
  brainLevel: number;
  bannedUntil: string | null;
  bannedReason: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type AdminUserDetail = AdminUserRow & {
  username: string | null;
  energyCurrent: number;
  energyLastUpdated: string | null;
  unlimitedEnergyUntil: string | null;
  checkInLastDate: string | null;
  checkInStreak: number;
  inventory: Record<string, unknown>;
  ownedItems: unknown[];
  brainStats: Record<string, unknown>;
};

type FeatureFlagRow = {
  key: string;
  enabled: boolean;
  payload: Record<string, unknown>;
  updatedAt: string | null;
};

type AuditLogRow = {
  id: string;
  adminUserId: string | null;
  targetUserId: string | null;
  action: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
};

// ── Helpers ────────────────────────────────────────────────
const api = async <T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<{ data: T | null; error: string | null; status: number }> => {
  try {
    const resp = await fetch(`/api/admin/${path}`, {
      credentials: 'include',
      cache: 'no-store',
      headers: {
        'content-type': 'application/json',
        'cache-control': 'no-cache',
        pragma: 'no-cache',
        ...(init?.headers as Record<string, string> | undefined),
      },
      ...init,
    });
    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      return {
        data: null,
        error: String((body as { error?: string })?.error ?? `HTTP ${resp.status}`),
        status: resp.status,
      };
    }
    const data = (await resp.json()) as T;
    return { data, error: null, status: resp.status };
  } catch (e) {
    return {
      data: null,
      error: String((e as Error).message ?? 'network_error'),
      status: 0,
    };
  }
};

const fmtDate = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' });
};

const useTab = (): Tab => {
  const location = useLocation();
  return useMemo(() => {
    const p = new URLSearchParams(location.search);
    const t = p.get('tab');
    if (t === 'flags' || t === 'audit') return t;
    return 'users';
  }, [location.search]);
};

// ── Inline Toast ───────────────────────────────────────────
function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div
      className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
        type === 'success'
          ? 'bg-green-50 text-green-700 border border-green-200'
          : 'bg-red-50 text-red-700 border border-red-200'
      }`}
    >
      <div className="flex items-center gap-2">
        {type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
        {message}
        <button onClick={onClose} className="ml-2 opacity-50 hover:opacity-100">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Edit Modal ─────────────────────────────────────────────
function EditFieldModal({
  title,
  value,
  fieldType = 'number',
  onSave,
  onClose,
}: {
  title: string;
  value: string;
  fieldType?: 'number' | 'text' | 'json' | 'date';
  onSave: (val: string) => Promise<void>;
  onClose: () => void;
}) {
  const [input, setInput] = useState(value);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(input);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md space-y-4"
      >
        <h3 className="text-lg font-semibold text-zen-800">{title}</h3>
        {fieldType === 'json' ? (
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full h-40 border border-zen-200 rounded-lg p-3 font-mono text-xs resize-none focus:ring-2 focus:ring-teal-300 focus:outline-none"
            spellCheck={false}
          />
        ) : (
          <input
            type={
              fieldType === 'number' ? 'number' : fieldType === 'date' ? 'date' : 'text'
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full border border-zen-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-teal-300 focus:outline-none"
            autoFocus
          />
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-zen-500 hover:bg-zen-100 text-sm"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-teal-500 text-white text-sm font-medium hover:bg-teal-600 disabled:opacity-50 flex items-center gap-1"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            保存
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Pagination ─────────────────────────────────────────────
function Pagination({
  offset,
  limit,
  hasMore,
  onPrev,
  onNext,
}: {
  offset: number;
  limit: number;
  hasMore: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  const page = Math.floor(offset / limit) + 1;
  return (
    <div className="flex items-center justify-between pt-3 border-t border-zen-100">
      <button
        onClick={onPrev}
        disabled={offset === 0}
        className="flex items-center gap-1 text-sm text-zen-500 hover:text-zen-700 disabled:opacity-30"
      >
        <ChevronLeft size={16} /> 上一页
      </button>
      <span className="text-xs text-zen-400">第 {page} 页</span>
      <button
        onClick={onNext}
        disabled={!hasMore}
        className="flex items-center gap-1 text-sm text-zen-500 hover:text-zen-700 disabled:opacity-30"
      >
        下一页 <ChevronRight size={16} />
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// USERS TAB
// ══════════════════════════════════════════════════════════
function UsersTab({
  toast,
}: {
  me: AdminMe;
  toast: (msg: string, type: 'success' | 'error') => void;
}) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const LIMIT = 20;

  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editField, setEditField] = useState<{
    title: string;
    field: string;
    value: string;
    type: 'number' | 'text' | 'json' | 'date';
  } | null>(null);
  const [banTarget, setBanTarget] = useState<AdminUserRow | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banDays, setBanDays] = useState('365');
  const [banSaving, setBanSaving] = useState(false);

  const reqId = useRef(0);

  const loadUsers = useCallback(
    async (q: string, off: number) => {
      const id = ++reqId.current;
      setLoading(true);
      const { data, error } = await api<{
        items: AdminUserRow[];
        nextOffset: number | null;
      }>(`users?query=${encodeURIComponent(q)}&limit=${LIMIT}&offset=${off}`);
      if (id !== reqId.current) return;
      setLoading(false);
      if (error) {
        toast(`加载失败: ${error}`, 'error');
        return;
      }
      setUsers(data?.items ?? []);
      setHasMore(data?.nextOffset !== null && data?.nextOffset !== undefined);
    },
    [toast],
  );

  useEffect(() => {
    loadUsers('', 0);
  }, [loadUsers]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    setOffset(0);
    loadUsers(query, 0);
  };

  const loadDetail = async (userId: string) => {
    setDetailLoading(true);
    const { data, error } = await api<AdminUserDetail>(`users/${userId}`);
    setDetailLoading(false);
    if (error) {
      toast(`加载用户详情失败: ${error}`, 'error');
      return;
    }
    setDetail(data);
  };

  const patchUser = async (userId: string, patch: Record<string, unknown>) => {
    const { error } = await api(`users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    if (error) {
      toast(`操作失败: ${error}`, 'error');
      return false;
    }
    toast('修改成功', 'success');
    loadDetail(userId);
    loadUsers(query, offset);
    return true;
  };

  const handleEditSave = async (val: string) => {
    if (!editField || !detail) return;
    let parsed: unknown;
    if (editField.type === 'number') {
      parsed = Number(val);
      if (!Number.isFinite(parsed as number)) {
        toast('请输入有效数字', 'error');
        return;
      }
    } else if (editField.type === 'json') {
      try {
        parsed = JSON.parse(val);
      } catch {
        toast('JSON 格式错误', 'error');
        return;
      }
    } else if (editField.type === 'date') {
      parsed = val || null;
    } else {
      parsed = val;
    }
    const ok = await patchUser(detail.id, { [editField.field]: parsed });
    if (ok) setEditField(null);
  };

  const handleBan = async () => {
    if (!banTarget) return;
    setBanSaving(true);
    const days = Math.max(1, Number(banDays) || 365);
    const until = new Date(Date.now() + days * 86400000).toISOString();
    const { error } = await api(`users/${banTarget.id}/ban`, {
      method: 'POST',
      body: JSON.stringify({ bannedUntil: until, reason: banReason || null }),
    });
    setBanSaving(false);
    if (error) {
      toast(`封禁失败: ${error}`, 'error');
      return;
    }
    toast(`已封禁 ${banTarget.email}`, 'success');
    setBanTarget(null);
    setBanReason('');
    loadUsers(query, offset);
    if (detail?.id === banTarget.id) loadDetail(banTarget.id);
  };

  const handleUnban = async (u: AdminUserRow) => {
    const { error } = await api(`users/${u.id}/unban`, {
      method: 'POST',
      body: '{}',
    });
    if (error) {
      toast(`解封失败: ${error}`, 'error');
      return;
    }
    toast(`已解封 ${u.email}`, 'success');
    loadUsers(query, offset);
    if (detail?.id === u.id) loadDetail(u.id);
  };

  const isBanned = (u: AdminUserRow | AdminUserDetail) =>
    u.bannedUntil && new Date(u.bannedUntil).getTime() > Date.now();

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* Left: User List */}
      <div className="flex-1 space-y-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zen-400"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索 Email / 昵称 / ID"
              className="w-full pl-9 pr-3 py-2 border border-zen-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-300 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-teal-500 text-white text-sm rounded-lg hover:bg-teal-600 flex items-center gap-1"
          >
            <Search size={14} /> 搜索
          </button>
        </form>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-zen-400">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-zen-400 text-sm">暂无用户数据</div>
        ) : (
          <div className="space-y-1">
            {users.map((u) => (
              <div
                key={u.id}
                onClick={() => loadDetail(u.id)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all text-sm ${
                  detail?.id === u.id
                    ? 'bg-teal-50 border border-teal-200'
                    : 'hover:bg-zen-50 border border-transparent'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-zen-700 truncate">
                    {u.name || u.email}
                  </div>
                  <div className="text-xs text-zen-400 truncate">{u.email}</div>
                </div>
                <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                  {isBanned(u) && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-medium">
                      封禁
                    </span>
                  )}
                  <span className="text-xs px-1.5 py-0.5 rounded bg-zen-100 text-zen-500">
                    {u.role}
                  </span>
                  <span className="text-xs text-zen-400">Lv{u.brainLevel}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <Pagination
          offset={offset}
          limit={LIMIT}
          hasMore={hasMore}
          onPrev={() => {
            const o = Math.max(0, offset - LIMIT);
            setOffset(o);
            loadUsers(query, o);
          }}
          onNext={() => {
            const o = offset + LIMIT;
            setOffset(o);
            loadUsers(query, o);
          }}
        />
      </div>

      {/* Right: Detail Panel */}
      <div className="lg:w-[380px] flex-shrink-0">
        {detailLoading ? (
          <div className="flex items-center justify-center py-12 text-zen-400">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : !detail ? (
          <div className="text-center py-12 text-zen-400 text-sm flex flex-col items-center gap-2">
            <Eye size={32} className="opacity-30" />
            <span>选择用户查看详情</span>
          </div>
        ) : (
          <div className="bg-white border border-zen-200 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-zen-800">{detail.name || detail.email}</h3>
              <button
                onClick={() => setDetail(null)}
                className="text-zen-400 hover:text-zen-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-1.5 text-xs text-zen-500">
              <div>
                <span className="text-zen-400 w-16 inline-block">ID</span>{' '}
                <span className="font-mono text-zen-600 select-all">{detail.id}</span>
              </div>
              <div>
                <span className="text-zen-400 w-16 inline-block">Email</span> {detail.email}
              </div>
              <div>
                <span className="text-zen-400 w-16 inline-block">昵称</span>{' '}
                {detail.name || '—'}
              </div>
              <div>
                <span className="text-zen-400 w-16 inline-block">用户名</span>{' '}
                {detail.username || '—'}
              </div>
              <div>
                <span className="text-zen-400 w-16 inline-block">角色</span>
                <span
                  className={`px-1.5 py-0.5 rounded ${
                    detail.role === 'admin'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-zen-100 text-zen-500'
                  }`}
                >
                  {detail.role}
                </span>
              </div>
              <div>
                <span className="text-zen-400 w-16 inline-block">注册</span>{' '}
                {fmtDate(detail.createdAt)}
              </div>
            </div>

            <div className="border-t border-zen-100 pt-3">
              <h4 className="text-xs font-semibold text-zen-600 mb-2">资产信息</h4>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { label: '经验 XP', field: 'xp', value: detail.xp, type: 'number' },
                    {
                      label: '脑力币',
                      field: 'brainCoins',
                      value: detail.brainCoins,
                      type: 'number',
                    },
                    {
                      label: '等级',
                      field: 'brainLevel',
                      value: `Lv${detail.brainLevel}`,
                      type: '',
                    },
                    {
                      label: '体力',
                      field: 'energyCurrent',
                      value: detail.energyCurrent,
                      type: 'number',
                    },
                  ] as const
                ).map((item) => (
                  <div
                    key={item.field}
                    className="bg-zen-50 rounded-lg p-2 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-[10px] text-zen-400">{item.label}</div>
                      <div className="text-sm font-medium text-zen-700">{item.value}</div>
                    </div>
                    {item.type && (
                      <button
                        onClick={() =>
                          setEditField({
                            title: `修改 ${item.label}`,
                            field: item.field,
                            value: String(
                              typeof item.value === 'number' ? item.value : 0,
                            ),
                            type: 'number',
                          })
                        }
                        className="text-zen-400 hover:text-teal-500"
                      >
                        <Edit2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-zen-100 pt-3">
              <h4 className="text-xs font-semibold text-zen-600 mb-2">签到信息</h4>
              <div className="flex gap-2">
                <div className="flex-1 bg-zen-50 rounded-lg p-2 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-zen-400">连续天数</div>
                    <div className="text-sm font-medium text-zen-700">
                      {detail.checkInStreak}
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setEditField({
                        title: '修改签到连续天数',
                        field: 'checkInStreak',
                        value: String(detail.checkInStreak),
                        type: 'number',
                      })
                    }
                    className="text-zen-400 hover:text-teal-500"
                  >
                    <Edit2 size={12} />
                  </button>
                </div>
                <div className="flex-1 bg-zen-50 rounded-lg p-2 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-zen-400">上次签到</div>
                    <div className="text-sm font-medium text-zen-700">
                      {detail.checkInLastDate || '—'}
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setEditField({
                        title: '修改上次签到日期 (YYYY-MM-DD)',
                        field: 'checkInLastDate',
                        value: detail.checkInLastDate || '',
                        type: 'date',
                      })
                    }
                    className="text-zen-400 hover:text-teal-500"
                  >
                    <Edit2 size={12} />
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-zen-100 pt-3 space-y-2">
              <h4 className="text-xs font-semibold text-zen-600">高级数据</h4>
              {(
                [
                  {
                    label: 'Brain Stats',
                    field: 'brainStats',
                    value: detail.brainStats,
                  },
                  { label: 'Inventory', field: 'inventory', value: detail.inventory },
                  {
                    label: 'Owned Items',
                    field: 'ownedItems',
                    value: detail.ownedItems,
                  },
                ] as const
              ).map((item) => (
                <button
                  key={item.field}
                  onClick={() =>
                    setEditField({
                      title: `编辑 ${item.label}`,
                      field: item.field,
                      value: JSON.stringify(item.value, null, 2),
                      type: 'json',
                    })
                  }
                  className="w-full text-left px-3 py-2 rounded-lg bg-zen-50 hover:bg-zen-100 text-sm text-zen-600 flex items-center justify-between"
                >
                  <span>{item.label}</span>
                  <Edit2 size={12} className="text-zen-400" />
                </button>
              ))}
            </div>

            <div className="border-t border-zen-100 pt-3 space-y-2">
              <h4 className="text-xs font-semibold text-zen-600">管理操作</h4>
              {isBanned(detail) ? (
                <div className="space-y-2">
                  <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                    <div>封禁至: {fmtDate(detail.bannedUntil)}</div>
                    {detail.bannedReason && <div>原因: {detail.bannedReason}</div>}
                  </div>
                  <button
                    onClick={() => handleUnban(detail)}
                    className="w-full px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm font-medium hover:bg-green-100 flex items-center justify-center gap-1"
                  >
                    <CheckCircle2 size={14} /> 解除封禁
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setBanTarget(detail);
                    setBanReason('');
                    setBanDays('365');
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm font-medium hover:bg-red-100 flex items-center justify-center gap-1"
                >
                  <Ban size={14} /> 封禁用户
                </button>
              )}
              <button
                onClick={() =>
                  setEditField({
                    title: '修改用户角色',
                    field: 'role',
                    value: detail.role,
                    type: 'text',
                  })
                }
                className="w-full px-3 py-2 rounded-lg bg-zen-50 border border-zen-200 text-zen-600 text-sm font-medium hover:bg-zen-100 flex items-center justify-center gap-1"
              >
                <Shield size={14} /> 修改角色
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editField && detail && (
        <EditFieldModal
          title={editField.title}
          value={editField.value}
          fieldType={editField.type}
          onSave={handleEditSave}
          onClose={() => setEditField(null)}
        />
      )}

      {/* Ban Modal */}
      {banTarget && (
        <div
          className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4"
          onClick={() => setBanTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md space-y-4"
          >
            <h3 className="text-lg font-semibold text-zen-800 flex items-center gap-2">
              <Ban size={20} className="text-red-500" /> 封禁用户
            </h3>
            <div className="text-sm text-zen-500">{banTarget.email}</div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-zen-500 mb-1 block">封禁天数</label>
                <input
                  type="number"
                  min="1"
                  value={banDays}
                  onChange={(e) => setBanDays(e.target.value)}
                  className="w-full border border-zen-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-zen-500 mb-1 block">封禁原因 (可选)</label>
                <input
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="违规描述..."
                  className="w-full border border-zen-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-300 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setBanTarget(null)}
                className="px-4 py-2 rounded-lg text-zen-500 hover:bg-zen-100 text-sm"
              >
                取消
              </button>
              <button
                onClick={handleBan}
                disabled={banSaving}
                className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50 flex items-center gap-1"
              >
                {banSaving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Ban size={14} />
                )}
                确认封禁
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// FEATURE FLAGS TAB
// ══════════════════════════════════════════════════════════
function FlagsTab({
  toast,
}: {
  me: AdminMe;
  toast: (msg: string, type: 'success' | 'error') => void;
}) {
  const [flags, setFlags] = useState<FeatureFlagRow[]>([]);
  const [loading, setLoading] = useState(true);

  const LB_KEY = 'leaderboard';
  const lbFlag = flags.find((f) => f.key === LB_KEY);
  const [lbConfig, setLbConfig] = useState({
    topN: 50,
    ttlMs: 60000,
    version: 1,
    hideGuests: false,
    weeklyEnabled: true,
  });
  const [lbSaving, setLbSaving] = useState(false);
  const [newKey, setNewKey] = useState('');

  const loadFlags = useCallback(async () => {
    setLoading(true);
    const { data, error } = await api<{ items: FeatureFlagRow[] }>('feature-flags');
    setLoading(false);
    if (error) {
      toast(`加载开关失败: ${error}`, 'error');
      return;
    }
    setFlags(data?.items ?? []);
  }, [toast]);

  useEffect(() => {
    loadFlags();
  }, [loadFlags]);

  // Sync leaderboard config when flags are loaded
  useEffect(() => {
    if (!lbFlag) return;
    const p = lbFlag.payload;
    setLbConfig({
      topN: Number(p.topN) || 50,
      ttlMs: Number(p.ttlMs) || 60000,
      version: Number(p.version) || 1,
      hideGuests: Boolean(p.hideGuests),
      weeklyEnabled: Boolean(p.weeklyEnabled),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lbFlag?.key, lbFlag?.updatedAt]);

  const toggleFlag = async (key: string, enabled: boolean) => {
    const { error } = await api('feature-flags', {
      method: 'PATCH',
      body: JSON.stringify({ key, enabled }),
    });
    if (error) {
      toast(`切换失败: ${error}`, 'error');
      return;
    }
    toast(`${key} ${enabled ? '已启用' : '已禁用'}`, 'success');
    loadFlags();
  };

  const saveLbConfig = async () => {
    setLbSaving(true);
    const { error } = await api('feature-flags', {
      method: 'PATCH',
      body: JSON.stringify({
        key: LB_KEY,
        enabled: lbFlag?.enabled ?? true,
        payload: lbConfig,
      }),
    });
    setLbSaving(false);
    if (error) {
      toast(`保存失败: ${error}`, 'error');
      return;
    }
    toast('排行榜配置已保存', 'success');
    loadFlags();
  };

  const addFlag = async (e: FormEvent) => {
    e.preventDefault();
    if (!newKey.trim()) return;
    const { error } = await api('feature-flags', {
      method: 'PATCH',
      body: JSON.stringify({ key: newKey.trim(), enabled: false }),
    });
    if (error) {
      toast(`创建失败: ${error}`, 'error');
      return;
    }
    toast(`新开关 ${newKey.trim()} 已创建`, 'success');
    setNewKey('');
    loadFlags();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-zen-400">
        <Loader2 size={24} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Leaderboard Config */}
      <div className="bg-white border border-zen-200 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-zen-800">排行榜配置</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zen-400">总榜</span>
            <button
              onClick={() => toggleFlag(LB_KEY, !(lbFlag?.enabled ?? false))}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                lbFlag?.enabled ? 'bg-teal-500' : 'bg-zen-300'
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  lbFlag?.enabled ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-zen-400 block mb-1">TopN 数量</label>
            <input
              type="number"
              value={lbConfig.topN}
              onChange={(e) =>
                setLbConfig((p) => ({ ...p, topN: Number(e.target.value) || 50 }))
              }
              className="w-full border border-zen-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-teal-300 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-zen-400 block mb-1">刷新间隔 (ms)</label>
            <input
              type="number"
              value={lbConfig.ttlMs}
              onChange={(e) =>
                setLbConfig((p) => ({ ...p, ttlMs: Number(e.target.value) || 60000 }))
              }
              className="w-full border border-zen-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-teal-300 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-zen-400 block mb-1">版本号</label>
            <input
              type="number"
              value={lbConfig.version}
              onChange={(e) =>
                setLbConfig((p) => ({ ...p, version: Number(e.target.value) || 1 }))
              }
              className="w-full border border-zen-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-teal-300 focus:outline-none"
            />
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={lbConfig.hideGuests}
              onChange={(e) =>
                setLbConfig((p) => ({ ...p, hideGuests: e.target.checked }))
              }
              className="rounded border-zen-300 text-teal-500 focus:ring-teal-300"
            />
            <span className="text-zen-600">隐藏游客</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={lbConfig.weeklyEnabled}
              onChange={(e) =>
                setLbConfig((p) => ({ ...p, weeklyEnabled: e.target.checked }))
              }
              className="rounded border-zen-300 text-teal-500 focus:ring-teal-300"
            />
            <span className="text-zen-600">周榜启用</span>
          </label>
        </div>
        <div className="flex justify-end">
          <button
            onClick={saveLbConfig}
            disabled={lbSaving}
            className="px-4 py-2 rounded-lg bg-teal-500 text-white text-sm font-medium hover:bg-teal-600 disabled:opacity-50 flex items-center gap-1"
          >
            {lbSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            保存配置
          </button>
        </div>
      </div>

      {/* All Flags */}
      <div className="bg-white border border-zen-200 rounded-xl p-4 space-y-3">
        <h3 className="font-semibold text-zen-800">功能开关</h3>
        {flags.length === 0 ? (
          <div className="text-sm text-zen-400 py-4 text-center">暂无开关</div>
        ) : (
          <div className="space-y-1">
            {flags.map((f) => (
              <div
                key={f.key}
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-zen-50"
              >
                <div>
                  <span className="text-sm font-medium text-zen-700">{f.key}</span>
                  {f.updatedAt && (
                    <span className="text-xs text-zen-400 ml-2">
                      {fmtDate(f.updatedAt)}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => toggleFlag(f.key, !f.enabled)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    f.enabled ? 'bg-teal-500' : 'bg-zen-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      f.enabled ? 'left-5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={addFlag} className="flex gap-2 pt-2 border-t border-zen-100">
          <input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="新开关 key..."
            className="flex-1 border border-zen-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-teal-300 focus:outline-none"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-zen-100 text-zen-600 text-sm rounded-lg hover:bg-zen-200"
          >
            + 新增
          </button>
        </form>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// AUDIT LOGS TAB
// ══════════════════════════════════════════════════════════
function AuditTab({
  toast,
}: {
  me: AdminMe;
  toast: (msg: string, type: 'success' | 'error') => void;
}) {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const LIMIT = 50;

  const [adminUserId, setAdminUserId] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadLogs = useCallback(
    async (off: number) => {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('limit', String(LIMIT));
      params.set('offset', String(off));
      if (adminUserId.trim()) params.set('adminUserId', adminUserId.trim());
      if (targetUserId.trim()) params.set('targetUserId', targetUserId.trim());
      if (from) params.set('from', new Date(from).toISOString());
      if (to) params.set('to', new Date(to + 'T23:59:59').toISOString());

      const { data, error } = await api<{
        items: AuditLogRow[];
        nextOffset: number | null;
      }>(`audit-logs?${params}`);
      setLoading(false);
      if (error) {
        toast(`加载审计日志失败: ${error}`, 'error');
        return;
      }
      setLogs(data?.items ?? []);
      setHasMore(data?.nextOffset !== null && data?.nextOffset !== undefined);
    },
    [adminUserId, targetUserId, from, to, toast],
  );

  useEffect(() => {
    loadLogs(0);
  }, [loadLogs]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    setOffset(0);
    loadLogs(0);
  };

  const exportCsv = () => {
    const params = new URLSearchParams();
    if (adminUserId.trim()) params.set('adminUserId', adminUserId.trim());
    if (targetUserId.trim()) params.set('targetUserId', targetUserId.trim());
    if (from) params.set('from', new Date(from).toISOString());
    if (to) params.set('to', new Date(to + 'T23:59:59').toISOString());
    window.open(`/api/admin/audit-logs/export?${params}`, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <form
        onSubmit={handleSearch}
        className="bg-white border border-zen-200 rounded-xl p-4 space-y-3"
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-zen-400 block mb-1">管理员 ID</label>
            <input
              value={adminUserId}
              onChange={(e) => setAdminUserId(e.target.value)}
              placeholder="操作者 ID"
              className="w-full border border-zen-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-teal-300 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-zen-400 block mb-1">目标用户 ID</label>
            <input
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              placeholder="被操作者 ID"
              className="w-full border border-zen-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-teal-300 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-zen-400 block mb-1">起始日期</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full border border-zen-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-teal-300 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-zen-400 block mb-1">结束日期</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full border border-zen-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-teal-300 focus:outline-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className="px-3 py-1.5 text-sm rounded-lg border border-zen-200 text-zen-600 hover:bg-zen-50 flex items-center gap-1"
          >
            <Download size={14} /> 导出 CSV
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 bg-teal-500 text-white text-sm rounded-lg hover:bg-teal-600 flex items-center gap-1"
          >
            <Search size={14} /> 查询
          </button>
        </div>
      </form>

      {/* Logs */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-zen-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-zen-400 text-sm">暂无审计日志</div>
      ) : (
        <div className="space-y-1">
          {logs.map((log) => (
            <div key={log.id}>
              <div
                onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zen-50 cursor-pointer text-sm"
              >
                <span className="text-xs text-zen-400 w-32 flex-shrink-0">
                  {fmtDate(log.createdAt)}
                </span>
                <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-zen-100 text-zen-600">
                  {log.action}
                </span>
                {log.targetUserId && (
                  <span className="text-xs text-zen-400 truncate">
                    → {log.targetUserId.slice(0, 8)}...
                  </span>
                )}
                {log.ip && (
                  <span className="text-xs text-zen-300 ml-auto">{log.ip}</span>
                )}
              </div>
              {expandedId === log.id && (
                <div className="mx-3 mb-2 p-3 bg-zen-50 rounded-lg text-xs space-y-2">
                  <div>
                    <span className="text-zen-400">管理员:</span>{' '}
                    <span className="font-mono">{log.adminUserId}</span>
                  </div>
                  <div>
                    <span className="text-zen-400">目标:</span>{' '}
                    <span className="font-mono">{log.targetUserId ?? '—'}</span>
                  </div>
                  <div>
                    <span className="text-zen-400">IP:</span> {log.ip ?? '—'}
                  </div>
                  <div>
                    <span className="text-zen-400">UA:</span>{' '}
                    <span className="truncate block">{log.userAgent ?? '—'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zen-200">
                    <div>
                      <div className="text-zen-400 mb-1">Before:</div>
                      <pre className="bg-white p-2 rounded text-[10px] overflow-auto max-h-32 border border-zen-200">
                        {JSON.stringify(log.before, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <div className="text-zen-400 mb-1">After:</div>
                      <pre className="bg-white p-2 rounded text-[10px] overflow-auto max-h-32 border border-zen-200">
                        {JSON.stringify(log.after, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Pagination
        offset={offset}
        limit={LIMIT}
        hasMore={hasMore}
        onPrev={() => {
          const o = Math.max(0, offset - LIMIT);
          setOffset(o);
          loadLogs(o);
        }}
        onNext={() => {
          const o = offset + LIMIT;
          setOffset(o);
          loadLogs(o);
        }}
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// ADMIN SCREEN (Main)
// ══════════════════════════════════════════════════════════
export function AdminScreen() {
  const tab = useTab();
  const navigate = useNavigate();
  const setTab = (next: Tab) =>
    navigate(`/admin?tab=${encodeURIComponent(next)}`, { replace: true });

  const [meLoading, setMeLoading] = useState(true);
  const [me, setMe] = useState<AdminMe | null>(null);
  const [meError, setMeError] = useState<string | null>(null);

  const [toastMsg, setToastMsg] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);
  const toast = useCallback(
    (message: string, type: 'success' | 'error') => setToastMsg({ message, type }),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    setMeLoading(true);
    setMeError(null);
    (async () => {
      const { data, error, status } = await api<AdminMe>(`me?_t=${Date.now()}`);
      if (cancelled) return;
      setMeLoading(false);
      if (error) {
        setMeError(
          status === 403
            ? '无权限 — 当前账号不是管理员'
            : status === 401
              ? '未登录 — 请先登录管理员账号'
              : error,
        );
        return;
      }
      setMe(data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (meLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Shield size={48} className="mx-auto text-zen-300 animate-pulse" />
          <div className="text-sm text-zen-400">正在验证管理员权限...</div>
        </div>
      </div>
    );
  }

  if (meError || !me) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4 max-w-sm">
          <AlertCircle size={48} className="mx-auto text-red-300" />
          <div className="text-lg font-semibold text-zen-700">访问被拒绝</div>
          <div className="text-sm text-zen-500">{meError ?? '无法验证管理员权限'}</div>
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700"
          >
            <ArrowLeft size={14} /> 返回首页
          </Link>
        </div>
      </div>
    );
  }

  const TABS: { key: Tab; label: string; icon: typeof Users }[] = [
    { key: 'users', label: '用户管理', icon: Users },
    { key: 'flags', label: '功能开关', icon: Flag },
    { key: 'audit', label: '审计日志', icon: ScrollText },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
      {toastMsg && (
        <Toast
          message={toastMsg.message}
          type={toastMsg.type}
          onClose={() => setToastMsg(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield size={24} className="text-amber-500" />
          <div>
            <h1 className="text-xl font-semibold text-zen-800">管理员后台</h1>
            <div className="text-xs text-zen-400">
              {me.email} · {me.role}
            </div>
          </div>
        </div>
        <Link
          to="/"
          className="text-sm text-zen-400 hover:text-zen-600 flex items-center gap-1"
        >
          <ArrowLeft size={14} /> 返回
        </Link>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-zen-100 rounded-lg p-1 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
              tab === key
                ? 'bg-white text-zen-800 shadow-sm'
                : 'text-zen-500 hover:text-zen-700'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {tab === 'users' && <UsersTab me={me} toast={toast} />}
        {tab === 'flags' && <FlagsTab me={me} toast={toast} />}
        {tab === 'audit' && <AuditTab me={me} toast={toast} />}
      </div>
    </div>
  );
}
