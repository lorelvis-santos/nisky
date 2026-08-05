import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { validateBody, validateParams, validateQuery } from "../../middlewares/validate.middleware";
import { MoodleController } from "./moodle.controller";
import { connectMoodleSchema, moodleEnabledSchema, moodleTaskQuerySchema } from "./moodle.validator";
import { idParamSchema } from "../tasks/tasks.validator";

const router = Router();
const controller = new MoodleController();

router.use(requireAuth);
router.get("/", controller.list);
router.post("/", validateBody(connectMoodleSchema), controller.connect);
router.get("/tasks", validateQuery(moodleTaskQuerySchema), controller.tasks);
router.post("/:id/sync", validateParams(idParamSchema), controller.sync);
router.patch("/:id", validateParams(idParamSchema), validateBody(moodleEnabledSchema), controller.setEnabled);
router.delete("/:id", validateParams(idParamSchema), controller.disconnect);

export default router;