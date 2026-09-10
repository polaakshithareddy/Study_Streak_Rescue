const dayjs = require('dayjs');
const Task = require('../models/Task');
const Plan = require('../models/Plan');

exports.getProgress = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Fetch active or latest plan
    const activePlan = await Plan.findOne({ userId, status: 'active' }).sort({ createdAt: -1 });

    let tasks = [];
    if (activePlan) {
      tasks = await Task.find({ planId: activePlan._id });
    } else {
      tasks = await Task.find({ userId });
    }

    const totalTasksCount = tasks.length;
    const completedTasksCount = tasks.filter(t => t.status === 'done').length;
    const missedTasksCount = tasks.filter(t => t.status === 'missed').length;
    const pendingTasksCount = tasks.filter(t => t.status === 'pending').length;

    const completionPercentage = totalTasksCount > 0
      ? Math.round((completedTasksCount / totalTasksCount) * 100)
      : 0;

    // Calculate Streaks
    // Group completed tasks by scheduledDate (or completedAt date format YYYY-MM-DD)
    const completedDatesSet = new Set(
      tasks
        .filter(t => t.status === 'done' && (t.completedAt || t.scheduledDate))
        .map(t => t.completedAt ? dayjs(t.completedAt).format('YYYY-MM-DD') : t.scheduledDate)
    );

    const todayStr = dayjs().format('YYYY-MM-DD');
    const yesterdayStr = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

    let currentStreak = 0;
    let checkDate = dayjs();

    // Check if today has a completed task, if not check starting from yesterday
    if (!completedDatesSet.has(todayStr) && completedDatesSet.has(yesterdayStr)) {
      checkDate = dayjs().subtract(1, 'day');
    }

    while (completedDatesSet.has(checkDate.format('YYYY-MM-DD'))) {
      currentStreak++;
      checkDate = checkDate.subtract(1, 'day');
    }

    // Longest streak calculation across sorted dates
    const sortedDates = Array.from(completedDatesSet).sort();
    let longestStreak = 0;
    let tempStreak = 0;
    let prevDate = null;

    for (const dStr of sortedDates) {
      const d = dayjs(dStr);
      if (!prevDate) {
        tempStreak = 1;
      } else {
        const diff = d.diff(prevDate, 'day');
        if (diff === 1) {
          tempStreak++;
        } else if (diff > 1) {
          tempStreak = 1;
        }
      }
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
      prevDate = d;
    }

    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
    }

    // Weekly Completed vs Missed Chart Data (Last 7 Days)
    const weeklyChartData = [];
    for (let i = 6; i >= 0; i--) {
      const d = dayjs().subtract(i, 'day');
      const dateStr = d.format('YYYY-MM-DD');
      const dayLabel = d.format('ddd'); // e.g. Mon, Tue, Wed

      const dayTasks = tasks.filter(t => t.scheduledDate === dateStr);
      const completed = dayTasks.filter(t => t.status === 'done').length;
      const missed = dayTasks.filter(t => t.status === 'missed').length;
      const pending = dayTasks.filter(t => t.status === 'pending').length;

      weeklyChartData.push({
        date: dateStr,
        dayLabel,
        completed,
        missed,
        pending
      });
    }

    // Badges Earned List
    const planVersion = activePlan ? activePlan.version : 1;
    const badges = [
      {
        id: 'first_step',
        title: 'First Step',
        description: 'Complete your first task',
        icon: '🌟',
        unlocked: completedTasksCount >= 1
      },
      {
        id: 'streak_3',
        title: '3-Day Streak',
        description: 'Maintain momentum for 3 consecutive days',
        icon: '🔥',
        unlocked: longestStreak >= 3 || currentStreak >= 3
      },
      {
        id: 'streak_7',
        title: '7-Day Warrior',
        description: 'Maintain a 7-day study streak',
        icon: '⚡',
        unlocked: longestStreak >= 7 || currentStreak >= 7
      },
      {
        id: 'plan_recovered',
        title: 'Plan Saved',
        description: 'Regenerated & recovered from missed deadlines',
        icon: '🛡️',
        unlocked: planVersion > 1
      },
      {
        id: 'master',
        title: '100% Master',
        description: 'Achieve 100% plan completion',
        icon: '🎯',
        unlocked: totalTasksCount > 0 && completedTasksCount === totalTasksCount
      }
    ];

    res.json({
      currentStreak,
      longestStreak,
      totalTasksCount,
      completedTasksCount,
      missedTasksCount,
      pendingTasksCount,
      completionPercentage,
      weeklyChartData,
      badges,
      activePlanVersion: planVersion
    });
  } catch (err) {
    next(err);
  }
};
