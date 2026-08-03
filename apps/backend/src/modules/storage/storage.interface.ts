export interface UploadResult {
  url: string;
  key: string;
  posterUrl?: string;
}

export interface UploadOptions {
  isPrivate?: boolean;
}

export type MediaProviderType = "image" | "video" | "document";

export interface StorageProvider {
  uploadImage(file: Express.Multer.File, folder: string, options?: UploadOptions): Promise<UploadResult>;
  deleteImage(key: string): Promise<boolean>;
  uploadVideo(file: Express.Multer.File, folder: string, options?: UploadOptions): Promise<UploadResult>;
  deleteVideo(key: string): Promise<boolean>;
  uploadFile(file: Express.Multer.File, folder: string, options?: UploadOptions): Promise<UploadResult>;
  deleteFile(key: string): Promise<boolean>;
}
