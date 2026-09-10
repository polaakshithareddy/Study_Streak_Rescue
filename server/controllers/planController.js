const dayjs = require('dayjs');
const Plan = require('../models/Plan');
const Task = require('../models/Task');
const { generateCatchUpPlan } = require('../utils/catchUpEngine');

/**
 * POST /api/plans
 * Generate a preview plan (runs Catch-Up Engine, doesn't persist to DB yet)
 */
exports.createPlanPreview = async (req, res, next) => {
  try {
    const {
      title,
      originalDeadline,
      targetDate,
      availableMinutesPerDay = 120,
      busySlots = [],
      tasks = []
    } = req.body;

    if (!title || !targetDate || !Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({
        error: {
          message: 'Please provide title, targetDate, and at least one task.',
          code: 'INVALID_INPUT'
        }
      });
    }

    const todayStr = dayjs().format('YYYY-MM-DD');
    const result = generateCatchUpPlan({
      startDate: todayStr,
      targetDate,
      availableMinutesPerDay: Number(availableMinutesPerDay),
      busySlots,
      tasks
    });

    res.json({
      preview: {
        title,
        originalDeadline,
        targetDate,
        availableMinutesPerDay: Number(availableMinutesPerDay),
        busySlots,
        tasks,
        schedule: result.schedule,
        summary: result.summary,
        warning: result.warning
      }
    });
  } catch (err) {
    return res.status(400).json({
      error: {
        message: err.message || 'Failed to generate plan preview.',
        code: 'ENGINE_ERROR'
      }
    });
  }
};

/**
 * POST /api/plans/confirm or POST /api/plans/:id/confirm
 * Persists the plan and tasks to MongoDB and sets status to active
 */
exports.confirmPlan = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      title,
      originalDeadline,
      targetDate,
      availableMinutesPerDay,
      busySlots = [],
      schedule = [],
      existingPlanId
    } = req.body;

    if (!title || !targetDate || !Array.isArray(schedule) || schedule.length === 0) {
      return res.status(400).json({
        error: {
          message: 'Missing required plan confirmation data or empty schedule.',
          code: 'INVALID_CONFIRM_DATA'
        }
      });
    }

    // Do NOT abandon previous active plans so student can manage multiple subjects!
    // Create new active Plan
    const plan = await Plan.create({
      userId,
      title,
      originalDeadline: originalDeadline ? new Date(originalDeadline) : null,
      targetDate: new Date(targetDate),
      availableMinutesPerDay: Number(availableMinutesPerDay) || 120,
      busySlots,
      status: 'active',
      version: 1
    });

    // Create Task documents from schedule
    const taskDocs = [];
    for (const day of schedule) {
      for (const t of day.tasks) {
        taskDocs.push({
          planId: plan._id,
          userId,
          title: t.title,
          estimatedMinutes: t.estimatedMinutes,
          category: t.category || 'General',
          scheduledDate: day.date,
          status: 'pending',
          originalTaskId: t.taskId || null
        });
      }
    }

    const createdTasks = await Task.insertMany(taskDocs);

    res.status(201).json({
      message: 'Plan confirmed and activated successfully!',
      plan,
      tasksCount: createdTasks.length
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/plans/active
 * Returns current active plans (supports multi-plan/multi-subject tracking)
 */
exports.getActivePlan = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { planId } = req.query;

    const activePlans = await Plan.find({ userId, status: 'active' }).sort({ createdAt: -1 });

    if (activePlans.length === 0) {
      return res.json({
        hasActivePlan: false,
        activePlans: [],
        plan: null,
        tasks: [],
        todayTasks: []
      });
    }

    // Select plan: specified planId, or default to first active plan
    const selectedPlan = planId
      ? activePlans.find(p => p._id.toString() === planId) || activePlans[0]
      : activePlans[0];

    const activePlanIds = activePlans.map(p => p._id);
    const planTitleMap = {};
    activePlans.forEach(p => { planTitleMap[p._id.toString()] = p.title; });

    // Fetch tasks across ALL active plans
    const allActiveTasks = await Task.find({ planId: { $in: activePlanIds } }).sort({ scheduledDate: 1, createdAt: 1 });
    const todayStr = dayjs().format('YYYY-MM-DD');

    // Auto-update past pending tasks to missed
    const pastPendingTasks = allActiveTasks.filter(t => t.scheduledDate < todayStr && t.status === 'pending');
    if (pastPendingTasks.length > 0) {
      const pastTaskIds = pastPendingTasks.map(t => t._id);
      await Task.updateMany({ _id: { $in: pastTaskIds } }, { status: 'missed' });
      allActiveTasks.forEach(t => {
        if (pastTaskIds.some(id => id.equals(t._id))) {
          t.status = 'missed';
        }
      });
    }

    // Annotate tasks with planTitle
    const annotatedTasks = allActiveTasks.map(t => ({
      ...t.toObject(),
      planTitle: planTitleMap[t.planId.toString()] || 'Subject Plan'
    }));

    const selectedPlanTasks = annotatedTasks.filter(t => t.planId.toString() === selectedPlan._id.toString());
    const todayTasks = annotatedTasks.filter(t => t.scheduledDate === todayStr);
    const missedTasks = annotatedTasks.filter(t => t.status === 'missed');

    res.json({
      hasActivePlan: true,
      activePlans,
      plan: selectedPlan,
      tasks: selectedPlanTasks,
      allActiveTasks: annotatedTasks,
      todayTasks,
      missedCount: missedTasks.length
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/plans/:id/regenerate
 * Re-runs the catch-up engine on remaining incomplete tasks and previews or confirms a updated plan
 */
exports.regeneratePlan = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { confirm = false, newAvailableMinutesPerDay, newTargetDate } = req.body;

    const plan = await Plan.findOne({ _id: id, userId });
    if (!plan) {
      return res.status(404).json({
        error: {
          message: 'Active plan not found.',
          code: 'PLAN_NOT_FOUND'
        }
      });
    }

    const allTasks = await Task.find({ planId: plan._id });
    const todayStr = dayjs().format('YYYY-MM-DD');

    const availableMins = newAvailableMinutesPerDay ? Number(newAvailableMinutesPerDay) : plan.availableMinutesPerDay;
    const targetDate = newTargetDate ? newTargetDate : dayjs(plan.targetDate).format('YYYY-MM-DD');

    // Filter incomplete tasks (pending or missed)
    const incompleteTasks = allTasks.filter(t => t.status !== 'done');

    if (incompleteTasks.length === 0) {
      return res.status(400).json({
        error: {
          message: 'All tasks are already completed! No need to regenerate.',
          code: 'ALL_TASKS_COMPLETED'
        }
      });
    }

    // Run Catch-Up Engine
    const engineResult = generateCatchUpPlan({
      startDate: todayStr,
      targetDate,
      availableMinutesPerDay: availableMins,
      busySlots: plan.busySlots,
      tasks: incompleteTasks.map(t => ({
        id: t._id.toString(),
        title: t.title,
        estimatedMinutes: t.estimatedMinutes,
        status: t.status
      })),
      isRegenerate: true
    });

    if (!confirm) {
      // Preview mode only
      return res.json({
        isRegenerationPreview: true,
        planId: plan._id,
        currentVersion: plan.version,
        nextVersion: plan.version + 1,
        availableMinutesPerDay: availableMins,
        targetDate,
        schedule: engineResult.schedule,
        summary: engineResult.summary,
        warning: engineResult.warning,
        incompleteTasksCount: incompleteTasks.length
      });
    }

    // Confirm mode: Delete incomplete old tasks and replace with newly generated schedule tasks
    const incompleteTaskIds = incompleteTasks.map(t => t._id);
    await Task.deleteMany({ _id: { $in: incompleteTaskIds } });

    const newTaskDocs = [];
    for (const day of engineResult.schedule) {
      for (const t of day.tasks) {
        newTaskDocs.push({
          planId: plan._id,
          userId,
          title: t.title,
          estimatedMinutes: t.estimatedMinutes,
          scheduledDate: day.date,
          status: 'pending',
          originalTaskId: t.taskId || null
        });
      }
    }

    await Task.insertMany(newTaskDocs);

    // Increment plan version
    plan.version += 1;
    plan.availableMinutesPerDay = availableMins;
    if (newTargetDate) {
      plan.targetDate = new Date(newTargetDate);
    }
    await plan.save();

    const updatedTasks = await Task.find({ planId: plan._id }).sort({ scheduledDate: 1 });

    res.json({
      message: 'Plan regenerated and recovered successfully!',
      plan,
      tasks: updatedTasks
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/plans/:id/busy-slots
 * Update busy slots for an active plan and automatically re-schedule incomplete tasks
 */
exports.updateBusySlots = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { busySlots = [] } = req.body;

    const plan = await Plan.findOne({ _id: id, userId });
    if (!plan) {
      return res.status(404).json({
        error: { message: 'Plan not found', code: 'PLAN_NOT_FOUND' }
      });
    }

    // Update busy slots on plan
    plan.busySlots = busySlots;
    await plan.save();

    // Fetch incomplete tasks to reschedule
    const allTasks = await Task.find({ planId: plan._id });
    const incompleteTasks = allTasks.filter(t => t.status !== 'done');
    const todayStr = dayjs().format('YYYY-MM-DD');
    const targetDateStr = dayjs(plan.targetDate).format('YYYY-MM-DD');

    if (incompleteTasks.length > 0) {
      // Re-run catch-up engine with updated busy slots
      const engineResult = generateCatchUpPlan({
        startDate: todayStr,
        targetDate: targetDateStr,
        availableMinutesPerDay: plan.availableMinutesPerDay,
        busySlots: busySlots,
        tasks: incompleteTasks.map(t => ({
          id: t._id.toString(),
          title: t.title,
          estimatedMinutes: t.estimatedMinutes,
          status: t.status
        })),
        isRegenerate: true
      });

      // Remove existing incomplete tasks
      const incompleteTaskIds = incompleteTasks.map(t => t._id);
      await Task.deleteMany({ _id: { $in: incompleteTaskIds } });

      // Insert recalculated task documents
      const newTasks = [];
      for (const day of engineResult.schedule) {
        for (const t of day.tasks) {
          newTasks.push({
            planId: plan._id,
            userId,
            title: t.title,
            estimatedMinutes: t.estimatedMinutes,
            category: t.category || 'General',
            scheduledDate: day.date,
            status: 'pending'
          });
        }
      }
      if (newTasks.length > 0) {
        await Task.insertMany(newTasks);
      }
    }

    const updatedTasks = await Task.find({ planId: plan._id }).sort({ scheduledDate: 1 });
    res.json({
      message: 'Busy slots updated and plan schedule recalculated successfully!',
      plan,
      tasks: updatedTasks
    });
  } catch (err) {
    next(err);
  }
};

