import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { validateQuery } from "../../middlewares/validate.middleware";
import { HomeController } from "./home.controller";
import { activityQuerySchema } from "./home.validator";

const router = Router();
const controller = new HomeController();

router.use(requireAuth);
router.get("/overview", controller.overview);
router.get("/activity", validateQuery(activityQuerySchema), controller.activity);
router.get("/habits-matrix", controller.habitsMatrix);

export default router;
