import multer from "multer";
import { AppError } from "../../utils/errors/handler";

const memory = multer.memoryStorage();

function fileFilter(allowed: (mime: string) => boolean, message: string) {
  return (_req: Express.Request, file: Express.Multer.File, callback: multer.FileFilterCallback) => {
    if (!allowed(file.mimetype)) {
      callback(new AppError("BAD_REQUEST", message));
      return;
    }
    callback(null, true);
  };
}

export const uploadImageMiddleware = multer({
  storage: memory,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter((mime) => mime.startsWith("image/"), "Solo se permiten imágenes"),
});

export const uploadVideoMiddleware = multer({
  storage: memory,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: fileFilter((mime) => mime === "video/mp4", "Solo se permiten videos MP4"),
});

export const uploadDocumentMiddleware = multer({
  storage: memory,
  limits: { fileSize: 60 * 1024 * 1024 },
  fileFilter: fileFilter((mime) => ["application/pdf", "text/csv", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"].includes(mime), "Formato de documento no permitido"),
});
