import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import LoadingSpinner from '../components/LoadingSpinner';
import { ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Flame, Award, CheckCircle2, AlertCircle, RefreshCw, Trophy, Target, PieChart as PieIcon, BarChart2 } from 'lucide-react';

export default function ProgressPage() {
  const [loading, setLoading] = useState(true);
  const [progressData, setProgressData] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      setLoading(true);
      const res = await api.get('/progress');
      setProgressData(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load progress stats.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Analyzing study streak & completion statistics..." />;
  }

  if (error || !progressData) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 text-center">
        <p className="text-danger text-sm mb-4">{error || 'Could not load progress.'}</p>
        <Button onClick={fetchProgress}>Retry</Button>
      </div>
    );
  }

  const {
    currentStreak,
    longestStreak,
    totalTasksCount,
    completedTasksCount,
    missedTasksCount,
    pendingTasksCount,
    completionPercentage,
    weeklyChartData,
    badges
  } = progressData;

  // Data for the Pie / Donut Chart
  const pieChartData = [
    { name: 'Completed', value: completedTasksCount, color: '#16a34a' },
    { name: 'Pending', value: pendingTasksCount, color: '#2563eb' },
    { name: 'Missed', value: missedTasksCount, color: '#dc2626' }
  ].filter(d => d.value > 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 pb-24 md:pb-12">
      {/* Top Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Study Progress & Badges</h1>
          <p className="text-xs text-slate-500 mt-0.5">Track your recovery consistency, streak milestones, and task completion metrics.</p>
        </div>

        <Button
          variant="outline"
          size="md"
          onClick={() => navigate('/plan/regenerate')}
          className="gap-2 shrink-0 border-accent text-accent hover:bg-blue-50"
        >
          <RefreshCw className="w-4 h-4" />
          Regenerate Plan from Here
        </Button>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="text-center p-4">
          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-2">
            <Flame className="w-5 h-5 fill-current" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{currentStreak} Days</div>
          <div className="text-xs text-slate-500 font-medium">Current Streak</div>
        </Card>

        <Card className="text-center p-4">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-accent flex items-center justify-center mx-auto mb-2">
            <Trophy className="w-5 h-5" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{longestStreak} Days</div>
          <div className="text-xs text-slate-500 font-medium">Longest Streak</div>
        </Card>

        <Card className="text-center p-4">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{completedTasksCount} / {totalTasksCount}</div>
          <div className="text-xs text-slate-500 font-medium">Tasks Completed</div>
        </Card>

        <Card className="text-center p-4">
          <div className="w-8 h-8 rounded-full bg-red-100 text-danger flex items-center justify-center mx-auto mb-2">
            <Target className="w-5 h-5" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{completionPercentage}%</div>
          <div className="text-xs text-slate-500 font-medium">Completion Rate</div>
        </Card>
      </div>

      {/* Analytics Charts Section (Pie Donut Chart + Weekly Bar Chart) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Task Breakdown Pie Chart */}
        <Card
          title="Task Breakdown Status"
          subtitle="Proportion of completed, pending, and missed tasks"
        >
          <div className="h-64 w-full flex items-center justify-center relative">
            {totalTasksCount === 0 ? (
              <p className="text-xs text-slate-400">No tasks created yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                    formatter={(val, name) => [`${val} Tasks`, name]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}

            {/* Center percentage overlay inside donut */}
            {totalTasksCount > 0 && (
              <div className="absolute flex flex-col items-center justify-center pointer-events-none pb-6">
                <span className="text-xl font-extrabold text-slate-900">{completionPercentage}%</span>
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Done</span>
              </div>
            )}
          </div>
        </Card>

        {/* Weekly Completed vs Missed Bar Chart */}
        <Card
          title="Weekly Activity Breakdown"
          subtitle="7-day completed vs missed tasks timeline"
        >
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="dayLabel" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="completed" name="Completed" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="missed" name="Missed" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Badges Earned Section */}
      <Card title="Earned Badges & Milestones" subtitle="Unlock badges by staying consistent with your recovery schedule">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className={`p-3.5 rounded-lg border flex items-start gap-3 transition-subtle ${
                badge.unlocked
                  ? 'bg-blue-50/50 border-blue-200 text-slate-900'
                  : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
              }`}
            >
              <div className="text-2xl shrink-0 p-1.5 bg-white rounded-lg border border-slate-200 shadow-xs">
                {badge.icon}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-slate-900">{badge.title}</h4>
                  {badge.unlocked && <Badge variant="success" className="text-[9px] px-1 py-0">Unlocked</Badge>}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">{badge.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
