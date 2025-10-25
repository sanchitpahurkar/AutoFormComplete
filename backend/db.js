// backend/config/db.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI is not set. Please add it to backend/.env');
  // do not exit immediately here — caller can handle it, but log clearly
}

mongoose.set('strictQuery', false);

const connectDB = async () => {
  try {
    if (!MONGO_URI) throw new Error('MONGO_URI not provided');
    const conn = await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // fail fast if cannot connect
    });
    console.log(`✅ MongoDB connected: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message || error);
    // print full stack in dev
    console.error(error.stack || error);
    // rethrow so server startup can handle failure if desired
    throw error;
  }
};

export default connectDB;
