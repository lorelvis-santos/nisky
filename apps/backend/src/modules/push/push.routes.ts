import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { PushController } from "./push.controller";
import { pushSubscriptionSchema, pushUnsubscribeSchema } from "./push.validator";

const router = Router();
const controller = new PushController();

router.use(requireAuth);
router.get("/vapid-public-key", controller.publicKey);
router.get("/subscriptions", controller.list);
router.post("/subscribe", validateBody(pushSubscriptionSchema), controller.subscribe);
router.delete("/unsubscribe", validateBody(pushUnsubscribeSchema), controller.unsubscribe);
router.post("/test", controller.test);

export default router;
