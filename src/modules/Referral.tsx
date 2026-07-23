'use client';

// ===== Nabo Flow — Referral System (Flagship Differentiator) =====
// Designed with extra visual polish and the least friction.
// Outperforms Petpooja in: automated two-sided rewards, leaderboard,
// and fraud detection with device/IP fingerprint flags.
import { useState } from 'react';
import {
  Share2, Gift, Trophy, ShieldAlert, ShieldCheck,
  TrendingUp, Copy, Check, AlertTriangle, Flag, Zap,
  Crown, Medal, Sparkles, UserPlus, Gift as GiftIcon,
} from 'lucide-react';
import { referrals, referralLeaderboard } from '../data';
import { inr } from '../format';
import { Card, Badge, Button, StatCard, SectionHeader, Avatar } from '../ui';

type Tab = 'dashboard' | 'rules' | 'fraud';

export function Referral() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [copied, setCopied] = useState(false);

  const qualified = referrals.filter(r => r.status === 'qualified').length;
  const rewarded = referrals.filter(r => r.status === 'rewarded').length;
  const flagged = referrals.filter(r => r.status === 'flagged').length;
  const totalRewards = referrals.filter(r => r.status === 'rewarded').reduce((s, r) => s + r.reward, 0);

  const referralCode = 'NABO-AARAV-2026';
  const copyCode = () => { setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="space-y-5">
      {/* Hero stats with gradient accent for the differentiator module */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Referrals" value={String(referrals.length)} sub="All-time" icon={<Share2 className="h-5 w-5" />} tone="brand" />
        <StatCard label="Qualified" value={String(qualified + rewarded)} sub={`${Math.round((qualified + rewarded) / referrals.length * 100)}% conversion`} icon={<TrendingUp className="h-5 w-5" />} tone="accent" />
        <StatCard label="Rewards Paid" value={inr(totalRewards)} sub={`${rewarded} rewarded`} icon={<Gift className="h-5 w-5" />} tone="info" />
        <StatCard label="Fraud Flags" value={String(flagged)} sub="Auto-detected" icon={<ShieldAlert className="h-5 w-5" />} tone="danger" />
      </div>

      {/* Quick-share referral code banner */}
      <Card className="bg-gradient-to-r from-brand-600 to-brand-700 border-0 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-white/15 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Refer & Earn ₹150</h3>
              <p className="text-sm text-white/80">Share your code. Both you and your friend get ₹150 when they order ≥₹300.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <code className="px-4 py-2.5 rounded-lg bg-white/15 text-white font-mono font-bold text-sm tracking-wide">{referralCode}</code>
            <button onClick={copyCode} className="h-10 px-4 rounded-lg bg-white text-brand-700 font-bold text-sm flex items-center gap-1.5 hover:bg-brand-50 transition-colors">
              {copied ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy</>}
            </button>
          </div>
        </div>
      </Card>

      <div className="flex gap-1 bg-white rounded-xl border border-ink-200/60 p-1 w-fit">
        {([
          { key: 'dashboard', label: 'Dashboard & Leaderboard' },
          { key: 'rules', label: 'Rule Configuration' },
          { key: 'fraud', label: 'Fraud Queue' },
        ] as { key: Tab; label: string }[]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-ink-50'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && <DashboardTab />}
      {tab === 'rules' && <RulesTab />}
      {tab === 'fraud' && <FraudTab />}
    </div>
  );
}

function DashboardTab() {
  const statusTone: Record<string, 'neutral' | 'warn' | 'brand' | 'danger'> = {
    qualified: 'brand', pending: 'warn', rewarded: 'brand', flagged: 'danger',
  };
  const rankIcons: Record<number, typeof Crown> = { 1: Crown, 2: Medal, 3: Medal };
  const rankColors: Record<number, string> = {
    1: 'bg-accent-100 text-accent-700',
    2: 'bg-ink-200 text-ink-700',
    3: 'bg-warn-100 text-warn-700',
  };

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      {/* Leaderboard — extra polish */}
      <div className="lg:col-span-1">
        <Card className="h-full">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-accent-500" />
            <h3 className="font-bold text-ink-900">Top Referrers</h3>
          </div>
          <div className="space-y-2">
            {referralLeaderboard.map(entry => {
              const Icon = rankIcons[entry.rank];
              return (
                <div key={entry.rank} className={`flex items-center gap-3 p-2.5 rounded-xl transition-all hover:bg-ink-50 ${entry.rank <= 3 ? 'bg-ink-50' : ''}`}>
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold ${rankColors[entry.rank] || 'bg-ink-100 text-ink-500'}`}>
                    {Icon ? <Icon className="h-4 w-4" /> : entry.rank}
                  </div>
                  <Avatar name={entry.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-ink-800 truncate">{entry.name}</div>
                    <div className="text-2xs text-ink-400">{entry.referrals} referrals</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold tnum text-ink-800">{inr(entry.rewards)}</div>
                    <Badge tone="neutral" size="xs">{entry.tier}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Recent referrals */}
      <div className="lg:col-span-2">
        <Card pad={false}>
          <div className="p-4 border-b border-ink-100">
            <h3 className="font-bold text-ink-900">Recent Referrals</h3>
            <p className="text-xs text-ink-400 mt-0.5">Auto-tracked from customer app and POS</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-ink-50 text-2xs uppercase tracking-wide text-ink-400 font-semibold">
                <th className="text-left px-4 py-2.5">Referrer</th>
                <th className="text-left px-3 py-2.5">Referee</th>
                <th className="text-left px-3 py-2.5">Date</th>
                <th className="text-right px-3 py-2.5">Reward</th>
                <th className="text-center px-3 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map(r => (
                <tr key={r.id} className="border-t border-ink-100 hover:bg-ink-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={r.referrer} size="sm" />
                      <span className="font-medium text-ink-700">{r.referrer}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-3.5 w-3.5 text-ink-400" />
                      <span className="text-ink-600">{r.referee}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-ink-400 text-xs">{r.date}</td>
                  <td className="px-3 py-3 text-right tnum font-semibold">{r.reward > 0 ? inr(r.reward) : '—'}</td>
                  <td className="px-3 py-3 text-center"><Badge tone={statusTone[r.status]} size="xs" dot>{r.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

function RulesTab() {
  return (
    <div className="space-y-4">
      <SectionHeader title="Referral Rule Configuration" subtitle="Define qualifying conditions, rewards, and cooldowns" action={<Button variant="primary" size="sm"><Zap className="h-3.5 w-3.5" /> Save Rules</Button>} />
      <div className="grid md:grid-cols-2 gap-3">
        <Card>
          <h3 className="font-bold text-ink-900 text-sm mb-4 flex items-center gap-2"><GiftIcon className="h-4 w-4 text-brand-500" /> Reward Structure</h3>
          <div className="space-y-3">
            <RuleRow label="Referrer reward" value="₹150 wallet credit" />
            <RuleRow label="Referee reward" value="₹150 wallet credit" />
            <RuleRow label="Qualifying order" value="≥ ₹300" />
            <RuleRow label="Cooldown" value="7 days between referrals" />
            <RuleRow label="Max referrals/month" value="10 per referrer" />
          </div>
        </Card>
        <Card>
          <h3 className="font-bold text-ink-900 text-sm mb-4 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-brand-500" /> Fraud Prevention</h3>
          <div className="space-y-3">
            <RuleRow label="Self-referral block" value="Same phone/email" />
            <RuleRow label="Device fingerprint" value="Same device = flag" />
            <RuleRow label="IP address check" value="Same IP within 24h = flag" />
            <RuleRow label="Velocity check" value=">5 refs/day from 1 user = flag" />
            <RuleRow label="Auto-reject threshold" value="3 flags = auto-reject" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function RuleRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between p-2.5 rounded-lg bg-ink-50">
      <span className="text-xs text-ink-500 font-medium">{label}</span>
      <span className="text-xs font-bold text-ink-800">{value}</span>
    </div>
  );
}

function FraudTab() {
  const flagged = referrals.filter(r => r.status === 'flagged');
  return (
    <div className="space-y-4">
      <SectionHeader title="Fraud-Flagging Queue" subtitle="Auto-detected suspicious referrals — review and action" />
      {flagged.length === 0 ? (
        <Card className="text-center py-12">
          <ShieldCheck className="h-10 w-10 text-brand-500 mx-auto mb-3" />
          <p className="text-sm font-medium text-ink-500">No flagged referrals. All clear.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {flagged.map(r => (
            <Card key={r.id} className="border-danger-200 bg-danger-50/30">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-danger-100 flex items-center justify-center shrink-0">
                  <Flag className="h-5 w-5 text-danger-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-ink-900 text-sm">{r.referrer} → {r.referee}</h3>
                    <Badge tone="danger" size="xs" dot>Flagged</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-danger-600 mb-3">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {r.flagReason}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="danger" className="text-2xs">Reject & Block</Button>
                    <Button size="sm" variant="secondary" className="text-2xs">Approve Manually</Button>
                    <Button size="sm" variant="ghost" className="text-2xs">View Details</Button>
                  </div>
                </div>
                <div className="text-right text-2xs text-ink-400">{r.date}</div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
