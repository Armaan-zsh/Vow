import { SupabaseImageStorageService } from './ImageStorageService';
import { ValidationError, ProviderAPIError } from '@/shared/types/errors';
import sharp from 'sharp';

// Mock Supabase client
const mockSupabaseClient = {
  storage: {
    from: jest.fn().mockReturnThis(),
    upload: jest.fn(),
    getPublicUrl: jest.fn(),
    createSignedUrl: jest.fn(),
    remove: jest.fn()
  }
};

// Mock Sharp
jest.mock('sharp');
const mockSharp = sharp as jest.MockedFunction<typeof sharp>;

describe('SupabaseImageStorageService', () => {
  let service: SupabaseImageStorageService;
  let mockImage: any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SupabaseImageStorageService(mockSupabaseClient as any);
    
    mockImage = {
      metadata: jest.fn(),
      resize: jest.fn().mockReturnThis(),
      webp: jest.fn().mockReturnThis(),
      toBuffer: jest.fn()
    };
    mockSharp.mockReturnValue(mockImage);
  });

  describe('uploadCover', () => {
    const validBuffer = Buffer.from('valid-image-data');
    const itemId = 'item-123';
    const userId = 'user-456';

    beforeEach(() => {
      mockImage.metadata.mockResolvedValue({
        format: 'jpeg',
        width: 800,
        height: 1200
      });
      mockImage.toBuffer.mockResolvedValue(Buffer.from('transformed-webp'));
      mockSupabaseClient.storage.upload.mockResolvedValue({ error: null });
      mockSupabaseClient.storage.remove.mockResolvedValue({ error: null });
    });

    it('should upload image successfully', async () => {
      const result = await service.uploadCover(validBuffer, itemId, userId);

      expect(result).toBe(`covers/${userId}/${itemId}.webp`);
      expect(mockSharp).toHaveBeenCalledWith(validBuffer);
      expect(mockImage.resize).toHaveBeenCalledWith(400, 600, {
        fit: 'cover',
        position: 'center'
      });
      expect(mockImage.webp).toHaveBeenCalledWith({ quality: 85 });
      expect(mockSupabaseClient.storage.upload).toHaveBeenCalledWith(
        `covers/${userId}/${itemId}.webp`,
        Buffer.from('transformed-webp'),
        {
          contentType: 'image/webp',
          upsert: true
        }
      );
    });

    it('should reject files over 10MB', async () => {
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024);

      await expect(service.uploadCover(largeBuffer, itemId, userId))
        .rejects.toThrow('Image size exceeds 10MB limit');
    });

    it('should reject invalid image formats', async () => {
      mockImage.metadata.mockResolvedValue({
        format: 'gif',
        width: 800,
        height: 1200
      });

      await expect(service.uploadCover(validBuffer, itemId, userId))
        .rejects.toThrow('Invalid image format');
    });

    it('should reject images that are too small', async () => {
      mockImage.metadata.mockResolvedValue({
        format: 'jpeg',
        width: 50,
        height: 100
      });

      await expect(service.uploadCover(validBuffer, itemId, userId))
        .rejects.toThrow('Image too small');
    });

    it('should reject images that are too large', async () => {
      mockImage.metadata.mockResolvedValue({
        format: 'jpeg',
        width: 3000,
        height: 4000
      });

      await expect(service.uploadCover(validBuffer, itemId, userId))
        .rejects.toThrow('Image too large');
    });

    it('should handle upload errors', async () => {
      mockSupabaseClient.storage.upload.mockResolvedValue({
        error: { message: 'Upload failed' }
      });

      await expect(service.uploadCover(validBuffer, itemId, userId))
        .rejects.toThrow('Failed to upload image: Upload failed');
    });
  });

  describe('getPublicUrl', () => {
    it('should return public URL', () => {
      const path = 'covers/user/item.webp';
      const publicUrl = 'https://example.com/covers/user/item.webp';
      
      mockSupabaseClient.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl }
      });

      const result = service.getPublicUrl(path);

      expect(result).toBe(publicUrl);
      expect(mockSupabaseClient.storage.getPublicUrl).toHaveBeenCalledWith(path);
    });
  });

  describe('generateSignedUrl', () => {
    it('should generate signed URL with default expiry', async () => {
      const path = 'covers/user/item.webp';
      const signedUrl = 'https://example.com/signed-url';
      
      mockSupabaseClient.storage.createSignedUrl.mockResolvedValue({
        data: { signedUrl },
        error: null
      });

      const result = await service.generateSignedUrl(path);

      expect(result).toBe(signedUrl);
      expect(mockSupabaseClient.storage.createSignedUrl).toHaveBeenCalledWith(path, 3600);
    });

    it('should handle signed URL errors', async () => {
      mockSupabaseClient.storage.createSignedUrl.mockResolvedValue({
        error: { message: 'Access denied' }
      });

      await expect(service.generateSignedUrl('path'))
        .rejects.toThrow('Failed to generate signed URL: Access denied');
    });
  });

  describe('deleteCover', () => {
    it('should delete image successfully', async () => {
      const path = 'covers/user/item.webp';
      mockSupabaseClient.storage.remove.mockResolvedValue({ error: null });

      await service.deleteCover(path);

      expect(mockSupabaseClient.storage.remove).toHaveBeenCalledWith([path]);
    });

    it('should handle delete errors', async () => {
      mockSupabaseClient.storage.remove.mockResolvedValue({
        error: { message: 'File not found' }
      });

      await expect(service.deleteCover('path'))
        .rejects.toThrow('Failed to delete image: File not found');
    });
  });
});