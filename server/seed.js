const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dayjs = require('dayjs');
const dotenv = require('dotenv');
dotenv.config();

const User = require('./models/User');
const Plan = require('./models/Plan');
const Task = require('./models/Task');

async function seed() {
  let mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/study_streak_rescue';

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
    console.log(`[Seed] Connected to ${mongoUri}`);
  } catch (err) {
    console.warn(`[Seed] Could not connect to local Mongo. Launching MongoMemoryServer...`);
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    console.log(`[Seed] Connected to memory mongo: ${mongoUri}`);
  }

  // Clear existing demo user
  const email = 'demo@example.com';
  await User.deleteMany({ email });
  
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  const user = await User.create({
    name: 'Alex Rivera',
    email,
    passwordHash
  });

  await Plan.deleteMany({ userId: user._id });
  await Task.deleteMany({ userId: user._id });

  const twoDaysAgoStr = dayjs().subtract(2, 'day').format('YYYY-MM-DD');
  const yesterdayStr = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
  const todayStr = dayjs().format('YYYY-MM-DD');
  const tomorrowStr = dayjs().add(1, 'day').format('YYYY-MM-DD');
  const in3DaysStr = dayjs().add(3, 'day').format('YYYY-MM-DD');
  const in5DaysStr = dayjs().add(5, 'day').format('YYYY-MM-DD');

  const plan = await Plan.create({
    userId: user._id,
    title: 'CS101 Data Structures Catch-Up',
    originalDeadline: dayjs().subtract(3, 'day').toDate(),
    targetDate: dayjs().add(7, 'day').toDate(),
    availableMinutesPerDay: 90,
    busySlots: [{ dayOfWeek: 0, startTime: '10:00', endTime: '12:00', blockedMinutes: 120 }],
    status: 'active',
    version: 1
  });

  const sampleTasks = [
    // Completed past tasks (2 days ago)
    {
      planId: plan._id,
      userId: user._id,
      title: 'Review Arrays & Linked Lists Notes',
      estimatedMinutes: 45,
      scheduledDate: twoDaysAgoStr,
      status: 'done',
      completedAt: dayjs().subtract(2, 'day').toDate()
    },
    {
      planId: plan._id,
      userId: user._id,
      title: 'Stack & Queue Exercises (Q1-Q5)',
      estimatedMinutes: 40,
      scheduledDate: twoDaysAgoStr,
      status: 'done',
      completedAt: dayjs().subtract(2, 'day').toDate()
    },
    // Missed past task (yesterday) - triggers recovery alert banner!
    {
      planId: plan._id,
      userId: user._id,
      title: 'Recursion & Backtracking Lab',
      estimatedMinutes: 60,
      scheduledDate: yesterdayStr,
      status: 'missed',
      completedAt: null
    },
    // Today's tasks
    {
      planId: plan._id,
      userId: user._id,
      title: 'Binary Search Tree Implementation',
      estimatedMinutes: 45,
      scheduledDate: todayStr,
      status: 'pending',
      completedAt: null
    },
    {
      planId: plan._id,
      userId: user._id,
      title: 'Big-O Analysis Worksheet',
      estimatedMinutes: 30,
      scheduledDate: todayStr,
      status: 'pending',
      completedAt: null
    },
    // Future tasks
    {
      planId: plan._id,
      userId: user._id,
      title: 'Graph Traversal (BFS & DFS)',
      estimatedMinutes: 60,
      scheduledDate: tomorrowStr,
      status: 'pending',
      completedAt: null
    },
    {
      planId: plan._id,
      userId: user._id,
      title: 'Dynamic Programming Basics',
      estimatedMinutes: 50,
      scheduledDate: in3DaysStr,
      status: 'pending',
      completedAt: null
    },
    {
      planId: plan._id,
      userId: user._id,
      title: 'Practice Exam Review Questions',
      estimatedMinutes: 45,
      scheduledDate: in5DaysStr,
      status: 'pending',
      completedAt: null
    }
  ];

  await Task.insertMany(sampleTasks);

  console.log('\n======================================================');
  console.log('  SUCCESSFULLY SEEDED DEMO DATA FOR STUDY STREAK RESCUE');
  console.log('======================================================');
  console.log(`Demo User Email: ${user.email}`);
  console.log(`Demo Password:   password123`);
  console.log(`Plan Created:    "${plan.title}" (Version ${plan.version})`);
  console.log(`Tasks Created:   ${sampleTasks.length} tasks (includes 1 missed task yesterday to test Regenerate)`);
  console.log('======================================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed script error:', err);
  process.exit(1);
});
