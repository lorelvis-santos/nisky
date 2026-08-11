import { Router } from "express";
import { attachSessionId, requireAuth } from "../../middlewares/auth.middleware";
import { clearPresenceOnLogout } from "../../middlewares/presence.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { AuthController } from "./auth.controller";
import { changePasswordSchema, loginSchema, registerSchema } from "./auth.validator";
import patRoutes from "./pat.routes";

const router = Router();
const controller = new AuthController();

router.post("/login", validateBody(loginSchema), controller.login);
router.post("/register", validateBody(registerSchema), controller.register);
router.post("/refresh", controller.refresh);
router.get("/config", controller.config);
router.get("/me", requireAuth, controller.me);
router.post("/logout", clearPresenceOnLogout, controller.logout);
router.patch("/password", requireAuth, attachSessionId, validateBody(changePasswordSchema), controller.changePassword);
router.use("/pat", patRoutes);

export default router;
