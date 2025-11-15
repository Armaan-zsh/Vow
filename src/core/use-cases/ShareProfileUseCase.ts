import { z } from 'zod';
import { UserId, ProfileVisibility } from '../entities/User';
import { IUserRepository } from '../repositories/IUserRepository';
import { AuthorizationError, NotFoundError, ValidationError } from '../../shared/types/errors';
import { transformZodError } from '../../shared/types/errors';

const ShareProfileDTOSchema = z.object({
  userId: z.string(),
  requestingUserId: z.string(),
  expiresIn: z.number().min(300).max(86400).default(3600) // 5min to 24h, default 1h
});

export type ShareProfileDTO = z.infer<typeof ShareProfileDTOSchema> & {
  userId: UserId;
  requestingUserId: UserId;
};

export interface ShareProfileResponse {
  url: string;
  isPublic: boolean;
  expiresAt?: Date;
  metadata: {
    title: string;
    description: string;
    username: string;
  };
}

interface JWTService {
  sign(payload: Record<string, any>, expiresIn: number): string;
}

interface CacheClient {
  set(key: string, value: string, ttl: number): Promise<void>;
}

interface AnalyticsService {
  track(event: string, userId: UserId, properties: Record<string, any>): Promise<void>;
}

interface AuditLogger {
  log(action: string, userId: UserId, details: Record<string, any>): Promise<void>;
}

export class ShareProfileUseCase {
  constructor(
    private userRepository: IUserRepository,
    private jwtService: JWTService,
    private cache: CacheClient,
    private analytics: AnalyticsService,
    private auditLogger: AuditLogger
  ) {}

  async execute(input: ShareProfileDTO): Promise<ShareProfileResponse> {
    const validatedInput = this.validateInput(input);

    // Get user profile
    const user = await this.userRepository.findById(validatedInput.userId);
    if (!user) {
      throw new NotFoundError('User', validatedInput.userId);
    }

    // Check permissions
    await this.checkPermissions(user.profileVisibility, validatedInput);

    // Generate URL based on visibility
    const result = await this.generateShareUrl(user, validatedInput);

    // Track analytics
    await this.analytics.track('profile_shared', validatedInput.requestingUserId, {
      sharedUserId: validatedInput.userId,
      visibility: user.profileVisibility,
      isPublic: result.isPublic
    });

    // Audit log
    await this.auditLogger.log('profile.shared', validatedInput.requestingUserId, {
      sharedUserId: validatedInput.userId,
      visibility: user.profileVisibility,
      url: result.url,
      expiresAt: result.expiresAt
    });

    return result;
  }

  private validateInput(input: ShareProfileDTO): ShareProfileDTO {
    try {
      const parsed = ShareProfileDTOSchema.parse(input);
      return {
        ...parsed,
        userId: input.userId,
        requestingUserId: input.requestingUserId
      };
    } catch (error: any) {
      throw transformZodError(error);
    }
  }

  private async checkPermissions(visibility: ProfileVisibility, input: ShareProfileDTO): Promise<void> {
    if (visibility === ProfileVisibility.PRIVATE) {
      // Only owner can share private profiles
      if (input.userId !== input.requestingUserId) {
        throw new AuthorizationError('Cannot share private profile');
      }
    }
  }

  private async generateShareUrl(user: any, input: ShareProfileDTO): Promise<ShareProfileResponse> {
    const baseMetadata = {
      title: `${user.name || user.username}'s Reading Profile`,
      description: `Check out ${user.username}'s reading collection on ReadFlex`,
      username: user.username
    };

    if (user.profileVisibility === ProfileVisibility.PUBLIC) {
      return {
        url: `/@${user.username}`,
        isPublic: true,
        metadata: baseMetadata
      };
    }

    // Generate signed URL for unlisted profiles
    const expiresAt = new Date(Date.now() + input.expiresIn * 1000);
    const token = this.jwtService.sign(
      {
        userId: input.userId,
        type: 'profile_share',
        exp: Math.floor(expiresAt.getTime() / 1000)
      },
      input.expiresIn
    );

    // Store one-time token in Redis
    const tokenKey = `share_token:${token}`;
    await this.cache.set(tokenKey, input.userId, input.expiresIn);

    return {
      url: `/share/${token}`,
      isPublic: false,
      expiresAt,
      metadata: baseMetadata
    };
  }
}