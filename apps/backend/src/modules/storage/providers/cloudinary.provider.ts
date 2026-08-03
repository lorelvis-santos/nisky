import { v2 as cloudinary } from "cloudinary";
import type { StorageProvider, UploadOptions, UploadResult } from "../storage.interface";

export class CloudinaryProvider implements StorageProvider {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  private upload(file: Express.Multer.File, folder: string, resourceType: "image" | "video" | "raw") {
    return new Promise<UploadResult>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ folder, resource_type: resourceType }, (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }
        resolve({ url: result.secure_url, key: result.public_id });
      });
      stream.end(file.buffer);
    });
  }

  private async remove(key: string, resourceType: "image" | "video" | "raw") {
    await cloudinary.uploader.destroy(key, { resource_type: resourceType });
    return true;
  }

  uploadImage(file: Express.Multer.File, folder: string, _options?: UploadOptions) { return this.upload(file, folder, "image"); }
  uploadVideo(file: Express.Multer.File, folder: string, _options?: UploadOptions) { return this.upload(file, folder, "video"); }
  uploadFile(file: Express.Multer.File, folder: string, _options?: UploadOptions) { return this.upload(file, folder, "raw"); }
  deleteImage(key: string) { return this.remove(key, "image"); }
  deleteVideo(key: string) { return this.remove(key, "video"); }
  deleteFile(key: string) { return this.remove(key, "raw"); }
}
