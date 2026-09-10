import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import LoadingSpinner from '../components/LoadingSpinner';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { ArrowLeft, History, Award, TrendingUp, Calendar } from 'lucide-react';
import dayjs from 'dayjs';

export default function RewardsHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('month'); // 'week' or 'month'
  const [historyData, setHistoryData] = useState(null);
  const navigate = useNavigate();

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/rewards/history?range=${range}`);
      setHistoryData(res.data);
    } catch (err) {
      console.error('Failed to load points history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [range]);

  if (loading) {
    return <LoadingSpinner text="Fetching points breakdown & transaction ledger..." />;
  }

  const { transactions = [], chartData = [], totalEarnedInRange = 0 } = historyData || {};

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 pb-24 md:pb-12">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/rewards" className="text-xs text-accent font-medium hover:underline flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Rewards Dashboard
            </Link>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <History className="w-6 h-6 text-accent" /> Points Breakdown & History
          </h1>
        </div>

        {/* Filter Toggle Buttons */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => setRange('week')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-subtle ${
              range === 'week' ? 'bg-white text-accent shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Last 7 Days
          </button>
          <button
            type="button"
            onClick={() => setRange('month')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-subtle ${
              range === 'month' ? 'bg-white text-accent shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Last 30 Days
          </button>
        </div>
      </div>

      {/* Summary Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 grid grid-cols-2 gap-4 text-center">
        <div>
          <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Points Earned in Period</span>
          <div className="text-xl font-extrabold text-emerald-600 mt-0.5">+{totalEarnedInRange} Pts</div>
        </div>
        <div>
          <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Transactions</span>
          <div className="text-xl font-extrabold text-slate-900 mt-0.5">{transactions.length} Logs</div>
        </div>
      </div>

      {/* Daily Points Chart */}
      <Card title="Daily Study Points Earned" subtitle={`Points history for the last ${range === 'week' ? '7' : '30'} days`}>
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

      {/* Detailed Transaction Ledger Table */}
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
  );
}
