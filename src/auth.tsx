'use client';

// ===== Nabo Flow — Auth + RBAC + Types (fully local, no Supabase) =====
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { ModuleKey } from './types';
import { isSupabaseConfigured, supabase } from './supabase';

// ─── Role & Profile types ─────────────────────────────────────────────────────
export type Role = 'admin' | 'manager' | 'cashier' | 'server' | 'inventory';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  outlet: string;
  active: boolean;
}

// ─── RBAC matrix ──────────────────────────────────────────────────────────────
export const ROLE_ACCESS: Record<Role, ModuleKey[]> = {
  admin:     ['pos','menu','inventory','purchase','online','reports','staff','referral','loyalty','mobile'],
  manager:   ['pos','menu','inventory','purchase','online','reports','staff','referral','loyalty','mobile'],
  cashier:   ['pos','online','referral','loyalty','mobile'],
  server:    ['pos','online','mobile'],
  inventory: ['inventory','purchase','reports'],
};

const SS_ROLE_KEY = 'nabo_role_permissions';

export function getRoleAccess(): Record<Role, ModuleKey[]> {
  try {
    const raw = sessionStorage.getItem(SS_ROLE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return ROLE_ACCESS;
}

export function saveRoleAccess(matrix: Record<Role, ModuleKey[]>) {
  try {
    sessionStorage.setItem(SS_ROLE_KEY, JSON.stringify(matrix));
  } catch { /* ignore */ }
}

export function canAccess(role: Role, key: ModuleKey): boolean {
  const current = getRoleAccess();
  return current[role]?.includes(key) ?? false;
}

// ─── Demo employee type ───────────────────────────────────────────────────────
export interface DemoEmployee {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  outlet: string;
  pin: string;      // plain 4-digit PIN (demo only)
  active: boolean;
}

// ─── Mutable in-memory employee store ────────────────────────────────────────
// `let` so we can push new employees; sessionStorage keeps them across re-renders.
const EMPLOYEES_STORAGE_KEY = 'nabo_employees';

function loadEmployees(): DemoEmployee[] {
  try {
    const raw = sessionStorage.getItem(EMPLOYEES_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as DemoEmployee[];
  } catch { /* ignore */ }
  return null as unknown as DemoEmployee[];
}

function saveEmployees(list: DemoEmployee[]) {
  try { sessionStorage.setItem(EMPLOYEES_STORAGE_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

const DEFAULT_EMPLOYEES: DemoEmployee[] = isSupabaseConfigured ? [] : [
  { id: 'emp-001', full_name: 'Super Admin', email: 'admin@naboflow.com', role: 'admin', outlet: 'Main Branch', pin: '1234', active: true },
];

// Initialise employee list: prefer sessionStorage snapshot so additions survive re-renders.
export let DEMO_EMPLOYEES: DemoEmployee[] = loadEmployees() ?? DEFAULT_EMPLOYEES;

export interface EmployeeOption {
  id: string;
  full_name: string;
  role: string;
  outlet: string;
}

// ─── Session storage key ──────────────────────────────────────────────────────
const SESSION_KEY = 'nabo_session_profile';

function saveProfile(profile: Profile) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(profile)); } catch { /* ignore */ }
}

function loadProfile(): Profile | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Profile;
  } catch { return null; }
}

function clearProfile() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}

// ─── Auth context shape ───────────────────────────────────────────────────────
interface AuthState {
  profile: Profile | null;
  loading: boolean;
  fetchEmployees: () => Promise<{ employees: EmployeeOption[]; error: string | null }>;
  pinLogin: (profileId: string, pin: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
  setPin: (pin: string) => Promise<{ error: string | null }>;
  hasPin: () => Promise<boolean>;
  createEmployee: (data: {
    fullName: string;
    email: string;
    password: string;
    role: Role;
    outlet?: string;
  }) => Promise<{ error: string | null; profile?: Profile }>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const stored = loadProfile();
    setProfile(stored);
    setLoading(false);
  }, []);

  // Return all active employees as picker options
  const fetchEmployees = useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('profiles').select('*').eq('active', true);
      if (!error && Array.isArray(data)) {
        const dbEmployees: EmployeeOption[] = data.map(p => ({
          id: p.id,
          full_name: p.full_name,
          role: p.role,
          outlet: p.outlet || 'Main Branch',
        }));
        return { employees: dbEmployees, error: null };
      }
    }

    const employees: EmployeeOption[] = DEMO_EMPLOYEES
      .filter(e => e.active)
      .map(({ id, full_name, role, outlet }) => ({ id, full_name, role, outlet }));
    return { employees, error: null };
  }, []);

  // Validate PIN against Supabase or demo table
  const pinLogin = useCallback(async (profileId: string, pin: string) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', profileId).maybeSingle();
      if (!error && data) {
        if (data.pin_hash && data.pin_hash !== pin) {
          return { error: 'Incorrect PIN' };
        }
        const p: Profile = {
          id: data.id,
          email: data.email,
          full_name: data.full_name,
          role: data.role as Role,
          outlet: data.outlet,
          active: data.active,
        };
        saveProfile(p);
        setProfile(p);
        return { error: null };
      }
    }

    const emp = DEMO_EMPLOYEES.find(e => e.id === profileId);
    if (!emp) return { error: 'Employee not found' };
    if (!emp.active) return { error: 'Account is disabled' };
    if (emp.pin !== pin) return { error: 'Incorrect PIN' };

    const p: Profile = {
      id: emp.id,
      email: emp.email,
      full_name: emp.full_name,
      role: emp.role,
      outlet: emp.outlet,
      active: emp.active,
    };
    saveProfile(p);
    setProfile(p);
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    clearProfile();
    setProfile(null);
  }, []);

  /**
   * createEmployee — adds the new employee to the in-memory DEMO_EMPLOYEES list
   * AND persists it to sessionStorage so that:
   *   • fetchProfiles() in StaffManagement reads the updated list
   *   • A browser refresh within the same session still shows the employee
   */
  const createEmployee = useCallback(async (data: {
    fullName: string;
    email: string;
    password: string;
    role: Role;
    outlet?: string;
  }) => {
    // Basic duplicate check
    if (DEMO_EMPLOYEES.some(e => e.email === data.email.trim())) {
      return { error: 'An employee with this email already exists' };
    }

    const newEmp: DemoEmployee = {
      id: `emp-${Date.now()}`,
      full_name: data.fullName.trim(),
      email: data.email.trim().toLowerCase(),
      role: data.role,
      outlet: data.outlet ?? 'Main Branch',
      pin: data.password.slice(0, 4).replace(/\D/g, '') || '0000', // use first 4 digits of password as default PIN
      active: true,
    };

    // Mutate the module-level array so all components referencing DEMO_EMPLOYEES see the update
    DEMO_EMPLOYEES = [...DEMO_EMPLOYEES, newEmp];
    // Persist to sessionStorage
    saveEmployees(DEMO_EMPLOYEES);

    const newProfile: Profile = {
      id: newEmp.id,
      email: newEmp.email,
      full_name: newEmp.full_name,
      role: newEmp.role,
      outlet: newEmp.outlet,
      active: true,
    };

    return { error: null, profile: newProfile };
  }, []);

  // ── No-op stubs (kept so existing imports don't break) ──
  const signIn = useCallback(async (_email: string, _password: string) => ({ error: 'Use PIN login' }), []);
  const signUp = useCallback(async (_e: string, _p: string, _n: string) => ({ error: 'Use PIN login' }), []);
  const refreshProfile = useCallback(async () => {}, []);
  const setPin = useCallback(async (_pin: string) => ({ error: null }), []);
  const hasPin = useCallback(async () => true, []);

  return (
    <AuthContext.Provider value={{
      profile, loading,
      fetchEmployees, pinLogin, signOut,
      signIn, signUp, refreshProfile, setPin, hasPin, createEmployee,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
