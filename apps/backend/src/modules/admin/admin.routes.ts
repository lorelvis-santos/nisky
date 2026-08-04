import { Router } from "express";
import { requireAdmin, requireAuth } from "../../middlewares/auth.middleware";
import { validateBody, validateParams, validateQuery } from "../../middlewares/validate.middleware";
import { AdminController } from "./admin.controller";
import { adminUserIdParamsSchema, adminUsersQuerySchema, createAdminUserSchema, updateAdminUserSchema, updateSettingsSchema } from "./admin.validator";

const router = Router();
const controller = new AdminController();

router.use(requireAuth, requireAdmin);
router.get("/users", validateQuery(adminUsersQuerySchema), controller.listUsers);
router.post("/users", validateBody(createAdminUserSchema), controller.createUser);
router.patch("/users/:id", validateParams(adminUserIdParamsSchema), validateBody(updateAdminUserSchema), controller.updateUser);
router.delete("/users/:id", validateParams(adminUserIdParamsSchema), controller.deleteUser);
router.get("/settings", controller.getSettings);
router.patch("/settings", validateBody(updateSettingsSchema), controller.updateSettings);

export default router;