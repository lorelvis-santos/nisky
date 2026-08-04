import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { validateBody, validateParams, validateQuery } from "../../middlewares/validate.middleware";
import { PomodoroController } from "./pomodoro.controller";
import { sessionActionSchema, sessionIdSchema, sessionQuerySchema, startSessionSchema, statsQuerySchema, updateSettingsSchema } from "./pomodoro.validator";

const router = Router();
const controller = new PomodoroController();

router.use(requireAuth);
router.get("/settings", controller.getSettings);
router.patch("/settings", validateBody(updateSettingsSchema), controller.updateSettings);
router.get("/stats", validateQuery(statsQuerySchema), controller.stats);
router.get("/sessions", validateQuery(sessionQuerySchema), controller.list);
router.post("/sessions", validateBody(startSessionSchema), controller.start);
router.get("/sessions/:id", validateParams(sessionIdSchema), controller.getById);
router.patch("/sessions/:id", validateParams(sessionIdSchema), validateBody(sessionActionSchema), controller.action);

export default router;
