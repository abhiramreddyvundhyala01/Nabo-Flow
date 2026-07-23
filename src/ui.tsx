// ===== Nabo Flow — UI Primitives =====
import { type ReactNode, type ButtonHTMLAttributes } from 'react';

// --- Badge ---
export function Badge({
  children, tone = 'neutral', size = 'sm', dot = false,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'brand' | 'accent' | 'danger' | 'warn' | 'info';
  size?: 'xs' | 'sm';
  dot?: boolean;
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-ink-100 text-ink-600',
    brand: 'bg-brand-50 text-brand-700',
    accent: 'bg-accent-50 text-accent-700',
    danger: 'bg-danger-50 text-danger-700',
    warn: 'bg-warn-50 text-warn-700',
    info: 'bg-info-50 text-info-700',
  };
  const dotTones: Record<string, string> = {
    neutral: 'bg-ink-400',
    brand: 'bg-brand-500',
    accent: 'bg-accent-500',
    danger: 'bg-danger-500',
    warn: 'bg-warn-500',
    info: 'bg-info-500',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${tones[tone]} ${size === 'xs' ? 'px-1.5 py-0.5 text-2xs' : 'px-2 py-0.5 text-xs'}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotTones[tone]}`} />}
      {children}
    </span>
  );
}

// --- Button ---
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
}
export function Button({
  children, variant = 'primary', size = 'md', block = false, className = '', ...rest
}: BtnProps) {
  const variants: Record<string, string> = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm',
    secondary: 'bg-white text-ink-700 border border-ink-200 hover:bg-ink-50 active:bg-ink-100',
    ghost: 'text-ink-600 hover:bg-ink-100 active:bg-ink-200',
    danger: 'bg-danger-600 text-white hover:bg-danger-700 active:bg-danger-800 shadow-sm',
    accent: 'bg-accent-500 text-white hover:bg-accent-600 active:bg-accent-700 shadow-sm',
  };
  const sizes: Record<string, string> = {
    sm: 'px-2.5 py-1.5 text-xs rounded-lg gap-1',
    md: 'px-3.5 py-2 text-sm rounded-lg gap-1.5',
    lg: 'px-5 py-3 text-base rounded-xl gap-2',
  };
  return (
    <button
      className={`inline-flex items-center justify-center font-semibold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed select-none ${variants[variant]} ${sizes[size]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

// --- Card ---
export function Card({
  children, className = '', pad = true, onClick, ...rest
}: {
  children: ReactNode;
  className?: string;
  pad?: boolean;
  onClick?: () => void;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div onClick={onClick} className={`bg-white rounded-xl border border-ink-200/60 shadow-card ${pad ? 'p-4' : ''} ${className}`} {...rest}>
      {children}
    </div>
  );
}

// --- StatCard ---
export function StatCard({
  label, value, sub, icon, tone = 'neutral',
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: ReactNode;
  tone?: 'neutral' | 'brand' | 'accent' | 'danger' | 'warn' | 'info';
}) {
  const toneBg: Record<string, string> = {
    neutral: 'bg-ink-100 text-ink-600',
    brand: 'bg-brand-50 text-brand-600',
    accent: 'bg-accent-50 text-accent-600',
    danger: 'bg-danger-50 text-danger-600',
    warn: 'bg-warn-50 text-warn-600',
    info: 'bg-info-50 text-info-600',
  };
  return (
    <Card className="flex items-center gap-3">
      {icon && <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${toneBg[tone]}`}>{icon}</div>}
      <div className="min-w-0">
        <div className="text-2xs font-semibold uppercase tracking-wide text-ink-400">{label}</div>
        <div className="text-xl font-bold text-ink-900 tnum">{value}</div>
        {sub && <div className="text-2xs text-ink-400 mt-0.5">{sub}</div>}
      </div>
    </Card>
  );
}

// --- ProgressBar ---
export function ProgressBar({
  value, max = 100, tone = 'brand', height = 'h-2',
}: {
  value: number;
  max?: number;
  tone?: 'brand' | 'accent' | 'danger' | 'warn' | 'info';
  height?: string;
}) {
  const tones: Record<string, string> = {
    brand: 'bg-brand-500',
    accent: 'bg-accent-500',
    danger: 'bg-danger-500',
    warn: 'bg-warn-500',
    info: 'bg-info-500',
  };
  const pctVal = Math.min(100, (value / max) * 100);
  return (
    <div className={`w-full ${height} bg-ink-100 rounded-full overflow-hidden`}>
      <div className={`${height} ${tones[tone]} rounded-full transition-all duration-300`} style={{ width: pctVal + '%' }} />
    </div>
  );
}

// --- SectionHeader ---
export function SectionHeader({
  title, subtitle, action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        <h2 className="text-lg font-bold text-ink-900">{title}</h2>
        {subtitle && <p className="text-sm text-ink-400 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// --- EmptyState ---
export function EmptyState({ message, icon }: { message: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-ink-400">
      {icon && <div className="mb-3 opacity-50">{icon}</div>}
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

// --- Toggle ---
export function Toggle({
  checked, onChange, label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? 'bg-brand-500' : 'bg-ink-200'}`}
      aria-label={label}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  );
}

// --- Avatar ---
export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('');
  const sizes = { sm: 'h-7 w-7 text-xs', md: 'h-9 w-9 text-sm', lg: 'h-12 w-12 text-base' };
  const colors = ['bg-brand-100 text-brand-700', 'bg-accent-100 text-accent-700', 'bg-info-100 text-info-700', 'bg-warn-100 text-warn-700'];
  const idx = name.charCodeAt(0) % colors.length;
  return (
    <div className={`${sizes[size]} ${colors[idx]} rounded-full flex items-center justify-center font-bold shrink-0`}>
      {initials}
    </div>
  );
}
