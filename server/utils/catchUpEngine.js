const dayjs = require('dayjs');
const isSameOrBefore = require('dayjs/plugin/isSameOrBefore');
const isSameOrAfter = require('dayjs/plugin/isSameOrAfter');
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

/**
 * Helper to convert "HH:mm" to total minutes from 00:00
 */
function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Calculates blocked minutes on a given day based on busySlots.
 * busySlots: Array of { dayOfWeek: Number (0=Sun..6=Sat), startTime: "HH:mm", endTime: "HH:mm", blockedMinutes: Number }
 */
function getBlockedMinutesForDate(date, busySlots = []) {
  if (!Array.isArray(busySlots) || busySlots.length === 0) return 0;
  
  const d = dayjs(date);
  const dayOfWeek = d.day(); // 0 = Sun, 6 = Sat
  
  let blocked = 0;
  for (const slot of busySlots) {
    // If specific dayOfWeek matches
    if (slot.dayOfWeek !== undefined && Number(slot.dayOfWeek) === dayOfWeek) {
      if (slot.blockedMinutes) {
        blocked += Number(slot.blockedMinutes);
      } else if (slot.startTime && slot.endTime) {
        const start = timeToMinutes(slot.startTime);
        const end = timeToMinutes(slot.endTime);
        if (end > start) {
          blocked += (end - start);
        }
      }
    }
  }
  return blocked;
}

/**
 * Catch-Up Engine Main Generator
 * 
 * @param {Object} params
 * @param {String|Date} params.startDate - Start date (YYYY-MM-DD or Date)
 * @param {String|Date} params.targetDate - Target completion date (YYYY-MM-DD or Date)
 * @param {Number} params.availableMinutesPerDay - Stated daily available minutes
 * @param {Array} params.busySlots - [{ dayOfWeek, startTime, endTime }]
 * @param {Array} params.tasks - [{ _id/id, title, estimatedMinutes, status }]
 * @param {Boolean} params.isRegenerate - If true, filtering only incomplete tasks
 * 
 * @returns {Object} { schedule: Array, summary: Object, warning: String|null }
 */
function generateCatchUpPlan({
  startDate = new Date(),
  targetDate,
  availableMinutesPerDay = 120,
  busySlots = [],
  tasks = [],
  isRegenerate = false
}) {
  const start = dayjs(startDate).startOf('day');
  const target = dayjs(targetDate).startOf('day');

  if (!target.isValid() || target.isBefore(start)) {
    throw new Error('Target date must be on or after start date.');
  }

  // Filter tasks if regenerating
  const pendingTasks = isRegenerate
    ? tasks.filter(t => t.status !== 'done')
    : [...tasks];

  if (pendingTasks.length === 0) {
    return {
      schedule: [],
      summary: {
        totalDays: target.diff(start, 'day') + 1,
        usableDays: 0,
        bufferDaysCount: 0,
        totalScheduledMinutes: 0,
        averageMinutesPerDay: 0,
        tasksScheduledCount: 0
      },
      warning: 'No pending tasks to schedule.'
    };
  }

  // Build day breakdown list between start and target
  const totalDaysCount = target.diff(start, 'day') + 1;
  const daysList = [];

  let curr = start;
  while (curr.isSameOrBefore(target, 'day')) {
    const blockedMins = getBlockedMinutesForDate(curr, busySlots);
    const usableMins = Math.max(0, availableMinutesPerDay - blockedMins);
    
    daysList.push({
      dateStr: curr.format('YYYY-MM-DD'),
      dayOfWeek: curr.day(),
      usableMinutes: usableMins,
      allocatedMinutes: 0,
      tasks: [],
      isBufferDay: false
    });
    curr = curr.add(1, 'day');
  }

  const usableDaysList = daysList.filter(d => d.usableMinutes > 0);
  if (usableDaysList.length === 0) {
    throw new Error('All available days between start and target are fully blocked by busy slots.');
  }

  // Task queue creation & sub-chunking
  const taskQueue = [];
  const maxSingleChunk = Math.max(...usableDaysList.map(d => d.usableMinutes));

  for (const t of pendingTasks) {
    const origId = t._id || t.id || `task_${Math.random().toString(36).substr(2, 9)}`;
    const title = t.title || 'Untitled Task';
    const est = Math.max(5, Number(t.estimatedMinutes) || 30);

    // If task duration exceeds maximum single day capacity, chunk it up
    if (est > maxSingleChunk && maxSingleChunk > 0) {
      const chunkCount = Math.ceil(est / maxSingleChunk);
      const chunkEst = Math.round(est / chunkCount);
      for (let i = 1; i <= chunkCount; i++) {
        taskQueue.push({
          taskId: origId,
          title: `${title} (Part ${i}/${chunkCount})`,
          estimatedMinutes: i === chunkCount ? est - chunkEst * (chunkCount - 1) : chunkEst,
          isSubChunk: true,
          partIndex: i,
          totalParts: chunkCount
        });
      }
    } else {
      taskQueue.push({
        taskId: origId,
        title: title,
        estimatedMinutes: est,
        isSubChunk: false
      });
    }
  }

  const totalRequiredMinutes = taskQueue.reduce((acc, t) => acc + t.estimatedMinutes, 0);

  // Reserve Buffer/Rest Days if there is enough slack!
  // If total required minutes fit into fewer days than available usable days,
  // we reserve buffer day(s) (preferring rest near the middle or before final day).
  const estimatedDaysNeeded = Math.ceil(totalRequiredMinutes / availableMinutesPerDay);
  let slackDays = usableDaysList.length - estimatedDaysNeeded;

  // We reserve at least 1 buffer day if usable days >= 3 and slack >= 1
  let numBufferDaysToReserve = 0;
  if (usableDaysList.length >= 3 && slackDays >= 1) {
    numBufferDaysToReserve = Math.min(slackDays, Math.floor(usableDaysList.length / 4) || 1);
  }

  // Pick buffer day indices from usableDaysList (e.g. before the last day or mid-point)
  const activeDays = [...usableDaysList];
  if (numBufferDaysToReserve > 0) {
    // Select buffer day(s) towards the end or middle
    for (let b = 0; b < numBufferDaysToReserve; b++) {
      // Pick index near 75% through schedule
      const bufferIdx = Math.floor(activeDays.length * 0.7);
      if (bufferIdx > 0 && bufferIdx < activeDays.length) {
        activeDays[bufferIdx].isBufferDay = true;
        activeDays.splice(bufferIdx, 1); // remove from active scheduling pool
      }
    }
  }

  // Evenly distribute tasks into active days
  let currentDayIdx = 0;
  let overflowWarning = null;

  for (const item of taskQueue) {
    let assigned = false;
    let attempts = 0;

    while (!assigned && attempts < activeDays.length * 2) {
      const dayObj = activeDays[currentDayIdx];
      const remainingCapacity = dayObj.usableMinutes - dayObj.allocatedMinutes;

      // Assign to current day if capacity allows or if day is empty
      if (remainingCapacity >= item.estimatedMinutes || dayObj.tasks.length === 0) {
        dayObj.tasks.push({
          title: item.title,
          estimatedMinutes: item.estimatedMinutes,
          taskId: item.taskId,
          isSubChunk: item.isSubChunk
        });
        dayObj.allocatedMinutes += item.estimatedMinutes;
        assigned = true;
      } else {
        // Move to next day
        currentDayIdx = (currentDayIdx + 1) % activeDays.length;
      }
      attempts++;
    }

    // Fallback if task still couldn't fit cleanly (add to day with minimum allocation)
    if (!assigned) {
      const minDay = activeDays.reduce((prev, curr) => 
        (curr.allocatedMinutes < prev.allocatedMinutes ? curr : prev), activeDays[0]);
      minDay.tasks.push({
        title: item.title,
        estimatedMinutes: item.estimatedMinutes,
        taskId: item.taskId,
        isSubChunk: item.isSubChunk
      });
      minDay.allocatedMinutes += item.estimatedMinutes;
    }

    // Rotate currentDayIdx for even balancing
    currentDayIdx = (currentDayIdx + 1) % activeDays.length;
  }

  // Check if daily workloads exceed stated limit
  const maxAllocated = Math.max(...daysList.map(d => d.allocatedMinutes));
  if (maxAllocated > availableMinutesPerDay) {
    overflowWarning = `Some days require up to ${maxAllocated} mins (exceeding ${availableMinutesPerDay} mins/day). Consider extending target date.`;
  }

  // Construct output schedule format: [{ date, tasks }]
  const schedule = daysList.map(d => ({
    date: d.dateStr,
    dayOfWeek: d.dayOfWeek,
    usableMinutes: d.usableMinutes,
    allocatedMinutes: d.allocatedMinutes,
    isBufferDay: d.isBufferDay,
    tasks: d.tasks
  }));

  const totalScheduledMinutes = schedule.reduce((acc, d) => acc + d.allocatedMinutes, 0);
  const tasksScheduledCount = schedule.reduce((acc, d) => acc + d.tasks.length, 0);
  const bufferDaysCount = schedule.filter(d => d.isBufferDay).length;

  return {
    schedule,
    summary: {
      totalDays: totalDaysCount,
      usableDays: usableDaysList.length,
      bufferDaysCount,
      totalScheduledMinutes,
      averageMinutesPerDay: Math.round(totalScheduledMinutes / Math.max(1, usableDaysList.length)),
      tasksScheduledCount
    },
    warning: overflowWarning
  };
}

module.exports = {
  generateCatchUpPlan,
  getBlockedMinutesForDate,
  timeToMinutes
};
