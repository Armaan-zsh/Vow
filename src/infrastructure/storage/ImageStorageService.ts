import sharp from 'sharp';
import { env } from '@/shared/config/env';
import { ValidationError, ProviderAPIError } from '@/shared/types/errors';

type SupabaseClient = any;
type StorageError = { message: string } | null;

function createClient(url: string, key: string): SupabaseClient {
  return {
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, file: Buffer, options: any) => ({ error: null }),
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `${url}/storage/v1/object/public/${path}` },
        }),
        createSignedUrl: async (path: string, expiresIn: number) => ({
          data: { signedUrl: `${url}/signed/${path}` },
          error: null,
        }),
        remove: async (paths: string[]) => ({ error: null }),
      }),
    },
  };
}

export interface ImageStorageService {
  uploadCover(image: Buffer, itemId: string, userId: string): Promise<string>;
  getPublicUrl(path: string): string;
  deleteCover(path: string): Promise<void>;
  generateSignedUrl(path: string, expiresIn?: number): Promise<string>;
}

export class SupabaseImageStorageService implements ImageStorageService {
  private supabase: SupabaseClient;
  private bucket = 'covers';

  constructor(supabaseClient?: SupabaseClient) {
    this.supabase = supabaseClient || createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  }

  async uploadCover(image: Buffer, itemId: string, userId: string): Promise<string> {
    // Validate file size
    if (image.length > 10 * 1024 * 1024) {
      throw new ValidationError('Image size exceeds 10MB limit');
    }

    // Validate and transform image
    const transformedImage = await this.transformImage(image);
    const path = `covers/${userId}/${itemId}.webp`;

    // Delete existing image if any
    await this.deleteCover(path).catch(() => {}); // Ignore if doesn't exist

    // Upload to Supabase
    const { error } = await this.supabase.storage.from(this.bucket).upload(path, transformedImage, {
      contentType: 'image/webp',
      upsert: true,
    });

    if (error) {
      throw new ProviderAPIError(`Failed to upload image: ${error.message}`);
    }

    return path;
  }

  getPublicUrl(path: string): string {
    const { data } = this.supabase.storage.from(this.bucket).getPublicUrl(path);

    return data.publicUrl;
  }

  async generateSignedUrl(path: string, expiresIn = 3600): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      throw new ProviderAPIError(`Failed to generate signed URL: ${error.message}`);
    }

    return data.signedUrl;
  }

  async deleteCover(path: string): Promise<void> {
    const { error } = await this.supabase.storage.from(this.bucket).remove([path]);

    if (error) {
      throw new ProviderAPIError(`Failed to delete image: ${error.message}`);
    }
  }

  private async transformImage(buffer: Buffer): Promise<Buffer> {
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();

      // Validate MIME type
      if (!metadata.format || !['jpeg', 'jpg', 'png', 'webp'].includes(metadata.format)) {
        throw new ValidationError('Invalid image format. Only JPEG, PNG, and WebP are allowed');
      }

      // Validate dimensions
      const { width = 0, height = 0 } = metadata;
      if (width < 100 || height < 150) {
        throw new ValidationError('Image too small. Minimum size is 100x150 pixels');
      }
      if (width > 2000 || height > 3000) {
        throw new ValidationError('Image too large. Maximum size is 2000x3000 pixels');
      }

      // Transform to WebP with 400x600 resize
      return await image
        .resize(400, 600, {
          fit: 'cover',
          position: 'center',
        })
        .webp({ quality: 85 })
        .toBuffer();
    } catch (error) {
      if (error instanceof ValidationError || error instanceof ProviderAPIError) throw error;
      throw new ValidationError('Invalid image file');
    }
  }
}
