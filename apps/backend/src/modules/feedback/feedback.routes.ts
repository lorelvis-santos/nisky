import { Router } from "express";
import { requireAdmin, requireAuth } from "../../middlewares/auth.middleware";
import { validateBody, validateParams, validateQuery } from "../../middlewares/validate.middleware";
import { FeedbackController } from "./feedback.controller";
import { createFeedbackSchema, feedbackQuerySchema, idParamSchema, updateFeedbackSchema } from "./feedback.validator";

const router = Router();
const controller = new FeedbackController();

router.use(requireAuth);
router.post("/", validateBody(createFeedbackSchema), controller.create);
router.get("/mine", controller.listMine);
router.delete("/:id", validateParams(idParamSchema), controller.deleteMine);

router.get("/admin", requireAdmin, validateQuery(feedbackQuerySchema), controller.adminList);
router.patch("/admin/:id", requireAdmin, validateParams(idParamSchema), validateBody(updateFeedbackSchema), controller.adminUpdate);
router.delete("/admin/:id", requireAdmin, validateParams(idParamSchema), controller.adminDelete);

export default router;