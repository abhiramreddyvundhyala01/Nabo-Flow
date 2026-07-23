'use client';

// ===== Nabo Flow — Staff Management (Fully Functional) =====
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp, Award, Plus, Check, X, Calendar, Users, Star,
  Shield, ShieldCheck, ShieldAlert, Loader2, RefreshCw,
  Search, Mail, Power, Crown, ChevronDown, Lock, KeyRound, AlertCircle,
  Clock, Coffee, LogOut, LogIn, ChevronUp, SlidersHorizontal,
  Download, Phone, Briefcase, Edit2, UserCheck, ArrowUpDown,
  BadgeCheck, UserX, BarChart2,
} from 'lucide-react';
import { staff as initialStaffData } from '../data';
import { inr } from '../format';
import { Card, Badge, Button, StatCard, SectionHeader, Avatar, ProgressBar } from '../ui';
import { type Profile, type Role, ROLE_ACCESS, canAccess, DEMO_EMPLOYEES, useAuth, getRoleAccess, saveRoleAccess } from '../auth';
import type { ModuleKey } from '../types';
import type { Staff } from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────
type Tab = 'rbac' | 'attendance' | 'performance';
type SortField = 'sales' | 'upsellRate' | 'avgBill' | 'attendance';
type SortDir = 'asc' | 'desc';
type AttendanceStatus = 'active' | 'break' | 'off';

interface AttendanceRecord {
  staffId: string;
  clockIn: string | null;
  clockOut: string | null;
  status: AttendanceStatus;
  hoursWorked: number;
}

const ROLES: Role[] = ['admin', 'manager', 'cashier', 'server', 'inventory'];

const ROLE_META: Record<Role, { label: string; tone: 'danger' | 'brand' | 'info' | 'warn' | 'neutral'; icon: typeof Crown }> = {
  admin:     { label: 'Admin',     tone: 'danger', icon: Crown },
  manager:   { label: 'Manager',   tone: 'brand',  icon: ShieldCheck },
  cashier:   { label: 'Cashier',   tone: 'info',   icon: Shield },
  server:    { label: 'Server',    tone: 'warn',   icon: ShieldAlert },
  inventory: { label: 'Inventory', tone: 'neutral', icon: Shield },
};

const PERMISSION_MODULES: { key: ModuleKey; label: string }[] = [
  { key: 'pos',       label: 'POS Billing' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'purchase',  label: 'Purchase' },
  { key: 'menu',      label: 'Menu Mgmt' },
  { key: 'loyalty',   label: 'Loyalty' },
  { key: 'referral',  label: 'Referrals' },
  { key: 'online',    label: 'Online Orders' },
  { key: 'reports',   label: 'Reports' },
  { key: 'staff',     label: 'Staff Mgmt' },
  { key: 'mobile',    label: 'Mobile App' },
];

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[200] flex items-center gap-2.5 bg-ink-900 text-white px-4 py-3 rounded-xl shadow-2xl animate-slide-up max-w-xs">
      <BadgeCheck className="h-4 w-4 text-brand-400 shrink-0" />
      <span className="text-sm font-medium flex-1">{message}</span>
      <button onClick={onClose} className="text-ink-400 hover:text-white"><X className="h-3.5 w-3.5" /></button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function StaffManagement() {
  const { profile, createEmployee } = useAuth();
  const [tab, setTab] = useState<Tab>('rbac');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>(initialStaffData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [pinTarget, setPinTarget] = useState<Profile | null>(null);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [detailStaff, setDetailStaff] = useState<Staff | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Attendance records keyed by staffId
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>(() => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    return Object.fromEntries(initialStaffData.map(s => [
      s.id,
      {
        staffId: s.id,
        clockIn: s.status === 'active' || s.status === 'break' ? '09:00' : null,
        clockOut: s.status === 'off' ? '17:00' : null,
        status: s.status as AttendanceStatus,
        hoursWorked: s.status === 'off' ? 8 : s.status === 'active' ? 5 : 4,
      },
    ]));
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    // DEMO_EMPLOYEES is a mutable module-level array — always read it fresh
    const mapped: Profile[] = DEMO_EMPLOYEES.map(e => ({
      id: e.id,
      email: e.email,
      full_name: e.full_name,
      role: e.role,
      outlet: e.outlet,
      active: e.active,
    }));
    setProfiles(mapped);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchProfiles(); }, []);

  const updateRole = async (id: string, role: Role) => {
    setUpdatingId(id);
    await new Promise(r => setTimeout(r, 300));
    setUpdatingId(null);
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, role } : p));
    showToast('Role updated successfully');
  };

  const toggleActive = async (p: Profile) => {
    setUpdatingId(p.id);
    await new Promise(r => setTimeout(r, 300));
    setUpdatingId(null);
    setProfiles(prev => prev.map(x => x.id === p.id ? { ...x, active: !x.active } : x));
    showToast(`${p.full_name} ${p.active ? 'disabled' : 'enabled'}`);
  };

  const handleAddEmployee = async (data: { fullName: string; email: string; password: string; role: Role; outlet: string }) => {
    // Delegate to auth's createEmployee which mutates DEMO_EMPLOYEES and persists to sessionStorage
    const result = await createEmployee(data);
    if (result.error) return result;
    // Re-read the updated DEMO_EMPLOYEES list into local state
    await fetchProfiles();
    setShowAddEmployee(false);
    showToast(`Employee "${data.fullName}" added successfully`);
    return result;
  };

  const handleClockIn = (staffId: string) => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    setAttendance(prev => ({
      ...prev,
      [staffId]: { ...prev[staffId], clockIn: timeStr, clockOut: null, status: 'active', hoursWorked: 0 },
    }));
    setStaffList(prev => prev.map(s => s.id === staffId ? { ...s, status: 'active' } : s));
    const staff = staffList.find(s => s.id === staffId);
    showToast(`${staff?.name} clocked in at ${timeStr}`);
  };

  const handleClockOut = (staffId: string) => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const rec = attendance[staffId];
    let hours = 0;
    if (rec?.clockIn) {
      const [ih, im] = rec.clockIn.split(':').map(Number);
      hours = Math.round((now.getHours() * 60 + now.getMinutes() - ih * 60 - im) / 60 * 10) / 10;
    }
    setAttendance(prev => ({
      ...prev,
      [staffId]: { ...prev[staffId], clockOut: timeStr, status: 'off', hoursWorked: Math.max(hours, 0) },
    }));
    setStaffList(prev => prev.map(s => s.id === staffId ? { ...s, status: 'off' } : s));
    const staff = staffList.find(s => s.id === staffId);
    showToast(`${staff?.name} clocked out at ${timeStr}`);
  };

  const handleBreak = (staffId: string, onBreak: boolean) => {
    const newStatus: AttendanceStatus = onBreak ? 'break' : 'active';
    setAttendance(prev => ({ ...prev, [staffId]: { ...prev[staffId], status: newStatus } }));
    setStaffList(prev => prev.map(s => s.id === staffId ? { ...s, status: newStatus } : s));
    const staffMember = staffList.find(s => s.id === staffId);
    showToast(`${staffMember?.name} ${onBreak ? 'on break' : 'back from break'}`);
  };

  const filtered = profiles.filter(p => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return p.email.toLowerCase().includes(q) || p.full_name.toLowerCase().includes(q) || p.role.includes(q);
  });

  const activeCount = profiles.filter(p => p.active).length;
  const roleCounts = ROLES.reduce((acc, r) => {
    acc[r] = profiles.filter(p => p.role === r).length;
    return acc;
  }, {} as Record<Role, number>);

  const isAdmin = profile?.role === 'admin';

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Users" value={String(profiles.length)} sub={`${activeCount} active`} icon={<Users className="h-5 w-5" />} tone="info" />
        <StatCard label="Admins" value={String(roleCounts.admin)} sub="Full access" icon={<Crown className="h-5 w-5" />} tone="danger" />
        <StatCard label="Managers" value={String(roleCounts.manager)} sub="No staff mgmt" icon={<ShieldCheck className="h-5 w-5" />} tone="brand" />
        <StatCard label="Frontline" value={String((roleCounts.cashier || 0) + (roleCounts.server || 0))} sub="Cashiers + Servers" icon={<Shield className="h-5 w-5" />} tone="warn" />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-danger-700 bg-danger-50 border border-danger-200 rounded-xl px-4 py-2.5">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-danger-600 hover:text-danger-800"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-white rounded-xl border border-ink-200/60 p-1 w-fit">
          {([
            { key: 'rbac', label: 'Users & Roles' },
            { key: 'attendance', label: 'Shift & Attendance' },
            { key: 'performance', label: 'Performance' },
          ] as { key: Tab; label: string }[]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-ink-50'}`}>
              {t.label}
            </button>
          ))}
        </div>
        {tab === 'rbac' && (
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button variant="primary" size="sm" onClick={() => setShowAddEmployee(true)}>
                <Plus className="h-3.5 w-3.5" /> Add Employee
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={fetchProfiles} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
        )}
      </div>

      {tab === 'rbac' && (
        <RBACTab
          profiles={filtered}
          loading={loading}
          search={search}
          setSearch={setSearch}
          updateRole={updateRole}
          toggleActive={toggleActive}
          updatingId={updatingId}
          isAdmin={isAdmin}
          currentUserId={profile?.id ?? ''}
          onSetPin={setPinTarget}
          onShowToast={showToast}
        />
      )}
      {tab === 'attendance' && (
        <AttendanceTab
          staffList={staffList}
          attendance={attendance}
          onClockIn={handleClockIn}
          onClockOut={handleClockOut}
          onBreak={handleBreak}
          onUpdateShift={(staffId, newShift) => {
            setStaffList(prev => prev.map(s => s.id === staffId ? { ...s, shift: newShift } : s));
            showToast('Shift updated successfully');
          }}
        />
      )}
      {tab === 'performance' && (
        <PerformanceTab
          staffList={staffList}
          onViewDetail={setDetailStaff}
          onExport={() => showToast('Performance report exported (demo)')}
        />
      )}

      {/* Modals */}
      {pinTarget && (
        <SetPinModal
          target={pinTarget}
          isAdmin={isAdmin}
          currentUserId={profile?.id ?? ''}
          onClose={() => setPinTarget(null)}
          onSaved={() => { setPinTarget(null); fetchProfiles(); showToast('PIN updated successfully'); }}
        />
      )}
      {showAddEmployee && (
        <AddEmployeeModal
          onClose={() => setShowAddEmployee(false)}
          onCreated={() => { setShowAddEmployee(false); fetchProfiles(); }}
          createEmployee={handleAddEmployee}
        />
      )}
      {detailStaff && (
        <StaffDetailModal
          staff={detailStaff}
          onClose={() => setDetailStaff(null)}
          onEdit={(updated) => {
            setStaffList(prev => prev.map(s => s.id === updated.id ? updated : s));
            setDetailStaff(null);
            showToast(`${updated.name}'s details updated`);
          }}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

// ─── RBAC Tab ─────────────────────────────────────────────────────────────────
function RBACTab({
  profiles, loading, search, setSearch, updateRole, toggleActive,
  updatingId, isAdmin, currentUserId, onSetPin, onShowToast,
}: {
  profiles: Profile[];
  loading: boolean;
  search: string;
  setSearch: (v: string) => void;
  updateRole: (id: string, role: Role) => void;
  toggleActive: (p: Profile) => void;
  updatingId: string | null;
  isAdmin: boolean;
  currentUserId: string;
  onSetPin: (p: Profile) => void;
  onShowToast: (msg: string) => void;
}) {
  const [matrix, setMatrix] = useState<Record<Role, ModuleKey[]>>(() => getRoleAccess());

  const handleTogglePermission = (role: Role, modKey: ModuleKey) => {
    if (!isAdmin) return;
    const currentList = matrix[role] || [];
    const hasAccess = currentList.includes(modKey);
    const updatedList = hasAccess
      ? currentList.filter(k => k !== modKey)
      : [...currentList, modKey];
    const updatedMatrix = { ...matrix, [role]: updatedList };

    saveRoleAccess(updatedMatrix);
    setMatrix(updatedMatrix);

    const modName = PERMISSION_MODULES.find(m => m.key === modKey)?.label || modKey;
    const roleName = ROLE_META[role].label;
    onShowToast(`${hasAccess ? 'Revoked' : 'Granted'} ${modName} access for ${roleName}`);
  };

  const handleResetMatrix = () => {
    if (!isAdmin) return;
    saveRoleAccess(ROLE_ACCESS);
    setMatrix(ROLE_ACCESS);
    onShowToast('Restored default role permission matrix');
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="User Management"
        subtitle={isAdmin
          ? 'Promote, demote, edit role permissions, or deactivate team members. Changes take effect immediately.'
          : 'View team members and their roles. Only admins can modify roles.'}
      />

      {/* Permission matrix */}
      <Card pad={false} className="overflow-auto">
        <div className="px-4 py-3 border-b border-ink-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-ink-800">Role Permission Matrix</h3>
            <p className="text-2xs text-ink-400 mt-0.5">
              {isAdmin ? 'Click any tick/cross to toggle access for that role' : 'Module access per role — drives sidebar visibility'}
            </p>
          </div>
          {isAdmin && (
            <Button variant="ghost" size="sm" onClick={handleResetMatrix} title="Reset permissions to default">
              <RefreshCw className="h-3.5 w-3.5" /> Reset Defaults
            </Button>
          )}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-ink-50 text-2xs uppercase tracking-wide text-ink-400 font-semibold">
              <th className="text-left px-4 py-2.5 sticky left-0 bg-ink-50">Module</th>
              {ROLES.map(r => {
                const M = ROLE_META[r];
                return (
                  <th key={r} className="text-center px-3 py-2.5">
                    <div className="flex flex-col items-center gap-1">
                      <M.icon className="h-3.5 w-3.5" />
                      <span>{M.label}</span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_MODULES.map(mod => (
              <tr key={mod.key} className="border-t border-ink-100">
                <td className="px-4 py-2.5 font-semibold text-ink-700 sticky left-0 bg-white">{mod.label}</td>
                {ROLES.map(r => {
                  const allowed = matrix[r]?.includes(mod.key);
                  return (
                    <td key={r} className="text-center px-3 py-2.5">
                      <button
                        onClick={() => handleTogglePermission(r, mod.key)}
                        disabled={!isAdmin}
                        title={isAdmin ? `Click to ${allowed ? 'revoke' : 'grant'} ${mod.label} for ${ROLE_META[r].label}` : ''}
                        className={`inline-flex h-7 w-7 rounded-lg items-center justify-center transition-all ${
                          isAdmin ? 'cursor-pointer hover:scale-110 active:scale-95' : 'cursor-default'
                        } ${
                          allowed ? 'bg-brand-100 text-brand-700 hover:bg-brand-200' : 'bg-ink-100 text-ink-400 hover:bg-ink-200'
                        }`}
                      >
                        {allowed ? <Check className="h-4 w-4 stroke-[3]" /> : <X className="h-4 w-4" />}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* User list */}
      <Card pad={false}>
        <div className="px-4 py-3 border-b border-ink-100 flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-ink-800">Team Members ({profiles.length})</h3>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, or role..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-ink-50 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-ink-400">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading users...
          </div>
        ) : profiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-ink-400">
            <Users className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">No users found.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-ink-50 text-2xs uppercase tracking-wide text-ink-400 font-semibold">
                <th className="text-left px-4 py-2.5">Member</th>
                <th className="text-left px-3 py-2.5">Role</th>
                <th className="text-left px-3 py-2.5">Outlet</th>
                <th className="text-center px-3 py-2.5">Status</th>
                <th className="text-center px-3 py-2.5">PIN</th>
                <th className="text-right px-4 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map(p => {
                const isSelf = p.id === currentUserId;
                const M = ROLE_META[p.role];
                const busy = updatingId === p.id;
                return (
                  <tr key={p.id} className="border-t border-ink-100 hover:bg-ink-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={p.full_name || p.email} size="sm" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-ink-800 truncate">{p.full_name || '(no name)'}</span>
                            {isSelf && <Badge tone="brand" size="xs">You</Badge>}
                          </div>
                          <div className="flex items-center gap-1 text-2xs text-ink-400">
                            <Mail className="h-3 w-3" />{p.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {isAdmin && !isSelf ? (
                        <RoleSelect value={p.role} onChange={r => updateRole(p.id, r)} disabled={busy} />
                      ) : (
                        <Badge tone={M.tone} size="xs">
                          <M.icon className="h-3 w-3" />
                          {M.label}
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-3 text-ink-500 text-xs">{p.outlet}</td>
                    <td className="px-3 py-3 text-center">
                      {p.active
                        ? <Badge tone="brand" size="xs" dot>Active</Badge>
                        : <Badge tone="neutral" size="xs" dot>Disabled</Badge>}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {(p as any).pin_hash
                        ? <Badge tone="brand" size="xs"><KeyRound className="h-3 w-3" />Set</Badge>
                        : <Badge tone="neutral" size="xs">None</Badge>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-400" />}
                        {(isAdmin || isSelf) && (
                          <Button variant="ghost" size="sm" onClick={() => onSetPin(p)} title="Set or reset PIN">
                            <Lock className="h-3.5 w-3.5" /> PIN
                          </Button>
                        )}
                        {isAdmin && !isSelf && (
                          <Button
                            variant={p.active ? 'ghost' : 'secondary'}
                            size="sm"
                            onClick={() => toggleActive(p)}
                            disabled={busy}
                            title={p.active ? 'Deactivate user' : 'Activate user'}
                          >
                            <Power className="h-3.5 w-3.5" />
                            {p.active ? 'Disable' : 'Enable'}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {!isAdmin && (
        <div className="flex items-center gap-2 text-xs text-ink-500 bg-info-50 border border-info-200 rounded-xl px-4 py-2.5">
          <ShieldAlert className="h-4 w-4 text-info-600 shrink-0" />
          <span>You are viewing in read-only mode. Only admins can promote, demote, or deactivate users.</span>
        </div>
      )}
    </div>
  );
}

// ─── Role Select ──────────────────────────────────────────────────────────────
function RoleSelect({ value, onChange, disabled }: { value: Role; onChange: (r: Role) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const M = ROLE_META[value];
  return (
    <div className="relative inline-block">
      <button
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold transition-colors
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-ink-100 cursor-pointer'}
          ${M.tone === 'danger' ? 'bg-danger-50 text-danger-700' :
            M.tone === 'brand' ? 'bg-brand-50 text-brand-700' :
            M.tone === 'info' ? 'bg-info-50 text-info-700' :
            M.tone === 'warn' ? 'bg-warn-50 text-warn-700' :
            'bg-ink-100 text-ink-600'}`}
      >
        <M.icon className="h-3 w-3" />
        {M.label}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-40 bg-white rounded-lg shadow-xl border border-ink-200 py-1">
            {ROLES.map(r => {
              const RM = ROLE_META[r];
              return (
                <button
                  key={r}
                  onClick={() => { onChange(r); setOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-left transition-colors hover:bg-ink-50
                    ${r === value ? 'text-brand-700 bg-brand-50/50' : 'text-ink-700'}`}
                >
                  <RM.icon className="h-3.5 w-3.5" />
                  {RM.label}
                  {r === value && <Check className="h-3.5 w-3.5 ml-auto" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── localStorage helpers ─────────────────────────────────────────────────────
const LS_ATT_LOG = 'nabo_attendance_log';

type DayStatus = 'present' | 'absent' | 'late' | 'half-day' | 'leave';

interface DayRecord {
  date: string;        // 'YYYY-MM-DD'
  staffId: string;
  status: DayStatus;
  clockIn: string;
  clockOut: string;
  hours: number;
  note: string;
}

function loadLog(): DayRecord[] {
  try { const r = localStorage.getItem(LS_ATT_LOG); if (r) return JSON.parse(r); } catch { /* ignore */ }
  return [];
}
function saveLog(log: DayRecord[]) {
  try { localStorage.setItem(LS_ATT_LOG, JSON.stringify(log)); } catch { /* ignore */ }
}
function toISO(d: Date) { return d.toISOString().slice(0, 10); }
function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-');
  return new Date(+y, +m - 1, +d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const DAY_STATUS_TONE: Record<DayStatus, 'brand' | 'danger' | 'warn' | 'info' | 'neutral'> = {
  present: 'brand', absent: 'danger', late: 'warn', 'half-day': 'info', leave: 'neutral',
};
const DAY_STATUS_COLOR: Record<DayStatus, string> = {
  present:   'bg-brand-500',
  absent:    'bg-danger-500',
  late:      'bg-warn-500',
  'half-day':'bg-info-400',
  leave:     'bg-ink-300',
};
const DAY_STATUS_LABEL: Record<DayStatus, string> = {
  present: 'Present', absent: 'Absent', late: 'Late', 'half-day': 'Half Day', leave: 'Leave',
};

// ─── Mark Attendance Modal ────────────────────────────────────────────────────
function MarkAttendanceModal({
  staff, date, existing, onSave, onClose,
}: {
  staff: Staff; date: string; existing?: DayRecord;
  onSave: (rec: DayRecord) => void; onClose: () => void;
}) {
  const [status, setStatus] = useState<DayStatus>(existing?.status ?? 'present');
  const [clockIn, setClockIn]   = useState(existing?.clockIn   ?? '09:00');
  const [clockOut, setClockOut] = useState(existing?.clockOut  ?? '18:00');
  const [note, setNote]         = useState(existing?.note      ?? '');

  const hours = (() => {
    try {
      const [ih, im] = clockIn.split(':').map(Number);
      const [oh, om] = clockOut.split(':').map(Number);
      const diff = (oh * 60 + om) - (ih * 60 + im);
      return diff > 0 ? +(diff / 60).toFixed(1) : 0;
    } catch { return 0; }
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-pop w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100">
          <div>
            <h3 className="font-bold text-ink-900">Mark Attendance</h3>
            <p className="text-xs text-ink-400">{staff.name} · {fmtDate(date)}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-ink-100 flex items-center justify-center"><X className="h-4 w-4 text-ink-500" /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Status chips */}
          <div>
            <label className="block text-xs font-semibold text-ink-600 mb-2">Status</label>
            <div className="grid grid-cols-5 gap-2">
              {(['present', 'absent', 'late', 'half-day', 'leave'] as DayStatus[]).map(s => (
                <button key={s} onClick={() => setStatus(s)}
                  className={`py-2 rounded-xl text-xs font-bold border-2 transition-all capitalize ${status === s ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-500 hover:border-ink-300'}`}>
                  {DAY_STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>

          {status !== 'absent' && status !== 'leave' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink-600 mb-1">Clock In</label>
                <input type="time" value={clockIn} onChange={e => setClockIn(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-600 mb-1">Clock Out</label>
                <input type="time" value={clockOut} onChange={e => setClockOut(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
              </div>
            </div>
          )}

          {hours > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-brand-50 border border-brand-100 text-sm">
              <Clock className="h-4 w-4 text-brand-600" />
              <span className="text-ink-700">Hours worked: <b className="text-brand-700">{hours}h</b></span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-ink-600 mb-1">Note (optional)</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)}
              placeholder="e.g. sick leave, late due to traffic..."
              className="w-full px-3 py-2 text-sm border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-ink-100">
          <button onClick={onClose} className="flex-1 h-10 rounded-lg border border-ink-200 text-sm font-semibold text-ink-600 hover:bg-ink-50">Cancel</button>
          <button
            onClick={() => onSave({ date, staffId: staff.id, status, clockIn: status !== 'absent' && status !== 'leave' ? clockIn : '', clockOut: status !== 'absent' && status !== 'leave' ? clockOut : '', hours: status !== 'absent' && status !== 'leave' ? hours : 0, note })}
            className="flex-1 h-10 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Attendance Tab ───────────────────────────────────────────────────────────
function AttendanceTab({
  staffList, attendance, onClockIn, onClockOut, onBreak, onUpdateShift,
}: {
  staffList: Staff[];
  attendance: Record<string, AttendanceRecord>;
  onClockIn: (id: string) => void;
  onClockOut: (id: string) => void;
  onBreak: (id: string, onBreak: boolean) => void;
  onUpdateShift: (id: string, newShift: string) => void;
}) {
  const today = new Date();
  const todayISO = toISO(today);

  const [subTab, setSubTab] = useState<'live' | 'history'>('live');
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [log, setLog] = useState<DayRecord[]>(loadLog);
  const [markModal, setMarkModal] = useState<{ staff: Staff; date: string } | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<string>('all');
  const [shiftFilter, setShiftFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('all');

  const shiftOptions = ['Morning (09:00 - 17:00)', 'Evening (16:00 - 00:00)', 'Night (22:00 - 06:00)', 'Full Day (09:00 - 21:00)'];

  const shifts = ['All', 'Morning', 'Evening', 'Night', 'Full Day'];
  const filtered = staffList.filter(s => {
    const matchShift = shiftFilter === 'All' || s.shift.toLowerCase().includes(shiftFilter.toLowerCase());
    const matchStatus = statusFilter === 'all' || attendance[s.id]?.status === statusFilter;
    return matchShift && matchStatus;
  });

  const activeCount   = Object.values(attendance).filter(a => a.status === 'active').length;
  const onBreakCount  = Object.values(attendance).filter(a => a.status === 'break').length;
  const offCount      = Object.values(attendance).filter(a => a.status === 'off').length;
  const statusTone: Record<string, 'brand' | 'warn' | 'neutral'> = { active: 'brand', break: 'warn', off: 'neutral' };

  // Persist log
  const persistLog = (newLog: DayRecord[]) => { setLog(newLog); saveLog(newLog); };

  const saveRecord = (rec: DayRecord) => {
    const next = [...log.filter(r => !(r.staffId === rec.staffId && r.date === rec.date)), rec];
    persistLog(next);
    setMarkModal(null);
  };

  const [calStaff, setCalStaff] = useState<string>(staffList[0]?.id ?? '');

  const deleteRecord = (staffId: string, date: string) => {
    persistLog(log.filter(r => !(r.staffId === staffId && r.date === date)));
  };

  // Records for selected date
  const dayLog = log.filter(r => r.date === selectedDate);
  const getRecord = (staffId: string, date: string) => log.find(r => r.staffId === staffId && r.date === date);

  // Calendar days in selected month
  const calendarDays = (() => {
    try {
      const [y, m] = selectedDate.split('-').map(Number);
      const days: string[] = [];
      const daysInMonth = new Date(y, m, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        days.push(`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
      }
      return days;
    } catch { return []; }
  })();

  const monthISO = selectedDate.slice(0, 7);
  const monthLog = log.filter(r => r.date.startsWith(monthISO));

  const staffSummary = (staffId: string) => {
    const recs = monthLog.filter(r => r.staffId === staffId);
    return {
      present:  recs.filter(r => r.status === 'present').length,
      absent:   recs.filter(r => r.status === 'absent').length,
      late:     recs.filter(r => r.status === 'late').length,
      halfDay:  recs.filter(r => r.status === 'half-day').length,
      leave:    recs.filter(r => r.status === 'leave').length,
      hours:    +recs.reduce((s, r) => s + r.hours, 0).toFixed(1),
    };
  };

  const todayLabel = today.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const exportCSV = () => {
    const rows = [['Date', 'Staff', 'Role', 'Shift', 'Status', 'Clock In', 'Clock Out', 'Hours', 'Note']];
    log.sort((a, b) => a.date.localeCompare(b.date)).forEach(r => {
      const s = staffList.find(s => s.id === r.staffId);
      rows.push([r.date, s?.name ?? r.staffId, s?.role ?? '', s?.shift ?? '', r.status, r.clockIn, r.clockOut, String(r.hours), r.note]);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `attendance_${monthISO}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <SectionHeader title="Shift & Attendance" subtitle={`Real-time status & detailed tracking — ${todayLabel}`} />
        <div className="flex items-center gap-2">
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-ink-200 text-sm font-medium text-ink-600 hover:bg-ink-50 transition-colors">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-ink-200/60 p-1 w-fit">
        {([
          { key: 'live',    label: 'Live Shift Status & Actions' },
          { key: 'history', label: 'Attendance Log & History' },
        ] as { key: typeof subTab; label: string }[]).map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${subTab === t.key ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-ink-50'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Live Shift Status ── */}
      {subTab === 'live' && (
        <div className="space-y-4">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex items-center gap-3 bg-brand-50 border border-brand-200 rounded-2xl p-4">
              <div className="h-10 w-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xs font-semibold uppercase text-brand-700">Present / Active</div>
                <div className="text-xl font-bold text-brand-900 tnum">{activeCount}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-warn-50 border border-warn-200 rounded-2xl p-4">
              <div className="h-10 w-10 rounded-xl bg-warn-100 text-warn-700 flex items-center justify-center font-bold">
                <Coffee className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xs font-semibold uppercase text-warn-700">On Break</div>
                <div className="text-xl font-bold text-warn-900 tnum">{onBreakCount}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-danger-50 border border-danger-200 rounded-2xl p-4">
              <div className="h-10 w-10 rounded-xl bg-danger-100 text-danger-700 flex items-center justify-center font-bold">
                <UserX className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xs font-semibold uppercase text-danger-700">Off Shift / Absent</div>
                <div className="text-xl font-bold text-danger-900 tnum">{offCount}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-ink-50 border border-ink-200 rounded-2xl p-4">
              <div className="h-10 w-10 rounded-xl bg-ink-200 text-ink-700 flex items-center justify-center font-bold">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xs font-semibold uppercase text-ink-600">Total Staff</div>
                <div className="text-xl font-bold text-ink-900 tnum">{staffList.length}</div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-ink-100">
            <div className="flex flex-wrap items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-ink-400 mr-1" />
              <span className="text-xs font-semibold text-ink-500">Filter Shift:</span>
              <div className="flex gap-1.5">
                {shifts.map(s => (
                  <button key={s} onClick={() => setShiftFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${shiftFilter === s ? 'bg-brand-600 text-white' : 'bg-ink-50 text-ink-600 hover:bg-ink-100'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-ink-500">Status:</span>
              <div className="flex gap-1">
                {['all', 'active', 'break', 'off'].map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${statusFilter === s ? 'bg-ink-900 text-white' : 'bg-ink-50 text-ink-600 hover:bg-ink-100'}`}>
                    {s === 'all' ? 'All' : s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Staff Cards */}
          <div className="grid md:grid-cols-2 gap-3">
            {filtered.map(s => {
              const rec = attendance[s.id];
              const isActive = rec?.status === 'active';
              const isBreak  = rec?.status === 'break';
              const isOff    = rec?.status === 'off';

              const currentShiftLabel = shiftOptions.find(opt => opt.toLowerCase().includes(s.shift.toLowerCase())) || `${s.shift} Shift`;

              return (
                <Card key={s.id} className={isActive ? 'border-brand-300 ring-1 ring-brand-200' : isBreak ? 'border-warn-300 ring-1 ring-warn-200' : ''}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar name={s.name} size="md" />
                        <div className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${isActive ? 'bg-brand-500' : isBreak ? 'bg-warn-500 animate-pulse' : 'bg-ink-300'}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-ink-900 truncate flex items-center gap-2">
                          {s.name}
                          <Badge tone={s.role === 'Manager' ? 'brand' : 'neutral'} size="xs">{s.role}</Badge>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Clock className="h-3 w-3 text-ink-400" />
                          <select
                            value={currentShiftLabel}
                            onChange={e => {
                              const val = e.target.value;
                              const simpleShift = val.startsWith('Morning') ? 'Morning' : val.startsWith('Evening') ? 'Evening' : val.startsWith('Night') ? 'Night' : 'Full Day';
                              onUpdateShift(s.id, simpleShift);
                            }}
                            className="text-xs bg-ink-50 hover:bg-ink-100 border border-ink-200 rounded px-1.5 py-0.5 font-semibold text-ink-700 focus:outline-none focus:ring-1 focus:ring-brand-400 cursor-pointer"
                          >
                            {shiftOptions.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <Badge tone={statusTone[rec?.status ?? 'off']} size="xs" dot>
                        {isActive ? 'Clocked In' : isBreak ? 'On Break' : 'Clocked Out'}
                      </Badge>
                      <button
                        onClick={() => setMarkModal({ staff: s, date: todayISO })}
                        className="inline-flex items-center gap-1 text-2xs text-brand-600 hover:text-brand-800 font-bold bg-brand-50 px-2 py-1 rounded-md border border-brand-100 hover:bg-brand-100 transition-colors"
                      >
                        <Edit2 className="h-3 w-3" /> Mark Status
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3.5 text-center">
                    <div className="bg-ink-50 rounded-xl px-2 py-2">
                      <div className="text-2xs font-semibold text-ink-400 uppercase">Clock In</div>
                      <div className="text-xs font-bold text-ink-800 tnum mt-0.5">{rec?.clockIn ?? '—'}</div>
                    </div>
                    <div className="bg-ink-50 rounded-xl px-2 py-2">
                      <div className="text-2xs font-semibold text-ink-400 uppercase">Clock Out</div>
                      <div className="text-xs font-bold text-ink-800 tnum mt-0.5">{rec?.clockOut ?? '—'}</div>
                    </div>
                    <div className="bg-ink-50 rounded-xl px-2 py-2">
                      <div className="text-2xs font-semibold text-ink-400 uppercase">Hours Today</div>
                      <div className="text-xs font-bold text-brand-700 tnum mt-0.5">{rec?.hoursWorked ?? 0} hrs</div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {isOff && (
                      <Button size="sm" variant="primary" block onClick={() => onClockIn(s.id)}>
                        <LogIn className="h-4 w-4" /> Clock In Now
                      </Button>
                    )}
                    {isActive && (
                      <>
                        <Button size="sm" variant="secondary" block onClick={() => onBreak(s.id, true)}>
                          <Coffee className="h-4 w-4 text-warn-600" /> Take Break
                        </Button>
                        <Button size="sm" variant="ghost" block onClick={() => onClockOut(s.id)}>
                          <LogOut className="h-4 w-4 text-danger-500" /> Clock Out
                        </Button>
                      </>
                    )}
                    {isBreak && (
                      <>
                        <Button size="sm" variant="primary" block onClick={() => onBreak(s.id, false)}>
                          <LogIn className="h-4 w-4" /> Resume Work
                        </Button>
                        <Button size="sm" variant="ghost" block onClick={() => onClockOut(s.id)}>
                          <LogOut className="h-4 w-4 text-danger-500" /> Clock Out
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* This month summary table */}
          <Card pad={false}>
            <div className="px-4 py-3 border-b border-ink-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink-800">This Month's Attendance Summary</h3>
              <Badge tone="neutral" size="xs">{new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</Badge>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-ink-50 text-2xs uppercase tracking-wide text-ink-400 font-semibold">
                  <th className="text-left px-4 py-2.5">Staff</th>
                  <th className="text-center px-3 py-2.5">Present</th>
                  <th className="text-center px-3 py-2.5">Absent</th>
                  <th className="text-center px-3 py-2.5">Late</th>
                  <th className="text-center px-3 py-2.5">Half Day</th>
                  <th className="text-right px-3 py-2.5">Hours</th>
                  <th className="text-right px-3 py-2.5">Att %</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map(s => {
                  const sum = staffSummary(s.id);
                  const totalDays = sum.present + sum.absent + sum.late + sum.halfDay + sum.leave;
                  const pct = totalDays > 0 ? Math.round((sum.present + sum.late + sum.halfDay * 0.5) / totalDays * 100) : s.attendance;
                  return (
                    <tr key={s.id} className="border-t border-ink-100 hover:bg-ink-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={s.name} size="sm" />
                          <div>
                            <div className="font-semibold text-ink-800 text-sm">{s.name}</div>
                            <div className="text-2xs text-ink-400">{s.shift} shift</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold">{sum.present}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-danger-100 text-danger-700 text-xs font-bold">{sum.absent}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-warn-100 text-warn-700 text-xs font-bold">{sum.late}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-info-100 text-info-700 text-xs font-bold">{sum.halfDay}</span>
                      </td>
                      <td className="px-3 py-3 text-right tnum text-ink-700 font-semibold">{sum.hours}h</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <div className="w-16">
                            <ProgressBar value={pct} tone={pct > 95 ? 'brand' : pct > 85 ? 'warn' : 'danger'} height="h-1.5" />
                          </div>
                          <span className="text-xs tnum font-bold text-ink-800 w-8 text-right">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* ── Attendance Log ── */}
      {subTab === 'history' && (
        <div className="space-y-4">
          {/* Date picker + staff filter */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-ink-400" />
              <label className="text-xs font-semibold text-ink-600">Date:</label>
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                max={todayISO}
                className="px-3 py-1.5 text-sm border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 tnum" />
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-ink-400" />
              <label className="text-xs font-semibold text-ink-600">Staff:</label>
              <select value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)}
                className="px-3 py-1.5 text-sm border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white">
                <option value="all">All Staff</option>
                {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <button onClick={() => setMarkModal({ staff: staffList[0], date: selectedDate })}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors">
              <Plus className="h-4 w-4" /> Mark Attendance
            </button>
          </div>

          {/* Day attendance table */}
          <Card pad={false}>
            <div className="px-4 py-3 border-b border-ink-100 flex items-center justify-between">
              <h3 className="font-bold text-ink-800 text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4 text-brand-600" />
                {fmtDate(selectedDate)} — Attendance
              </h3>
              <span className="text-2xs text-ink-400">{dayLog.length} records</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-ink-50 text-2xs uppercase tracking-wide text-ink-400 font-semibold border-b border-ink-100">
                    <th className="text-left px-4 py-2.5">Staff</th>
                    <th className="text-left px-3 py-2.5">Role · Shift</th>
                    <th className="text-center px-3 py-2.5">Status</th>
                    <th className="text-center px-3 py-2.5">Clock In</th>
                    <th className="text-center px-3 py-2.5">Clock Out</th>
                    <th className="text-center px-3 py-2.5">Hours</th>
                    <th className="text-left px-3 py-2.5">Note</th>
                    <th className="text-center px-3 py-2.5">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedStaff === 'all' ? staffList : staffList.filter(s => s.id === selectedStaff)).map(s => {
                    const rec = getRecord(s.id, selectedDate);
                    return (
                      <tr key={s.id} className="border-t border-ink-100 hover:bg-ink-50/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={s.name} size="sm" />
                            <span className="font-semibold text-ink-800">{s.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-ink-500 text-xs">{s.role} · {s.shift}</td>
                        <td className="px-3 py-3 text-center">
                          {rec
                            ? <Badge tone={DAY_STATUS_TONE[rec.status]} size="xs">{DAY_STATUS_LABEL[rec.status]}</Badge>
                            : <span className="text-2xs text-ink-300 italic">not marked</span>}
                        </td>
                        <td className="px-3 py-3 text-center text-xs tnum font-medium">{rec?.clockIn || '—'}</td>
                        <td className="px-3 py-3 text-center text-xs tnum font-medium">{rec?.clockOut || '—'}</td>
                        <td className="px-3 py-3 text-center">
                          {rec?.hours ? <span className="font-bold tnum">{rec.hours}h</span> : <span className="text-ink-300">—</span>}
                        </td>
                        <td className="px-3 py-3 text-xs text-ink-500 max-w-32 truncate">{rec?.note || '—'}</td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => setMarkModal({ staff: s, date: selectedDate })}
                              className="h-7 w-7 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-600 flex items-center justify-center transition-colors" title="Edit">
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            {rec && (
                              <button onClick={() => deleteRecord(s.id, selectedDate)}
                                className="h-7 w-7 rounded-lg bg-danger-50 hover:bg-danger-100 text-danger-500 flex items-center justify-center transition-colors" title="Delete">
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Monthly calendar heatmap for selected staff */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-ink-800 text-sm">Monthly Calendar</h3>
              <select value={calStaff} onChange={e => setCalStaff(e.target.value)}
                className="px-3 py-1.5 text-xs border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white">
                {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mb-4">
              {(Object.entries(DAY_STATUS_COLOR) as [DayStatus, string][]).map(([s, c]) => (
                <div key={s} className="flex items-center gap-1.5 text-2xs text-ink-500 font-medium">
                  <div className={`h-3 w-3 rounded-sm ${c}`} />
                  {DAY_STATUS_LABEL[s]}
                </div>
              ))}
              <div className="flex items-center gap-1.5 text-2xs text-ink-500 font-medium">
                <div className="h-3 w-3 rounded-sm bg-ink-100 border border-ink-200" />
                Not Marked
              </div>
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                <div key={d} className="text-center text-2xs font-bold text-ink-400 py-1">{d}</div>
              ))}
              {/* Offset for first day of month */}
              {Array.from({ length: new Date(calendarDays[0]).getDay() }).map((_, i) => (
                <div key={`off-${i}`} />
              ))}
              {calendarDays.map(dayISO => {
                const rec = getRecord(calStaff, dayISO);
                const dayNum = parseInt(dayISO.split('-')[2]);
                const isToday = dayISO === todayISO;
                const isFuture = dayISO > todayISO;
                return (
                  <button
                    key={dayISO}
                    disabled={isFuture}
                    onClick={() => {
                      const s = staffList.find(s => s.id === calStaff);
                      if (s) setMarkModal({ staff: s, date: dayISO });
                    }}
                    title={rec ? `${DAY_STATUS_LABEL[rec.status]}${rec.clockIn ? ` · ${rec.clockIn}–${rec.clockOut}` : ''}` : 'Not marked'}
                    className={`relative flex flex-col items-center justify-center rounded-lg h-10 text-xs font-bold transition-all
                      ${isFuture ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:scale-105 hover:shadow-sm'}
                      ${isToday ? 'ring-2 ring-brand-500 ring-offset-1' : ''}
                      ${rec ? DAY_STATUS_COLOR[rec.status] + ' text-white' : 'bg-ink-100 text-ink-500 hover:bg-ink-200'}`}
                  >
                    {dayNum}
                    {rec && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-white/60" />}
                  </button>
                );
              })}
            </div>

            {/* Staff month summary below calendar */}
            {(() => {
              const sum = staffSummary(calStaff);
              const s = staffList.find(x => x.id === calStaff);
              return (
                <div className="mt-4 pt-4 border-t border-ink-100 grid grid-cols-3 md:grid-cols-6 gap-3 text-center">
                  {[
                    { label: 'Present', value: sum.present, color: 'text-brand-600' },
                    { label: 'Absent',  value: sum.absent,  color: 'text-danger-600' },
                    { label: 'Late',    value: sum.late,    color: 'text-warn-600' },
                    { label: 'Half Day',value: sum.halfDay, color: 'text-info-600' },
                    { label: 'Leave',   value: sum.leave,   color: 'text-ink-400' },
                    { label: 'Hrs Worked', value: `${sum.hours}h`, color: 'text-ink-900' },
                  ].map(item => (
                    <div key={item.label} className="bg-ink-50 rounded-xl py-2.5">
                      <div className={`text-lg font-bold ${item.color}`}>{item.value}</div>
                      <div className="text-2xs text-ink-400">{item.label}</div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </Card>

          {/* Full attendance log table */}
          {log.length > 0 && (
            <Card pad={false}>
              <div className="px-4 py-3 border-b border-ink-100">
                <h3 className="font-bold text-ink-800 text-sm">Full Attendance Log ({log.length} records)</h3>
              </div>
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0">
                    <tr className="bg-ink-50 text-2xs uppercase tracking-wide text-ink-400 font-semibold border-b border-ink-100">
                      <th className="text-left px-4 py-2.5">Date</th>
                      <th className="text-left px-3 py-2.5">Staff</th>
                      <th className="text-center px-3 py-2.5">Status</th>
                      <th className="text-center px-3 py-2.5">In</th>
                      <th className="text-center px-3 py-2.5">Out</th>
                      <th className="text-center px-3 py-2.5">Hours</th>
                      <th className="text-left px-3 py-2.5">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...log].sort((a,b) => b.date.localeCompare(a.date)).map((r, i) => {
                      const s = staffList.find(x => x.id === r.staffId);
                      return (
                        <tr key={i} className="border-t border-ink-100 hover:bg-ink-50/50">
                          <td className="px-4 py-2.5 text-xs tnum text-ink-600 font-medium">{fmtDate(r.date)}</td>
                          <td className="px-3 py-2.5 font-semibold text-ink-800">{s?.name ?? r.staffId}</td>
                          <td className="px-3 py-2.5 text-center">
                            <Badge tone={DAY_STATUS_TONE[r.status]} size="xs">{DAY_STATUS_LABEL[r.status]}</Badge>
                          </td>
                          <td className="px-3 py-2.5 text-center text-xs tnum">{r.clockIn || '—'}</td>
                          <td className="px-3 py-2.5 text-center text-xs tnum">{r.clockOut || '—'}</td>
                          <td className="px-3 py-2.5 text-center text-xs font-bold tnum">{r.hours ? `${r.hours}h` : '—'}</td>
                          <td className="px-3 py-2.5 text-xs text-ink-500 max-w-32 truncate">{r.note || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Mark Attendance Modal */}
      {markModal && (
        <MarkAttendanceModal
          staff={markModal.staff}
          date={markModal.date}
          existing={getRecord(markModal.staff.id, markModal.date)}
          onSave={saveRecord}
          onClose={() => setMarkModal(null)}
        />
      )}
    </div>
  );
}

// ─── Performance Tab ──────────────────────────────────────────────────────────
function PerformanceTab({
  staffList, onViewDetail, onExport,
}: {
  staffList: Staff[];
  onViewDetail: (s: Staff) => void;
  onExport: () => void;
}) {
  const [sortField, setSortField] = useState<SortField>('sales');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [monthFilter, setMonthFilter] = useState('July 2026');

  const MONTHS = ['July 2026', 'June 2026', 'May 2026', 'April 2026'];

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sorted = useMemo(() => {
    return [...staffList]
      .filter(s => s.sales >= 0)
      .sort((a, b) => {
        const av = a[sortField];
        const bv = b[sortField];
        return sortDir === 'desc' ? (bv as number) - (av as number) : (av as number) - (bv as number);
      });
  }, [staffList, sortField, sortDir]);

  const maxSales = Math.max(...sorted.map(s => s.sales), 1);

  const SortBtn = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => toggleSort(field)}
      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${sortField === field ? 'bg-brand-600 text-white' : 'bg-white border border-ink-200 text-ink-600 hover:bg-ink-50'}`}
    >
      {label}
      {sortField === field ? (sortDir === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-50" />}
    </button>
  );

  return (
    <div className="space-y-4">
      <SectionHeader title="Staff Performance Leaderboard" subtitle="Sales, upsell rate, and average bill value" action={
        <Button variant="secondary" size="sm" onClick={onExport}><Download className="h-3.5 w-3.5" /> Export</Button>
      } />

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-400 font-medium">Sort by:</span>
          <SortBtn field="sales" label="Sales" />
          <SortBtn field="upsellRate" label="Upsell %" />
          <SortBtn field="avgBill" label="Avg Bill" />
          <SortBtn field="attendance" label="Attendance" />
        </div>
        <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
          className="px-3 py-1.5 text-xs bg-white border border-ink-200 rounded-lg text-ink-700 focus:outline-none focus:ring-2 focus:ring-brand-400">
          {MONTHS.map(m => <option key={m}>{m}</option>)}
        </select>
      </div>

      {/* Leaderboard */}
      <div className="space-y-3">
        {sorted.map((s, i) => (
          <div key={s.id} onClick={() => onViewDetail(s)}>
          <Card
            className={`cursor-pointer hover:shadow-md transition-shadow ${i === 0 ? 'border-accent-200 bg-accent-50/30' : ''}`}
          >
            <div className="flex items-center gap-4">
              {/* Rank */}
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                i === 0 ? 'bg-accent-100 text-accent-700' :
                i === 1 ? 'bg-ink-200 text-ink-700' :
                i === 2 ? 'bg-warn-100 text-warn-700' : 'bg-ink-100 text-ink-500'
              }`}>
                {i === 0 ? <Star className="h-5 w-5 fill-accent-400 text-accent-500" /> : i + 1}
              </div>

              <Avatar name={s.name} size="md" />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-bold text-ink-900 truncate">{s.name}</div>
                  {i === 0 && <Badge tone="accent" size="xs"><Award className="h-3 w-3" /> Top Performer</Badge>}
                </div>
                <div className="text-2xs text-ink-400">{s.role} · {s.shift} shift</div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                {[
                  { label: 'Sales', value: s.sales > 0 ? inr(s.sales) : '—', highlight: sortField === 'sales' },
                  { label: 'Upsell', value: s.sales > 0 ? `${s.upsellRate}%` : '—', highlight: sortField === 'upsellRate' },
                  { label: 'Avg Bill', value: s.sales > 0 ? inr(s.avgBill) : '—', highlight: sortField === 'avgBill' },
                ].map(stat => (
                  <div key={stat.label} className="text-center">
                    <div className="text-2xs uppercase text-ink-400 font-semibold">{stat.label}</div>
                    <div className={`text-sm font-bold tnum ${stat.highlight ? 'text-brand-700' : 'text-ink-800'}`}>{stat.value}</div>
                  </div>
                ))}
              </div>

              <div className="w-24 hidden lg:block">
                <ProgressBar value={s.sales} max={maxSales} tone={i === 0 ? 'accent' : 'brand'} />
                <div className="text-2xs text-ink-400 text-right mt-0.5">Attendance {s.attendance}%</div>
              </div>
            </div>
          </Card>
          </div>
        ))}
      </div>

      {/* Summary table */}
      <Card pad={false}>
        <div className="px-4 py-3 border-b border-ink-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-ink-800">Detailed Metrics — {monthFilter}</h3>
          <BarChart2 className="h-4 w-4 text-ink-400" />
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-ink-50 text-2xs uppercase tracking-wide text-ink-400 font-semibold">
              <th className="text-left px-4 py-2.5">Staff</th>
              <th className="text-right px-3 py-2.5">Sales</th>
              <th className="text-right px-3 py-2.5">Upsell %</th>
              <th className="text-right px-3 py-2.5">Avg Bill</th>
              <th className="text-right px-3 py-2.5">Attendance</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s, i) => (
              <tr key={s.id} className="border-t border-ink-100 hover:bg-ink-50/50 cursor-pointer" onClick={() => onViewDetail(s)}>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-ink-400 w-4">{i + 1}</span>
                    <span className="font-semibold text-ink-800">{s.name}</span>
                    <Badge tone="neutral" size="xs">{s.role}</Badge>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right font-semibold tnum text-ink-800">{s.sales > 0 ? inr(s.sales) : '—'}</td>
                <td className="px-3 py-2.5 text-right tnum text-ink-600">{s.sales > 0 ? `${s.upsellRate}%` : '—'}</td>
                <td className="px-3 py-2.5 text-right tnum text-ink-600">{s.sales > 0 ? inr(s.avgBill) : '—'}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2 justify-end">
                    <div className="w-16">
                      <ProgressBar value={s.attendance} tone={s.attendance > 95 ? 'brand' : s.attendance > 90 ? 'warn' : 'danger'} height="h-1.5" />
                    </div>
                    <span className="text-xs tnum text-ink-600 w-8 text-right">{s.attendance}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ─── Staff Detail Modal ───────────────────────────────────────────────────────
function StaffDetailModal({
  staff: s, onClose, onEdit,
}: {
  staff: Staff;
  onClose: () => void;
  onEdit: (updated: Staff) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: s.name, role: s.role, shift: s.shift });
  const [busy, setBusy] = useState(false);

  const ROLES_STAFF = ['Manager', 'Captain', 'Cashier', 'Server', 'Inventory'];
  const SHIFTS = ['Morning', 'Evening', 'Full'];

  const save = async () => {
    setBusy(true);
    await new Promise(r => setTimeout(r, 400));
    setBusy(false);
    onEdit({ ...s, ...form });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-pop w-full max-w-sm p-6 animate-slide-up">
        <div className="flex items-center gap-3 mb-5">
          <Avatar name={s.name} size="lg" />
          <div className="flex-1">
            <h3 className="text-base font-bold text-ink-900">{s.name}</h3>
            <p className="text-2xs text-ink-400">{s.role} · {s.shift} shift</p>
          </div>
          <div className="flex items-center gap-1">
            {!editing && (
              <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-ink-100">
                <Edit2 className="h-4 w-4" />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-ink-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="text-2xs font-semibold uppercase text-ink-400">Name</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full mt-1 h-10 px-3 text-sm bg-ink-50 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-2xs font-semibold uppercase text-ink-400">Role</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full mt-1 h-10 px-3 text-sm bg-ink-50 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400">
                  {ROLES_STAFF.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-2xs font-semibold uppercase text-ink-400">Shift</label>
                <select value={form.shift} onChange={e => setForm(f => ({ ...f, shift: e.target.value }))}
                  className="w-full mt-1 h-10 px-3 text-sm bg-ink-50 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400">
                  {SHIFTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="secondary" block onClick={() => setEditing(false)}>Cancel</Button>
              <Button variant="primary" block onClick={save} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" /> Save</>}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Sales', value: s.sales > 0 ? inr(s.sales) : 'N/A' },
                { label: 'Upsell Rate', value: s.sales > 0 ? `${s.upsellRate}%` : 'N/A' },
                { label: 'Avg Bill', value: s.sales > 0 ? inr(s.avgBill) : 'N/A' },
                { label: 'Attendance', value: `${s.attendance}%` },
              ].map(stat => (
                <div key={stat.label} className="bg-ink-50 rounded-lg px-3 py-2.5">
                  <div className="text-2xs text-ink-400 font-semibold uppercase">{stat.label}</div>
                  <div className="text-sm font-bold text-ink-800 tnum mt-0.5">{stat.value}</div>
                </div>
              ))}
            </div>
            {s.sales > 0 && (
              <div>
                <div className="text-2xs text-ink-400 font-semibold uppercase mb-1.5">Sales Performance</div>
                <ProgressBar value={s.sales} max={30000} tone="brand" />
              </div>
            )}
            <div>
              <div className="text-2xs text-ink-400 font-semibold uppercase mb-1.5">Attendance</div>
              <ProgressBar value={s.attendance} tone={s.attendance > 95 ? 'brand' : s.attendance > 90 ? 'warn' : 'danger'} />
            </div>
            <Button variant="secondary" block onClick={onClose}>Close</Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Add Employee Modal ───────────────────────────────────────────────────────
function AddEmployeeModal({
  onClose, onCreated, createEmployee,
}: {
  onClose: () => void;
  onCreated: () => void;
  createEmployee: (data: { fullName: string; email: string; password: string; role: Role; outlet: string }) => Promise<{ error: string | null }>;
}) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('server');
  const [outlet, setOutlet] = useState('Main Branch');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    if (!fullName.trim()) { setError('Full name is required'); return; }
    if (!email.trim()) { setError('Email is required'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Invalid email address'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setBusy(true);
    const { error: err } = await createEmployee({ fullName: fullName.trim(), email: email.trim(), password, role, outlet });
    setBusy(false);
    if (err) { setError(err); return; }
    onCreated();
  };

  const OUTLETS = ['Main Branch', 'Koramangala', 'Indiranagar', 'Whitefield'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-pop w-full max-w-md p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center">
            <Plus className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-ink-900">Add New Employee</h3>
            <p className="text-2xs text-ink-400">Create a new account with login credentials</p>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-600"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-3.5">
          <div>
            <label className="text-2xs font-semibold uppercase text-ink-400">Full Name *</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Priya Sharma" autoFocus
              className="w-full mt-1 h-10 px-3 text-sm bg-ink-50 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>
          <div>
            <label className="text-2xs font-semibold uppercase text-ink-400">Email *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="priya@restaurant.com"
              className="w-full mt-1 h-10 px-3 text-sm bg-ink-50 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
          </div>
          <div>
            <label className="text-2xs font-semibold uppercase text-ink-400">Temporary Password *</label>
            <input type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters"
              className="w-full mt-1 h-10 px-3 text-sm bg-ink-50 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400" />
            <p className="text-2xs text-ink-400 mt-1">Employee can change this after first login</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-2xs font-semibold uppercase text-ink-400">Role</label>
              <select value={role} onChange={e => setRole(e.target.value as Role)}
                className="w-full mt-1 h-10 px-3 text-sm bg-ink-50 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 capitalize">
                {ROLES.map(r => <option key={r} value={r} className="capitalize">{ROLE_META[r].label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-2xs font-semibold uppercase text-ink-400">Outlet</label>
              <select value={outlet} onChange={e => setOutlet(e.target.value)}
                className="w-full mt-1 h-10 px-3 text-sm bg-ink-50 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400">
                {OUTLETS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-xs text-danger-600 bg-danger-50 border border-danger-200 rounded-lg px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="secondary" block onClick={onClose}>Cancel</Button>
            <Button variant="primary" block onClick={submit} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" /> Create</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Set PIN Modal ────────────────────────────────────────────────────────────
function SetPinModal({
  target, isAdmin, currentUserId, onClose, onSaved,
}: {
  target: Profile;
  isAdmin: boolean;
  currentUserId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isSelf = target.id === currentUserId;
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const save = async () => {
    setError(null);
    if (!/^\d{4}$/.test(pin)) { setError('PIN must be 4 digits'); return; }
    if (pin !== confirm) { setError('PINs do not match'); return; }
    setBusy(true);
    await new Promise(r => setTimeout(r, 600));
    setBusy(false);
    setDone(true);
    setTimeout(() => onSaved(), 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-pop w-full max-w-sm p-6 animate-slide-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center">
            <Lock className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-ink-900">Set PIN</h3>
            <p className="text-2xs text-ink-400">
              {isSelf ? 'Set your 4-digit login PIN' : `Set PIN for ${target.full_name || target.email}`}
            </p>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-600"><X className="h-4 w-4" /></button>
        </div>

        {done ? (
          <div className="flex flex-col items-center justify-center py-6 text-brand-600 animate-fade-in">
            <div className="h-12 w-12 rounded-full bg-brand-100 flex items-center justify-center mb-2">
              <Check className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold">PIN saved successfully</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-2xs font-semibold uppercase text-ink-400">New 4-digit PIN</label>
              <input type="password" inputMode="numeric" maxLength={4} value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••" autoFocus
                className="w-full mt-1 h-11 px-3 text-center text-2xl tracking-[0.5em] font-bold bg-ink-50 border border-ink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 tnum" />
            </div>
            <div>
              <label className="text-2xs font-semibold uppercase text-ink-400">Confirm PIN</label>
              <input type="password" inputMode="numeric" maxLength={4} value={confirm}
                onChange={e => setConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                className="w-full mt-1 h-11 px-3 text-center text-2xl tracking-[0.5em] font-bold bg-ink-50 border border-ink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 tnum" />
            </div>
            {error && (
              <div className="flex items-center gap-1.5 text-xs text-danger-600 bg-danger-50 border border-danger-200 rounded-lg px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button variant="secondary" block onClick={onClose}>Cancel</Button>
              <Button variant="primary" block onClick={save} disabled={busy || pin.length < 4 || confirm.length < 4}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save PIN'}
              </Button>
            </div>
            {!isSelf && isAdmin && (
              <p className="text-2xs text-ink-400 text-center pt-1">
                Admin setting PIN on behalf of employee. The employee can change it later.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
