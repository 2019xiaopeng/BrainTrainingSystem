import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Shield, Users, Flag, ScrollText, Search, Ban, CheckCircle2 } from 'lucide-react';

type Tab = 'users' | 'flags' | 'audit';

const useTab = (): Tab => {
  const location = useLocation();
  return useMemo(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'flags' || tab === 'audit' || tab === 'users') return tab;
    return 'users';
  }, [location.search]);
};

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
};

type AdminUserDetail = AdminUserRow & {
  username: string | null;
  energyCurrent: number;
  energyLastUpdated: string | null;
  checkInLastDate: string | null;
  checkInStreak: number;
  inventory: Record<string, unknown>;
  ownedItems: unknown[];
  brainStats: Record<string, unknown>;
};

type FeatureFlagRow = { key: string; enabled: boolean; payload: Record<string, unknown>; updatedAt: string | null };

type AuditLogRow = {
  id: string;
  adminUserId: string | null;
  targetUserId: string | null;
  action: string;
  createdAt: string;
  ip: string | null;
};

export function AdminScreen() {
  const tab = useTab();
  const location = useLocation();
  const navigate = useNavigate();
  const setTab = (next: Tab) => navigate(`/admin?tab=${encodeURIComponent(next)}`, { replace: true });

  const [meLoading, setMeLoading] = useState(true);
  const [me, setMe] = useState<AdminMe | null>(null);
  const [meError, setMeError] = useState<string | null>(null);
  const [meDebug, setMeDebug] = useState<{ status: number; body: unknown } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setMeLoading(true);
    setMeError(null);
    setMeDebug(null);
    (async () => {
      try {
        const doFetch = async () =>
          await fetch(`/api/admin/me?_t=${Date.now()}`, {
            credentials: 'include',
            cache: 'no-store',
            headers: { 'cache-control': 'no-cache', pragma: 'no-cache' },
          });

        let resp = await doFetch();
        if (resp.status === 304) resp = await doFetch();

        if (!resp.ok) {
          const clone = resp.clone();
          const data = await resp.json().catch(async () => {
            const text = await clone.text().catch(() => '');
            return text ? { nonJson: text.slice(0, 300) } : null;
          });
          if (!cancelled) setMeDebug({ status: resp.status, body: data });
          const role = String((data as { role?: unknown } | null)?.role ?? '');
          const errCode = String((data as { error?: unknown } | null)?.error ?? 'unauthorized');
          const err = role ? `${errCode} (role=${role})` : errCode;
          throw new Error(err);
        }
        const clone = resp.clone();
        const data = (await resp.json().catch(async () => {
          const text = await clone.text().catch(() => '');
          return text ? ({ nonJson: text.slice(0, 300) } as unknown) : null;
        })) as AdminMe | { nonJson: string } | null;
        if (!data || typeof data !== 'object' || 'nonJson' in data) {
          if (!cancelled) setMeDebug({ status: resp.status, body: data });
          throw new Error('invalid_admin_me_response');
        }
        if (!cancelled) setMe(data);
      } catch {
        if (!cancelled) setMeError('无权限访问管理员后台');
      } finally {
        if (!cancelled) setMeLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [location.key]);

  const [usersQuery, setUsersQuery] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [selectedError, setSelectedError] = useState<string | null>(null);

  const loadUsers = async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const url = `/api/admin/users?query=${encodeURIComponent(usersQuery)}&limit=20&offset=0&_t=${Date.now()}`;
      const resp = await fetch(url, { credentials: 'include', cache: 'no-store' });
      if (!resp.ok) throw new Error('fetch_failed');
      const data = (await resp.json()) as { items?: AdminUserRow[] };
      setUsers(Array.isArray(data.items) ? data.items : []);
    } catch {
      setUsersError('加载用户列表失败');
    } finally {
      setUsersLoading(false);
    }
  };

  const loadUserDetail = async (id: string) => {
    setSelectedLoading(true);
    setSelectedError(null);
    try {
      const resp = await fetch(`/api/admin/users/${encodeURIComponent(id)}?_t=${Date.now()}`, { credentials: 'include', cache: 'no-store' });
      if (!resp.ok) throw new Error('fetch_failed');
      const data = (await resp.json()) as AdminUserDetail;
      setSelectedUser(data);
    } catch {
      setSelectedError('加载用户详情失败');
      setSelectedUser(null);
    } finally {
      setSelectedLoading(false);
    }
  };

  useEffect(() => {
    if (tab !== 'users') return;
    void loadUsers();
  }, [tab]);

  useEffect(() => {
    if (tab !== 'users') return;
    if (!selectedUserId) return;
    void loadUserDetail(selectedUserId);
  }, [tab, selectedUserId]);

  const [flagsLoading, setFlagsLoading] = useState(false);
  const [flagsError, setFlagsError] = useState<string | null>(null);
  const [flags, setFlags] = useState<FeatureFlagRow[]>([]);
  const leaderboardFlag = useMemo(() => flags.find((f) => f.key === 'leaderboard') ?? null, [flags]);
  const leaderboardPayload = (leaderboardFlag?.payload ?? {}) as Record<string, unknown>;
  const [lbTopN, setLbTopN] = useState(String(Number(leaderboardPayload.topN ?? 10) || 10));
  const [lbTtlSeconds, setLbTtlSeconds] = useState(String(Number(leaderboardPayload.snapshotTtlSeconds ?? 60) || 60));
  const [lbHideGuests, setLbHideGuests] = useState(Boolean(leaderboardPayload.hideGuests ?? false));
  const [lbWeeklyEnabled, setLbWeeklyEnabled] = useState(Boolean(leaderboardPayload.weeklyEnabled ?? false));
  const [lbVersion, setLbVersion] = useState(String(Math.max(1, Math.floor(Number(leaderboardPayload.version ?? 1) || 1))));

  const loadFlags = async () => {
    setFlagsLoading(true);
    setFlagsError(null);
    try {
      const resp = await fetch(`/api/admin/feature-flags?_t=${Date.now()}`, { credentials: 'include', cache: 'no-store' });
      if (!resp.ok) throw new Error('fetch_failed');
      const data = (await resp.json()) as { items?: FeatureFlagRow[] };
      setFlags(Array.isArray(data.items) ? data.items : []);
    } catch {
      setFlagsError('加载配置失败');
    } finally {
      setFlagsLoading(false);
    }
  };

  useEffect(() => {
    const payload = (leaderboardFlag?.payload ?? {}) as Record<string, unknown>;
    setLbTopN(String(Number(payload.topN ?? 10) || 10));
    setLbTtlSeconds(String(Number(payload.snapshotTtlSeconds ?? 60) || 60));
    setLbHideGuests(Boolean(payload.hideGuests ?? false));
    setLbWeeklyEnabled(Boolean(payload.weeklyEnabled ?? false));
    setLbVersion(String(Math.max(1, Math.floor(Number(payload.version ?? 1) || 1))));
  }, [leaderboardFlag?.updatedAt]);

  const toggleFlag = async (key: string, enabled: boolean) => {
    try {
      const resp = await fetch(`/api/admin/feature-flags?_t=${Date.now()}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({ key, enabled }),
      });
      if (!resp.ok) throw new Error('update_failed');
      await loadFlags();
    } catch {
      setFlagsError('更新失败');
    }
  };

  useEffect(() => {
    if (tab !== 'flags') return;
    void loadFlags();
  }, [tab]);

  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [audit, setAudit] = useState<AuditLogRow[]>([]);
  const [auditAdminUserId, setAuditAdminUserId] = useState('');
  const [auditTargetUserId, setAuditTargetUserId] = useState('');
  const [auditFrom, setAuditFrom] = useState('');
  const [auditTo, setAuditTo] = useState('');

  const loadAudit = async () => {
    setAuditLoading(true);
    setAuditError(null);
    try {
      const qs = new URLSearchParams();
      qs.set('limit', '50');
      qs.set('offset', '0');
      if (auditAdminUserId.trim()) qs.set('adminUserId', auditAdminUserId.trim());
      if (auditTargetUserId.trim()) qs.set('targetUserId', auditTargetUserId.trim());
      if (auditFrom) qs.set('from', `${auditFrom}T00:00:00.000Z`);
      if (auditTo) qs.set('to', `${auditTo}T23:59:59.999Z`);
      qs.set('_t', String(Date.now()));
      const resp = await fetch(`/api/admin/audit-logs?${qs.toString()}`, { credentials: 'include', cache: 'no-store' });
      if (!resp.ok) throw new Error('fetch_failed');
      const data = (await resp.json()) as { items?: AuditLogRow[] };
      setAudit(Array.isArray(data.items) ? data.items : []);
    } catch {
      setAuditError('加载审计日志失败');
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (tab !== 'audit') return;
    void loadAudit();
  }, [tab]);

  if (meLoading) {
    return (
      <div className="space-y-4 pt-2 pb-8">
        <div className="bg-white rounded-xl p-4 border border-zen-200/50 shadow-sm text-sm text-zen-500">加载中…</div>
      </div>
    );
  }

  if (!me || meError) {
    return (
      <div className="space-y-4 pt-2 pb-8">
        <div className="bg-white rounded-xl p-4 border border-zen-200/50 shadow-sm">
          <div className="text-sm font-medium text-zen-700">管理员后台</div>
          <div className="text-sm text-zen-500 mt-2">{meError ?? '无权限'}</div>
          {meDebug && (
            <div className="mt-2 text-xs text-zen-400 break-all">
              /api/admin/me status={meDebug.status} body={JSON.stringify(meDebug.body)}
            </div>
          )}
          <div className="mt-3">
            <Link className="text-sm text-zen-700 hover:underline" to="/">
              返回首页
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const tabs: Array<{ key: Tab; label: string; icon: ComponentType<{ className?: string }> }> = [
    { key: 'users', label: '用户', icon: Users },
    { key: 'flags', label: '开关', icon: Flag },
    { key: 'audit', label: '审计', icon: ScrollText },
  ];

  return (
    <div className="space-y-4 pt-2 pb-8">
      <div className="bg-white rounded-xl p-4 border border-zen-200/50 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Shield className="w-5 h-5 text-zen-400" />
          <div className="min-w-0">
            <div className="text-sm font-medium text-zen-700 truncate">管理员后台</div>
            <div className="text-xs text-zen-400 truncate">{me.email}</div>
          </div>
        </div>
        <div className="text-xs px-2 py-1 rounded-md border bg-sage-50 border-sage-200 text-sage-700">Admin</div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
              tab === key ? 'bg-sage-100 text-sage-700 border-sage-200' : 'bg-white text-zen-500 border-zen-200/50 hover:bg-zen-50'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <div className="space-y-3">
          <div className="bg-white rounded-xl p-4 border border-zen-200/50 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zen-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-zen-200 text-sm outline-none focus:ring-2 focus:ring-zen-200"
                  placeholder="搜索 email / 昵称 / ID"
                  value={usersQuery}
                  onChange={(e) => setUsersQuery(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="px-3 py-2 rounded-lg bg-zen-800 text-white text-sm hover:bg-zen-900 transition-colors disabled:opacity-60"
                disabled={usersLoading}
                onClick={() => void loadUsers()}
              >
                搜索
              </button>
            </div>

            {usersError && <div className="text-xs text-red-600">{usersError}</div>}
            {usersLoading ? (
              <div className="text-xs text-zen-500">加载中…</div>
            ) : (
              <div className="space-y-2">
                {users.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setSelectedUserId(u.id)}
                    className={`w-full text-left rounded-lg border p-3 transition-colors ${
                      selectedUserId === u.id ? 'bg-sage-50 border-sage-200' : 'bg-white border-zen-200/50 hover:bg-zen-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-zen-700 truncate">{u.name}</div>
                        <div className="text-xs text-zen-400 truncate">{u.email}</div>
                      </div>
                      <div className="text-xs text-zen-500 shrink-0">{u.role}</div>
                    </div>
                    {u.bannedUntil && (
                      <div className="mt-2 text-xs text-red-600 flex items-center gap-1">
                        <Ban className="w-3.5 h-3.5" />
                        已封禁
                      </div>
                    )}
                  </button>
                ))}
                {users.length === 0 && <div className="text-xs text-zen-500">暂无数据</div>}
              </div>
            )}
          </div>

          {selectedUserId && (
            <div className="bg-white rounded-xl p-4 border border-zen-200/50 shadow-sm space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium text-zen-700">用户详情</div>
                <button
                  type="button"
                  className="text-xs text-zen-500 hover:underline"
                  onClick={() => {
                    setSelectedUserId(null);
                    setSelectedUser(null);
                    setSelectedError(null);
                  }}
                >
                  关闭
                </button>
              </div>

              {selectedLoading && <div className="text-xs text-zen-500">加载中…</div>}
              {selectedError && <div className="text-xs text-red-600">{selectedError}</div>}

              {selectedUser && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-zen-200/50 p-3">
                    <div className="text-sm font-medium text-zen-700">{selectedUser.name}</div>
                    <div className="text-xs text-zen-400">{selectedUser.email}</div>
                    <div className="text-xs text-zen-500 mt-1">ID: {selectedUser.id}</div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg border border-zen-200/50 p-3">
                      <div className="text-[11px] text-zen-400">XP</div>
                      <div className="text-sm font-mono text-zen-700">{selectedUser.xp}</div>
                    </div>
                    <div className="rounded-lg border border-zen-200/50 p-3">
                      <div className="text-[11px] text-zen-400">Coins</div>
                      <div className="text-sm font-mono text-zen-700">{selectedUser.brainCoins}</div>
                    </div>
                    <div className="rounded-lg border border-zen-200/50 p-3">
                      <div className="text-[11px] text-zen-400">Lv</div>
                      <div className="text-sm font-mono text-zen-700">{selectedUser.brainLevel}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-zen-200 text-zen-700 px-4 py-2 text-sm hover:bg-zen-50 transition-colors"
                      onClick={async () => {
                        const nextXpStr = window.prompt('设置 XP（整数）', String(selectedUser.xp));
                        if (nextXpStr === null) return;
                        const nextXp = Number(nextXpStr);
                        if (!Number.isFinite(nextXp)) return;
                        if (!window.confirm(`确认把 XP 修改为 ${Math.floor(nextXp)} 吗？`)) return;
                        await fetch(`/api/admin/users/${encodeURIComponent(selectedUser.id)}`, {
                          method: 'PATCH',
                          headers: { 'content-type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({ xp: Math.floor(nextXp) }),
                        });
                        await loadUserDetail(selectedUser.id);
                        await loadUsers();
                      }}
                    >
                      调整 XP
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-zen-200 text-zen-700 px-4 py-2 text-sm hover:bg-zen-50 transition-colors"
                      onClick={async () => {
                        const nextCoinsStr = window.prompt('设置 Coins（整数）', String(selectedUser.brainCoins));
                        if (nextCoinsStr === null) return;
                        const nextCoins = Number(nextCoinsStr);
                        if (!Number.isFinite(nextCoins)) return;
                        if (!window.confirm(`确认把 Coins 修改为 ${Math.floor(nextCoins)} 吗？`)) return;
                        await fetch(`/api/admin/users/${encodeURIComponent(selectedUser.id)}`, {
                          method: 'PATCH',
                          headers: { 'content-type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({ brainCoins: Math.floor(nextCoins) }),
                        });
                        await loadUserDetail(selectedUser.id);
                        await loadUsers();
                      }}
                    >
                      调整 Coins
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {selectedUser.bannedUntil ? (
                      <button
                        type="button"
                        className="rounded-lg bg-green-600 text-white px-4 py-2 text-sm hover:bg-green-700 transition-colors"
                        onClick={async () => {
                          if (!window.confirm('确认解封该用户吗？')) return;
                          await fetch(`/api/admin/users/${encodeURIComponent(selectedUser.id)}/unban`, {
                            method: 'POST',
                            credentials: 'include',
                          });
                          await loadUserDetail(selectedUser.id);
                          await loadUsers();
                        }}
                      >
                        解封
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="rounded-lg bg-red-600 text-white px-4 py-2 text-sm hover:bg-red-700 transition-colors"
                        onClick={async () => {
                          const reason = window.prompt('封禁原因（可选）', '') ?? '';
                          if (!window.confirm('确认封禁该用户吗？')) return;
                          await fetch(`/api/admin/users/${encodeURIComponent(selectedUser.id)}/ban`, {
                            method: 'POST',
                            headers: { 'content-type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({ reason }),
                          });
                          await loadUserDetail(selectedUser.id);
                          await loadUsers();
                        }}
                      >
                        封禁
                      </button>
                    )}
                    <div className="rounded-lg border border-zen-200/50 px-4 py-2 text-sm text-zen-600 flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-zen-400" />
                      已审计
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-zen-200 text-zen-700 px-4 py-2 text-sm hover:bg-zen-50 transition-colors"
                      onClick={async () => {
                        const nextEnergyStr = window.prompt('设置 Energy（整数）', String(selectedUser.energyCurrent));
                        if (nextEnergyStr === null) return;
                        const nextEnergy = Number(nextEnergyStr);
                        if (!Number.isFinite(nextEnergy)) return;
                        if (!window.confirm(`确认把 Energy 修改为 ${Math.floor(nextEnergy)} 吗？`)) return;
                        await fetch(`/api/admin/users/${encodeURIComponent(selectedUser.id)}`, {
                          method: 'PATCH',
                          headers: { 'content-type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({ energyCurrent: Math.floor(nextEnergy) }),
                        });
                        await loadUserDetail(selectedUser.id);
                      }}
                    >
                      调整 Energy
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-zen-200 text-zen-700 px-4 py-2 text-sm hover:bg-zen-50 transition-colors"
                      onClick={async () => {
                        const jsonStr = window.prompt('设置 Inventory（JSON 对象）', JSON.stringify(selectedUser.inventory ?? {}));
                        if (jsonStr === null) return;
                        let next: unknown;
                        try {
                          next = JSON.parse(jsonStr);
                        } catch {
                          return;
                        }
                        if (!next || typeof next !== 'object' || Array.isArray(next)) return;
                        if (!window.confirm('确认更新 Inventory 吗？')) return;
                        await fetch(`/api/admin/users/${encodeURIComponent(selectedUser.id)}`, {
                          method: 'PATCH',
                          headers: { 'content-type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({ inventory: next }),
                        });
                        await loadUserDetail(selectedUser.id);
                      }}
                    >
                      编辑 Inventory
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-zen-200 text-zen-700 px-4 py-2 text-sm hover:bg-zen-50 transition-colors"
                      onClick={async () => {
                        const jsonStr = window.prompt('设置 BrainStats（JSON 对象）', JSON.stringify(selectedUser.brainStats ?? {}));
                        if (jsonStr === null) return;
                        let next: unknown;
                        try {
                          next = JSON.parse(jsonStr);
                        } catch {
                          return;
                        }
                        if (!next || typeof next !== 'object' || Array.isArray(next)) return;
                        if (!window.confirm('确认更新 BrainStats 吗？')) return;
                        await fetch(`/api/admin/users/${encodeURIComponent(selectedUser.id)}`, {
                          method: 'PATCH',
                          headers: { 'content-type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({ brainStats: next }),
                        });
                        await loadUserDetail(selectedUser.id);
                      }}
                    >
                      编辑 BrainStats
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-zen-200 text-zen-700 px-4 py-2 text-sm hover:bg-zen-50 transition-colors"
                      onClick={async () => {
                        const nextStreakStr = window.prompt('设置 连续签到天数（整数）', String(selectedUser.checkInStreak));
                        if (nextStreakStr === null) return;
                        const nextStreak = Number(nextStreakStr);
                        if (!Number.isFinite(nextStreak)) return;
                        const nextDate = window.prompt('设置 最近签到日期（YYYY-MM-DD 或留空清空）', selectedUser.checkInLastDate ?? '') ?? '';
                        const patch: Record<string, unknown> = { checkInStreak: Math.floor(nextStreak) };
                        patch.checkInLastDate = nextDate.trim() ? nextDate.trim() : null;
                        if (!window.confirm('确认更新签到字段吗？')) return;
                        await fetch(`/api/admin/users/${encodeURIComponent(selectedUser.id)}`, {
                          method: 'PATCH',
                          headers: { 'content-type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify(patch),
                        });
                        await loadUserDetail(selectedUser.id);
                      }}
                    >
                      编辑 签到字段
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'flags' && (
        <div className="space-y-3">
          <div className="bg-white rounded-xl p-4 border border-zen-200/50 shadow-sm space-y-3">
            <div className="text-sm font-medium text-zen-700">排行榜配置</div>
            <div className="rounded-lg border border-zen-200/50 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-zen-700">总榜启用</div>
                <button
                  type="button"
                  className={`w-12 h-7 rounded-full p-1 transition-colors ${leaderboardFlag?.enabled ? 'bg-sage-500' : 'bg-zen-200'}`}
                  onClick={() => void toggleFlag('leaderboard', !Boolean(leaderboardFlag?.enabled))}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${leaderboardFlag?.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-zen-500">
                  TopN
                  <input
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-zen-200 text-sm outline-none focus:ring-2 focus:ring-zen-200"
                    value={lbTopN}
                    onChange={(e) => setLbTopN(e.target.value)}
                  />
                </label>
                <label className="text-xs text-zen-500">
                  刷新频率（秒）
                  <input
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-zen-200 text-sm outline-none focus:ring-2 focus:ring-zen-200"
                    value={lbTtlSeconds}
                    onChange={(e) => setLbTtlSeconds(e.target.value)}
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-zen-500">
                  版本（触发刷新）
                  <input
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-zen-200 text-sm outline-none focus:ring-2 focus:ring-zen-200"
                    value={lbVersion}
                    onChange={(e) => setLbVersion(e.target.value)}
                  />
                </label>
                <div className="text-xs text-zen-400 flex items-end pb-2">
                  递增可使快照失效并重算
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-zen-700">隐藏游客</div>
                <button
                  type="button"
                  className={`w-12 h-7 rounded-full p-1 transition-colors ${lbHideGuests ? 'bg-sage-500' : 'bg-zen-200'}`}
                  onClick={() => setLbHideGuests((v) => !v)}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${lbHideGuests ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-zen-700">周榜开关</div>
                <button
                  type="button"
                  className={`w-12 h-7 rounded-full p-1 transition-colors ${lbWeeklyEnabled ? 'bg-sage-500' : 'bg-zen-200'}`}
                  onClick={() => setLbWeeklyEnabled((v) => !v)}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${lbWeeklyEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <button
                type="button"
                className="w-full px-3 py-2 rounded-lg bg-zen-800 text-white text-sm hover:bg-zen-900 transition-colors"
                onClick={async () => {
                  const topN = Math.max(1, Math.min(100, Number(lbTopN) || 10));
                  const ttl = Math.max(5, Math.min(3600, Number(lbTtlSeconds) || 60));
                  const version = Math.max(1, Math.min(10_000, Math.floor(Number(lbVersion) || 1)));
                  await fetch(`/api/admin/feature-flags?_t=${Date.now()}`, {
                    method: 'PATCH',
                    headers: { 'content-type': 'application/json' },
                    credentials: 'include',
                    cache: 'no-store',
                    body: JSON.stringify({
                      key: 'leaderboard',
                      enabled: Boolean(leaderboardFlag?.enabled ?? false),
                      payload: { ...leaderboardPayload, topN, snapshotTtlSeconds: ttl, hideGuests: lbHideGuests, weeklyEnabled: lbWeeklyEnabled, version },
                    }),
                  });
                  await loadFlags();
                }}
              >
                保存配置
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-zen-200/50 shadow-sm space-y-3">
            <div className="text-sm font-medium text-zen-700">运营开关</div>
          {flagsError && <div className="text-xs text-red-600">{flagsError}</div>}
          {flagsLoading ? (
            <div className="text-xs text-zen-500">加载中…</div>
          ) : (
            <div className="space-y-2">
              {flags.map((f) => (
                <div key={f.key} className="flex items-center justify-between rounded-lg border border-zen-200/50 p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-zen-700 truncate">{f.key}</div>
                    <div className="text-xs text-zen-400 truncate">{f.updatedAt ?? ''}</div>
                  </div>
                  <button
                    type="button"
                    className={`w-12 h-7 rounded-full p-1 transition-colors ${f.enabled ? 'bg-sage-500' : 'bg-zen-200'}`}
                    onClick={() => void toggleFlag(f.key, !f.enabled)}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform ${f.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              ))}
              {flags.length === 0 && <div className="text-xs text-zen-500">暂无配置</div>}
            </div>
          )}
        </div>
        </div>
      )}

      {tab === 'audit' && (
        <div className="bg-white rounded-xl p-4 border border-zen-200/50 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-zen-700">审计日志</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="text-xs px-3 py-2 rounded-lg border border-zen-200 text-zen-700 hover:bg-zen-50 transition-colors"
                onClick={() => void loadAudit()}
              >
                查询
              </button>
              <button
                type="button"
                className="text-xs px-3 py-2 rounded-lg bg-zen-800 text-white hover:bg-zen-900 transition-colors"
                onClick={() => {
                  const qs = new URLSearchParams();
                  if (auditAdminUserId.trim()) qs.set('adminUserId', auditAdminUserId.trim());
                  if (auditTargetUserId.trim()) qs.set('targetUserId', auditTargetUserId.trim());
                  if (auditFrom) qs.set('from', `${auditFrom}T00:00:00.000Z`);
                  if (auditTo) qs.set('to', `${auditTo}T23:59:59.999Z`);
                  qs.set('_t', String(Date.now()));
                  window.open(`/api/admin/audit-logs/export?${qs.toString()}`, '_blank', 'noopener,noreferrer');
                }}
              >
                导出 CSV
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-zen-500">
              adminUserId
              <input
                className="mt-1 w-full px-3 py-2 rounded-lg border border-zen-200 text-sm outline-none focus:ring-2 focus:ring-zen-200"
                value={auditAdminUserId}
                onChange={(e) => setAuditAdminUserId(e.target.value)}
              />
            </label>
            <label className="text-xs text-zen-500">
              targetUserId
              <input
                className="mt-1 w-full px-3 py-2 rounded-lg border border-zen-200 text-sm outline-none focus:ring-2 focus:ring-zen-200"
                value={auditTargetUserId}
                onChange={(e) => setAuditTargetUserId(e.target.value)}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-zen-500">
              from
              <input
                type="date"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-zen-200 text-sm outline-none focus:ring-2 focus:ring-zen-200"
                value={auditFrom}
                onChange={(e) => setAuditFrom(e.target.value)}
              />
            </label>
            <label className="text-xs text-zen-500">
              to
              <input
                type="date"
                className="mt-1 w-full px-3 py-2 rounded-lg border border-zen-200 text-sm outline-none focus:ring-2 focus:ring-zen-200"
                value={auditTo}
                onChange={(e) => setAuditTo(e.target.value)}
              />
            </label>
          </div>
          {auditError && <div className="text-xs text-red-600">{auditError}</div>}
          {auditLoading ? (
            <div className="text-xs text-zen-500">加载中…</div>
          ) : (
            <div className="space-y-2">
              {audit.map((a) => (
                <div key={a.id} className="rounded-lg border border-zen-200/50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs text-zen-500 truncate">{a.createdAt}</div>
                    <div className="text-xs text-zen-500 truncate">{a.ip ?? ''}</div>
                  </div>
                  <div className="text-sm font-medium text-zen-700 mt-1">{a.action}</div>
                  <div className="text-xs text-zen-400 mt-1 truncate">
                    admin: {a.adminUserId ?? '-'} / target: {a.targetUserId ?? '-'}
                  </div>
                </div>
              ))}
              {audit.length === 0 && <div className="text-xs text-zen-500">暂无日志</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
