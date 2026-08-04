import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { validateBody, validateParams, validateQuery } from "../../middlewares/validate.middleware";
import { TaskController } from "./tasks.controller";
import { createSubtaskSchema, createTaskSchema, idParamSchema, subtaskParamsSchema, taskQuerySchema, updateSubtaskSchema, updateTaskSchema } from "./tasks.validator";

const router = Router();
const controller = new TaskController();

router.use(requireAuth);
router.get("/", validateQuery(taskQuerySchema), controller.list);
router.post("/", validateBody(createTaskSchema), controller.create);
router.get("/:id", validateParams(idParamSchema), controller.getById);
router.patch("/:id", validateParams(idParamSchema), validateBody(updateTaskSchema), controller.update);
router.delete("/:id", validateParams(idParamSchema), controller.delete);
router.get("/:id/subtasks", validateParams(idParamSchema), controller.listSubtasks);
router.post("/:id/subtasks", validateParams(idParamSchema), validateBody(createSubtaskSchema), controller.createSubtask);
router.patch("/:id/subtasks/:subtaskId", validateParams(subtaskParamsSchema), validateBody(updateSubtaskSchema), controller.updateSubtask);
router.delete("/:id/subtasks/:subtaskId", validateParams(subtaskParamsSchema), controller.deleteSubtask);

export default router;
