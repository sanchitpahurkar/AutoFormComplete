import express from "express";
import { createUser, getUserByClerkId, updateUserByClerkId } from "../controllers/userController.js";

const router = express.Router();

// POST -> /api/users -> create user
router.post("/", createUser);

// get users by clerk id
router.get("/me", getUserByClerkId);

// update users by clerkId
router.put("/me", updateUserByClerkId);

export default router;