import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import LoadingSpinner from '../components/LoadingSpinner';
import CoffeeBreakModal from '../components/CoffeeBreakModal';
import { ShoppingBag, Award, ArrowLeft, CheckCircle2, Coffee, Shield, Palette, Sparkles, Play } from 'lucide-react';

const REDEEM_PERKS = [
  {
    id: 'perk_coffee_treat',
    title: 'Self-Set Treat: Coffee Break',
    description: 'Reward yourself with your favorite coffee or snack after completing your plan.',
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

export default function RewardsRedeemPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [redeemingId, setRedeemingId] = useState(null);
  const [message, setMessage] = useState('');
  const [showCoffeeModal, setShowCoffeeModal] = useState(false);
  const navigate = useNavigate();

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await api.get('/rewards/summary');
      setSummary(res.data);
    } catch (err) {
      console.error('Failed to load summary', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleRedeem = async (perk) => {
    if (!summary || summary.totalPoints < perk.cost) return;
    setRedeemingId(perk.id);
    setMessage('');
    try {
      const res = await api.post('/rewards/redeem', {
        perkId: perk.id,
        perkTitle: perk.title,
        cost: perk.cost
      });
      setMessage(res.data.message);
      toast.success(`Redeemed ${perk.title}!`);
      fetchSummary();
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
    return <LoadingSpinner text="Opening Study Rewards Shop..." />;
  }

  const { totalPoints = 0, unlockedPerks = [] } = summary || {};

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 pb-24 md:pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/rewards" className="text-xs text-accent font-medium hover:underline flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Rewards Dashboard
            </Link>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-accent" /> Redeem Study Perks
          </h1>
        </div>

        {/* Current Points Balance Pill */}
        <div className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-2 rounded-lg shadow-xs shrink-0">
          <Award className="w-6 h-6 text-accent" />
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Available Balance</span>
            <span className="text-lg font-extrabold text-slate-900">{totalPoints} Pts</span>
          </div>
        </div>
      </div>

      {message && (
        <div className="p-3.5 bg-green-50 border border-green-200 rounded-lg text-xs text-success font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-success" />
          <span>{message}</span>
        </div>
      )}

      {/* Perks Grid */}
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

      {/* Coffee Break Relaxation Modal */}
      {showCoffeeModal && (
        <CoffeeBreakModal onClose={() => setShowCoffeeModal(false)} />
      )}
    </div>
  );
}
