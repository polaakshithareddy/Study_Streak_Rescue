import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import LoadingSpinner from '../components/LoadingSpinner';
import PomodoroTimerModal from '../components/PomodoroTimerModal';
import CelebrationModal from '../components/CelebrationModal';
import { Flame, AlertTriangle, CheckCircle2, Clock, Calendar, ArrowRight, PlusCircle, Sparkles, Play, Quote, Zap, Trophy, BookOpen } from 'lucide-react';
import dayjs from 'dayjs';

const MOTIVATIONAL_QUOTES = [
  "Small daily steps lead to massive recovery over time.",
  "Missing a deadline is temporary; giving up is permanent.",
  "Focus on progress, not perfection.",
  "One task at a time builds invincible momentum."
];

import { useToast } from '../context/ToastContext';
import { getGoogleCalendarLink } from '../utils/calendarSync';
import { playReminderChime, sendNativeNotification } from '../components/DeadlineReminderMonitor';

export default function TodayPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [activePlan, setActivePlan] = useState(null);
  const [todayTasks, setTodayTasks] = useState([]);
  const [missedCount, setMissedCount] = useState(0);
  const [activePlansCount, setActivePlansCount] = useState(1);
  const [progress, setProgress] = useState(null);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [activeFocusTask, setActiveFocusTask] = useState(null);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [celebrationData, setCelebrationData] = useState(null);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [planRes, progressRes] = await Promise.all([
        api.get('/plans/active'),
        api.get('/progress')
      ]);

      if (planRes.data.hasActivePlan) {
        setActivePlan(planRes.data.plan);
        setTodayTasks(planRes.data.todayTasks || []);
        setMissedCount(planRes.data.missedCount || 0);
        setActivePlansCount(planRes.data.activePlansCount || 1);
      } else {
        setActivePlan(null);
        setTodayTasks([]);
      }

      setProgress(progressRes.data);
    } catch (err) {
      console.error('Failed to load today page data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    setQuoteIndex(Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length));
  }, []);

  const handleToggleTask = async (taskId, currentStatus) => {
    try {
      setUpdatingTaskId(taskId);
      const isDone = currentStatus === 'done';
      const res = await api.patch(`/tasks/${taskId}/complete`, { done: !isDone });
      
      setTodayTasks(prev => prev.map(t => {
        if (t._id === taskId) {
          return {
            ...t,
            status: !isDone ? 'done' : 'pending',
            completedAt: !isDone ? new Date() : null
          };
        }
        return t;
      }));

      if (!isDone) {
        toast.success('Task completed! +15 Study Points awarded.');
      } else {
        toast.info('Task unchecked. Points updated.');
      }

      // Trigger Celebration Modal if Day Cleared!
      if (res.data.isDayCleared) {
        setCelebrationData({
          xpEarned: res.data.xpEarned || 600,
          userLevel: res.data.userLevel || 1
        });
      }

      const progressRes = await api.get('/progress');
      setProgress(progressRes.data);
    } catch (err) {
      toast.error(err.message || 'Failed to update task.');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading today's rescue schedule..." />;
  }

  if (!activePlan) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Card className="text-center py-10">
          <div className="w-12 h-12 bg-blue-50 text-accent rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">No Active Catch-Up Plan</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
            Missed a deadline or fallen behind? Let's turn your remaining workload into a clear, day-by-day recovery plan.
          </p>
          <Link to="/plan/new">
            <Button size="lg" className="gap-2">
              <PlusCircle className="w-5 h-5" />
              Create My Catch-Up Plan
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const tasksRemainingCount = todayTasks.filter(t => t.status === 'pending').length;
  const tasksCompletedTodayCount = todayTasks.filter(t => t.status === 'done').length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 pb-24 md:pb-12">
      {/* Top Banner Header: Multi-Subject Status & Streak */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="primary">{activePlansCount} Active {activePlansCount === 1 ? 'Subject Plan' : 'Subject Plans'}</Badge>
            <span className="text-xs text-slate-500">Multi-Subject Daily Catch-Up</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">{activePlan.title}</h1>
        </div>

        {/* Streak Counter & XP Pills */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Link to="/plan/new">
            <Button variant="outline" size="sm" className="gap-1 text-xs">
              <PlusCircle className="w-3.5 h-3.5" /> Add Subject Plan
            </Button>
          </Link>

          {/* Streak pill */}
          <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
              <Flame className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Streak</div>
              <div className="text-sm font-bold text-slate-900">
                {progress?.currentStreak || 0} Days
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Motivational Quote Ribbon */}
      <div className="bg-blue-50/70 border border-blue-100 rounded-lg p-3 px-4 flex items-center gap-3 text-xs text-blue-900">
        <Quote className="w-4 h-4 text-accent shrink-0" />
        <span className="italic">"{MOTIVATIONAL_QUOTES[quoteIndex]}"</span>
      </div>

      {/* Missed Tasks Alert Banner */}
      {missedCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-red-900">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-danger">
                Falling Behind: {missedCount} {missedCount === 1 ? 'task was' : 'tasks were'} missed
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Don't stress! The Catch-Up Engine can automatically redistribute missed work across remaining days.
              </p>
            </div>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => navigate('/plan/regenerate')}
            className="shrink-0 gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            Reschedule & Recalculate
          </Button>
        </div>
      )}

      {/* Weekly Dot-Strip (M-S) */}
      <Card title="Weekly Progress Overview" subtitle="Status for current week">
        <div className="grid grid-cols-7 gap-2 pt-2 text-center">
          {(progress?.weeklyChartData || []).map((day) => {
            const isToday = day.date === dayjs().format('YYYY-MM-DD');
            let dotColor = 'bg-slate-200 border-slate-300';
            let statusText = 'No tasks';

            if (day.completed > 0 && day.missed === 0) {
              dotColor = 'bg-success text-white border-success';
              statusText = `${day.completed} done`;
            } else if (day.missed > 0) {
              dotColor = 'bg-danger text-white border-danger';
              statusText = `${day.missed} missed`;
            } else if (day.pending > 0) {
              dotColor = isToday ? 'bg-accent text-white border-accent' : 'bg-slate-100 border-slate-300 text-slate-700';
              statusText = `${day.pending} pending`;
            }

            return (
              <div key={day.date} className="flex flex-col items-center">
                <span className={`text-xs font-semibold mb-1.5 ${isToday ? 'text-accent font-bold' : 'text-slate-500'}`}>
                  {day.dayLabel}
                </span>
                <div
                  title={`${day.date}: ${statusText}`}
                  className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-medium ${dotColor} ${
                    isToday ? 'ring-2 ring-blue-300 ring-offset-1' : ''
                  }`}
                >
                  {day.completed > 0 ? (
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  ) : day.missed > 0 ? (
                    '!'
                  ) : (
                    dayjs(day.date).format('D')
                  )}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 truncate max-w-full">
                  {statusText}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Today's Multi-Subject Checklist */}
      <Card
        title={`Today's Tasks (${dayjs().format('dddd, MMM D')})`}
        subtitle={`${tasksRemainingCount} left to complete today • ${tasksCompletedTodayCount} done • Across ${activePlansCount} subjects`}
        headerAction={
          <Link to="/plan/review" className="text-xs font-medium text-accent hover:underline flex items-center gap-1">
            View Subject Plans <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        }
      >
        {todayTasks.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium">No tasks scheduled for today!</p>
            <p className="text-xs text-slate-400 mt-1">Enjoy your study break or view subject plans for upcoming topics.</p>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            {todayTasks.map((t) => {
              const isDone = t.status === 'done';
              return (
                <div
                  key={t._id}
                  className={`p-3.5 rounded-lg border transition-subtle flex items-center justify-between gap-3 ${
                    isDone
                      ? 'bg-slate-50 border-slate-200 text-slate-500'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-900 shadow-xs'
                  }`}
                >
                  <div
                    onClick={() => handleToggleTask(t._id, t.status)}
                    className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                  >
                    <input
                      type="checkbox"
                      checked={isDone}
                      disabled={updatingTaskId === t._id}
                      onChange={() => {}}
                      className="w-5 h-5 rounded border-slate-300 text-accent focus:ring-accent cursor-pointer"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Badge variant="neutral" className="text-[10px] px-1.5 py-0 font-bold text-accent bg-blue-50 border-blue-200 truncate max-w-[180px]">
                          {t.planTitle || 'Subject'}
                        </Badge>
                      </div>
                      <span className={`text-sm font-medium block truncate ${isDone ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                        {t.title}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {t.estimatedMinutes} mins
                        </span>
                        {t.originalTaskId && (
                          <Badge variant="neutral" className="text-[10px] px-1.5 py-0">
                            Sub-Chunk
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!isDone && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveFocusTask(t)}
                          className="gap-1 text-xs text-accent border-blue-200 hover:bg-blue-50"
                          title="Start 25-min Pomodoro timer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" /> Focus
                        </Button>

                        <a
                          href={getGoogleCalendarLink(t.title, t.scheduledDate, t.estimatedMinutes, t.planTitle)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-subtle"
                          title="Add task to Google Calendar"
                        >
                          <Calendar className="w-3.5 h-3.5 text-blue-500" /> Cal
                        </a>
                      </>
                    )}

                    {isDone ? (
                      <Badge variant="success" className="gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Done
                      </Badge>
                    ) : (
                      <Badge variant="primary">Pending</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Pomodoro Timer Modal */}
      {activeFocusTask && (
        <PomodoroTimerModal
          task={activeFocusTask}
          onClose={() => setActiveFocusTask(null)}
          onCompleteTask={(taskId) => handleToggleTask(taskId, 'pending')}
        />
      )}

      {/* Day Cleared Celebration Modal */}
      {celebrationData && (
        <CelebrationModal
          xpEarned={celebrationData.xpEarned}
          userLevel={celebrationData.userLevel}
          currentStreak={progress?.currentStreak || 1}
          onClose={() => setCelebrationData(null)}
        />
      )}
    </div>
  );
}
