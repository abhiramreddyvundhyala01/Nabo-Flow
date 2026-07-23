'use client';

// ===== Nabo Flow — Loyalty Module =====
import { useState } from 'react';
import {
  Gift, Star, Crown, Wallet, Gamepad2, Trophy, Sparkles,
  TrendingUp, Plus, RotateCw, Flame, Target,
} from 'lucide-react';
import { loyaltyTiers, customers } from '../data';
import { inr } from '../format';
import { Card, Badge, Button, StatCard, SectionHeader, ProgressBar, Avatar } from '../ui';

type Tab = 'tiers' | 'rules' | 'wallet' | 'gamification';

export function Loyalty() {
  const [tab, setTab] = useState<Tab>('tiers');
  const totalMembers = loyaltyTiers.reduce((s, t) => s + t.members, 0);
  const totalPoints = customers.reduce((s, c) => s + c.points, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Members" value={totalMembers.toLocaleString()} sub="Across all tiers" icon={<Gift className="h-5 w-5" />} tone="brand" />
        <StatCard label="Points Issued" value={totalPoints.toLocaleString()} sub="Lifetime" icon={<Star className="h-5 w-5" />} tone="accent" />
        <StatCard label="Wallet Balance" value={inr(42000)} sub="Redeemable" icon={<Wallet className="h-5 w-5" />} tone="info" />
        <StatCard label="Redemption Rate" value="34%" sub="Last 30 days" icon={<TrendingUp className="h-5 w-5" />} tone="warn" />
      </div>

      <div className="flex gap-1 bg-white rounded-xl border border-ink-200/60 p-1 w-fit">
        {([
          { key: 'tiers', label: 'Tier Dashboard' },
          { key: 'rules', label: 'Points Rules' },
          { key: 'wallet', label: 'Digital Wallet' },
          { key: 'gamification', label: 'Gamification' },
        ] as { key: Tab; label: string }[]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-ink-50'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'tiers' && <TiersTab />}
      {tab === 'rules' && <RulesTab />}
      {tab === 'wallet' && <WalletTab />}
      {tab === 'gamification' && <GamificationTab />}
    </div>
  );
}

function TiersTab() {
  const tierIcons: Record<string, typeof Star> = { Silver: Star, Gold: Crown, Platinum: Trophy };
  const tierColors: Record<string, string> = {
    Silver: 'border-ink-200 bg-ink-50',
    Gold: 'border-accent-300 bg-accent-50',
    Platinum: 'border-brand-300 bg-brand-50',
  };
  return (
    <div className="grid md:grid-cols-3 gap-4">
      {loyaltyTiers.map(tier => {
        const Icon = tierIcons[tier.name];
        return (
          <Card key={tier.name} className={`border-2 ${tierColors[tier.name]}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-xl bg-white border border-ink-200 flex items-center justify-center">
                <Icon className="h-6 w-6 text-ink-700" />
              </div>
              <div>
                <h3 className="font-bold text-ink-900 text-lg">{tier.name}</h3>
                <p className="text-2xs text-ink-400">Min spend {inr(tier.min)}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1"><span className="text-ink-400">Members</span><span className="font-bold tnum">{tier.members.toLocaleString()}</span></div>
                <ProgressBar value={tier.members} max={1240} tone="brand" />
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-ink-100">
                <span className="text-xs text-ink-500">Points multiplier</span>
                <span className="text-sm font-bold text-ink-800">{tier.multiplier}x</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-ink-100">
                <div className="text-2xs uppercase text-ink-400 font-semibold mb-1">Perk</div>
                <div className="text-xs font-medium text-ink-700">{tier.perk}</div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function RulesTab() {
  const rules = [
    { event: 'Order completed', points: '₹1 = 1 pt', condition: 'Min order ₹100', active: true },
    { event: 'Birthday month', points: '200 bonus pts', condition: 'Once per year', active: true },
    { event: 'Referral qualified', points: '150 pts each', condition: 'Referee orders ≥₹300', active: true },
    { event: 'Review on Zomato', points: '50 pts', condition: 'Screenshot upload', active: true },
    { event: '10-visit streak', points: '100 pts', condition: 'Within 30 days', active: false },
  ];
  return (
    <div className="space-y-4">
      <SectionHeader title="Points Rules Configuration" subtitle="Define how customers earn points" action={<Button variant="primary" size="sm"><Plus className="h-3.5 w-3.5" /> Add Rule</Button>} />
      <Card pad={false}>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-ink-50 text-2xs uppercase tracking-wide text-ink-400 font-semibold">
              <th className="text-left px-4 py-2.5">Event</th>
              <th className="text-left px-3 py-2.5">Points</th>
              <th className="text-left px-3 py-2.5">Condition</th>
              <th className="text-center px-3 py-2.5">Active</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r, i) => (
              <tr key={i} className="border-t border-ink-100 hover:bg-ink-50/50">
                <td className="px-4 py-3 font-semibold text-ink-800">{r.event}</td>
                <td className="px-3 py-3"><Badge tone="brand" size="xs">{r.points}</Badge></td>
                <td className="px-3 py-3 text-ink-500 text-xs">{r.condition}</td>
                <td className="px-3 py-3 text-center">{r.active ? <Badge tone="brand" size="xs" dot>Active</Badge> : <Badge tone="neutral" size="xs">Off</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function WalletTab() {
  return (
    <div className="space-y-4">
      <SectionHeader title="Digital Wallet — Staff Lookup" subtitle="Look up customer wallet balance at POS for redemption" />
      <div className="grid md:grid-cols-2 gap-3">
        {customers.slice(0, 6).map(c => (
          <Card key={c.id} className="flex items-center gap-3">
            <Avatar name={c.name} size="md" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-ink-800 truncate">{c.name}</div>
              <div className="text-2xs text-ink-400">{c.phone}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold tnum text-ink-900">{c.points} pts</div>
              <div className="text-2xs text-brand-600 font-medium">{inr(c.points)}</div>
            </div>
            <Button size="sm" variant="secondary" className="text-2xs"><RotateCw className="h-3 w-3" /> Redeem</Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function GamificationTab() {
  const games = [
    { name: 'Spin the Wheel', icon: Gamepad2, desc: 'Once per visit, min order ₹500', rewards: ['5% off', 'Free dessert', '50 pts', 'Buy 1 Get 1', 'Nothing', '100 pts'], active: true, plays: 1240 },
    { name: 'Visit Streak', icon: Flame, desc: '3 visits in 7 days = bonus 100 pts', rewards: ['100 pts on streak'], active: true, plays: 420 },
    { name: 'Mystery Box', icon: Sparkles, desc: 'Monthly unlock for Gold+ members', rewards: ['Surprise reward'], active: false, plays: 0 },
    { name: 'Menu Explorer', icon: Target, desc: 'Order 10 unique items = 200 pts', rewards: ['200 pts'], active: true, plays: 86 },
  ];
  return (
    <div className="space-y-4">
      <SectionHeader title="Gamification Configuration" subtitle="Engage customers with interactive reward mechanics" action={<Button variant="primary" size="sm"><Plus className="h-3.5 w-3.5" /> New Game</Button>} />
      <div className="grid md:grid-cols-2 gap-3">
        {games.map(g => {
          const Icon = g.icon;
          return (
            <Card key={g.name}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-brand-50 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-brand-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-ink-900">{g.name}</h3>
                    <p className="text-2xs text-ink-400">{g.desc}</p>
                  </div>
                </div>
                <Badge tone={g.active ? 'brand' : 'neutral'} size="xs" dot>{g.active ? 'Active' : 'Off'}</Badge>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {g.rewards.map((r, i) => <Badge key={i} tone="accent" size="xs">{r}</Badge>)}
              </div>
              {g.plays > 0 && (
                <div className="flex items-center justify-between pt-3 border-t border-ink-100 text-xs">
                  <span className="text-ink-400">Total plays</span>
                  <span className="font-bold tnum text-ink-700">{g.plays.toLocaleString()}</span>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
