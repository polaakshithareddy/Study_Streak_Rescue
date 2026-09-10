const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../middleware/auth');

exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        error: {
          message: 'Please provide name, email, and password.',
          code: 'MISSING_FIELDS'
        }
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        error: {
          message: 'An account with this email already exists.',
          code: 'EMAIL_EXISTS'
        }
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash
    });

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: {
          message: 'Please provide both email and password.',
          code: 'MISSING_FIELDS'
        }
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({
        error: {
          message: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        }
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        error: {
          message: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        }
      });
    }

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        }
      });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.seedDemo = async (req, res, next) => {
  try {
    const dayjs = require('dayjs');
    const Plan = require('../models/Plan');
    const Task = require('../models/Task');
    const userId = req.user.id;

    await Plan.deleteMany({ userId });
    await Task.deleteMany({ userId });

    const twoDaysAgoStr = dayjs().subtract(2, 'day').format('YYYY-MM-DD');
    const yesterdayStr = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
    const todayStr = dayjs().format('YYYY-MM-DD');
    const tomorrowStr = dayjs().add(1, 'day').format('YYYY-MM-DD');
    const in3DaysStr = dayjs().add(3, 'day').format('YYYY-MM-DD');

    const plan = await Plan.create({
      userId,
      title: 'CS101 Data Structures Catch-Up',
      originalDeadline: dayjs().subtract(3, 'day').toDate(),
      targetDate: dayjs().add(7, 'day').toDate(),
      availableMinutesPerDay: 90,
      busySlots: [{ dayOfWeek: 0, startTime: '10:00', endTime: '12:00', blockedMinutes: 120 }],
      status: 'active',
      version: 1
    });

    const sampleTasks = [
      { planId: plan._id, userId, title: 'Review Arrays & Linked Lists Notes', estimatedMinutes: 45, scheduledDate: twoDaysAgoStr, status: 'done', completedAt: dayjs().subtract(2, 'day').toDate() },
      { planId: plan._id, userId, title: 'Stack & Queue Exercises (Q1-Q5)', estimatedMinutes: 40, scheduledDate: twoDaysAgoStr, status: 'done', completedAt: dayjs().subtract(2, 'day').toDate() },
      { planId: plan._id, userId, title: 'Recursion & Backtracking Lab', estimatedMinutes: 60, scheduledDate: yesterdayStr, status: 'missed', completedAt: null },
      { planId: plan._id, userId, title: 'Binary Search Tree Implementation', estimatedMinutes: 45, scheduledDate: todayStr, status: 'pending', completedAt: null },
      { planId: plan._id, userId, title: 'Big-O Analysis Worksheet', estimatedMinutes: 30, scheduledDate: todayStr, status: 'pending', completedAt: null },
      { planId: plan._id, userId, title: 'Graph Traversal (BFS & DFS)', estimatedMinutes: 60, scheduledDate: tomorrowStr, status: 'pending', completedAt: null },
      { planId: plan._id, userId, title: 'Dynamic Programming Basics', estimatedMinutes: 50, scheduledDate: in3DaysStr, status: 'pending', completedAt: null }
    ];

    await Task.insertMany(sampleTasks);

    res.json({ message: 'Demo plan re-seeded successfully!', plan });
  } catch (err) {
    next(err);
  }
};
