import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import LoadingSpinner from '../components/LoadingSpinner';
import CoffeeBreakModal from '../components/CoffeeBreakModal';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import {
  Award,
  Flame,
  CheckCircle2,
  Shield,
  Sparkles,
  Clock,
  History,
  ShoppingBag,
  ArrowRight,
  Zap,
  Coffee,
  Palette,
  Check,
  TrendingUp,
  LayoutGrid
} from 'lucide-react';
import dayjs from 'dayjs';

const REDEEM_PERKS = [
  {
    id: 'perk_coffee_treat',
    title: 'Self-Set Treat: Coffee Break',
    description: 'Reward yourself with your favorite coffee or relaxation break.',
    cost: 100,
    icon: Coffee,
    color: 'text-amber-600 bg-amber-50 border-amber-200'
  },
  {
    id: 'perk_gold_badge',
    title: 'Gold Scholar Badge',
    description: 'Unlock the exclusive Gold Scholar badge on your student profile.',
    cost: 150,
    icon: Award,
    color: 'text-yellow-600 bg-yellow-50 border-yellow-200'
  },
  {
    id: 'perk_focus_theme',
    title: 'Midnight Focus Theme',
    description: 'Unlock sleek dark mode accents across the Study Streak Rescue interface.',
    cost: 200,
    icon: Palette,
    color: 'text-purple-600 bg-purple-50 border-purple-200'
  },
  {
    id: 'perk_streak_shield',
    title: 'Extra Streak Shield',
    description: 'Add an extra emergency streak protection charge to your profile.',
    cost: 250,
    icon: Shield,
    color: 'text-blue-600 bg-blue-50 border-blue-200'
  }
];

import { useToast } from '../context/ToastContext';

export default function RewardsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'shop', 'history'
  const [summary, setSummary] = useState(null);
  const [todaySet, setTodaySet] = useState(null);
  const [punchCards, setPunchCards] = useState([]);
  const [historyData, setHistoryData] = useState(null);
  const [historyRange, setHistoryRange] = useState('month');
  
  const [togglingProtection, setTogglingProtection] = useState(false);
  const [completingTileId, setCompletingTileId] = useState(null);
  const [redeemingId, setRedeemingId] = useState(null);
  const [redeemMessage, setRedeemMessage] = useState('');
  const [showCoffeeModal, setShowCoffeeModal] = useState(false);

  const fetchRewardsData = async () => {
    try {
      setLoading(true);
      const [sumRes, setRes, pcRes, histRes] = await Promise.all([
        api.get('/rewards/summary'),
        api.get('/rewards/today-set'),
        api.get('/rewards/punch-cards'),
        api.get(`/rewards/history?range=${historyRange}`)
      ]);

      setSummary(sumRes.data);
      setTodaySet(setRes.data);
      setPunchCards(pcRes.data.punchCards || []);
      setHistoryData(histRes.data);
    } catch (err) {
      console.error('Failed to load combined rewards dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRewardsData();
  }, [historyRange]);

  const handleToggleProtection = async () => {
    if (!summary) return;
    setTogglingProtection(true);
    try {
      const res = await api.post('/rewards/streak-protection', {
        enabled: !summary.streakProtectionEnabled
      });
      setSummary(prev => ({
        ...prev,
        streakProtectionEnabled: res.data.streakProtectionEnabled,
        streakProtectionUsedThisMonth: res.data.streakProtectionUsedThisMonth
      }));
      toast.success(res.data.streakProtectionEnabled ? 'Streak Protection enabled!' : 'Streak Protection disabled.');
    } catch (err) {
      toast.error('Failed to toggle streak protection: ' + err.message);
    } finally {
      setTogglingProtection(false);
    }
  };

  const handleCompleteBonusTile = async (tileId) => {
    setCompletingTileId(tileId);
    try {
      await api.post('/rewards/complete-bonus-tile', { tileId });
      toast.success('Bonus tile completed! +5 Study Points claimed.');
      fetchRewardsData();
    } catch (err) {
      toast.error(err.message || 'Could not complete bonus activity');
    } finally {
      setCompletingTileId(null);
    }
  };

  const handleRedeem = async (perk) => {
    if (!summary || summary.totalPoints < perk.cost) return;
    setRedeemingId(perk.id);
    setRedeemMessage('');
    try {
      const res = await api.post('/rewards/redeem', {
        perkId: perk.id,
        perkTitle: perk.title,
        cost: perk.cost
      });
      setRedeemMessage(res.data.message);
      toast.success(`Redeemed ${perk.title}!`);
      await fetchRewardsData();
      if (perk.id === 'perk_coffee_treat') {
        setShowCoffeeModal(true);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to redeem perk');
    } finally {
      setRedeemingId(null);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading Study Rewards Dashboard..." />;
  }

  if (!summary) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 text-center">
        <p className="text-slate-500 mb-4">Failed to load rewards dashboard.</p>
        <Button onClick={fetchRewardsData}>Retry</Button>
      </div>
    );
  }

  const {
    totalPoints = 0,
    pointsThisMonth = 0,
    pointsEarnedToday = 0,
    currentTier = 'starter',
    nextTierTarget = 250,
    tierProgressPct = 0,
    streaks = {},
    streakProtectionEnabled = false,
    streakProtectionUsedThisMonth = false,
    monthlyBonus = {},
    unlockedPerks = []
  } = summary;

  const hasCoffeePerk = unlockedPerks.includes('perk_coffee_treat');

  const tierColors = {
    starter: { badge: 'neutral', label: 'Starter Tier' },
    focused: { badge: 'primary', label: 'Focused Tier' },
    elite: { badge: 'success', label: 'Elite Tier' }
  };

  const { transactions = [], chartData = [], totalEarnedInRange = 0 } = historyData || {};

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 pb-24 md:pb-12">
      {/* Top Section: Points Balance & Navigation Tabs */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={tierColors[currentTier]?.badge || 'primary'} className="uppercase text-[10px]">
              {tierColors[currentTier]?.label || 'Starter Tier'}
            </Badge>
            <span className="text-xs text-slate-500 font-medium">Re-earned Monthly</span>
          </div>

          <div className="flex items-baseline gap-3">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Award className="w-8 h-8 text-accent shrink-0" />
              {totalPoints} <span className="text-base font-semibold text-slate-500">Study Points</span>
            </h1>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
              +{pointsEarnedToday} pts earned today
            </span>
          </div>

          {/* Tier Progress Bar */}
          <div className="mt-3 max-w-sm space-y-1">
            <div className="flex justify-between text-[11px] font-semibold text-slate-500">
              <span>Monthly Tier Progress ({pointsThisMonth} / {nextTierTarget} pts)</span>
              <span>{tierProgressPct}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div
                className="h-full bg-accent transition-all duration-300 rounded-full"
                style={{ width: `${tierProgressPct}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Section Quick Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-lg border border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-1.5 transition-subtle ${
              activeTab === 'overview' ? 'bg-white text-accent shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Dashboard
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('shop')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-1.5 transition-subtle ${
              activeTab === 'shop' ? 'bg-white text-accent shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" /> Redeem Perks
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-1.5 transition-subtle ${
              activeTab === 'history' ? 'bg-white text-accent shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" /> Points History
          </button>
        </div>
      </div>

      {/* Coffee Break Treat Banner if Unlocked */}
      {hasCoffeePerk && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Coffee className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-900">Unlocked Perk: Coffee Break Treat</h4>
              <p className="text-[11px] text-amber-700">Take your 15-minute relaxation break anytime!</p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCoffeeModal(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5 shrink-0"
          >
            <Coffee className="w-3.5 h-3.5" /> Take Coffee Break (15m)
          </Button>
        </div>
      )}

      {/* ==================== TAB 1: OVERVIEW ==================== */}
      {(activeTab === 'overview' || activeTab === 'all') && (
        <div className="space-y-6">
          {/* Parallel Streaks Row (3 Side-by-Side Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Task Streak */}
            <Card className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                  <Flame className="w-5 h-5 fill-current" />
                </div>
                <Badge variant="neutral" className="text-[10px]">Task Streak</Badge>
              </div>
              <div className="text-2xl font-bold text-slate-900">{streaks?.dailyTask?.current || 0} Days</div>
              <div className="text-xs text-slate-500 mt-0.5 flex justify-between">
                <span>Daily Task Streak</span>
                <span className="font-semibold text-slate-700">Best: {streaks?.dailyTask?.best || 0}d</span>
              </div>
            </Card>

            {/* Full-Day Streak */}
            <Card className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <Badge variant="success" className="text-[10px]">Full-Day</Badge>
              </div>
              <div className="text-2xl font-bold text-slate-900">{streaks?.fullDay?.current || 0} Days</div>
              <div className="text-xs text-slate-500 mt-0.5 flex justify-between">
                <span>Completed All Tasks</span>
                <span className="font-semibold text-slate-700">Best: {streaks?.fullDay?.best || 0}d</span>
              </div>
            </Card>

            {/* App Check-In Streak */}
            <Card className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-accent flex items-center justify-center">
                  <Zap className="w-5 h-5 fill-current" />
                </div>
                <Badge variant="primary" className="text-[10px]">Check-In</Badge>
              </div>
              <div className="text-2xl font-bold text-slate-900">{streaks?.checkIn?.current || 0} Days</div>
              <div className="text-xs text-slate-500 mt-0.5 flex justify-between">
                <span>Daily App Review</span>
                <span className="font-semibold text-slate-700">Best: {streaks?.checkIn?.best || 0}d</span>
              </div>
            </Card>
          </div>

          {/* Today's Study Set */}
          <Card
            title="Today's Study Set"
            subtitle={`${todaySet?.completedCount || 0} of ${todaySet?.totalTiles || 0} activities completed today`}
            headerAction={
              <Link to="/today" className="text-xs text-accent font-medium hover:underline flex items-center gap-1">
                Go to Task Checklist <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
              {(todaySet?.taskTiles || []).map((tile) => (
                <div
                  key={tile.id}
                  className={`p-3.5 rounded-lg border flex flex-col justify-between transition-subtle ${
                    tile.completed
                      ? 'bg-slate-50 border-slate-200 text-slate-500'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-900'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Badge variant={tile.completed ? 'success' : 'primary'} className="text-[10px]">
                        +{tile.points} Pts
                      </Badge>
                      <span className="text-[11px] text-slate-400 font-medium">{tile.estimatedTime}</span>
                    </div>
                    <h4 className={`text-xs font-semibold line-clamp-2 ${tile.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                      {tile.title}
                    </h4>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Scheduled Task</span>
                    {tile.completed ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Done
                      </span>
                    ) : (
                      <span className="text-slate-500 font-medium">Pending</span>
                    )}
                  </div>
                </div>
              ))}

              {(todaySet?.bonusTiles || []).map((tile) => (
                <div
                  key={tile.id}
                  className={`p-3.5 rounded-lg border flex flex-col justify-between transition-subtle ${
                    tile.completed
                      ? 'bg-emerald-50/50 border-emerald-200 text-slate-500'
                      : 'bg-blue-50/40 border-blue-200 text-slate-900'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Badge variant="warning" className="text-[10px] gap-1">
                        <Sparkles className="w-3 h-3" /> Bonus +{tile.points} Pts
                      </Badge>
                      <span className="text-[11px] text-slate-400 font-medium">{tile.estimatedTime}</span>
                    </div>
                    <h4 className={`text-xs font-semibold line-clamp-2 ${tile.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                      {tile.title}
                    </h4>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Bonus Explore</span>
                    {tile.completed ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Claimed
                      </span>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={completingTileId === tile.id}
                        onClick={() => handleCompleteBonusTile(tile.id)}
                        className="px-2 py-0.5 text-[10px] bg-white hover:bg-accent hover:text-white"
                      >
                        Claim +5 Pts
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Punch Cards */}
          <Card title="Study Punch Cards" subtitle="Complete multi-day mini-challenges to earn big point rewards">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {punchCards.map((pc) => (
                <div key={pc.id} className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{pc.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{pc.description}</p>
                    </div>
                    <Badge variant={pc.status === 'completed' ? 'success' : 'primary'} className="text-[10px]">
                      +{pc.rewardPoints} Pts
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    {Array.from({ length: pc.totalSlots }).map((_, idx) => {
                      const isFilled = idx < pc.filledSlots;
                      return (
                        <div
                          key={idx}
                          className={`flex-1 h-8 rounded-md border flex items-center justify-center text-xs font-bold transition-subtle ${
                            isFilled
                              ? 'bg-accent text-white border-accent shadow-xs'
                              : 'bg-white border-slate-300 text-slate-300'
                          }`}
                        >
                          {isFilled ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                    <span>{pc.filledSlots} of {pc.totalSlots} stamps collected</span>
                    <span>{pc.status === 'completed' ? 'Reward Claimed!' : 'In Progress'}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Consistency Bonus & Streak Protection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title="Monthly Consistency Bonus" subtitle="Target 250 monthly points + 3-day task streak">
              <div className="space-y-3 pt-1">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span>Requirement Progress</span>
                  <span className="text-accent">{pointsThisMonth} / {monthlyBonus?.targetPoints || 250} Pts</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className="h-full bg-accent transition-all duration-300 rounded-full"
                    style={{ width: `${Math.min(100, Math.round((pointsThisMonth / (monthlyBonus?.targetPoints || 250)) * 100))}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                  <span className="text-slate-500">Streak Condition: 3+ Days</span>
                  {streaks?.dailyTask?.current >= 3 ? (
                    <Badge variant="success">Condition Met</Badge>
                  ) : (
                    <Badge variant="neutral">{streaks?.dailyTask?.current || 0}/3 Days</Badge>
                  )}
                </div>
              </div>
            </Card>

            <Card title="Streak Protection" subtitle="Forgives 1 missed day per month without breaking your streak">
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-center gap-2.5">
                    <Shield className={`w-5 h-5 ${streakProtectionEnabled ? 'text-accent' : 'text-slate-400'}`} />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Protect My Streak</span>
                      <span className="text-[11px] text-slate-500">
                        {streakProtectionUsedThisMonth ? 'Used this month' : '1 protection available'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={togglingProtection}
                    onClick={handleToggleProtection}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      streakProtectionEnabled ? 'bg-accent' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        streakProtectionEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {streakProtectionEnabled && (
                  <p className="text-[11px] text-slate-500 italic">
                    Active: If you miss a day this month, the backend will silently preserve your streak count.
                  </p>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: REDEEM PERKS SHOP ==================== */}
      {activeTab === 'shop' && (
        <div className="space-y-4">
          {redeemMessage && (
            <div className="p-3.5 bg-green-50 border border-green-200 rounded-lg text-xs text-success font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span>{redeemMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {REDEEM_PERKS.map((perk) => {
              const Icon = perk.icon;
              const isUnlocked = unlockedPerks.includes(perk.id);
              const canAfford = totalPoints >= perk.cost;

              return (
                <Card key={perk.id} className="flex flex-col justify-between p-5 space-y-4">
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-2.5 rounded-lg border ${perk.color}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <Badge variant={isUnlocked ? 'success' : canAfford ? 'primary' : 'neutral'} className="font-bold">
                        {perk.cost} Pts
                      </Badge>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">{perk.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">{perk.description}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    {isUnlocked ? (
                      perk.id === 'perk_coffee_treat' ? (
                        <Button
                          variant="primary"
                          onClick={() => setShowCoffeeModal(true)}
                          className="w-full text-xs font-bold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          <Coffee className="w-3.5 h-3.5" /> Take Coffee Break Now (15m)
                        </Button>
                      ) : (
                        <Button variant="outline" disabled className="w-full text-xs text-emerald-600 gap-1 font-bold bg-emerald-50 border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Unlocked Perk
                        </Button>
                      )
                    ) : (
                      <Button
                        variant="primary"
                        disabled={!canAfford || redeemingId === perk.id}
                        onClick={() => handleRedeem(perk)}
                        className="w-full text-xs font-bold gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {redeemingId === perk.id ? 'Redeeming...' : canAfford ? `Redeem for ${perk.cost} Pts` : 'Insufficient Points'}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================== TAB 3: POINTS HISTORY ==================== */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-accent" /> Total Points Earned: +{totalEarnedInRange} Pts
            </h3>
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-md border border-slate-200">
              <button
                type="button"
                onClick={() => setHistoryRange('week')}
                className={`px-2.5 py-1 text-xs font-semibold rounded ${historyRange === 'week' ? 'bg-white text-accent shadow-xs' : 'text-slate-600'}`}
              >
                7 Days
              </button>
              <button
                type="button"
                onClick={() => setHistoryRange('month')}
                className={`px-2.5 py-1 text-xs font-semibold rounded ${historyRange === 'month' ? 'bg-white text-accent shadow-xs' : 'text-slate-600'}`}
              >
                30 Days
              </button>
            </div>
          </div>

          <Card title="Daily Points Chart" subtitle={`Points breakdown for the last ${historyRange === 'week' ? '7' : '30'} days`}>
            <div className="h-64 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="dayLabel" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                    formatter={(val) => [`+${val} Points`, 'Earned']}
                  />
                  <Bar dataKey="points" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Points Transaction History">
            {transactions.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-6">No points transactions logged for this period.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {transactions.map((t) => {
                  const isPositive = t.amount > 0;
                  return (
                    <div key={t._id} className="py-3 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="font-semibold text-slate-900 block">{t.description}</span>
                        <span className="text-[11px] text-slate-400 mt-0.5 block">
                          {dayjs(t.createdAt).format('MMM D, YYYY • h:mm A')}
                        </span>
                      </div>
                      <Badge variant={isPositive ? 'success' : 'danger'} className="text-xs font-bold shrink-0">
                        {isPositive ? `+${t.amount}` : t.amount} Pts
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Coffee Break Relaxation Modal */}
      {showCoffeeModal && (
        <CoffeeBreakModal onClose={() => setShowCoffeeModal(false)} />
      )}
    </div>
  );
}
