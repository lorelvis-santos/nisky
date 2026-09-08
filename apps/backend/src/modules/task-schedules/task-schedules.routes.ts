import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { validateBody, validateParams, validateQuery } from "../../middlewares/validate.middleware";
import { TaskScheduleController } from "./task-schedules.controller";
import { taskScheduleIdParamSchema, taskScheduleQuerySchema, upsertTaskScheduleSchema } from "./task-schedules.validator";

const router = Router();
const controller = new TaskScheduleController();

router.use(requireAuth);
router.get("/", validateQuery(taskScheduleQuerySchema), controller.list);
router.put("/:taskId", validateParams(taskScheduleIdParamSchema), validateBody(upsertTaskScheduleSchema), controller.upsert);
router.delete("/:taskId", validateParams(taskScheduleIdParamSchema), controller.remove);

export default router;
