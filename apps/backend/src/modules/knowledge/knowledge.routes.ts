import { Router } from "express";
import { requireAuth, requireScopes } from "../../middlewares/auth.middleware";
import { validateBody, validateParams, validateQuery } from "../../middlewares/validate.middleware";
import { KnowledgeController } from "./knowledge.controller";
import { createNoteSchema, noteIdParamsSchema, noteQuerySchema, saveNoteDraftSchema, updateNoteSchema } from "./knowledge.validator";

const router = Router();
const controller = new KnowledgeController();

router.use(requireAuth);
router.get("/facets", requireScopes("notes:read"), validateQuery(noteQuerySchema.pick({ projectId: true })), controller.facets);
router.get("/", requireScopes("notes:read"), validateQuery(noteQuerySchema), controller.list);
router.get("/draft", requireScopes("notes:read"), controller.getDraft);
router.put("/draft", requireScopes("notes:write"), validateBody(saveNoteDraftSchema), controller.saveDraft);
router.delete("/draft", requireScopes("notes:write"), controller.deleteDraft);
router.get("/:id", requireScopes("notes:read"), validateParams(noteIdParamsSchema), controller.getById);
router.post("/", requireScopes("notes:write"), validateBody(createNoteSchema), controller.create);
router.patch("/:id", requireScopes("notes:write"), validateParams(noteIdParamsSchema), validateBody(updateNoteSchema), controller.update);
router.delete("/:id", requireScopes("notes:write"), validateParams(noteIdParamsSchema), controller.delete);

export default router;
