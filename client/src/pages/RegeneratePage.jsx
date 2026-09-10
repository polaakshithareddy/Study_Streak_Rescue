import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import LoadingSpinner from '../components/LoadingSpinner';
import { Sparkles, AlertTriangle, Clock, Calendar, CheckCircle2, ArrowLeft, Shield } from 'lucide-react';
import dayjs from 'dayjs';
import { useToast } from '../context/ToastContext';

export default function RegeneratePage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [activePlan, setActivePlan] = useState(null);
  const [availableMinutesPerDay, setAvailableMinutesPerDay] = useState(120);
  const [targetDate, setTargetDate] = useState('');
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    fetchActivePlanAndPreview();
  }, []);

  const fetchActivePlanAndPreview = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/plans/active');

      if (!res.data.hasActivePlan) {
        navigate('/plan/new');
        return;
      }

      const plan = res.data.plan;
      setActivePlan(plan);
      setAvailableMinutesPerDay(plan.availableMinutesPerDay);
      setTargetDate(dayjs(plan.targetDate).format('YYYY-MM-DD'));

      // Fetch regeneration preview
      const regenRes = await api.post(`/plans/${plan._id}/regenerate`, {
        confirm: false,
        newAvailableMinutesPerDay: plan.availableMinutesPerDay,
        newTargetDate: dayjs(plan.targetDate).format('YYYY-MM-DD')
      });

      setPreview(regenRes.data);
    } catch (err) {
      setError(err.message || 'Failed to calculate regenerated schedule preview.');
      toast.error(err.message || 'Failed to calculate regenerated schedule preview.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePreview = async (newMins, newTarget) => {
    if (!activePlan) return;
    try {
      setLoading(true);
      const regenRes = await api.post(`/plans/${activePlan._id}/regenerate`, {
        confirm: false,
        newAvailableMinutesPerDay: newMins || availableMinutesPerDay,
        newTargetDate: newTarget || targetDate
      });
      setPreview(regenRes.data);
      toast.info('Recalculated schedule preview.');
    } catch (err) {
      setError(err.message || 'Failed to update regeneration preview.');
      toast.error(err.message || 'Failed to update regeneration preview.');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptNewPlan = async () => {
    if (!activePlan) return;
    setConfirming(true);
    setError('');

    try {
      await api.post(`/plans/${activePlan._id}/regenerate`, {
        confirm: true,
        newAvailableMinutesPerDay: availableMinutesPerDay,
        newTargetDate: targetDate
      });

      toast.success('Catch-up plan regenerated & updated!');
      navigate('/today');
    } catch (err) {
      setError(err.message || 'Failed to accept regenerated plan.');
      toast.error(err.message || 'Failed to accept regenerated plan.');
      setConfirming(false);
    }
  };

  if (loading && !preview) {
    return <LoadingSpinner text="Recalculating catch-up schedule with Catch-Up Engine..." />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 pb-24 md:pb-12">
      {/* Top Banner Alert */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 text-danger flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Badge variant="danger">Plan Falling Behind</Badge>
              <span className="text-xs text-slate-500">Current Plan Version: {activePlan?.version || 1}</span>
            </div>
            <h1 className="text-lg font-bold text-slate-900">Regenerate Catch-Up Schedule</h1>
            <p className="text-xs text-slate-600 mt-1">
              Missed tasks have been automatically detected. The engine will preserve completed work, remove missed bottlenecks, and spread remaining topics evenly.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/today')}
          className="shrink-0 gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> Keep Original Plan
        </Button>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-danger">
          {error}
        </div>
      )}

      {/* Available Time & Target Date Readjustment */}
      <Card title="Adjust Available Study Time for Recovery">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold text-slate-700">Daily Study Limit</label>
              <span className="text-xs font-bold text-accent bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {availableMinutesPerDay} mins/day
              </span>
            </div>
            <input
              type="range"
              min="30"
              max="360"
              step="15"
              value={availableMinutesPerDay}
              onChange={e => {
                const val = Number(e.target.value);
                setAvailableMinutesPerDay(val);
                handleUpdatePreview(val, targetDate);
              }}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Recovery Target Date</label>
            <input
              type="date"
              value={targetDate}
              min={dayjs().format('YYYY-MM-DD')}
              onChange={e => {
                setTargetDate(e.target.value);
                handleUpdatePreview(availableMinutesPerDay, e.target.value);
              }}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-accent focus:outline-none"
            />
          </div>
        </div>
      </Card>

      {/* Summary Strip for Regenerated Schedule */}
      {preview && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-xs text-slate-500 uppercase font-semibold">Remaining Incomplete</div>
            <div className="text-lg font-bold text-slate-900 mt-0.5">{preview.incompleteTasksCount} Tasks</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase font-semibold">Days Remaining</div>
            <div className="text-lg font-bold text-slate-900 mt-0.5">{preview.summary?.totalDays || 0} Days</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase font-semibold">New Daily Pace</div>
            <div className="text-lg font-bold text-accent mt-0.5">~{preview.summary?.averageMinutesPerDay || 0} min/day</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase font-semibold">New Version</div>
            <div className="text-lg font-bold text-emerald-600 mt-0.5">Version {preview.nextVersion}</div>
          </div>
        </div>
      )}

      {/* Recalculated Timeline Preview */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent" />
          Preview of Redistributed Schedule
        </h2>

        {preview?.schedule?.map((day) => {
          const isToday = day.date === dayjs().format('YYYY-MM-DD');
          return (
            <Card key={day.date} className={isToday ? 'border-accent ring-1 ring-accent-light' : ''}>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">
                    {dayjs(day.date).format('dddd, MMM D')}
                  </span>
                  {isToday && <Badge variant="primary">Today</Badge>}
                  {day.isBufferDay && <Badge variant="success">Rest Buffer</Badge>}
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  {day.allocatedMinutes} / {availableMinutesPerDay} mins
                </span>
              </div>

              {day.tasks.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No tasks scheduled for this day.</p>
              ) : (
                <div className="space-y-2">
                  {day.tasks.map((t, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                      <span className="font-medium text-slate-800">{t.title}</span>
                      <span className="text-slate-500 font-medium">{t.estimatedMinutes} mins</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Confirm / Reject Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          variant="primary"
          size="lg"
          disabled={confirming}
          onClick={handleAcceptNewPlan}
          className="flex-1 gap-2 font-bold py-3"
        >
          <CheckCircle2 className="w-5 h-5" />
          {confirming ? 'Saving New Schedule...' : 'Accept New Plan (Increment Version)'}
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={() => navigate('/today')}
          className="sm:w-auto py-3"
        >
          Keep Original Plan Instead
        </Button>
      </div>
    </div>
  );
}
