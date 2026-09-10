const mongoose = require('mongoose');

const pointsTransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true // positive for earned, negative for redeemed
  },
  reason: {
    type: String,
    enum: [
      'task_complete',
      'full_day_bonus',
      'streak_bonus',
      'monthly_bonus',
      'plan_complete',
      'bonus_tile',
      'punch_card',
      'check_in',
      'redeemed'
    ],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  relatedTaskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('PointsTransaction', pointsTransactionSchema);
