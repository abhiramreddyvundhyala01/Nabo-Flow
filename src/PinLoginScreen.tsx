'use client';

// ===== Nabo Flow — PIN Login Screen (POS-style, no backend) =====
import { useState, useEffect, useCallback } from 'react';
import {
  Store, ChevronDown, Delete, Loader2, AlertCircle,
  Users, ArrowLeft, Search, Info,
} from 'lucide-react';
import { useAuth, type EmployeeOption, DEMO_EMPLOYEES } from './auth';

const ROLE_TONE: Record<string, string> = {
  admin:     'bg-danger-50 text-danger-700',
  manager:   'bg-brand-50 text-brand-700',
  cashier:   'bg-info-50 text-info-700',
  server:    'bg-warn-50 text-warn-700',
  inventory: 'bg-ink-100 text-ink-600',
};

export function PinLoginScreen() {
  const { fetchEmployees, pinLogin } = useAuth();
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selected, setSelected] = useState<EmployeeOption | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingEmps, setLoadingEmps] = useState(true);
  const [showHints, setShowHints] = useState(false);

  useEffect(() => {
    fetchEmployees().then(({ employees }) => {
      setEmployees(employees);
      setLoadingEmps(false);
    });
  }, [fetchEmployees]);

  const submit = useCallback(async (fullPin: string) => {
    if (!selected) { setError('Please select an employee'); return; }
    setBusy(true);
    setError(null);
    const { error: err } = await pinLogin(selected.id, fullPin);
    setBusy(false);
    if (err) {
      setError(err);
      setPin('');
    }
  }, [selected, pinLogin]);

  const onKey = (digit: string) => {
    if (pin.length >= 4 || busy) return;
    const next = pin + digit;
    setPin(next);
    setError(null);
    if (next.length === 4) {
      setTimeout(() => submit(next), 150);
    }
  };

  const onDelete = () => { setPin(p => p.slice(0, -1)); setError(null); };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-ink-900 p-4">
      {/* Ambient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-brand-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-info-600/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Brand */}
        <div className="flex flex-col items-center mb-6">
          <div className="h-14 w-14 rounded-2xl bg-brand-500 flex items-center justify-center shadow-xl mb-3">
            <Store className="h-7 w-7 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Nabo Flow</h1>
          <p className="text-sm text-ink-400 mt-1">Select your profile &amp; enter PIN</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6">
          {!selected ? (
            <EmployeePicker
              employees={employees}
              loading={loadingEmps}
              onSelect={(emp) => { setSelected(emp); setError(null); }}
            />
          ) : (
            <PinPad
              employee={selected}
              pin={pin}
              error={error}
              busy={busy}
              onKey={onKey}
              onDelete={onDelete}
              onBack={() => { setSelected(null); setPin(''); setError(null); }}
            />
          )}
        </div>

        {/* Demo PIN hints toggle */}
        <div className="mt-4 flex flex-col items-center gap-2">
          <button
            onClick={() => setShowHints(h => !h)}
            className="text-2xs text-ink-500 hover:text-brand-400 transition-colors flex items-center gap-1"
          >
            <Info className="h-3 w-3" />
            {showHints ? 'Hide' : 'Show'} demo credentials
          </button>

          {showHints && (
            <div className="w-full bg-ink-800/80 backdrop-blur rounded-xl p-3 text-2xs text-ink-300 space-y-1.5 border border-ink-700 animate-fade-in">
              <p className="text-ink-400 font-semibold mb-2 uppercase tracking-wide">Demo Credentials</p>
              {DEMO_EMPLOYEES.map(emp => (
                <div key={emp.id} className="flex items-center justify-between">
                  <span className="font-medium text-white">{emp.full_name}</span>
                  <span className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-2xs font-bold ${ROLE_TONE[emp.role] ?? 'bg-ink-100 text-ink-600'}`}>
                      {emp.role}
                    </span>
                    <span className="font-mono text-brand-400">PIN: {emp.pin}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== Employee Picker Dropdown =====
function EmployeePicker({
  employees, loading, onSelect,
}: {
  employees: EmployeeOption[];
  loading: boolean;
  onSelect: (emp: EmployeeOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = employees.filter(e => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return e.full_name.toLowerCase().includes(q) || e.role.toLowerCase().includes(q) || (e.outlet ?? '').toLowerCase().includes(q);
  });

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-4">
        <Users className="h-8 w-8 text-brand-500 mx-auto mb-2" />
        <h2 className="text-base font-bold text-ink-900">Select Employee</h2>
        <p className="text-2xs text-ink-400 mt-0.5">Choose your profile to continue</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-ink-400">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading employees...
        </div>
      ) : employees.length === 0 ? (
        <div className="text-center py-8 text-ink-400">
          <AlertCircle className="h-6 w-6 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No employees found.</p>
        </div>
      ) : (
        <div className="relative">
          <button
            onClick={() => setOpen(o => !o)}
            className="w-full h-12 px-4 bg-ink-50 border border-ink-200 rounded-xl flex items-center justify-between text-left transition-all hover:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            <span className="text-sm text-ink-400">Tap to select employee...</span>
            <ChevronDown className={`h-4 w-4 text-ink-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute z-20 mt-1 w-full bg-white rounded-xl shadow-pop border border-ink-200 max-h-72 overflow-hidden flex flex-col">
                <div className="relative p-2 border-b border-ink-100">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name, role, outlet..."
                    autoFocus
                    className="w-full pl-9 pr-3 py-2 text-sm bg-ink-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>
                <div className="overflow-y-auto">
                  {filtered.map(emp => (
                    <button
                      key={emp.id}
                      onClick={() => { onSelect(emp); setOpen(false); setSearch(''); }}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-brand-50 transition-colors text-left border-b border-ink-50 last:border-0"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">
                          {emp.full_name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-ink-800">{emp.full_name}</div>
                          <div className="text-2xs text-ink-400">{emp.outlet}</div>
                        </div>
                      </div>
                      <span className={`text-2xs font-bold px-2 py-0.5 rounded-full capitalize ${ROLE_TONE[emp.role] ?? 'bg-ink-100 text-ink-600'}`}>
                        {emp.role}
                      </span>
                    </button>
                  ))}
                  {filtered.length === 0 && (
                    <div className="text-center py-4 text-2xs text-ink-400">No matches</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ===== PIN Pad =====
function PinPad({
  employee, pin, error, busy, onKey, onDelete, onBack,
}: {
  employee: EmployeeOption;
  pin: string;
  error: string | null;
  busy: boolean;
  onKey: (d: string) => void;
  onDelete: () => void;
  onBack: () => void;
}) {
  return (
    <div className="animate-slide-up">
      {/* Employee header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={onBack}
          className="h-8 w-8 rounded-lg bg-ink-100 text-ink-500 hover:bg-ink-200 flex items-center justify-center transition-colors"
          title="Back to employee list"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="h-10 w-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold">
          {employee.full_name.split(' ').map(w => w[0]).slice(0, 2).join('')}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-ink-800 truncate">{employee.full_name}</div>
          <div className="text-2xs text-ink-400 capitalize">{employee.role} · {employee.outlet}</div>
        </div>
      </div>

      {/* PIN dots */}
      <div className="flex items-center justify-center gap-3 mb-5">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`h-3.5 w-3.5 rounded-full border-2 transition-all duration-150
              ${i < pin.length
                ? 'bg-brand-500 border-brand-500 scale-110'
                : error
                  ? 'border-danger-300'
                  : 'border-ink-300'}`}
          />
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center justify-center gap-1.5 text-xs text-danger-600 mb-4 animate-fade-in">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Numeric keypad */}
      <div className="grid grid-cols-3 gap-2.5">
        {['1','2','3','4','5','6','7','8','9'].map(d => (
          <KeypadButton key={d} digit={d} onPress={onKey} disabled={busy} />
        ))}
        <div />
        <KeypadButton digit="0" onPress={onKey} disabled={busy} />
        <button
          onClick={onDelete}
          disabled={busy || pin.length === 0}
          className="h-14 rounded-xl bg-ink-100 text-ink-600 hover:bg-ink-200 active:bg-ink-300 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Delete className="h-5 w-5" />
        </button>
      </div>

      {busy && (
        <div className="flex items-center justify-center mt-4 text-2xs text-brand-600">
          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Verifying PIN...
        </div>
      )}
    </div>
  );
}

function KeypadButton({ digit, onPress, disabled }: { digit: string; onPress: (d: string) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => onPress(digit)}
      disabled={disabled}
      className="h-14 rounded-xl bg-ink-50 hover:bg-brand-50 active:bg-brand-100 text-ink-800 hover:text-brand-700 text-xl font-bold flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {digit}
    </button>
  );
}
