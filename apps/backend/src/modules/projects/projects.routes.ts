import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { validateBody, validateParams } from "../../middlewares/validate.middleware";
import { ProjectController } from "./projects.controller";
import { createProjectSchema, idParamSchema, updateProjectSchema } from "./projects.validator";

const router = Router();
const controller = new ProjectController();

router.use(requireAuth);
router.get("/", controller.list);
router.post("/", validateBody(createProjectSchema), controller.create);
router.patch("/:id", validateParams(idParamSchema), validateBody(updateProjectSchema), controller.update);
router.patch("/:id/default", validateParams(idParamSchema), controller.setDefault);
router.delete("/:id", validateParams(idParamSchema), controller.delete);

export default router;
