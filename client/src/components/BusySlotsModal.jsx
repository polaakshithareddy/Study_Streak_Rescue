import React, { useState } from 'react';
import { X, Plus, Trash2, Clock, Calendar, Check, Save } from 'lucide-react';
import Button from './Button';
import Badge from './Badge';

const DAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
];

export default function BusySlotsModal({ initialSlots = [], onSave, onClose }) {
  const [slots, setSlots] = useState(
    initialSlots.map(s => ({
      dayOfWeek: s.dayOfWeek ?? 1,
      startTime: s.startTime || '09:00',
      endTime: s.endTime || '11:00',
      blockedMinutes: s.blockedMinutes || 120,
      label: s.label || 'Busy Slot'
    }))
  );

  const [newDay, setNewDay] = useState(1);
  const [newStart, setNewStart] = useState('14:00');
  const [newEnd, setNewEnd] = useState('16:00');
  const [newLabel, setNewLabel] = useState('');

  const calculateMinutes = (start, end) => {
    try {
      const [h1, m1] = start.split(':').map(Number);
      const [h2, m2] = end.split(':').map(Number);
      const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
      return diff > 0 ? diff : 60;
    } catch (e) {
      return 60;
    }
  };

  const handleAddSlot = () => {
    const blockedMins = calculateMinutes(newStart, newEnd);
    setSlots(prev => [
      ...prev,
      {
        dayOfWeek: Number(newDay),
        startTime: newStart,
        endTime: newEnd,
        blockedMinutes: blockedMins,
        label: newLabel.trim() || 'Busy Slot'
      }
    ]);
    setNewLabel('');
  };

  const handleRemoveSlot = (index) => {
    setSlots(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = () => {
    onSave(slots);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 relative animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <Badge variant="primary" className="mb-1 gap-1">
            <Clock className="w-3.5 h-3.5" /> Catch-Up Engine Schedule Adjuster
          </Badge>
          <h2 className="text-xl font-extrabold text-slate-900">Edit Plan Busy Slots</h2>
          <p className="text-xs text-slate-500 mt-1">
            Specify recurring classes, jobs, or busy times. The engine will reserve these slots and recalculate your daily study workload automatically.
          </p>
        </div>

        {/* Existing Busy Slots List */}
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {slots.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-4 bg-slate-50 rounded-lg border border-slate-100">
              No busy slots configured yet.
            </p>
          ) : (
            slots.map((s, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              >
                <div>
                  <span className="font-bold text-slate-900">
                    {DAYS.find(d => d.value === s.dayOfWeek)?.label || 'Day'} • {s.startTime} - {s.endTime}
                  </span>
                  <span className="text-slate-500 block text-[11px]">
                    {s.label || 'Busy'} ({s.blockedMinutes} mins blocked)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveSlot(idx)}
                  className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50"
                  title="Delete slot"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add New Busy Slot Form */}
        <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl space-y-3">
          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-accent" /> Add a Busy Time Slot
          </h4>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Day of Week</label>
              <select
                value={newDay}
                onChange={(e) => setNewDay(Number(e.target.value))}
                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-1 focus:ring-accent focus:outline-none"
              >
                {DAYS.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Activity Label</label>
              <input
                type="text"
                placeholder="e.g. Tutoring, Work"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-1 focus:ring-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Start Time</label>
              <input
                type="time"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-1 focus:ring-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">End Time</label>
              <input
                type="time"
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-1 focus:ring-accent focus:outline-none"
              />
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleAddSlot}
            className="w-full text-xs font-bold gap-1 bg-white hover:bg-slate-100"
          >
            <Plus className="w-3.5 h-3.5" /> Add Busy Slot
          </Button>
        </div>

        {/* Modal Controls */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="outline" onClick={onClose} size="sm">
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} size="sm" className="gap-1.5 font-bold">
            <Save className="w-4 h-4" /> Save & Recalculate Plan
          </Button>
        </div>
      </div>
    </div>
  );
}
