import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import healthRoutes from "../modules/health/health.routes";
import uploadRoutes from "../modules/uploads/uploads.routes";
import taskRoutes from "../modules/tasks/tasks.routes";
import habitRoutes from "../modules/habits/habits.routes";
import quickNoteRoutes from "../modules/quicknotes/quicknotes.routes";

const router = Router();
router.use("/auth", authRoutes);
router.use("/health", healthRoutes);
router.use("/uploads", uploadRoutes);
router.use("/tasks", taskRoutes);
router.use("/habits", habitRoutes);
router.use("/quick-notes", quickNoteRoutes);

export default router;
