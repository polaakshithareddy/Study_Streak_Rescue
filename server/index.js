const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const planRoutes = require('./routes/planRoutes');
const taskRoutes = require('./routes/taskRoutes');
const progressRoutes = require('./routes/progressRoutes');
const rewardsRoutes = require('./routes/rewardsRoutes');

const { apiRateLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/api/', apiRateLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/rewards', rewardsRoutes);

const fs = require('fs');
const path = require('path');

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Study Streak Rescue API', timestamp: new Date() });
});

// Serve static frontend assets whenever client/dist exists
const clientDistPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath) || process.env.NODE_ENV === 'production') {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(clientDistPath, 'index.html'));
  });
}

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error('[API ERROR]', err);
  const status = err.status || 500;
  res.status(status).json({
    error: {
      message: err.message || 'Internal Server Error',
      code: err.code || 'SERVER_ERROR'
    }
  });
});

async function startServer() {
  let mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/study_streak_rescue';
  
  try {
    // Attempt standard Mongoose connection
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
    console.log(`[MongoDB] Connected successfully to ${mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
  } catch (err) {
    console.error('[MongoDB Connection Error Detail]:', err.message);
    console.warn(`[MongoDB Warning] Could not connect to Mongo at ${mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}. Falling back to MongoMemoryServer...`);
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
      console.log(`[MongoDB Memory Server] Connected in-memory at ${mongoUri}`);
    } catch (memErr) {
      console.error('[MongoDB Error] Failed to connect to MongoDB memory server:', memErr);
    }
  }

  app.listen(PORT, () => {
    console.log(`[Study Streak Rescue Server] Running on http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
