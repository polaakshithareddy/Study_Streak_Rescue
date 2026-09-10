import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { Calendar, Plus, Trash2, Clock, AlertCircle, Sparkles } from 'lucide-react';
import dayjs from 'dayjs';

import { useToast } from '../context/ToastContext';

export default function NewPlanPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [originalDeadline, setOriginalDeadline] = useState(dayjs().subtract(2, 'day').format('YYYY-MM-DD'));
  const [targetDate, setTargetDate] = useState(dayjs().add(7, 'day').format('YYYY-MM-DD'));
  const [availableMinutesPerDay, setAvailableMinutesPerDay] = useState(120);

  // Busy Slots state
  const [busySlots, setBusySlots] = useState([
    { dayOfWeek: 0, startTime: '10:00', endTime: '12:00', label: 'Sunday Morning Work' }
  ]);

  // Tasks state
  const [tasks, setTasks] = useState([
    { id: '1', title: 'Chapter 4 Reading & Notes', estimatedMinutes: 60 },
    { id: '2', title: 'Problem Set Q1 - Q15', estimatedMinutes: 90 },
    { id: '3', title: 'Lab Simulation Report', estimatedMinutes: 75 }
  ]);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskMins, setNewTaskMins] = useState(45);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setTasks(prev => [
      ...prev,
      {
        id: `task_${Date.now()}`,
        title: newTaskTitle.trim(),
        estimatedMinutes: Number(newTaskMins) || 30
      }
    ]);
    setNewTaskTitle('');
    setNewTaskMins(45);
  };

  const handleRemoveTask = (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleAddBusySlot = () => {
    setBusySlots(prev => [
      ...prev,
      { dayOfWeek: 1, startTime: '14:00', endTime: '16:00', label: 'Work Shift' }
    ]);
  };

  const handleRemoveBusySlot = (index) => {
    setBusySlots(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleGeneratePlan = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Please enter a title for your catch-up plan.');
      toast.error('Please enter a title for your catch-up plan.');
      return;
    }
    if (!targetDate) {
      setError('Please select a target completion date.');
      toast.error('Please select a target completion date.');
      return;
    }
    if (tasks.length === 0) {
      setError('Please add at least one remaining task or topic.');
      toast.error('Please add at least one remaining task or topic.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/plans', {
        title,
        originalDeadline,
        targetDate,
        availableMinutesPerDay,
        busySlots,
        tasks
      });

      toast.success('Catch-Up Plan schedule preview generated!');
      navigate('/plan/review', { state: { previewData: res.data.preview } });
    } catch (err) {
      setError(err.message || 'Failed to generate plan preview.');
      toast.error(err.message || 'Failed to generate plan preview.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-24 md:pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">New Catch-Up Plan</h1>
          <p className="text-xs text-slate-500 mt-0.5">Turn a missed deadline into a balanced, step-by-step study schedule.</p>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-danger">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleGeneratePlan} className="space-y-6">
        {/* Section 1: Basic Deadline Information */}
        <Card title="1. Missed Assignment / Course Info">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Plan / Subject Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Math Assignment 3 Catch-Up"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-accent focus:outline-none"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Original Due Date (Missed)
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-accent focus:outline-none"
                  value={originalDeadline}
                  onChange={e => setOriginalDeadline(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Target Recovery Date *
                </label>
                <input
                  type="date"
                  required
                  min={dayjs().format('YYYY-MM-DD')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-accent focus:outline-none"
                  value={targetDate}
                  onChange={e => setTargetDate(e.target.value)}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Section 2: Available Daily Time */}
        <Card title="2. Daily Available Study Time">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600 font-medium">Stated Available Study Time / Day</span>
              <span className="text-sm font-bold text-accent bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                {Math.floor(availableMinutesPerDay / 60)}h {availableMinutesPerDay % 60 > 0 ? `${availableMinutesPerDay % 60}m` : ''} ({availableMinutesPerDay} mins)
              </span>
            </div>

            <input
              type="range"
              min="30"
              max="360"
              step="15"
              value={availableMinutesPerDay}
              onChange={e => setAvailableMinutesPerDay(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-accent"
            />
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>30 mins</span>
              <span>2 hrs</span>
              <span>4 hrs</span>
              <span>6 hrs</span>
            </div>
          </div>
        </Card>

        {/* Section 3: Recurring Busy Slots (Optional) */}
        <Card
          title="3. Recurring Busy Slots (Optional)"
          subtitle="Days/times when you are unavailable for study (work, classes, sports)"
          headerAction={
            <Button type="button" variant="outline" size="sm" onClick={handleAddBusySlot} className="gap-1 text-xs">
              <Plus className="w-3.5 h-3.5" /> Add Slot
            </Button>
          }
        >
          {busySlots.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No busy slots added. All days will have full study availability.</p>
          ) : (
            <div className="space-y-2">
              {busySlots.map((slot, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <select
                    value={slot.dayOfWeek}
                    onChange={e => {
                      const updated = [...busySlots];
                      updated[idx].dayOfWeek = Number(e.target.value);
                      setBusySlots(updated);
                    }}
                    className="px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                  >
                    {daysOfWeek.map((day, dIdx) => (
                      <option key={day} value={dIdx}>{day}</option>
                    ))}
                  </select>

                  <input
                    type="time"
                    value={slot.startTime || '10:00'}
                    onChange={e => {
                      const updated = [...busySlots];
                      updated[idx].startTime = e.target.value;
                      setBusySlots(updated);
                    }}
                    className="px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                  />
                  <span className="text-xs text-slate-400">to</span>
                  <input
                    type="time"
                    value={slot.endTime || '12:00'}
                    onChange={e => {
                      const updated = [...busySlots];
                      updated[idx].endTime = e.target.value;
                      setBusySlots(updated);
                    }}
                    className="px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                  />

                  <button
                    type="button"
                    onClick={() => handleRemoveBusySlot(idx)}
                    className="ml-auto text-slate-400 hover:text-danger p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Section 4: Remaining Tasks List */}
        <Card title="4. Remaining Tasks & Topics">
          <div className="space-y-4">
            {/* Add Task Sub-Form */}
            <div className="flex flex-col sm:flex-row gap-2 pb-3 border-b border-slate-200">
              <input
                type="text"
                placeholder="Topic or task title (e.g. Chapter 5 Summary)"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-accent focus:outline-none"
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="10"
                  max="480"
                  step="5"
                  className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-accent focus:outline-none"
                  value={newTaskMins}
                  onChange={e => setNewTaskMins(e.target.value)}
                />
                <span className="text-xs text-slate-500">mins</span>
                <Button type="button" onClick={handleAddTask} size="md" className="shrink-0 gap-1">
                  <Plus className="w-4 h-4" /> Add
                </Button>
              </div>
            </div>

            {/* Tasks List */}
            {tasks.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No tasks added yet. Add remaining topics above.</p>
            ) : (
              <div className="space-y-2">
                {tasks.map((t, index) => (
                  <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-xs flex items-center justify-center font-semibold">
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium text-slate-800">{t.title}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {t.estimatedMinutes} mins
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTask(t.id)}
                        className="text-slate-400 hover:text-danger p-1 transition-subtle"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Primary CTA */}
        <Button
          type="submit"
          size="lg"
          disabled={submitting}
          className="w-full py-3.5 text-base gap-2 font-bold shadow-xs"
        >
          <Sparkles className="w-5 h-5 fill-current" />
          {submitting ? 'Calculating Schedule...' : 'Generate My Catch-Up Plan'}
        </Button>
      </form>
    </div>
  );
}
