import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import healthRoutes from "../modules/health/health.routes";
import uploadRoutes from "../modules/uploads/uploads.routes";

const router = Router();
router.use("/auth", authRoutes);
router.use("/health", healthRoutes);
router.use("/uploads", uploadRoutes);

export default router;
