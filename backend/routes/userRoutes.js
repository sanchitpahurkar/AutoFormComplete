// backend/routes/userRoutes.js
import express from "express";
import { createUser, getUserByClerkId, updateUserByClerkId } from "../controllers/userController.js";

const router = express.Router();

router.post("/", createUser); // POST /api/users
router.get("/me", getUserByClerkId); // GET /api/users/me
router.put("/me", updateUserByClerkId); // PUT /api/users/me

export default router;
