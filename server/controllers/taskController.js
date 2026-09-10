const dayjs = require('dayjs');
const Task = require('../models/Task');
const Plan = require('../models/Plan');

/**
 * GET /api/tasks/today
 * Today's tasks for active plan
 */
exports.getTodayTasks = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const activePlans = await Plan.find({ userId, status: 'active' });

    if (activePlans.length === 0) {
      return res.json({ todayTasks: [], hasActivePlan: false });
    }

    const activePlanIds = activePlans.map(p => p._id);
    const planTitleMap = {};
    activePlans.forEach(p => { planTitleMap[p._id.toString()] = p.title; });

    const todayStr = dayjs().format('YYYY-MM-DD');

    // Auto-mark past pending tasks as missed
    await Task.updateMany(
      { planId: { $in: activePlanIds }, scheduledDate: { $lt: todayStr }, status: 'pending' },
      { status: 'missed' }
    );

    const rawTodayTasks = await Task.find({ planId: { $in: activePlanIds }, scheduledDate: todayStr }).sort({ createdAt: 1 });
    const missedTasks = await Task.find({ planId: { $in: activePlanIds }, status: 'missed' });

    const todayTasks = rawTodayTasks.map(t => ({
      ...t.toObject(),
      planTitle: planTitleMap[t.planId.toString()] || 'Subject Plan'
    }));

    res.json({
      hasActivePlan: true,
      activePlansCount: activePlans.length,
      todayDate: todayStr,
      todayTasks,
      missedCount: missedTasks.length
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/tasks/:id/complete
 * Toggle/mark a task done
 */
exports.completeTask = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { done = true } = req.body;

    const task = await Task.findOne({ _id: id, userId });
    if (!task) {
      return res.status(404).json({
        error: {
          message: 'Task not found.',
          code: 'TASK_NOT_FOUND'
        }
      });
    }

    const User = require('../models/User');
    const user = await User.findById(userId);

    let xpEarned = 0;
    let isDayCleared = false;

    if (done) {
      task.status = 'done';
      task.completedAt = new Date();
      xpEarned += 100;
    } else {
      task.status = 'pending';
      task.completedAt = null;
    }

    await task.save();

    // Check if all today's tasks for active plan are now completed!
    const todayStr = dayjs().format('YYYY-MM-DD');
    const todayTasks = await Task.find({ planId: task.planId, scheduledDate: todayStr });
    const pendingTodayTasks = todayTasks.filter(t => t.status !== 'done');

    if (done && todayTasks.length > 0 && pendingTodayTasks.length === 0) {
      isDayCleared = true;
      xpEarned += 500; // +500 Bonus XP for Day Cleared!
    }

    // Trigger Rewards Engine Hook
    const { processTaskCompletionRewards, revokeTaskCompletionRewards } = require('../utils/rewardsEngine');
    if (done) {
      const rewardRes = await processTaskCompletionRewards(userId, task, isDayCleared);
      if (rewardRes.alreadyAwarded) {
        // If points were already awarded previously for this task, suppress celebration
        isDayCleared = false;
        xpEarned = 0;
      }
    } else {
      await revokeTaskCompletionRewards(userId, task);
      if (user) {
        user.xp = Math.max(0, (user.xp || 0) - 100);
        user.level = Math.max(1, Math.floor(user.xp / 1000) + 1);
        await user.save();
      }
    }

    if (user && xpEarned > 0) {
      user.xp = (user.xp || 0) + xpEarned;
      user.level = Math.floor(user.xp / 1000) + 1;
      await user.save();
    }

    res.json({
      message: task.status === 'done' ? 'Task completed!' : 'Task set back to pending',
      task,
      isDayCleared,
      xpEarned,
      userXp: user?.xp || 0,
      userLevel: user?.level || 1
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/tasks/:id/miss
 * Mark task as missed
 */
exports.missTask = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const task = await Task.findOne({ _id: id, userId });
    if (!task) {
      return res.status(404).json({
        error: {
          message: 'Task not found.',
          code: 'TASK_NOT_FOUND'
        }
      });
    }

    task.status = 'missed';
    task.completedAt = null;
    await task.save();

    res.json({
      message: 'Task marked as missed.',
      task
    });
  } catch (err) {
    next(err);
  }
};
