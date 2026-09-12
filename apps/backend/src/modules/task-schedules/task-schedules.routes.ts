import { Router } from "express";
import { requireAuth, requireScopes } from "../../middlewares/auth.middleware";
import { validateBody, validateParams, validateQuery } from "../../middlewares/validate.middleware";
import { TaskScheduleController } from "./task-schedules.controller";
import { taskScheduleIdParamSchema, taskScheduleQuerySchema, upsertTaskScheduleSchema } from "./task-schedules.validator";

const router = Router();
const controller = new TaskScheduleController();

router.use(requireAuth);
router.get("/", requireScopes("tasks:read"), validateQuery(taskScheduleQuerySchema), controller.list);
router.put("/:taskId", requireScopes("tasks:write"), validateParams(taskScheduleIdParamSchema), validateBody(upsertTaskScheduleSchema), controller.upsert);
router.delete("/:taskId", requireScopes("tasks:write"), validateParams(taskScheduleIdParamSchema), controller.remove);

export default router;
