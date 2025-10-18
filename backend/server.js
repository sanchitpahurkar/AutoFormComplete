import express from "express";
import connectDB from "./db.js";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./routes/userRoutes.js";
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";


dotenv.config();

const app = express();
app.use(cors(
  {
  origin: "http://localhost:5173", // or whatever your React dev server runs on
  credentials: true
}
));
app.use(express.json());

// db connection
connectDB();

// routes
app.use("/api/users", ClerkExpressRequireAuth(), userRoutes);

// server initialization
let PORT = process.env.PORT;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));


