'use client';

// ===== Nabo Flow — Customer Mobile App (Mobile-first design pass) =====
// Consumer-facing: more spacious, delightful treatment.
import { useState } from 'react';
import {
  QrCode, Search, Star, Clock, Flame, Plus, Minus,
  Gift, Share2, Trophy, Users, Wallet, SplitSquareHorizontal,
  GlassWater, UtensilsCrossed, Bell, CreditCard, Check,
  Home, ClipboardList, User, ChevronRight, Sparkles,
  Copy,
} from 'lucide-react';
import { menuItems as defaultMenuItems, categories } from '../data';
import { inr } from '../format';
import { Badge, Button, Avatar } from '../ui';
import { useMenu } from '../MenuContext';

type Screen = 'home' | 'menu' | 'cart' | 'tracking' | 'loyalty' | 'referral' | 'split' | 'feedback';

export function MobileApp() {
  const [screen, setScreen] = useState<Screen>('home');

  return (
    <div className="flex items-center justify-center h-full bg-ink-100 py-6">
      {/* Phone frame */}
      <div className="relative w-[380px] h-[780px] bg-white rounded-[2.5rem] shadow-pop border-8 border-ink-900 overflow-hidden flex flex-col">
        {/* Status bar */}
        <div className="h-8 bg-ink-900 flex items-center justify-between px-6 text-white text-2xs">
          <span className="font-semibold">9:41</span>
          <div className="flex items-center gap-1">
            <span>●●●●</span>
            <span>WiFi</span>
            <span>100%</span>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-auto bg-ink-50">
          {screen === 'home' && <HomeScreen onNavigate={setScreen} />}
          {screen === 'menu' && <MenuScreen />}
          {screen === 'cart' && <CartScreen onNavigate={setScreen} />}
          {screen === 'tracking' && <TrackingScreen />}
          {screen === 'loyalty' && <LoyaltyScreen />}
          {screen === 'referral' && <ReferralScreen />}
          {screen === 'split' && <SplitScreen />}
          {screen === 'feedback' && <FeedbackScreen />}
        </div>

        {/* Bottom nav */}
        <div className="h-16 bg-white border-t border-ink-200 flex items-center justify-around px-2 shrink-0">
          {([
            { key: 'home', icon: Home, label: 'Home' },
            { key: 'menu', icon: ClipboardList, label: 'Menu' },
            { key: 'loyalty', icon: Gift, label: 'Rewards' },
            { key: 'referral', icon: Share2, label: 'Refer' },
            { key: 'home', icon: User, label: 'Profile' },
          ] as { key: Screen; icon: typeof Home; label: string }[]).map((item, i) => {
            const Icon = item.icon;
            const isActive = screen === item.key || (i === 0 && screen === 'home');
            return (
              <button key={i} onClick={() => setScreen(item.key)} className={`flex flex-col items-center gap-0.5 ${isActive ? 'text-brand-600' : 'text-ink-400'}`}>
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-2xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Screen selector for desktop preview */}
      <div className="ml-6 space-y-2">
        <div className="text-xs font-semibold text-ink-400 uppercase tracking-wide mb-2">Quick Navigate</div>
        {([
          { key: 'home', label: 'Home / QR Scan' },
          { key: 'menu', label: 'Digital Menu' },
          { key: 'cart', label: 'Cart & Checkout' },
          { key: 'tracking', label: 'Order Tracking' },
          { key: 'loyalty', label: 'Loyalty Wallet' },
          { key: 'referral', label: 'Referral Center' },
          { key: 'split', label: 'Bill Splitting' },
          { key: 'feedback', label: 'Feedback / Rating' },
        ] as { key: Screen; label: string }[]).map(s => (
          <button key={s.key} onClick={() => setScreen(s.key)}
            className={`block text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${screen === s.key ? 'bg-brand-600 text-white' : 'bg-white text-ink-600 hover:bg-ink-100'}`}>
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function HomeScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { menuItems } = useMenu();
  return (
    <div className="p-5 space-y-5">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold text-ink-900">Welcome back, Aarav!</h1>
        <p className="text-sm text-ink-400 mt-0.5">Platinum member · 2,840 pts</p>
      </div>

      {/* QR Scan card */}
      <button onClick={() => onNavigate('menu')} className="w-full p-5 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white text-left shadow-card-md active:scale-[0.98] transition-transform">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-white/15 flex items-center justify-center">
            <QrCode className="h-7 w-7 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Scan to Order</h2>
            <p className="text-sm text-white/80">Scan QR at table for digital menu</p>
          </div>
        </div>
      </button>

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: Gift, label: 'Rewards', screen: 'loyalty' as Screen, color: 'bg-accent-50 text-accent-600' },
          { icon: Share2, label: 'Refer', screen: 'referral' as Screen, color: 'bg-brand-50 text-brand-600' },
          { icon: SplitSquareHorizontal, label: 'Split Bill', screen: 'split' as Screen, color: 'bg-info-50 text-info-600' },
          { icon: Bell, label: 'Service', screen: 'home' as Screen, color: 'bg-warn-50 text-warn-600' },
        ].map(a => {
          const Icon = a.icon;
          return (
            <button key={a.label} onClick={() => onNavigate(a.screen)} className="flex flex-col items-center gap-1.5">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${a.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-2xs font-medium text-ink-600">{a.label}</span>
            </button>
          );
        })}
      </div>

      {/* AI Recommendation */}
      <div className="p-4 rounded-2xl bg-white border border-ink-200">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-accent-500" />
          <h3 className="font-bold text-ink-900 text-sm">Recommended for You</h3>
        </div>
        <p className="text-xs text-ink-400 mb-3">Based on your order history</p>
        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          {menuItems.filter(m => m.popular).slice(0, 4).map(item => (
            <div key={item.id} className="shrink-0 w-32">
              <div className="h-24 rounded-xl bg-gradient-to-br from-ink-100 to-ink-200 flex items-center justify-center mb-2">
                <UtensilsCrossed className="h-8 w-8 text-ink-400" />
              </div>
              <div className="text-xs font-semibold text-ink-800 truncate">{item.name}</div>
              <div className="text-xs font-bold text-brand-600 tnum">{inr(item.price)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent order tracking */}
      <button onClick={() => onNavigate('tracking')} className="w-full p-4 rounded-2xl bg-white border border-ink-200 text-left">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-warn-500" />
              <span className="font-bold text-ink-900 text-sm">Order in progress</span>
            </div>
            <p className="text-xs text-ink-400">ORD-20260723-001 · Preparing · ETA 18 min</p>
          </div>
          <ChevronRight className="h-5 w-5 text-ink-300" />
        </div>
      </button>
    </div>
  );
}

function MenuScreen() {
  const { menuItems } = useMenu();
  const [activeCat, setActiveCat] = useState('starters');
  const [cart, setCart] = useState<Record<string, number>>({});
  const filtered = menuItems.filter(m => m.available && m.category === activeCat);

  const addToCart = (id: string) => setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  const removeFromCart = (id: string) => setCart(prev => { const c = { ...prev }; if (c[id] > 1) c[id]--; else delete c[id]; return c; });

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-4 bg-white sticky top-0 z-10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
          <input type="text" placeholder="Search dishes..." className="w-full pl-10 pr-4 py-2.5 text-sm bg-ink-50 border border-ink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400" />
        </div>
      </div>
      {/* Category chips */}
      <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
        {categories.filter(c => c.id !== 'all' && c.id !== 'fav').map(cat => (
          <button key={cat.id} onClick={() => setActiveCat(cat.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeCat === cat.id ? 'bg-brand-600 text-white' : 'bg-white text-ink-500 border border-ink-200'}`}>
            {cat.name}
          </button>
        ))}
      </div>
      {/* Items */}
      <div className="flex-1 px-4 space-y-3 pb-4">
        {filtered.map(item => (
          <div key={item.id} className="flex gap-3 p-3 rounded-2xl bg-white border border-ink-200">
            <div className="h-20 w-20 rounded-xl bg-gradient-to-br from-ink-100 to-ink-200 flex items-center justify-center shrink-0">
              <UtensilsCrossed className="h-7 w-7 text-ink-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-1.5">
                <span className={`mt-1 h-3 w-3 rounded-sm border-2 ${item.veg ? 'border-brand-500' : 'border-danger-500'} shrink-0`}>
                  <span className={`block h-1.5 w-1.5 rounded-full ${item.veg ? 'bg-brand-500' : 'bg-danger-500'} m-auto mt-px`} />
                </span>
                <div className="min-w-0">
                  <h3 className="font-bold text-ink-900 text-sm">{item.name}</h3>
                  {item.description && <p className="text-2xs text-ink-400 mt-0.5 line-clamp-2">{item.description}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                {item.prepTime && <span className="flex items-center gap-0.5 text-2xs text-ink-400"><Clock className="h-3 w-3" />{item.prepTime}m</span>}
                {item.spice && item.spice !== 'none' && <span className="flex items-center gap-0.5 text-2xs text-ink-400"><Flame className="h-3 w-3" />{item.spice}</span>}
                {item.allergens && item.allergens.length > 0 && <span className="text-2xs text-ink-400">· {item.allergens.join(', ')}</span>}
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="font-bold text-ink-900 tnum">{inr(item.price)}</span>
                {cart[item.id] ? (
                  <div className="flex items-center gap-2">
                    <button onClick={() => removeFromCart(item.id)} className="h-7 w-7 rounded-lg bg-ink-100 flex items-center justify-center"><Minus className="h-3.5 w-3.5 text-ink-600" /></button>
                    <span className="text-sm font-bold tnum w-5 text-center">{cart[item.id]}</span>
                    <button onClick={() => addToCart(item.id)} className="h-7 w-7 rounded-lg bg-brand-500 flex items-center justify-center"><Plus className="h-3.5 w-3.5 text-white" /></button>
                  </div>
                ) : (
                  <button onClick={() => addToCart(item.id)} className="h-8 px-3 rounded-lg bg-brand-50 text-brand-700 text-xs font-bold flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> Add</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CartScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { menuItems } = useMenu();
  return (
    <div className="p-5 space-y-4">
      <h1 className="text-xl font-bold text-ink-900">Your Cart</h1>
      <div className="space-y-2">
        {menuItems.slice(0, 3).map(item => (
          <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-ink-200">
            <div className="h-14 w-14 rounded-lg bg-ink-100 flex items-center justify-center"><UtensilsCrossed className="h-5 w-5 text-ink-400" /></div>
            <div className="flex-1">
              <h3 className="font-semibold text-ink-800 text-sm">{item.name}</h3>
              <span className="text-xs text-ink-400 tnum">{inr(item.price)}</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="h-7 w-7 rounded-lg bg-ink-100 flex items-center justify-center"><Minus className="h-3.5 w-3.5" /></button>
              <span className="font-bold tnum">1</span>
              <button className="h-7 w-7 rounded-lg bg-brand-500 flex items-center justify-center"><Plus className="h-3.5 w-3.5 text-white" /></button>
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 rounded-xl bg-white border border-ink-200 space-y-2">
        <div className="flex justify-between text-sm text-ink-500"><span>Subtotal</span><span className="tnum">{inr(860)}</span></div>
        <div className="flex justify-between text-sm text-ink-500"><span>GST (5%)</span><span className="tnum">{inr(43)}</span></div>
        <div className="flex justify-between text-sm text-brand-600"><span>Loyalty points applied</span><span className="tnum">-50 pts</span></div>
        <div className="h-px bg-ink-100" />
        <div className="flex justify-between font-bold text-ink-900"><span>Total</span><span className="text-lg tnum">{inr(853)}</span></div>
      </div>
      <button onClick={() => onNavigate('tracking')} className="w-full h-14 rounded-xl bg-brand-600 text-white font-bold flex items-center justify-center gap-2 shadow-card-md active:scale-[0.98] transition-transform">
        <CreditCard className="h-5 w-5" /> Place Order · {inr(853)}
      </button>
    </div>
  );
}

function TrackingScreen() {
  const steps = [
    { label: 'Order Received', icon: Check, done: true },
    { label: 'Preparing', icon: Clock, done: true, active: true },
    { label: 'Ready for Pickup', icon: UtensilsCrossed, done: false },
    { label: 'Served', icon: Check, done: false },
  ];
  return (
    <div className="p-5 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-ink-900">Order Tracking</h1>
        <p className="text-sm text-ink-400 mt-0.5">ORD-20260723-001 · Table T3</p>
      </div>
      {/* ETA card */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-warn-400 to-warn-600 text-white text-center">
        <Clock className="h-8 w-8 mx-auto mb-2" />
        <div className="text-3xl font-bold tnum">18 min</div>
        <div className="text-sm text-white/80">Estimated time remaining</div>
      </div>
      {/* Timeline */}
      <div className="space-y-1">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={i} className="flex items-center gap-4">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${step.done ? 'bg-brand-500 text-white' : 'bg-ink-100 text-ink-300'} ${step.active ? 'animate-pulse-ring' : ''}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className={`font-semibold text-sm ${step.done ? 'text-ink-800' : 'text-ink-400'}`}>{step.label}</div>
              </div>
              {i < steps.length - 1 && <div className={`w-0.5 h-8 ${step.done ? 'bg-brand-500' : 'bg-ink-200'}`} />}
            </div>
          );
        })}
      </div>
      {/* Service requests */}
      <div>
        <h3 className="font-bold text-ink-900 text-sm mb-3">Smart Table Service</h3>
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: GlassWater, label: 'Water' },
            { icon: UtensilsCrossed, label: 'Cutlery' },
            { icon: CreditCard, label: 'Bill' },
            { icon: Bell, label: 'Waiter' },
          ].map(s => {
            const Icon = s.icon;
            return (
              <button key={s.label} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white border border-ink-200 hover:border-brand-300 transition-colors">
                <Icon className="h-5 w-5 text-ink-600" />
                <span className="text-2xs font-medium text-ink-600">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LoyaltyScreen() {
  return (
    <div className="p-5 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-ink-900">Loyalty Wallet</h1>
        <p className="text-sm text-ink-400 mt-0.5">Platinum member since 2024</p>
      </div>
      {/* Wallet card */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 text-white">
        <div className="flex items-center justify-between mb-4">
          <Trophy className="h-6 w-6 text-accent-300" />
          <span className="text-xs font-bold bg-white/15 px-2 py-1 rounded-full">PLATINUM</span>
        </div>
        <div className="text-3xl font-bold tnum">2,840 pts</div>
        <div className="text-sm text-white/80 mt-1">≈ {inr(2840)} redeemable</div>
        <div className="mt-4">
          <div className="flex justify-between text-2xs text-white/70 mb-1"><span>Progress to next reward</span><span>160 pts to go</span></div>
          <div className="h-2 bg-white/15 rounded-full overflow-hidden"><div className="h-2 bg-accent-300 rounded-full" style={{ width: '95%' }} /></div>
        </div>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Visits', value: '42', icon: Users, color: 'text-info-600 bg-info-50' },
          { label: 'Total Spend', value: '₹28K', icon: Wallet, color: 'text-brand-600 bg-brand-50' },
          { label: 'Rewards', value: '12', icon: Gift, color: 'text-accent-600 bg-accent-50' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="p-3 rounded-xl bg-white border border-ink-200 text-center">
              <div className={`h-9 w-9 rounded-lg ${s.color} flex items-center justify-center mx-auto mb-2`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="text-lg font-bold tnum text-ink-800">{s.value}</div>
              <div className="text-2xs text-ink-400">{s.label}</div>
            </div>
          );
        })}
      </div>
      {/* Recent rewards */}
      <div>
        <h3 className="font-bold text-ink-900 text-sm mb-2">Recent Rewards</h3>
        <div className="space-y-2">
          {[
            { name: 'Birthday dessert', date: '2 days ago', points: 200 },
            { name: 'Spin the wheel — 100 pts', date: '1 week ago', points: 100 },
            { name: 'Referral bonus', date: '2 weeks ago', points: 150 },
          ].map((r, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white border border-ink-200">
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-accent-500" />
                <div>
                  <div className="text-sm font-medium text-ink-800">{r.name}</div>
                  <div className="text-2xs text-ink-400">{r.date}</div>
                </div>
              </div>
              <span className="text-sm font-bold tnum text-brand-600">+{r.points}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReferralScreen() {
  const [copied, setCopied] = useState(false);
  const code = 'NABO-AARAV-2026';
  return (
    <div className="p-5 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-ink-900">Refer & Earn</h1>
        <p className="text-sm text-ink-400 mt-0.5">Get ₹150 for each friend who orders</p>
      </div>
      {/* Referral code */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white">
        <div className="text-center mb-4">
          <Sparkles className="h-8 w-8 mx-auto mb-2 text-accent-300" />
          <h2 className="font-bold text-lg">Your Referral Code</h2>
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 px-4 py-3 rounded-xl bg-white/15 text-white font-mono font-bold text-center tracking-wide">{code}</code>
          <button onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="h-12 px-4 rounded-xl bg-white text-brand-700 font-bold text-sm flex items-center gap-1.5">
            {copied ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy</>}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          {['WhatsApp', 'SMS', 'More'].map(s => (
            <button key={s} className="py-2.5 rounded-xl bg-white/15 text-white text-xs font-bold hover:bg-white/25 transition-colors">{s}</button>
          ))}
        </div>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-white border border-ink-200 text-center">
          <div className="text-2xl font-bold tnum text-ink-800">11</div>
          <div className="text-2xs text-ink-400">Referrals</div>
        </div>
        <div className="p-3 rounded-xl bg-white border border-ink-200 text-center">
          <div className="text-2xl font-bold tnum text-brand-600">{inr(1650)}</div>
          <div className="text-2xs text-ink-400">Earned</div>
        </div>
        <div className="p-3 rounded-xl bg-white border border-ink-200 text-center">
          <div className="text-2xl font-bold tnum text-accent-600">#2</div>
          <div className="text-2xs text-ink-400">Rank</div>
        </div>
      </div>
      {/* Leaderboard */}
      <div>
        <h3 className="font-bold text-ink-900 text-sm mb-2">Leaderboard</h3>
        <div className="space-y-2">
          {[
            { rank: 1, name: 'Kabir Singh', refs: 14 },
            { rank: 2, name: 'You', refs: 11 },
            { rank: 3, name: 'Diya Sharma', refs: 8 },
          ].map(e => (
            <div key={e.rank} className={`flex items-center gap-3 p-3 rounded-xl ${e.name === 'You' ? 'bg-brand-50 border border-brand-200' : 'bg-white border border-ink-200'}`}>
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-sm ${e.rank === 1 ? 'bg-accent-100 text-accent-700' : e.rank === 2 ? 'bg-ink-200 text-ink-700' : 'bg-warn-100 text-warn-700'}`}>
                {e.rank === 1 ? <Trophy className="h-4 w-4" /> : e.rank}
              </div>
              <span className="flex-1 font-semibold text-ink-800 text-sm">{e.name}</span>
              <span className="text-sm tnum font-bold text-ink-600">{e.refs} refs</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SplitScreen() {
  return (
    <div className="p-5 space-y-5">
      <h1 className="text-xl font-bold text-ink-900">Split the Bill</h1>
      <div className="p-4 rounded-2xl bg-white border border-ink-200">
        <div className="text-center mb-4">
          <div className="text-2xs uppercase text-ink-400 font-semibold">Total Bill</div>
          <div className="text-3xl font-bold tnum text-ink-900">{inr(1260)}</div>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {['50/50', 'Item-wise', 'Equal (3)'].map((s, i) => (
            <button key={s} className={`py-3 rounded-xl text-sm font-bold transition-colors ${i === 0 ? 'bg-brand-600 text-white' : 'bg-ink-50 text-ink-600 border border-ink-200'}`}>{s}</button>
          ))}
        </div>
        <div className="space-y-2">
          {[
            { name: 'You', amount: 630, paid: false },
            { name: 'Riya', amount: 630, paid: true },
          ].map(p => (
            <div key={p.name} className="flex items-center justify-between p-3 rounded-xl bg-ink-50">
              <div className="flex items-center gap-2">
                <Avatar name={p.name} size="sm" />
                <span className="font-medium text-ink-800 text-sm">{p.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold tnum text-ink-800">{inr(p.amount)}</span>
                {p.paid ? <Badge tone="brand" size="xs" dot>Paid</Badge> : <Button size="sm" variant="primary" className="text-2xs">Pay</Button>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeedbackScreen() {
  const [rating, setRating] = useState(0);
  return (
    <div className="p-5 space-y-5">
      <h1 className="text-xl font-bold text-ink-900">Rate Your Experience</h1>
      <div className="p-6 rounded-2xl bg-white border border-ink-200 text-center">
        <p className="text-sm text-ink-500 mb-4">How was your meal today?</p>
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} onClick={() => setRating(n)}>
              <Star className={`h-8 w-8 transition-colors ${n <= rating ? 'text-accent-400 fill-accent-400' : 'text-ink-200'}`} />
            </button>
          ))}
        </div>
        {rating > 0 && <p className="text-sm font-semibold text-brand-600 mt-3">{['', 'Needs work', 'Okay', 'Good', 'Great', 'Amazing!'][rating]}</p>}
      </div>
      <div>
        <h3 className="font-bold text-ink-900 text-sm mb-2">Tell us more</h3>
        <textarea placeholder="What did you love? What can we improve?" className="w-full h-28 p-3 text-sm bg-white border border-ink-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none" />
      </div>
      <button className="w-full h-14 rounded-xl bg-brand-600 text-white font-bold flex items-center justify-center gap-2 shadow-card-md">
        <Check className="h-5 w-5" /> Submit Feedback
      </button>
    </div>
  );
}
