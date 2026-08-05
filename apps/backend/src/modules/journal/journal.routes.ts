import { Router } from "express";
import { attachSessionId, requireAuth } from "../../middlewares/auth.middleware";
import { validateBody, validateParams, validateQuery } from "../../middlewares/validate.middleware";
import { JournalController } from "./journal.controller";
import { createJournalEntrySchema, journalIdParamsSchema, journalQuerySchema, updateJournalEntrySchema } from "./journal.validator";

const router = Router();
const controller = new JournalController();

router.use(requireAuth, attachSessionId);
router.get("/", validateQuery(journalQuerySchema), controller.list);
router.get("/:id", validateParams(journalIdParamsSchema), controller.getById);
router.post("/", validateBody(createJournalEntrySchema), controller.create);
router.patch("/:id", validateParams(journalIdParamsSchema), validateBody(updateJournalEntrySchema), controller.update);
router.delete("/:id", validateParams(journalIdParamsSchema), controller.delete);

export default router;
