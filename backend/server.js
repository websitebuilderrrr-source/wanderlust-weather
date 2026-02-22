const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const cron = require('node-cron');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Import routes
const authRoutes = require('./routes/auth');
const weatherRoutes = require('./routes/weather');
const userRoutes = require('./routes/user');
const alertRoutes = require('./routes/alerts');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/user', userRoutes);
app.use('/api/alerts', alertRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// MongoDB Connection
const connectDB = async () => {
  try {
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('MongoDB Connected');
    } else {
      console.log('No MongoDB URI provided - running without database');
    }
  } catch (error) {
    console.error('MongoDB connection error:', error);
    // Continue running even if DB connection fails
  }
};

connectDB();

// Schedule weather alerts check (every hour)
cron.schedule('0 * * * *', async () => {
  console.log('Checking weather alerts...');
  // Alert checking logic will go here
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;