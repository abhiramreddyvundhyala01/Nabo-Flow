'use client';

// ===== Nabo Flow — App Root =====
import { useState, useEffect } from 'react';
import { Wifi, Calendar, Loader2, LogOut } from 'lucide-react';
import type { ModuleKey } from './types';
import { Shell } from './Shell';
import { POSBilling } from './modules/POSBilling';
import { Inventory } from './modules/Inventory';
import { Purchase } from './modules/Purchase';
import { MenuManagement } from './modules/MenuManagement';
import { Loyalty } from './modules/Loyalty';
import { Referral } from './modules/Referral';
import { OnlineOrders } from './modules/OnlineOrders';
import { Reports } from './modules/Reports';
import { StaffManagement } from './modules/StaffManagement';
import { MobileApp } from './modules/MobileApp';
import { Badge, Button } from './ui';
import { useAuth, canAccess } from './auth';
import { PinLoginScreen } from './PinLoginScreen';
import { MenuProvider } from './MenuContext';

const MODULE_META: Record<ModuleKey, { title: string; subtitle: string }> = {
  pos:       { title: 'POS Billing',            subtitle: '3-click sale flow · Takeaway · Dine-In · Delivery · QR · Captain' },
  menu:      { title: 'Menu Management',        subtitle: 'Single item master for POS, online, and aggregators' },
  inventory: { title: 'Inventory Management',   subtitle: 'Recipe-linked real-time stock deduction' },
  purchase:  { title: 'Purchase & Vendors',     subtitle: 'PO creation, WhatsApp dispatch, GRN, vendor ledger' },
  online:    { title: 'Online Orders',          subtitle: 'Unified queue across Zomato, Swiggy, and direct channels' },
  reports:   { title: 'Reports & Analytics',    subtitle: 'Sales, bills, and revenue performance analytics' },
  staff:     { title: 'Staff Management',       subtitle: 'RBAC, shift & attendance, performance tracking' },
  referral:  { title: 'Referral System',        subtitle: 'Automated two-sided rewards with fraud detection' },
  loyalty:   { title: 'Loyalty Program',        subtitle: 'Points, tiers, digital wallet, gamification' },
  mobile:    { title: 'Customer Mobile App',    subtitle: 'QR ordering, live tracking, loyalty, referrals, bill splitting' },
};

function App() {
  const { profile, loading, signOut } = useAuth();
  const [active, setActive] = useState<ModuleKey>('pos');

  // If the user's role doesn't permit the active module, fall back to the first allowed one.
  useEffect(() => {
    if (profile && !canAccess(profile.role, active)) {
      const first = (Object.keys(MODULE_META) as ModuleKey[]).find(k => canAccess(profile.role, k));
      if (first) setActive(first);
    }
  }, [profile, active]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      </div>
    );
  }

  // No backend session — just check profile (sessionStorage)
  if (!profile) {
    return <MenuProvider><PinLoginScreen /></MenuProvider>;
  }

  const meta = MODULE_META[active];
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  const renderModule = () => {
    switch (active) {
      case 'pos':       return <POSBilling />;
      case 'inventory': return <Inventory />;
      case 'purchase':  return <Purchase />;
      case 'menu':      return <MenuManagement />;
      case 'loyalty':   return <Loyalty />;
      case 'referral':  return <Referral />;
      case 'online':    return <OnlineOrders />;
      case 'reports':   return <Reports />;
      case 'staff':     return <StaffManagement />;
      case 'mobile':    return <MobileApp />;
      default:          return null;
    }
  };

  const isPOS    = active === 'pos';
  const isMobile = active === 'mobile';

  const initials = (profile.full_name || profile.email)
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <MenuProvider>
      <Shell
        active={active}
        onSelect={setActive}
        title={meta.title}
        subtitle={meta.subtitle}
        noTopbar={isPOS || isMobile}
        fullBleed={isPOS || isMobile}
        right={
          !isPOS && !isMobile && (
            <div className="flex items-center gap-3">
              <Badge tone="brand" size="sm" dot>Live</Badge>
              <span className="flex items-center gap-1.5 text-xs text-ink-400">
                <Calendar className="h-3.5 w-3.5" />{today}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-brand-600 font-medium">
                <Wifi className="h-3.5 w-3.5" />Offline Mode
              </span>
              <div className="flex items-center gap-2 pl-3 border-l border-ink-200">
                <div className="h-8 w-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">{initials}</div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-ink-800">{profile.full_name || profile.email}</div>
                  <div className="text-2xs text-ink-400 capitalize">{profile.role} · {profile.outlet}</div>
                </div>
                <Button variant="ghost" size="sm" onClick={signOut} title="Sign out">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )
        }
      >
        {renderModule()}
      </Shell>
    </MenuProvider>
  );
}

export default App;
