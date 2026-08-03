import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { UploadsController } from "./uploads.controller";
import { uploadDocumentMiddleware, uploadImageMiddleware, uploadVideoMiddleware } from "../storage/storage.middleware";

const router = Router();
router.post("/image", requireAuth, uploadImageMiddleware.single("file"), UploadsController.uploadImage);
router.post("/video", requireAuth, uploadVideoMiddleware.single("file"), UploadsController.uploadVideo);
router.post("/document", requireAuth, uploadDocumentMiddleware.single("file"), UploadsController.uploadDocument);

export default router;
