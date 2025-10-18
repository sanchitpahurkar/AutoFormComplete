import express from "express";
import { createUser, getAllUsers } from "../controllers/userController.js";

const router = express.Router();

// POST -> /api/users -> create user
router.post("/", createUser);

// GET -> /api/users -> fetch all users
router.get("/", getAllUsers);

export default router;