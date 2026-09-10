const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true
  },
  estimatedMinutes: {
    type: Number,
    required: true,
    default: 30
  },
  category: {
    type: String,
    default: 'General'
  },
  scheduledDate: {
    type: String, // YYYY-MM-DD format
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'done', 'missed'],
    default: 'pending'
  },
  completedAt: {
    type: Date,
    default: null
  },
  originalTaskId: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Task', taskSchema);
