import React, { useEffect, useRef } from 'react';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import dayjs from 'dayjs';

/**
 * Audio chime for 15-minute deadline reminder
 */
function playReminderChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const notes = [
      { freq: 587.33, time: 0, duration: 0.2 },   // D5
      { freq: 880.00, time: 0.15, duration: 0.4 }  // A5
    ];

    notes.forEach(n => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(n.freq, ctx.currentTime + n.time);
      gain.gain.setValueAtTime(0.3, ctx.currentTime + n.time);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + n.time + n.duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + n.time);
      osc.stop(ctx.currentTime + n.time + n.duration);
    });
  } catch (e) {
    console.log('Audio chime error:', e);
  }
}

/**
 * Triggers native browser desktop notification if permission granted
 */
function sendNativeNotification(title, body) {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, { body, icon: '/favicon.ico' });
        }
      });
    }
  }
}

export default function DeadlineReminderMonitor() {
  const toast = useToast();
  const notifiedIdsRef = useRef(new Set());

  const checkDeadlines = async () => {
    try {
      const res = await api.get('/plans/active');
      if (!res.data.hasActivePlan) return;

      const { plan, todayTasks = [] } = res.data;
      const now = dayjs();
      const todayStr = now.format('YYYY-MM-DD');

      // Check 1: Target Plan Deadline if target date is today
      if (plan.targetDate) {
        const targetDay = dayjs(plan.targetDate).format('YYYY-MM-DD');
        if (targetDay === todayStr) {
          const planKey = `plan_${plan._id}_${todayStr}`;
          // Set end of day target time as 23:59 or end of study session
          const endOfDay = dayjs(`${todayStr} 23:59:00`);
          const minsRemaining = endOfDay.diff(now, 'minute');

          if (minsRemaining <= 15 && minsRemaining > 0 && !notifiedIdsRef.current.has(planKey)) {
            notifiedIdsRef.current.add(planKey);
            const msg = `⚠️ Deadline Alert: Your Catch-Up Plan "${plan.title}" target deadline is in ${minsRemaining} minutes!`;
            toast.warning(msg, 6000);
            playReminderChime();
            sendNativeNotification('Study Streak Rescue Deadline', msg);
          }
        }
      }

      // Check 2: Scheduled Today Tasks (Check 15-min window relative to current time)
      const pendingTasks = todayTasks.filter(t => t.status === 'pending');
      pendingTasks.forEach((t, idx) => {
        const taskKey = `task_${t._id}`;

        // Assign mock/due hour slots throughout the day if specific due time is not set
        // e.g. Task 1 due 16:00, Task 2 due 19:00, Task 3 due 21:00
        const defaultDueHour = 17 + idx * 2;
        const dueTimeStr = t.dueTime || `${defaultDueHour.toString().padStart(2, '0')}:00`;
        const taskDeadline = dayjs(`${todayStr} ${dueTimeStr}`);
        const minsToDeadline = taskDeadline.diff(now, 'minute');

        if (minsToDeadline <= 15 && minsToDeadline > 0 && !notifiedIdsRef.current.has(taskKey)) {
          notifiedIdsRef.current.add(taskKey);
          const msg = `⏰ Task Reminder: "${t.title}" deadline is in ${minsToDeadline} minutes (${dueTimeStr})!`;
          toast.warning(msg, 6000);
          playReminderChime();
          sendNativeNotification('15-Minute Task Deadline Alert', msg);
        }
      });
    } catch (e) {
      // Silent error polling
    }
  };

  useEffect(() => {
    // Request Notification permission on mount
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Run check immediately, then poll every 30 seconds
    checkDeadlines();
    const interval = setInterval(checkDeadlines, 30000);
    return () => clearInterval(interval);
  }, []);

  return null; // Silent background monitor
}

export { playReminderChime, sendNativeNotification };
