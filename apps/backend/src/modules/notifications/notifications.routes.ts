import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { NotificationController } from "./notifications.controller";
import { updateNotificationSettingsSchema } from "./notifications.validator";

const router = Router();
const controller = new NotificationController();

router.use(requireAuth);
router.get("/settings", controller.getSettings);
router.patch("/settings", validateBody(updateNotificationSettingsSchema), controller.updateSettings);

export default router;