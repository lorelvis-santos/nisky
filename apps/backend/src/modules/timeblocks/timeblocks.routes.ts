import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { validateBody, validateParams } from "../../middlewares/validate.middleware";
import { TimeBlockController } from "./timeblocks.controller";
import { createTimeBlockSchema, idParamSchema, updateTimeBlockSchema, updateTimeBlockSettingsSchema, createTimeBlockExceptionSchema } from "./timeblocks.validator";

const router = Router();
const controller = new TimeBlockController();

router.use(requireAuth);
router.get("/settings", controller.getSettings);
router.patch("/settings", validateBody(updateTimeBlockSettingsSchema), controller.updateSettings);
router.get("/", controller.list);
router.get("/active", controller.active);
router.get("/today", controller.today);
router.post("/", validateBody(createTimeBlockSchema), controller.create);
router.patch("/:id", validateParams(idParamSchema), validateBody(updateTimeBlockSchema), controller.update);
router.delete("/:id", validateParams(idParamSchema), controller.delete);
router.post("/:id/exception", validateParams(idParamSchema), validateBody(createTimeBlockExceptionSchema), controller.exception);

export default router;
