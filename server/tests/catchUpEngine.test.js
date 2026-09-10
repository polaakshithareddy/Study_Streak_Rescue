const test = require('node:test');
const assert = require('node:assert');
const dayjs = require('dayjs');
const { generateCatchUpPlan, timeToMinutes } = require('../utils/catchUpEngine');

test('Catch-Up Engine - Basic Plan Generation', () => {
  const startDate = '2026-09-10';
  const targetDate = '2026-09-14'; // 5 days total (10, 11, 12, 13, 14)
  const availableMinutesPerDay = 120;
  const tasks = [
    { id: '1', title: 'Math Homework Q1-Q10', estimatedMinutes: 60 },
    { id: '2', title: 'Physics Lab Report', estimatedMinutes: 90 },
    { id: '3', title: 'Reading Chapter 4', estimatedMinutes: 45 }
  ];

  const result = generateCatchUpPlan({
    startDate,
    targetDate,
    availableMinutesPerDay,
    tasks
  });

  assert.ok(result.schedule);
  assert.strictEqual(result.schedule.length, 5);
  assert.strictEqual(result.summary.tasksScheduledCount, 3);
  assert.strictEqual(result.summary.totalScheduledMinutes, 195);
});

test('Catch-Up Engine - Splits Oversized Tasks into Sub-Chunks', () => {
  const startDate = '2026-09-10';
  const targetDate = '2026-09-14';
  const availableMinutesPerDay = 60; // low daily cap
  const tasks = [
    { id: 't1', title: 'Huge Research Paper Writeup', estimatedMinutes: 180 } // 180 > 60
  ];

  const result = generateCatchUpPlan({
    startDate,
    targetDate,
    availableMinutesPerDay,
    tasks
  });

  // Should split 180 mins into 3 chunks of 60 mins
  assert.strictEqual(result.summary.tasksScheduledCount, 3);
  const scheduledTasks = result.schedule.flatMap(d => d.tasks);
  assert.ok(scheduledTasks.some(t => t.title.includes('Part 1/3')));
  assert.ok(scheduledTasks.some(t => t.title.includes('Part 2/3')));
  assert.ok(scheduledTasks.some(t => t.title.includes('Part 3/3')));
});

test('Catch-Up Engine - Busy Slots Excludes/Reduces Available Time', () => {
  const startDate = '2026-09-10'; // Thursday (dayOfWeek = 4)
  const targetDate = '2026-09-14';
  const availableMinutesPerDay = 120;
  // Fully block Thursday (dayOfWeek = 4)
  const busySlots = [{ dayOfWeek: 4, blockedMinutes: 120 }];

  const tasks = [
    { id: '1', title: 'Essay Outline', estimatedMinutes: 60 }
  ];

  const result = generateCatchUpPlan({
    startDate,
    targetDate,
    availableMinutesPerDay,
    busySlots,
    tasks
  });

  const thursdaySchedule = result.schedule.find(d => d.date === '2026-09-10');
  assert.strictEqual(thursdaySchedule.usableMinutes, 0);
  assert.strictEqual(thursdaySchedule.tasks.length, 0);
});

test('Catch-Up Engine - Regenerate Mode ignores completed tasks', () => {
  const startDate = '2026-09-12';
  const targetDate = '2026-09-14';
  const availableMinutesPerDay = 120;
  const tasks = [
    { id: '1', title: 'Task Done', estimatedMinutes: 60, status: 'done' },
    { id: '2', title: 'Task Missed', estimatedMinutes: 60, status: 'missed' },
    { id: '3', title: 'Task Pending', estimatedMinutes: 60, status: 'pending' }
  ];

  const result = generateCatchUpPlan({
    startDate,
    targetDate,
    availableMinutesPerDay,
    tasks,
    isRegenerate: true
  });

  // Should only reschedule Task Missed & Task Pending (2 tasks)
  assert.strictEqual(result.summary.tasksScheduledCount, 2);
});

test('Helper - timeToMinutes', () => {
  assert.strictEqual(timeToMinutes('02:30'), 150);
  assert.strictEqual(timeToMinutes('14:15'), 855);
});
