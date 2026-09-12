import { Router } from "express";
import { requireAuth, requireScopes } from "../../middlewares/auth.middleware";
import { validateBody, validateParams, validateQuery } from "../../middlewares/validate.middleware";
import { TaskController } from "./tasks.controller";
import { archiveTaskSchema, bulkMoveTasksSchema, bulkTaskIdsSchema, createSubtaskSchema, createTaskSchema, idParamSchema, reorderTasksSchema, subtaskParamsSchema, taskQuerySchema, updateSubtaskSchema, updateTaskSchema } from "./tasks.validator";

const router = Router();
const controller = new TaskController();

router.use(requireAuth);
router.get("/", requireScopes("tasks:read"), validateQuery(taskQuerySchema), controller.list);
router.post("/", requireScopes("tasks:write"), validateBody(createTaskSchema), controller.create);
router.patch("/reorder", requireScopes("tasks:write"), validateBody(reorderTasksSchema), controller.reorder);
router.post("/bulk-delete", requireScopes("tasks:write"), validateBody(bulkTaskIdsSchema), controller.bulkDelete);
router.patch("/bulk-move", requireScopes("tasks:write"), validateBody(bulkMoveTasksSchema), controller.bulkMove);
router.get("/:id", requireScopes("tasks:read"), validateParams(idParamSchema), controller.getById);
router.patch("/:id", requireScopes("tasks:write"), validateParams(idParamSchema), validateBody(updateTaskSchema), controller.update);
router.patch("/:id/archive", requireScopes("tasks:write"), validateParams(idParamSchema), validateBody(archiveTaskSchema), controller.archive);
router.delete("/:id", requireScopes("tasks:write"), validateParams(idParamSchema), controller.delete);
router.get("/:id/subtasks", requireScopes("tasks:read"), validateParams(idParamSchema), controller.listSubtasks);
router.post("/:id/subtasks", requireScopes("tasks:write"), validateParams(idParamSchema), validateBody(createSubtaskSchema), controller.createSubtask);
router.patch("/:id/subtasks/:subtaskId", requireScopes("tasks:write"), validateParams(subtaskParamsSchema), validateBody(updateSubtaskSchema), controller.updateSubtask);
router.delete("/:id/subtasks/:subtaskId", requireScopes("tasks:write"), validateParams(subtaskParamsSchema), controller.deleteSubtask);

export default router;
