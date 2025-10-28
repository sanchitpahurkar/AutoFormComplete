// backend/routes/userRoutes.js
import express from "express";
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';
import { createUser, getUserByClerkId, updateUserByClerkId, getAllUsers, getUserById } from "../controllers/userController.js";

const router = express.Router();

router.post("/", createUser); // POST /api/users
router.get("/me", getUserByClerkId); // GET /api/users/me
router.put("/me", updateUserByClerkId); // PUT /api/users/me

// ✅ Protect all admin routes
router.get('/all', ClerkExpressRequireAuth(), getAllUsers);
router.get('/:id', ClerkExpressRequireAuth(), getUserById);

export default router;
