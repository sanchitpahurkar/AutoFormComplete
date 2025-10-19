import express from "express";
import connectDB from "./db.js"; 
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./routes/userRoutes.js";
import autofillRoutes from "./routes/autofillRoutes.js"; // <-- NEW IMPORT: Autofill Routes
import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";


dotenv.config();

const app = express();
app.use(cors(
    {
        origin: "http://localhost:5173", // React frontend running on 5173
        credentials: true
    }
));
app.use(express.json());

// DB Connection
connectDB();

// Routes
// 1. User routes require Clerk Authentication
app.use("/api/users", ClerkExpressRequireAuth(), userRoutes);

// 2. Autofill routes (API root) - Clerk authentication is NOT applied here, 
//    as we handle auth logic within the controller using data from the frontend body.
app.use("/api", autofillRoutes); // <-- NEW LINE: Registers the /api/autofill route

// Simple health check route
app.get('/', (req, res) => {
    res.send('AutoFormComplete Backend API is Running');
});

// Server Initialization
let PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));