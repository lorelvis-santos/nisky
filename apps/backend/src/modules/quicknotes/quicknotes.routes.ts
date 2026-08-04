import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { validateBody, validateParams, validateQuery } from "../../middlewares/validate.middleware";
import { QuickNoteController } from "./quicknotes.controller";
import { createQuickNoteSchema, idParamSchema, quickNoteQuerySchema, updateQuickNoteSchema } from "./quicknotes.validator";

const router = Router();
const controller = new QuickNoteController();

router.use(requireAuth);
router.get("/", validateQuery(quickNoteQuerySchema), controller.list);
router.post("/", validateBody(createQuickNoteSchema), controller.create);
router.patch("/:id", validateParams(idParamSchema), validateBody(updateQuickNoteSchema), controller.update);
router.delete("/:id", validateParams(idParamSchema), controller.delete);

export default router;
