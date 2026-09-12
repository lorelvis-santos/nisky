import { Router } from "express";
import { requireAuth, requireScopes } from "../../middlewares/auth.middleware";
import { validateBody, validateParams, validateQuery } from "../../middlewares/validate.middleware";
import { QuickNoteController } from "./quicknotes.controller";
import { createQuickNoteSchema, idParamSchema, quickNoteQuerySchema, updateQuickNoteSchema } from "./quicknotes.validator";

const router = Router();
const controller = new QuickNoteController();

router.use(requireAuth);
router.get("/", requireScopes("notes:read"), validateQuery(quickNoteQuerySchema), controller.list);
router.post("/", requireScopes("notes:write"), validateBody(createQuickNoteSchema), controller.create);
router.patch("/:id", requireScopes("notes:write"), validateParams(idParamSchema), validateBody(updateQuickNoteSchema), controller.update);
router.delete("/:id", requireScopes("notes:write"), validateParams(idParamSchema), controller.delete);

export default router;
