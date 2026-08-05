import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { validateBody, validateParams, validateQuery } from "../../middlewares/validate.middleware";
import { ReminderController } from "./reminders.controller";
import { createReminderSchema, idParamSchema, reminderQuerySchema, snoozeReminderSchema, updateReminderSchema } from "./reminders.validator";

const router = Router();
const controller = new ReminderController();

router.use(requireAuth);
router.get("/", validateQuery(reminderQuerySchema), controller.list);
router.post("/", validateBody(createReminderSchema), controller.create);
router.get("/:id", validateParams(idParamSchema), controller.get);
router.patch("/:id", validateParams(idParamSchema), validateBody(updateReminderSchema), controller.update);
router.delete("/:id", validateParams(idParamSchema), controller.delete);
router.post("/:id/snooze", validateParams(idParamSchema), validateBody(snoozeReminderSchema), controller.snooze);

export default router;
