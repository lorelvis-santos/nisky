import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { validateBody, validateParams, validateQuery } from "../../middlewares/validate.middleware";
import { IntegrationController } from "./integration.controller";
import { idParamSchema, integrationEnabledSchema, integrationTaskQuerySchema, providerParamSchema, providerIdParamSchema, connectUasdSchema } from "./integration.validator";
import { UasdController } from "./uasd/uasd.controller";

const router = Router();
const controller = new IntegrationController();
const uasdController = new UasdController();

router.use(requireAuth);
router.get("/", controller.list);
router.get("/tasks", validateQuery(integrationTaskQuerySchema), controller.tasks);
router.delete("/tasks", validateQuery(integrationTaskQuerySchema), controller.clean);
router.post("/UASD", validateBody(connectUasdSchema), uasdController.connect);
router.post("/UASD/:id/sync", validateParams(idParamSchema), uasdController.sync);
router.get("/UASD/jobs/:id", validateParams(idParamSchema), uasdController.status);
router.patch("/UASD/:id", validateParams(idParamSchema), validateBody(integrationEnabledSchema), uasdController.setEnabled);
router.delete("/UASD/:id", validateParams(idParamSchema), uasdController.disconnect);
router.post("/:provider", validateParams(providerParamSchema), controller.connect);
router.post("/:provider/:id/sync", validateParams(providerIdParamSchema), controller.sync);
router.patch("/:provider/:id", validateParams(providerIdParamSchema), validateBody(integrationEnabledSchema), controller.setEnabled);
router.delete("/:provider/:id", validateParams(providerIdParamSchema), controller.disconnect);

export default router;
