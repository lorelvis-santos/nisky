import { Router } from "express";
import { requireAuth, requireScopes } from "../../middlewares/auth.middleware";
import { validateQuery } from "../../middlewares/validate.middleware";
import { HomeController } from "./home.controller";
import { activityQuerySchema } from "./home.validator";

const router = Router();
const controller = new HomeController();

router.use(requireAuth);
router.get("/overview", requireScopes("tasks:read"), controller.overview);
router.get("/activity", requireScopes("tasks:read"), validateQuery(activityQuerySchema), controller.activity);
router.get("/habits-matrix", requireScopes("tasks:read"), controller.habitsMatrix);

export default router;
