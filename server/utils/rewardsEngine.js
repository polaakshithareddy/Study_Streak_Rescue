const dayjs = require('dayjs');
const RewardsProfile = require('../models/RewardsProfile');
const PointsTransaction = require('../models/PointsTransaction');

/**
 * Ensures a user has a RewardsProfile initialized for the current month.
 */
async function getOrCreateRewardsProfile(userId) {
  const currentMonthStr = dayjs().format('YYYY-MM');
  let profile = await RewardsProfile.findOne({ userId });

  if (!profile) {
    profile = await RewardsProfile.create({
      userId,
      totalPoints: 0,
      pointsThisMonth: 0,
      currentTier: 'starter',
      tierMonth: currentMonthStr,
      streaks: {
        dailyTask: { current: 0, best: 0, lastDate: null },
        fullDay: { current: 0, best: 0, lastDate: null },
        checkIn: { current: 0, best: 0, lastDate: null }
      },
      punchCards: [
        {
          id: 'pc_5day_sprint',
          title: '5-Day Study Sprint',
          description: 'Complete tasks on 5 separate days this month',
          totalSlots: 5,
          filledSlots: 0,
          rewardPoints: 50,
          status: 'in_progress'
        },
        {
          id: 'pc_2plan_recovery',
          title: 'Catch-Up Champion',
          description: 'Complete 2 full catch-up milestones',
          totalSlots: 2,
          filledSlots: 0,
          rewardPoints: 100,
          status: 'in_progress'
        }
      ],
      monthlyBonus: {
        targetPoints: 250,
        targetActivities: 2,
        activitiesDone: 0,
        claimed: false
      }
    });
  } else if (profile.tierMonth !== currentMonthStr) {
    // New calendar month reset for monthly tiers and pointsThisMonth
    profile.tierMonth = currentMonthStr;
    profile.pointsThisMonth = 0;
    profile.currentTier = 'starter';
    profile.streakProtectionUsedThisMonth = false;
    profile.monthlyBonus = {
      targetPoints: 250,
      targetActivities: 2,
      activitiesDone: 0,
      claimed: false
    };
    // Reset punch cards for new month
    profile.punchCards = [
      {
        id: 'pc_5day_sprint',
        title: '5-Day Study Sprint',
        description: 'Complete tasks on 5 separate days this month',
        totalSlots: 5,
        filledSlots: 0,
        rewardPoints: 50,
        status: 'in_progress'
      },
      {
        id: 'pc_2plan_recovery',
        title: 'Catch-Up Champion',
        description: 'Complete 2 full catch-up milestones',
        totalSlots: 2,
        filledSlots: 0,
        rewardPoints: 100,
        status: 'in_progress'
      }
    ];
    await profile.save();
  }

  return profile;
}

/**
 * Re-evaluates tier status based on points earned this month
 */
function calculateTier(pointsThisMonth) {
  if (pointsThisMonth >= 500) return 'elite';
  if (pointsThisMonth >= 250) return 'focused';
  return 'starter';
}

/**
 * Awards points and updates streaks & punch cards on task completion (idempotent)
 */
async function processTaskCompletionRewards(userId, task, isDayCleared) {
  const profile = await getOrCreateRewardsProfile(userId);
  const todayStr = dayjs().format('YYYY-MM-DD');
  const yesterdayStr = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

  // Check if points were ALREADY awarded for this specific task
  const existingTxn = await PointsTransaction.findOne({
    userId,
    relatedTaskId: task._id,
    reason: 'task_complete'
  });

  if (existingTxn) {
    // Points were already awarded for this task — do not award again!
    return { profile, pointsGained: 0, alreadyAwarded: true };
  }

  let pointsGained = 0;

  // 1. Base Task Points (+10 pts)
  pointsGained += 10;
  await PointsTransaction.create({
    userId,
    amount: 10,
    reason: 'task_complete',
    description: `Completed task: ${task.title}`,
    relatedTaskId: task._id
  });

  // 2. Full-Day Clearance Bonus (+15 pts)
  if (isDayCleared) {
    pointsGained += 15;
    await PointsTransaction.create({
      userId,
      amount: 15,
      reason: 'full_day_bonus',
      description: `Cleared all tasks for today! (+15 Bonus)`,
      relatedTaskId: task._id
    });
  }

  // 3. Update Daily Task Streak
  const dt = profile.streaks.dailyTask;
  if (dt.lastDate !== todayStr) {
    if (dt.lastDate === yesterdayStr) {
      dt.current += 1;
    } else if (dt.lastDate === null || !dt.lastDate) {
      dt.current = 1;
    } else {
      // Check if streak protection is enabled
      if (profile.streakProtectionEnabled && !profile.streakProtectionUsedThisMonth) {
        profile.streakProtectionUsedThisMonth = true;
        dt.current += 1; // Protect streak!
      } else {
        dt.current = 1; // Reset streak
      }
    }
    dt.best = Math.max(dt.best, dt.current);
    dt.lastDate = todayStr;

    // Daily Streak Bonus (+5 pts/day)
    pointsGained += 5;
    await PointsTransaction.create({
      userId,
      amount: 5,
      reason: 'streak_bonus',
      description: `Daily task streak maintained (${dt.current} days)`,
      relatedTaskId: task._id
    });
  }

  // 4. Update Full-Day Streak
  if (isDayCleared) {
    const fd = profile.streaks.fullDay;
    if (fd.lastDate !== todayStr) {
      if (fd.lastDate === yesterdayStr) {
        fd.current += 1;
      } else {
        fd.current = 1;
      }
      fd.best = Math.max(fd.best, fd.current);
      fd.lastDate = todayStr;
    }
  }

  // 5. Update Punch Cards
  for (const pc of profile.punchCards) {
    if (pc.status === 'in_progress') {
      if (pc.id === 'pc_5day_sprint' && dt.lastDate === todayStr) {
        pc.filledSlots = Math.min(pc.totalSlots, pc.filledSlots + 1);
      } else if (pc.id === 'pc_2plan_recovery' && isDayCleared) {
        pc.filledSlots = Math.min(pc.totalSlots, pc.filledSlots + 1);
      }

      if (pc.filledSlots >= pc.totalSlots) {
        pc.status = 'completed';
        pointsGained += pc.rewardPoints;
        await PointsTransaction.create({
          userId,
          amount: pc.rewardPoints,
          reason: 'punch_card',
          description: `Completed Punch Card: ${pc.title} (+${pc.rewardPoints} pts)`
        });
      }
    }
  }

  // 6. Update Profile Points & Monthly Tier
  profile.totalPoints += pointsGained;
  profile.pointsThisMonth += pointsGained;
  profile.currentTier = calculateTier(profile.pointsThisMonth);

  // 7. Check Monthly Consistency Bonus (+50 to +150 pts)
  const mb = profile.monthlyBonus;
  if (!mb.claimed && profile.pointsThisMonth >= mb.targetPoints && dt.current >= 3) {
    mb.claimed = true;
    const bonusAmount = profile.currentTier === 'elite' ? 150 : profile.currentTier === 'focused' ? 100 : 50;
    profile.totalPoints += bonusAmount;
    profile.pointsThisMonth += bonusAmount;
    await PointsTransaction.create({
      userId,
      amount: bonusAmount,
      reason: 'monthly_bonus',
      description: `Monthly Consistency Bonus unlocked! (+${bonusAmount} pts)`
    });
  }

  await profile.save();
  return { profile, pointsGained };
}

/**
 * Records daily Check-In streak
 */
async function processCheckInRewards(userId) {
  const profile = await getOrCreateRewardsProfile(userId);
  const todayStr = dayjs().format('YYYY-MM-DD');
  const yesterdayStr = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

  const ci = profile.streaks.checkIn;
  if (ci.lastDate !== todayStr) {
    if (ci.lastDate === yesterdayStr) {
      ci.current += 1;
    } else {
      ci.current = 1;
    }
    ci.best = Math.max(ci.best, ci.current);
    ci.lastDate = todayStr;

    profile.totalPoints += 5;
    profile.pointsThisMonth += 5;
    profile.currentTier = calculateTier(profile.pointsThisMonth);

    await PointsTransaction.create({
      userId,
      amount: 5,
      reason: 'check_in',
      description: `Daily App Check-In bonus`
    });

    await profile.save();
  }
  return profile;
}

/**
 * Deducts points if a task is unchecked (undone)
 */
async function revokeTaskCompletionRewards(userId, task) {
  const profile = await getOrCreateRewardsProfile(userId);
  const txns = await PointsTransaction.find({
    userId,
    relatedTaskId: task._id,
    amount: { $gt: 0 }
  });

  if (txns.length > 0) {
    const totalAwarded = txns.reduce((acc, t) => acc + t.amount, 0);
    profile.totalPoints = Math.max(0, profile.totalPoints - totalAwarded);
    profile.pointsThisMonth = Math.max(0, profile.pointsThisMonth - totalAwarded);
    await profile.save();

    await PointsTransaction.deleteMany({ userId, relatedTaskId: task._id });
    await PointsTransaction.create({
      userId,
      amount: -totalAwarded,
      reason: 'task_complete',
      description: `Task unchecked: ${task.title} (-${totalAwarded} pts)`,
      relatedTaskId: task._id
    });
  }

  return profile;
}

module.exports = {
  getOrCreateRewardsProfile,
  calculateTier,
  processTaskCompletionRewards,
  processCheckInRewards,
  revokeTaskCompletionRewards
};
