import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { validateBody, validateParams, validateQuery } from "../../middlewares/validate.middleware";
import { KnowledgeController } from "./knowledge.controller";
import { createNoteSchema, noteIdParamsSchema, noteQuerySchema, updateNoteSchema } from "./knowledge.validator";

const router = Router();
const controller = new KnowledgeController();

router.use(requireAuth);
router.get("/facets", controller.facets);
router.get("/", validateQuery(noteQuerySchema), controller.list);
router.get("/:id", validateParams(noteIdParamsSchema), controller.getById);
router.post("/", validateBody(createNoteSchema), controller.create);
router.patch("/:id", validateParams(noteIdParamsSchema), validateBody(updateNoteSchema), controller.update);
router.delete("/:id", validateParams(noteIdParamsSchema), controller.delete);

export default router;
