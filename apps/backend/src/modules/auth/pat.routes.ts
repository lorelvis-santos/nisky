import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { validateBody, validateParams } from "../../middlewares/validate.middleware";
import { patController } from "./pat.controller";
import { createPatSchema, idParamSchema } from "./pat.validator";

const router = Router();

router.use(requireAuth);
router.post("/", validateBody(createPatSchema), patController.create);
router.get("/", patController.list);
router.delete("/:id", validateParams(idParamSchema), patController.revoke);

export default router;