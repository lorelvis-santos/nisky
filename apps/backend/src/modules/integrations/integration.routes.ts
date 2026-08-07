import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { validateBody, validateParams, validateQuery } from "../../middlewares/validate.middleware";
import { IntegrationController } from "./integration.controller";
import { idParamSchema, integrationEnabledSchema, integrationTaskQuerySchema, providerParamSchema, providerIdParamSchema } from "./integration.validator";

const router = Router();
const controller = new IntegrationController();

router.use(requireAuth);
router.get("/", controller.list);
router.get("/tasks", validateQuery(integrationTaskQuerySchema), controller.tasks);
router.delete("/tasks", validateQuery(integrationTaskQuerySchema), controller.clean);
router.post("/:provider", validateParams(providerParamSchema), controller.connect);
router.post("/:provider/:id/sync", validateParams(providerIdParamSchema), controller.sync);
router.patch("/:provider/:id", validateParams(providerIdParamSchema), validateBody(integrationEnabledSchema), controller.setEnabled);
router.delete("/:provider/:id", validateParams(providerIdParamSchema), controller.disconnect);

export default router;