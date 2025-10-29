// backend/server.js

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import connectDB from './db.js';
import userRoutes from './routes/userRoutes.js';
import autofillRoutes from './routes/autofillRoutes.js';
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import { execSync } from 'child_process';
import fs from 'fs';

// ✅ Ensure Playwright Chromium exists at runtime (important for Render)
const browserPath = '/opt/render/.cache/ms-playwright/chromium-1194/chrome-linux/chrome';
try {
  if (!fs.existsSync(browserPath)) {
    console.log('⚙️ Playwright Chromium missing. Installing...');
    execSync('npx playwright install chromium', { stdio: 'inherit' });
  } else {
    console.log('✅ Playwright Chromium found.');
  }
} catch (err) {
  console.error('❌ Failed to ensure Playwright installation:', err);
}

const app = express();
app.use(express.json());
app.use(cors({
  origin: (process.env.FRONTEND_ORIGIN || 'http://localhost:5173').replace(/\/$/, ''),
  credentials: true
}));

(async () => {
  try {
    await connectDB();

    // Protected user routes
    app.use('/api/users', ClerkExpressRequireAuth(), userRoutes);

    // Autofill routes (public or protected depending on use case)
    app.use('/api/autofill', autofillRoutes);

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  } catch (err) {
    console.error('❌ Server startup error:', err);
    process.exit(1);
  }
})();
