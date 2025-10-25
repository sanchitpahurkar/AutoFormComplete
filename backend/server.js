// backend/server.js

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import connectDB from './db.js';
import userRoutes from './routes/userRoutes.js';
import autofillRoutes from './routes/autofillRoutes.js';

// Clerk middleware
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';

const app = express();
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

(async () => {
  try {
    await connectDB();

    // User routes (protected)
    app.use('/api/users', ClerkExpressRequireAuth(), userRoutes);

    // Autofill routes (can be public or protected)
    app.use('/api/autofill', autofillRoutes); // <-- FIXED MOUNT PATH

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error('Server startup error', err);
    process.exit(1);
  }
})();
