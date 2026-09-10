const dayjs = require('dayjs');
const RewardsProfile = require('../models/RewardsProfile');
const PointsTransaction = require('../models/PointsTransaction');
const Task = require('../models/Task');
const Plan = require('../models/Plan');
const { getOrCreateRewardsProfile, processCheckInRewards } = require('../utils/rewardsEngine');

/**
 * GET /api/rewards/summary
 */
exports.getSummary = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Record check-in streak automatically
    const profile = await processCheckInRewards(userId);

    // Calculate points earned today
    const startOfToday = dayjs().startOf('day').toDate();
    const todayTransactions = await PointsTransaction.find({
      userId,
      amount: { $gt: 0 },
      createdAt: { $gte: startOfToday }
    });

    const pointsEarnedToday = todayTransactions.reduce((acc, t) => acc + t.amount, 0);

    // Calculate tier progress
    const tierLimits = { starter: 250, focused: 500, elite: 1000 };
    const nextTierTarget = tierLimits[profile.currentTier] || 1000;
    const tierProgressPct = Math.min(100, Math.round((profile.pointsThisMonth / nextTierTarget) * 100));

    res.json({
      totalPoints: profile.totalPoints,
      pointsThisMonth: profile.pointsThisMonth,
      pointsEarnedToday,
      currentTier: profile.currentTier,
      nextTierTarget,
      tierProgressPct,
      streaks: profile.streaks,
      streakProtectionEnabled: profile.streakProtectionEnabled,
      streakProtectionUsedThisMonth: profile.streakProtectionUsedThisMonth,
      extraShields: profile.extraShields || 0,
      activeTheme: profile.activeTheme || 'light',
      monthlyBonus: profile.monthlyBonus,
      unlockedPerks: profile.unlockedPerks
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/rewards/today-set
 * Returns today's task tiles + 2 bonus activity tiles
 */
exports.getTodaySet = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const activePlan = await Plan.findOne({ userId, status: 'active' });
    const profile = await getOrCreateRewardsProfile(userId);

    const todayStr = dayjs().format('YYYY-MM-DD');
    let taskTiles = [];

    if (activePlan) {
      const todayTasks = await Task.find({ planId: activePlan._id, scheduledDate: todayStr });
      taskTiles = todayTasks.map(t => ({
        id: t._id.toString(),
        type: 'task',
        title: t.title,
        points: 10,
        estimatedTime: `${t.estimatedMinutes} mins`,
        completed: t.status === 'done'
      }));
    }

    // 2 Small Bonus Activity Tiles
    const bonusTiles = [
      {
        id: `bonus_notes_${todayStr}`,
        type: 'bonus',
        title: 'Review yesterday\'s study notes',
        points: 5,
        estimatedTime: '5 mins',
        completed: profile.bonusTilesCompleted.includes(`bonus_notes_${todayStr}`)
      },
      {
        id: `bonus_prep_${todayStr}`,
        type: 'bonus',
        title: 'Organize study desk & materials',
        points: 5,
        estimatedTime: '3 mins',
        completed: profile.bonusTilesCompleted.includes(`bonus_prep_${todayStr}`)
      }
    ];

    res.json({
      taskTiles,
      bonusTiles,
      totalTiles: taskTiles.length + bonusTiles.length,
      completedCount: taskTiles.filter(t => t.completed).length + bonusTiles.filter(t => t.completed).length
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/rewards/complete-bonus-tile
 */
exports.completeBonusTile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { tileId } = req.body;

    if (!tileId) {
      return res.status(400).json({ error: { message: 'tileId is required', code: 'MISSING_TILE_ID' } });
    }

    const profile = await getOrCreateRewardsProfile(userId);

    if (profile.bonusTilesCompleted.includes(tileId)) {
      return res.status(400).json({ error: { message: 'Bonus tile already completed today', code: 'ALREADY_COMPLETED' } });
    }

    profile.bonusTilesCompleted.push(tileId);
    profile.totalPoints += 5;
    profile.pointsThisMonth += 5;
    await profile.save();

    await PointsTransaction.create({
      userId,
      amount: 5,
      reason: 'bonus_tile',
      description: 'Completed Bonus Activity Tile (+5 pts)'
    });

    res.json({
      message: 'Bonus tile completed! +5 Study Points earned.',
      totalPoints: profile.totalPoints,
      pointsThisMonth: profile.pointsThisMonth
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/rewards/punch-cards
 */
exports.getPunchCards = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const profile = await getOrCreateRewardsProfile(userId);
    res.json({ punchCards: profile.punchCards });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/rewards/streak-protection
 */
exports.toggleStreakProtection = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { enabled } = req.body;

    const profile = await getOrCreateRewardsProfile(userId);
    profile.streakProtectionEnabled = Boolean(enabled);
    await profile.save();

    res.json({
      message: `Streak Protection ${profile.streakProtectionEnabled ? 'Enabled' : 'Disabled'}`,
      streakProtectionEnabled: profile.streakProtectionEnabled,
      streakProtectionUsedThisMonth: profile.streakProtectionUsedThisMonth
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/rewards/history?range=week|month
 */
exports.getHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { range = 'month' } = req.query;

    const daysCount = range === 'week' ? 7 : 30;
    const startDate = dayjs().subtract(daysCount, 'day').startOf('day').toDate();

    const transactions = await PointsTransaction.find({
      userId,
      createdAt: { $gte: startDate }
    }).sort({ createdAt: -1 });

    // Daily points breakdown chart data for last 30 days
    const chartData = [];
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = dayjs().subtract(i, 'day');
      const dateStr = d.format('YYYY-MM-DD');
      const dayLabel = d.format('MMM D');

      const dayStart = d.startOf('day').toDate();
      const dayEnd = d.endOf('day').toDate();

      const dayTxns = transactions.filter(t => t.createdAt >= dayStart && t.createdAt <= dayEnd && t.amount > 0);
      const pointsEarned = dayTxns.reduce((acc, t) => acc + t.amount, 0);

      chartData.push({
        date: dateStr,
        dayLabel,
        points: pointsEarned
      });
    }

    res.json({
      transactions,
      chartData,
      totalEarnedInRange: transactions.filter(t => t.amount > 0).reduce((a, b) => a + b.amount, 0)
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/rewards/redeem
 */
exports.redeemPerk = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { perkId, perkTitle, cost } = req.body;

    if (!perkId || !cost || Number(cost) <= 0) {
      return res.status(400).json({ error: { message: 'Invalid perk or cost', code: 'INVALID_PERK' } });
    }

    const profile = await getOrCreateRewardsProfile(userId);

    if (profile.totalPoints < cost) {
      return res.status(400).json({ error: { message: 'Insufficient Study Points balance', code: 'INSUFFICIENT_POINTS' } });
    }

    profile.totalPoints -= Number(cost);
    if (!profile.unlockedPerks.includes(perkId)) {
      profile.unlockedPerks.push(perkId);
    }

    // Apply specific perk side-effects!
    if (perkId === 'perk_focus_theme') {
      profile.activeTheme = 'dark';
    } else if (perkId === 'perk_streak_shield') {
      profile.extraShields = (profile.extraShields || 0) + 1;
      profile.streakProtectionEnabled = true;
    }

    await profile.save();

    await PointsTransaction.create({
      userId,
      amount: -Number(cost),
      reason: 'redeemed',
      description: `Redeemed Perk: ${perkTitle || perkId} (-${cost} pts)`
    });

    res.json({
      message: `Successfully redeemed "${perkTitle || perkId}"!`,
      totalPoints: profile.totalPoints,
      unlockedPerks: profile.unlockedPerks,
      activeTheme: profile.activeTheme,
      extraShields: profile.extraShields
    });
  } catch (err) {
    next(err);
  }
};
