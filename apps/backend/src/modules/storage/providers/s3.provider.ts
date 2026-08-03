import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { StorageProvider, UploadOptions, UploadResult } from "../storage.interface";

export class S3Provider implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET_NAME ?? "nisky-bucket";
    this.publicUrl = (process.env.S3_PUBLIC_URL ?? "").replace(/\/$/, "");
    this.client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION ?? "us-east-1",
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY ?? "",
        secretAccessKey: process.env.S3_SECRET_KEY ?? "",
      },
    });
  }

  private async upload(file: Express.Multer.File, folder: string, options?: UploadOptions): Promise<UploadResult> {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "-");
    const key = `${folder}/${Date.now()}-${safeName}`;
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ...(options?.isPrivate ? {} : { ACL: "public-read" }),
    }));
    return { url: `${this.publicUrl}/${key}`, key };
  }

  private async remove(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    return true;
  }

  uploadImage(file: Express.Multer.File, folder: string, options?: UploadOptions) { return this.upload(file, folder, options); }
  uploadVideo(file: Express.Multer.File, folder: string, options?: UploadOptions) { return this.upload(file, folder, options); }
  uploadFile(file: Express.Multer.File, folder: string, options?: UploadOptions) { return this.upload(file, folder, options); }
  deleteImage(key: string) { return this.remove(key); }
  deleteVideo(key: string) { return this.remove(key); }
  deleteFile(key: string) { return this.remove(key); }
}
