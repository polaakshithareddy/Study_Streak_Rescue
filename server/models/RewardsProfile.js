const mongoose = require('mongoose');

const streakSchema = new mongoose.Schema({
  current: { type: Number, default: 0 },
  best: { type: Number, default: 0 },
  lastDate: { type: String, default: null }
}, { _id: false });

const punchCardSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  totalSlots: { type: Number, required: true },
  filledSlots: { type: Number, default: 0 },
  rewardPoints: { type: Number, required: true },
  status: { type: String, enum: ['in_progress', 'completed'], default: 'in_progress' }
}, { _id: false });

const rewardsProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  totalPoints: {
    type: Number,
    default: 0
  },
  pointsThisMonth: {
    type: Number,
    default: 0
  },
  currentTier: {
    type: String,
    enum: ['starter', 'focused', 'elite'],
    default: 'starter'
  },
  tierMonth: {
    type: String, // format YYYY-MM
    required: true
  },
  streaks: {
    dailyTask: { type: streakSchema, default: () => ({ current: 0, best: 0, lastDate: null }) },
    fullDay: { type: streakSchema, default: () => ({ current: 0, best: 0, lastDate: null }) },
    checkIn: { type: streakSchema, default: () => ({ current: 0, best: 0, lastDate: null }) }
  },
  streakProtectionEnabled: {
    type: Boolean,
    default: false
  },
  streakProtectionUsedThisMonth: {
    type: Boolean,
    default: false
  },
  punchCards: [punchCardSchema],
  monthlyBonus: {
    targetPoints: { type: Number, default: 250 },
    targetActivities: { type: Number, default: 2 },
    activitiesDone: { type: Number, default: 0 },
    claimed: { type: Boolean, default: false }
  },
  bonusTilesCompleted: [{ type: String }],
  unlockedPerks: [{ type: String }],
  extraShields: {
    type: Number,
    default: 0
  },
  activeTheme: {
    type: String,
    default: 'light'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('RewardsProfile', rewardsProfileSchema);
