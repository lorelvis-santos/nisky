import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { validateBody, validateParams, validateQuery } from "../../middlewares/validate.middleware";
import { HabitController } from "./habits.controller";
import { createHabitSchema, entriesQuerySchema, idParamSchema, toggleEntrySchema, updateHabitSchema } from "./habits.validator";

const router = Router();
const controller = new HabitController();

router.use(requireAuth);
router.get("/", controller.list);
router.post("/", validateBody(createHabitSchema), controller.create);
router.get("/:id", validateParams(idParamSchema), controller.getById);
router.patch("/:id", validateParams(idParamSchema), validateBody(updateHabitSchema), controller.update);
router.delete("/:id", validateParams(idParamSchema), controller.delete);
router.post("/:id/entries", validateParams(idParamSchema), validateBody(toggleEntrySchema), controller.toggleEntry);
router.get("/:id/entries", validateParams(idParamSchema), validateQuery(entriesQuerySchema), controller.entries);
router.get("/:id/streak", validateParams(idParamSchema), controller.streak);

export default router;
