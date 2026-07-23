'use client';

// ===== Nabo Flow — Layout Shell =====
import { type ReactNode } from 'react';
import {
  Monitor, Package, Truck, BookOpen, Gift, Share2,
  ShoppingBag, BarChart3, UserCog, Smartphone, Store, ClipboardList,
  type LucideIcon,
} from 'lucide-react';
import type { ModuleKey } from './types';
import { useAuth, canAccess, type Role } from './auth';

const NAV: { key: ModuleKey; label: string; icon: LucideIcon }[] = [
  { key: 'pos', label: 'POS Billing', icon: Monitor },
  { key: 'menu', label: 'Menu Mgmt', icon: BookOpen },
  { key: 'inventory', label: 'Inventory', icon: Package },
  { key: 'purchase', label: 'Purchase', icon: Truck },
  { key: 'online', label: 'Online Orders', icon: ShoppingBag },
  { key: 'reports', label: 'Reports', icon: BarChart3 },
  { key: 'staff', label: 'Staff', icon: UserCog },
  { key: 'referral', label: 'Referrals', icon: Share2 },
  { key: 'loyalty', label: 'Loyalty', icon: Gift },
  { key: 'mobile', label: 'Mobile App', icon: Smartphone },
];

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin',
  manager: 'Manager',
  cashier: 'Cashier',
  server: 'Server',
  inventory: 'Inventory',
};

export function Sidebar({
  active, onSelect,
}: {
  active: ModuleKey;
  onSelect: (k: ModuleKey) => void;
}) {
  const { profile, signOut } = useAuth();
  const role = profile?.role ?? 'server';
  const visible = NAV.filter(n => canAccess(role, n.key));
  const initials = (profile?.full_name || profile?.email || '?')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <aside className="w-16 shrink-0 bg-ink-900 flex flex-col items-center py-3 gap-1 z-30">
      {/* Logo */}
      <div className="h-10 w-10 rounded-xl bg-brand-500 flex items-center justify-center mb-2 shadow-lg">
        <Store className="h-5 w-5 text-white" strokeWidth={2.5} />
      </div>
      <div className="w-8 h-px bg-ink-700 mb-1" />

      {visible.map(({ key, label, icon: Icon }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={`group relative h-12 w-12 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all duration-150
              ${isActive ? 'bg-brand-600 text-white' : 'text-ink-400 hover:text-white hover:bg-ink-800'}`}
            title={label}
          >
            <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-2xs font-semibold leading-none">{label.split(' ')[0]}</span>
            {isActive && <span className="absolute -right-0.5 top-1/2 -translate-y-1/2 h-6 w-1 bg-brand-400 rounded-l-full" />}
          </button>
        );
      })}

      {/* Spacer */}
      <div className="flex-1" />

      {/* User badge + sign out */}
      <div className="flex flex-col items-center gap-1 pt-2 border-t border-ink-700 w-12">
        <div className="h-8 w-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold" title={profile?.email}>
          {initials}
        </div>
        <span className="text-2xs text-ink-400 font-medium leading-none">{ROLE_LABEL[role]}</span>
        <button
          onClick={signOut}
          className="h-8 w-8 rounded-lg text-ink-400 hover:text-danger-400 hover:bg-ink-800 flex items-center justify-center transition-colors mt-0.5"
          title="Sign out"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </aside>
  );
}

export function Topbar({
  title, subtitle, right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <header className="h-14 shrink-0 bg-white border-b border-ink-200/60 flex items-center justify-between px-5">
      <div>
        <h1 className="text-base font-bold text-ink-900">{title}</h1>
        {subtitle && <p className="text-xs text-ink-400">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {right}
      </div>
    </header>
  );
}

export function Shell({
  active, onSelect, title, subtitle, right, children, noTopbar = false, fullBleed = false,
}: {
  active: ModuleKey;
  onSelect: (k: ModuleKey) => void;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  noTopbar?: boolean;
  fullBleed?: boolean;
}) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-ink-50">
      <Sidebar active={active} onSelect={onSelect} />
      <div className="flex-1 flex flex-col min-w-0">
        {!noTopbar && <Topbar title={title} subtitle={subtitle} right={right} />}
        <main className={`flex-1 overflow-auto ${fullBleed ? '' : 'p-5'}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
