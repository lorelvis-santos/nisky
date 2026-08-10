import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { UserController } from "./user.controller";
import { updateProfileSchema } from "./user.validator";
import { uploadImageMiddleware } from "../storage/storage.middleware";

const router = Router();
const controller = new UserController();

router.use(requireAuth);
router.patch("/profile", validateBody(updateProfileSchema), controller.updateProfile);
router.post("/avatar", uploadImageMiddleware.single("file"), controller.uploadAvatar);
router.delete("/avatar", controller.removeAvatar);

export default router;