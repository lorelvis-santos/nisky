import { CloudinaryProvider } from "./providers/cloudinary.provider";
import { S3Provider } from "./providers/s3.provider";
import type { MediaProviderType, StorageProvider } from "./storage.interface";

export class StorageFactory {
  private static instances: Partial<Record<MediaProviderType, StorageProvider>> = {};

  static getProvider(type: MediaProviderType): StorageProvider {
    if (this.instances[type]) return this.instances[type];
    const driver = process.env[`STORAGE_${type.toUpperCase()}_DRIVER`] ?? "s3";
    const provider = driver === "cloudinary" ? new CloudinaryProvider() : new S3Provider();
    this.instances[type] = provider;
    return provider;
  }
}
