import { Router } from "express";
import { attachSessionId, requireAuth } from "../../middlewares/auth.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { AuthController } from "./auth.controller";
import { changePasswordSchema, loginSchema, registerSchema } from "./auth.validator";

const router = Router();
const controller = new AuthController();

router.post("/login", validateBody(loginSchema), controller.login);
router.post("/register", validateBody(registerSchema), controller.register);
router.post("/refresh", controller.refresh);
router.get("/config", controller.config);
router.get("/me", requireAuth, controller.me);
router.post("/logout", controller.logout);
router.patch("/password", requireAuth, attachSessionId, validateBody(changePasswordSchema), controller.changePassword);

export default router;
