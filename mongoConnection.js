require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error('MONGODB_URI is required');

let isConnected = false;

async function connectToMongoDB() {
  if (isConnected) {
    console.log('✅ MongoDB already connected');
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    console.log('✅ MongoDB connected successfully at ' + MONGODB_URI);
    return mongoose.connection;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('MongoDB is required. Please install and start MongoDB locally:');
    console.error('1. Download: https://www.mongodb.com/try/download/community');
    console.error('2. Install MongoDB Community Edition');
    console.error('3. Start MongoDB service (mongod.exe on Windows)');
    console.error('4. Try again');
    
    // Don't exit, let the app try to connect on retry
    isConnected = false;
    throw error;
  }
}

function getConnection() {
  return mongoose.connection;
}

function disconnect() {
  return mongoose.disconnect();
}

module.exports = {
  connectToMongoDB,
  getConnection,
  disconnect,
  mongoose
};
