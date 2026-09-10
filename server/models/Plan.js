const mongoose = require('mongoose');

const busySlotSchema = new mongoose.Schema({
  dayOfWeek: { type: Number, required: true }, // 0=Sun, 6=Sat
  startTime: { type: String }, // e.g. "09:00"
  endTime: { type: String },   // e.g. "11:00"
  blockedMinutes: { type: Number }
}, { _id: false });

const planSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Plan title is required'],
    trim: true
  },
  originalDeadline: {
    type: Date
  },
  targetDate: {
    type: Date,
    required: [true, 'Target date is required']
  },
  availableMinutesPerDay: {
    type: Number,
    required: true,
    default: 120
  },
  busySlots: [busySlotSchema],
  status: {
    type: String,
    enum: ['active', 'completed', 'abandoned'],
    default: 'active'
  },
  version: {
    type: Number,
    default: 1
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Plan', planSchema);
