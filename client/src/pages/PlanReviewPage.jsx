import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import LoadingSpinner from '../components/LoadingSpinner';
import BusySlotsModal from '../components/BusySlotsModal';
import { useToast } from '../context/ToastContext';
import { Calendar, Clock, CheckCircle2, ArrowLeft, AlertCircle, ShieldCheck, Download, Copy, Check, PlusCircle, BookOpen } from 'lucide-react';
import dayjs from 'dayjs';
import { downloadICSFile } from '../utils/calendarSync';

export default function PlanReviewPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const [previewData, setPreviewData] = useState(location.state?.previewData || null);
  const [loading, setLoading] = useState(!location.state?.previewData);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [isActiveViewOnly, setIsActiveViewOnly] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activePlans, setActivePlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [showBusySlotsModal, setShowBusySlotsModal] = useState(false);

  const fetchActivePlanData = (planIdToLoad) => {
    setLoading(true);
    const url = planIdToLoad ? `/plans/active?planId=${planIdToLoad}` : '/plans/active';
    api.get(url)
      .then(res => {
        if (res.data.hasActivePlan) {
          const plan = res.data.plan;
          const tasks = res.data.tasks;
          setActivePlans(res.data.activePlans || []);
          setSelectedPlanId(plan._id);

          const dateMap = {};
          for (const t of tasks) {
            if (!dateMap[t.scheduledDate]) {
              dateMap[t.scheduledDate] = {
                date: t.scheduledDate,
                tasks: []
              };
            }
            dateMap[t.scheduledDate].tasks.push({
              taskId: t._id,
              title: t.title,
              estimatedMinutes: t.estimatedMinutes,
              status: t.status
            });
          }

          const schedule = Object.values(dateMap);
          const totalScheduledMinutes = tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);

          setPreviewData({
            title: plan.title,
            targetDate: plan.targetDate,
            availableMinutesPerDay: plan.availableMinutesPerDay,
            busySlots: plan.busySlots || [],
            schedule,
            summary: {
              totalDays: schedule.length,
              usableDays: schedule.length,
              totalScheduledMinutes,
              averageMinutesPerDay: Math.round(totalScheduledMinutes / Math.max(1, schedule.length)),
              tasksScheduledCount: tasks.length
            }
          });
          setIsActiveViewOnly(true);
        } else {
          navigate('/plan/new');
        }
      })
      .catch(err => {
        setError(err.message || 'Failed to load plan schedule.');
        toast.error(err.message || 'Failed to load plan schedule.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!previewData) {
      fetchActivePlanData(null);
    }
  }, [navigate]);

  const handleConfirm = async () => {
    if (!previewData) return;
    setConfirming(true);
    setError('');

    try {
      await api.post('/plans/confirm', {
        title: previewData.title,
        originalDeadline: previewData.originalDeadline,
        targetDate: previewData.targetDate,
        availableMinutesPerDay: previewData.availableMinutesPerDay,
        busySlots: previewData.busySlots,
        schedule: previewData.schedule
      });

      toast.success('Catch-up plan activated successfully!');
      navigate('/today');
    } catch (err) {
      setError(err.message || 'Failed to confirm plan.');
      toast.error(err.message || 'Failed to confirm plan.');
    } finally {
      setConfirming(false);
    }
  };

  const handleSaveBusySlots = async (newBusySlots) => {
    if (!selectedPlanId) return;
    try {
      setLoading(true);
      const res = await api.put(`/plans/${selectedPlanId}/busy-slots`, {
        busySlots: newBusySlots
      });
      toast.success('Busy slots updated & catch-up plan recalculated!');
      setShowBusySlotsModal(false);
      fetchActivePlanData(selectedPlanId);
    } catch (err) {
      toast.error(err.message || 'Failed to update busy slots.');
      setLoading(false);
    }
  };

  const handleCopySchedule = () => {
    if (!previewData) return;
    let text = `# ${previewData.title} Catch-Up Plan\n`;
    text += `Target Exam/Deadline: ${dayjs(previewData.targetDate).format('YYYY-MM-DD')}\n\n`;

    previewData.schedule.forEach(day => {
      text += `## ${dayjs(day.date).format('ddd, MMM D, YYYY')}\n`;
      day.tasks.forEach(t => {
        text += `- [ ] ${t.title} (${t.estimatedMinutes} mins)\n`;
      });
      text += `\n`;
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Schedule copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportPDF = () => {
    toast.info('Opening print/PDF export view...');
    window.print();
  };

  if (loading) {
    return <LoadingSpinner text="Formatting schedule timeline..." />;
  }

  if (!previewData) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 text-center">
        <p className="text-slate-500 mb-4">No schedule preview available.</p>
        <Link to="/plan/new">
          <Button>Create a Plan</Button>
        </Link>
      </div>
    );
  }

  const { title, targetDate, availableMinutesPerDay, schedule, summary, warning } = previewData;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 pb-24 md:pb-12">
      {/* Active Subject Switcher Header Tabs */}
      {isActiveViewOnly && activePlans.length > 0 && (
        <div className="flex items-center justify-between gap-3 bg-white p-3 border border-slate-200 rounded-lg overflow-x-auto">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-accent shrink-0" />
            <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Active Subject Plans:</span>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {activePlans.map(p => {
                const isSelected = p._id === selectedPlanId;
                return (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => fetchActivePlanData(p._id)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-subtle whitespace-nowrap ${
                      isSelected
                        ? 'bg-accent text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {p.title}
                  </button>
                );
              })}
            </div>
          </div>

          <Link to="/plan/new" className="shrink-0">
            <Button variant="outline" size="sm" className="gap-1 text-xs whitespace-nowrap">
              <PlusCircle className="w-3.5 h-3.5" /> Add Another Subject
            </Button>
          </Link>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={isActiveViewOnly ? 'success' : 'primary'}>
              {isActiveViewOnly ? 'Active Plan' : 'Plan Review Preview'}
            </Badge>
            <span className="text-xs text-slate-500">Target Date: {dayjs(targetDate).format('MMMM D, YYYY')}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Edit Busy Slots Button */}
          {isActiveViewOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBusySlotsModal(true)}
              className="gap-1 text-xs text-amber-700 border-amber-200 hover:bg-amber-50 font-semibold"
              title="Edit recurring busy slots & recalculate plan"
            >
              <Clock className="w-3.5 h-3.5 text-amber-600" /> Edit Busy Slots
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadICSFile(previewData.title, previewData.schedule, previewData.availableMinutesPerDay)}
            className="gap-1 text-xs text-accent border-blue-200 hover:bg-blue-50 font-semibold"
            title="Download iCal (.ics) Calendar Sync File"
          >
            <Calendar className="w-3.5 h-3.5" /> Sync Calendar (.ics)
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopySchedule}
            className="gap-1 text-xs"
            title="Copy Schedule Markdown"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            className="gap-1 text-xs text-red-700 border-red-200 hover:bg-red-50"
            title="Export Schedule as PDF"
          >
            <Download className="w-3.5 h-3.5 text-danger" /> Export as PDF
          </Button>

          {!isActiveViewOnly && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/plan/new')}
                className="gap-1 text-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Edit
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirm}
                disabled={confirming}
                className="gap-1 text-xs font-bold"
              >
                <ShieldCheck className="w-4 h-4" /> {confirming ? 'Activating Plan...' : 'Activate This Catch-Up Plan'}
              </Button>
            </>
          )}
        </div>
      </div>

      {warning && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block mb-0.5">Heavy Workload Notice</span>
            <span>{warning}</span>
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3.5">
          <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Total Duration</span>
          <div className="text-lg font-bold text-slate-900 mt-0.5">{summary.usableDays} Usable Days</div>
        </Card>
        <Card className="p-3.5">
          <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Scheduled Workload</span>
          <div className="text-lg font-bold text-slate-900 mt-0.5">{summary.totalScheduledMinutes} Mins Total</div>
        </Card>
        <Card className="p-3.5">
          <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Daily Study Time</span>
          <div className="text-lg font-bold text-slate-900 mt-0.5">{summary.averageMinutesPerDay} Mins / Day</div>
        </Card>
        <Card className="p-3.5">
          <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Tasks Chunked</span>
          <div className="text-lg font-bold text-slate-900 mt-0.5">{summary.tasksScheduledCount} Action Items</div>
        </Card>
      </div>

      {/* Day-by-Day Timeline */}
      <Card title="Catch-Up Day-by-Day Schedule Timeline">
        <div className="space-y-6 pt-2">
          {schedule.map((dayItem, index) => {
            const isToday = dayItem.date === dayjs().format('YYYY-MM-DD');
            const dayMinutes = dayItem.tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);

            return (
              <div key={dayItem.date} className="relative pl-6 border-l-2 border-slate-200">
                <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 bg-white ${isToday ? 'border-accent ring-4 ring-blue-50' : 'border-slate-300'}`} />

                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      Day {index + 1}: {dayjs(dayItem.date).format('dddd, MMM D, YYYY')}
                    </h3>
                    {isToday && <Badge variant="primary" className="text-[10px]">Today</Badge>}
                  </div>
                  <span className="text-xs font-semibold text-slate-500">{dayMinutes} mins scheduled</span>
                </div>

                <div className="space-y-2">
                  {dayItem.tasks.map((t, tIdx) => (
                    <div
                      key={t.taskId || tIdx}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        {t.status === 'done' ? (
                          <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                        )}
                        <span className={`font-semibold ${t.status === 'done' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                          {t.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-slate-500 font-medium">{t.estimatedMinutes} mins</span>
                        {isActiveViewOnly && (
                          <Badge variant={t.status === 'done' ? 'success' : t.status === 'missed' ? 'danger' : 'neutral'} className="text-[10px] capitalize">
                            {t.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Busy Slots Modal */}
      {showBusySlotsModal && (
        <BusySlotsModal
          initialSlots={previewData.busySlots || []}
          onSave={handleSaveBusySlots}
          onClose={() => setShowBusySlotsModal(false)}
        />
      )}
    </div>
  );
}
