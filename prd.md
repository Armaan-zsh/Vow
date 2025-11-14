1. PRODUCT FOUNDATION & VISION CLARITY
1.1 Product Thesis (The "Why")
Problem: Knowledge workers consume 50+ pieces of content monthly across books, papers, and articles but have no unified, performant, social-first showcase. Existing solutions are either too academic (Zotero), too book-focused (Goodreads), or too note-heavy (Notion).
Solution: ReadFlex is the "GitHub Profile for Your Brain" — a read-only portfolio of intellectual consumption that loads instantly, scales to 10k+ items, and makes social proof effortless.
North Star Metric: Time to "First Flex" — from signup to sharing a profile < 3 minutes.
2. PHASED ROADMAP (REALISTIC TIMELINES)
Phase 0: Foundation (Week 1)
Goal: Bulletproof infrastructure before writing features
Day 1-2: Dev environment setup with Docker, linting, type-checking
Day 3-4: Auth system with rate limiting and fraud detection
Day 5-7: Database schema + migrations + seed data
Phase 1: MVP Core (Weeks 2-3)
Goal: Single user journey works end-to-end
Week 2: Add items (manual + API search), profile display
Week 3: Privacy controls, shareable links, basic search
Phase 2: Social Layer (Weeks 4-5)
Goal: Network effects begin
Follow/unfollow, activity feed, notifications
Hashtag discovery, basic recommendations
Phase 3: Scale & Polish (Weeks 6-8)
Goal: Production-ready for 10k users
Performance optimization, background jobs, analytics
Admin panel, abuse detection, GDPR compliance tools
Total: 8 weeks for v1.0 (not 2 days — that's a recipe for technical debt).
3. TECHNICAL ARCHITECTURE: "AI-PROOF" DESIGN
3.1 The "Layered Cake" Pattern (Prevents AI Mess)
This structure forces any AI (including you vibe-coding) to place code in the correct layer, preventing the spaghetti code common in AI-assisted projects.
Copy
app/
├── src/
│   ├── core/              # Business logic that NEVER touches external services
│   │   ├── entities/      # Pure TypeScript classes (User, Item, etc.)
│   │   ├── use-cases/     # Feature logic (AddItemUseCase, ShareProfileUseCase)
│   │   └── repositories/  # Interfaces (IItemRepository, IUserRepository)
│   │
│   ├── infrastructure/    # External services ONLY
│   │   ├── database/      # Prisma implementations of repositories
│   │   ├── api/           # Google Books, arXiv clients
│   │   ├── storage/       # S3/Supabase implementations
│   │   └── auth/          # NextAuth adapters
│   │
│   ├── presentation/      # Next.js specifics
│   │   ├── app/           # Next.js 13+ App Router pages
│   │   ├── components/    # Reusable UI (with stories)
│   │   └── hooks/         # React hooks for presentation logic
│   │
│   └── shared/
│       ├── types/         # Shared TypeScript types
│       ├── config/        # Environment validation
│       └── utils/         # Pure functions (date formatters, etc.)
AI Guardrail Rule: If a file imports from next/* or @prisma/*, it belongs in infrastructure/ or presentation/, never in core/.
3.2 Tech Stack (Final Decision)
Based on analysis, this stack balances speed, scalability, and AI-friendliness:
Table
Copy
Layer	Technology	Justification
Framework	Next.js 14 (App Router)	SSR for profiles, API routes backend, single codebase
Auth	NextAuth.js 4.24 + Supabase Auth	Handles all providers, phone OTP, JWT rotation
Database	PostgreSQL (Supabase)	Free tier, Row Level Security, connection pooling
ORM	Prisma 5.x	Type-safe, migrations, AI-friendly schema
Cache	Redis (Upstash)	Serverless, global edge, rate limiting
Storage	Supabase Storage	1GB free, CDN, image transformations
Styling	Tailwind CSS + cva	Component variants prevent className spaghetti
Validation	Zod + valibot	Type-safe forms, runtime validation
API Clients	ofetch + react-query	Typed, cached, retry logic
Background Jobs	Inngest	Event-driven, serverless, idempotent
Analytics	PostHog (self-hosted)	Privacy-first, feature flags, session replay
Error Tracking	Sentry	Source maps, performance monitoring
E2E Testing	Playwright + msw	Mock APIs, visual regression
4. DATABASE SCHEMA: PRODUCTION-READY
4.1 Prisma Schema with RLS Policies (Critical for Security)
prisma
Copy
// schema.prisma
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["views", "relationJoins"]
}

datasource db {
  provider = "postgresql"
  url = env("DATABASE_URL")
}

// ==========================================
// CORE ENTITIES (AI-Proof Business Logic)
// ==========================================

model User {
  id String @id @default(cuid())
  username String @unique @db.VarChar(39) // Twitter-style limit
  email String? @unique
  phone String? @unique
  name String? @db.VarChar(100)
  
  // Privacy & Security
  profileVisibility ProfileVisibility @default(PUBLIC)
  isVerified Boolean @default(false)
  mfaEnabled Boolean @default(false)
  lastLoginAt DateTime?
  loginCount Int @default(0)
  failedLogins Int @default(0) @ignore // For rate limiting in Redis, not DB
  
  // Content stats (denormalized for performance)
  totalItems Int @default(0)
  booksCount Int @default(0)
  papersCount Int @default(0)
  articlesCount Int @default(0)
  streakDays Int @default(0)
  lastReadDate DateTime?
  
  // Relations
  items Item[]
  interests UserInterest[]
  followers Follow[] @relation("Following")
  following Follow[] @relation("Follower")
  accounts Account[]
  
  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Indexes
  @@index([username, email])
  @@index([createdAt])
}

model Item {
  id String @id @default(cuid())
  userId String
  type ItemType
  
  // Core metadata (agnostic of type)
  title String @db.VarChar(500)
  author String? @db.VarChar(500) // Comma-separated for multiple
  url String? @db.Text
  coverImage String? @db.Text // Cloudinary URL
  publishedYear Int?
  
  // User context
  status ReadingStatus @default(READ)
  rating Int? @range(1, 5)
  notes String? @db.Text // Max 5000 chars enforced in use-case
  readDate DateTime?
  addedAt DateTime @default(now())
  
  // Discovery
  isPublic Boolean @default(true)
  viewCount Int @default(0)
  tags ItemTag[]
  
  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Type-specific data (JSONB for flexibility)
  metadata Json @default("{}") // {isbn: "...", doi: "...", journal: "..."}
  
  // Vector for semantic search (future-proof)
  embedding Unsupported("vector(1536)")?
  
  // Indexes
  @@index([userId, addedAt(sort: Desc)])
  @@index([userId, type])
  @@index([title(ops: raw("gin_trgm_ops"))]) // Trigram search
  @@index([embedding], type: Gin) // For vector similarity
}

// ==========================================
// TAGS & INTERESTS (Normalized for Scale)
// ==========================================

model Tag {
  id String @id @default(cuid())
  name String @db.VarChar(50)
  slug String @db.VarChar(50)
  color String @default("#3B82F6") @db.VarChar(7)
  userId String // Tags are user-specific
  
  @@unique([userId, slug])
  @@index([userId])
}

model ItemTag {
  itemId String
  tagId String
  
  @@id([itemId, tagId])
  @@index([itemId])
  @@index([tagId])
}

model Interest {
  id String @id @default(cuid())
  name String @unique
  slug String @unique
  category String // "academic", "fiction", "tech"
  
  @@index([category])
}

model UserInterest {
  userId String
  interestId String
  createdAt DateTime @default(now())
  
  @@id([userId, interestId])
  @@index([userId])
  @@index([interestId])
}

// ==========================================
// SOCIAL GRAPH (Scalable Following)
// ==========================================

model Follow {
  followerId String
  followingId String
  createdAt DateTime @default(now())
  
  @@id([followerId, followingId])
  @@index([followerId])
  @@index([followingId])
}

// ==========================================
// AUDIT LOG (GDPR Compliance & Debug)
// ==========================================

model AuditLog {
  id String @id @default(cuid())
  userId String
  action String @db.VarChar(50) // "ITEM_CREATED", "PROFILE_UPDATED"
  entityType String @db.VarChar(20) // "Item", "User"
  entityId String
  ipAddress String? @db.VarChar(45) // IPv6 support
  userAgent String? @db.Text
  createdAt DateTime @default(now())
  
  @@index([userId, createdAt(sort: Desc)])
  @@index([entityType, entityId])
}

// Enums
enum ItemType { BOOK PAPER ARTICLE }
enum ReadingStatus { WANT_TO_READ READING READ SKIMMED }
enum ProfileVisibility { PUBLIC UNLISTED PRIVATE }
4.2 Row Level Security (RLS) Policies (Critical)
sql
Copy
-- Enable RLS
ALTER TABLE "Item" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

-- Users can only read their own items unless public
CREATE POLICY "Users can read own items" ON "Item"
  FOR SELECT USING ("userId" = current_setting('app.current_user_id')::text OR "isPublic" = true);

-- Users can only modify their own items
CREATE POLICY "Users can modify own items" ON "Item"
  FOR ALL USING ("userId" = current_setting('app.current_user_id')::text);

-- Prevent profile enumeration
CREATE POLICY "Only show public users" ON "User"
  FOR SELECT USING ("profileVisibility" = 'PUBLIC' OR "id" = current_setting('app.current_user_id')::text);
AI Implementation Note: Prisma doesn't natively support RLS. Use middleware to set app.current_user_id before queries.
5. AUTHENTICATION: ENTERPRISE-GRADE
5.1 Multi-Provider Strategy with Fallbacks
TypeScript
Copy
// src/core/use-cases/AuthenticateUser.ts
interface AuthResult {
  userId: string;
  isNewUser: boolean;
  sessionToken: string;
}

export class AuthenticateUserUseCase {
  constructor(
    private userRepo: IUserRepository,
    private accountRepo: IAccountRepository,
    private sessionService: ISessionService
  ) {}

  async execute(provider: AuthProvider, token: string): Promise<AuthResult> {
    // 1. Verify token with provider (infrastructure layer)
    const providerData = await this.verifyProviderToken(provider, token);
    
    // 2. Rate limiting check (Redis)
    await this.checkRateLimit(providerData.email || providerData.phone);
    
    // 3. Find or create user
    let user = await this.userRepo.findByProviderId(provider, providerData.id);
    let isNewUser = false;
    
    if (!user) {
      // Check email/phone collision
      if (providerData.email) {
        const existing = await this.userRepo.findByEmail(providerData.email);
        if (existing && existing.emailVerified) {
          throw new EmailAlreadyRegisteredError();
        }
      }
      
      // Create new user with generated username
      const username = await this.generateUniqueUsername(
        providerData.name || providerData.email || 'user'
      );
      
      user = await this.userRepo.create({
        username,
        email: providerData.email,
        phone: providerData.phone,
        name: providerData.name,
        profileImage: providerData.picture,
        emailVerified: providerData.emailVerified ? new Date() : null,
      });
      isNewUser = true;
    }
    
    // 4. Create session
    const sessionToken = await this.sessionService.createSession(user.id);
    
    // 5. Audit log
    await this.auditLog.log('USER_LOGIN', user.id, { provider });
    
    return { userId: user.id, isNewUser, sessionToken };
  }
}
5.2 Phone Auth with Anti-Fraud
TypeScript
Copy
// src/infrastructure/auth/PhoneVerifier.ts
export class PhoneVerifier {
  private twilio: TwilioClient;
  private redis: RedisClient;
  
  async sendOTP(phone: string): Promise<void> {
    // Rate limit: 3 attempts per hour per phone
    const key = `otp_attempts:${phone}`;
    const attempts = await this.redis.incr(key);
    if (attempts > 3) {
      const ttl = await this.redis.ttl(key);
      throw new RateLimitError(`Wait ${ttl} seconds`);
    }
    if (attempts === 1) await this.redis.expire(key, 3600);
    
    // Generate 6-digit OTP
    const otp = this.generateOTP();
    const hash = await bcrypt.hash(otp, 10);
    
    // Store hashed OTP in Redis (10 min expiry)
    await this.redis.setex(`otp:${phone}`, 600, hash);
    
    // Send via Twilio (with template)
    await this.twilio.messages.create({
      body: `Your ReadFlex code: ${otp}. Valid for 10 min. Never share this code.`,
      to: phone,
      from: process.env.TWILIO_PHONE_NUMBER,
    });
  }
  
  async verifyOTP(phone: string, otp: string): Promise<boolean> {
    const storedHash = await this.redis.get(`otp:${phone}`);
    if (!storedHash) throw new OTPExpiredError();
    
    const isValid = await bcrypt.compare(otp, storedHash);
    if (isValid) await this.redis.del(`otp:${phone}`); // One-time use
    
    return isValid;
  }
}
6. API DESIGN: TYPE-SAFE & DOCUMENTED
6.1 tRPC Router (Prevents API Drift)
TypeScript
Copy
// src/infrastructure/api/trpc/routers/item.ts
export const itemRouter = router({
  create: publicProcedure
    .input(
      z.object({
        title: z.string().min(1).max(500),
        type: z.enum(['BOOK', 'PAPER', 'ARTICLE']),
        author: z.string().optional(),
        url: z.string().url().optional(),
        isbn: z.string().optional(),
        doi: z.string().optional(),
        readDate: z.date().optional(),
        notes: z.string().max(5000).optional(),
        tags: z.array(z.string()).max(10).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Authorization check
      if (!ctx.userId) throw new TRPCError({ code: 'UNAUTHORIZED' });
      
      // Use case execution
      const useCase = new AddItemUseCase(
        new PrismaItemRepository(),
        new PrismaUserRepository()
      );
      
      const result = await useCase.execute({
        userId: ctx.userId,
        ...input,
      });
      
      return result;
    }),
    
  search: publicProcedure
    .input(
      z.object({
        query: z.string().min(2),
        type: z.enum(['BOOK', 'PAPER', 'ARTICLE']).optional(),
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const useCase = new SearchItemsUseCase(
        new PrismaItemRepository()
      );
      
      return useCase.execute({
        userId: ctx.userId,
        ...input,
      });
    }),
});
6.2 REST Fallback for External Integrations
TypeScript
Copy
// src/infrastructure/api/rest/routes/items.ts
const itemsRouter = Router();

itemsRouter.post(
  '/',
  authenticateJWT,
  validateBody(createItemSchema),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const useCase = container.get<AddItemUseCase>(
      'AddItemUseCase'
    );
    
    const result = await useCase.execute({
      userId: req.userId,
      ...req.body,
    });
    
    res.status(201).json({
      success: true,
      data: result,
      links: {
        self: `/items/${result.id}`,
        profile: `/@${req.user.username}`,
      },
    });
  })
);
7. PERFORMANCE STRATEGY: HANDLING 10K+ ITEMS
7.1 Pagination Strategy (Cursor-based)
TypeScript
Copy
// src/core/use-cases/GetUserProfile.ts
export class GetUserProfileUseCase {
  async execute(userId: string, options: {
    limit: number;
    cursor?: string;
    filter?: { type?: ItemType; tag?: string };
  }) {
    // Use keyset pagination for performance
    const cursorClause = options.cursor 
      ? { id: { lt: options.cursor } } 
      : {};
    
    const items = await this.itemRepo.findMany({
      where: {
        userId,
        ...cursorClause,
        ...(options.filter?.type && { type: options.filter.type }),
        ...(options.filter?.tag && { tags: { has: options.filter.tag } }),
      },
      orderBy: { addedAt: 'desc' },
      take: options.limit + 1, // Fetch one extra to detect next page
    });
    
    const hasNextPage = items.length > options.limit;
    const nextCursor = hasNextPage ? items[items.length - 1].id : null;
    
    return {
      items: items.slice(0, options.limit),
      nextCursor,
      hasNextPage,
    };
  }
}
7.2 Caching Hierarchy
TypeScript
Copy
// src/infrastructure/cache/MultiTierCache.ts
export class MultiTierCache {
  // L1: In-memory (per-request)
  private l1 = new Map<string, any>();
  
  // L2: Redis (per-user)
  private l2: RedisClient;
  
  // L3: Database (source of truth)
  
  async get<T>(key: string, fetcher: () => Promise<T>, ttl: number): Promise<T> {
    // L1 check
    if (this.l1.has(key)) return this.l1.get(key);
    
    // L2 check
    const l2Value = await this.l2.get(key);
    if (l2Value) {
      const parsed = JSON.parse(l2Value);
      this.l1.set(key, parsed);
      return parsed;
    }
    
    // L3 fetch
    const value = await fetcher();
    
    // Populate caches
    this.l1.set(key, value);
    await this.l2.setex(key, ttl, JSON.stringify(value));
    
    return value;
  }
}
7.3 Image Optimization Pipeline
TypeScript
Copy
// src/infrastructure/storage/ImageProcessor.ts
export class ImageProcessor {
  async processCoverImage(url: string): Promise<string> {
    // 1. Download original
    const response = await fetch(url);
    const buffer = Buffer.from(await response.arrayBuffer());
    
    // 2. Validate (no SVG exploits, max 10MB)
    if (buffer.length > 10 * 1024 * 1024) throw new ImageTooLargeError();
    
    // 3. Transform with Sharp
    const processed = await sharp(buffer)
      .resize(400, 600, { fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer();
    
    // 4. Upload to Supabase with signed URL
    const filename = `covers/${cuid()}.webp`;
    await supabase.storage.from('covers').upload(filename, processed, {
      contentType: 'image/webp',
    });
    
    // 5. Return public URL with transformation params
    const { data } = supabase.storage.from('covers').getPublicUrl(filename);
    return data.publicUrl;
  }
}
8. AI-FRIENDLY DEVELOPMENT WORKFLOW
8.1 The "Atomic Prompt" Pattern (Prevents AI Chaos)
Instead of asking AI to "build the profile page," break it into atomic, verifiable prompts:
Bad: "Build the profile page with all features"
Good: "Generate a React component that displays a user's items in a grid with cursor-based pagination. Accept props: items: Item[], nextCursor: string|null, onLoadMore: () => void. Use Tailwind with brutalist design. Include loading skeleton."
Atomic Prompt Template:
Copy
CONTEXT: [Link to PRD section]
TASK: [Single, verifiable function/component]
CONSTRAINTS: [TypeScript, tests, performance budget]
OUTPUT: [Code + unit tests + Storybook story]
8.2 AI Code Review Checklist
Before merging AI-generated code, verify:
[ ] No business logic in components — All logic is in core/use-cases/
[ ] No direct DB calls in API routes — Goes through repository interfaces
[ ] **Type imports only from shared/types/, not from @prisma/client in core
[ ] Error boundaries on every React component
[ ] Zod validation on every API boundary
[ ] Rate limiting on every mutation endpoint
[ ] Audit log on every state-changing operation
8.3 Automated AI Guardrails
bash
Copy
# .husky/pre-commit
#!/bin/sh
npm run lint
npm run type-check
npm run test:unit
npm run test:ai-rules

# package.json scripts
{
  "test:ai-rules": "eslint --config .eslintrc-ai.js src/"
}
JavaScript
Copy
// .eslintrc-ai.js
module.exports = {
  rules: {
    // Ban direct Prisma imports in core
    'no-restricted-imports': ['error', {
      patterns: [{
        group: ['@prisma/client'],
        message: 'Import from src/core/repositories instead',
      }],
    }],
    // Enforce use-case pattern
    'no-direct-api-call': ['error', {
      patterns: ['axios', 'fetch'],
    }],
  },
};
9. TESTING STRATEGY: CONFIDENCE AT SCALE
9.1 Testing Pyramid for AI-Generated Code
Copy
Unit Tests (70%): Jest + fast-check (property-based testing)
  - Test every use-case
  - Test every repository method
  - Run in CI on every commit

Integration Tests (20%): Testcontainers (real PostgreSQL)
  - Test API endpoints
  - Test auth flows
  - Run on PRs

E2E Tests (10%): Playwright + MSW (mock external APIs)
  - Critical paths: signup → add item → share profile
  - Visual regression with Percy
  - Run nightly + pre-deploy
9.2 Critical Path Testing
TypeScript
Copy
// e2e/readflex-critical-path.spec.ts
test('Complete user journey: signup → add book → share profile', async ({ page }) => {
  // 1. Sign up with Google
  await page.goto('/auth/signin');
  await page.click('text="Sign in with Google"');
  // ... handle OAuth popup
  
  // 2. Onboarding
  await expect(page).toHaveURL(/\/onboarding/);
  await page.click('button:has-text("Technology")');
  await page.click('button:has-text("Science")');
  await page.click('text="Continue"');
  
  // 3. Add first book
  await expect(page).toHaveURL(/\/profile/);
  await page.click('text="Add Your First Read"');
  await page.fill('input[placeholder="Search books..."]', 'Can\t Hurt Me');
  await page.click('text="Can\'t Hurt Me - David Goggins"');
  await page.click('text="Add to Profile"');
  
  // 4. Verify on profile
  await expect(page.locator('text="Can\'t Hurt Me"')).toBeVisible();
  
  // 5. Share profile
  await page.click('text="Share Profile"');
  const shareUrl = await page.inputValue('input[readonly]');
  expect(shareUrl).toMatch(/^https:\/\/readflex\.com\/@[a-z0-9_]+$/);
  
  // 6. Verify public view
  await page.goto(shareUrl);
  await expect(page.locator('text="Can\'t Hurt Me"')).toBeVisible();
});
10. MONITORING & OBSERVABILITY: DON'T FLY BLIND
10.1 Metrics Dashboard (Prometheus + Grafana)
yaml
Copy
# Key Metrics to Track
- **User**: signup_rate, dau, item_add_rate, sharing_rate
- **Performance**: p95_api_latency, db_query_time, cache_hit_rate
- **Error**: error_rate_by_endpoint, auth_failure_rate, rate_limit_hits
- **Business**: avg_items_per_user, profile_views, social_interactions
10.2 Alerting Rules
yaml
Copy
# Alert: High error rate
- alert: ReadFlexHighErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
  for: 5m
  labels: { severity: 'critical' }
  annotations:
    summary: "Error rate > 5% for 5 minutes"

# Alert: Database slow queries
- alert: ReadFlexSlowQueries
  expr: histogram_quantile(0.95, db_query_duration_seconds) > 1
  for: 10m
  annotations:
    summary: "P95 query time > 1s"
11. ERROR HANDLING & RESILIENCE
11.1 Error Taxonomy
TypeScript
Copy
// src/shared/types/errors.ts
export class ReadFlexError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly shouldReport: boolean;
  
  constructor(message: string, code: string, statusCode: number, shouldReport = false) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.shouldReport = shouldReport;
  }
}

export class RateLimitError extends ReadFlexError {
  constructor(message = 'Too many requests') {
    super(message, 'RATE_LIMIT', 429, false);
  }
}

export class ProviderAPIError extends ReadFlexError {
  constructor(provider: string) {
    super(`${provider} is unavailable`, 'PROVIDER_ERROR', 503, true);
  }
}
11.2 Circuit Breaker Pattern (Prevent Cascade Failures)
TypeScript
Copy
// src/infrastructure/api/CircuitBreaker.ts
export class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failures = 0;
  private lastFailureTime = 0;
  
  constructor(
    private threshold: number = 5,
    private timeout: number = 60000 // 1 minute
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new ProviderAPIError('Google Books');
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}
12. DEPLOYMENT & CI/CD: ZERO-DOWNTIME
12.1 GitHub Actions Workflow
yaml
Copy
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with: { node-version: '20' }
      
      - name: Start services
        run: docker-compose up -d postgres redis
      
      - name: Install deps
        run: npm ci
      
      - name: Generate Prisma client
        run: npx prisma generate
      
      - name: Run migrations
        run: npx prisma migrate deploy
      
      - name: Run tests
        run: npm run test:coverage
      
      - name: Run E2E
        run: npm run test:e2e
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test
      
      - name: Build
        run: npm run build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
12.2 Database Migrations (Zero-Downtime)
bash
Copy
# Safe migration pattern
1. Create new column/table (nullable)
2. Deploy code that writes to both old & new
3. Backfill old data to new column/table
4. Deploy code that reads from new only
5. Drop old column/table

# Example: Adding a column
npx prisma migrate dev --name add_item_embedding
# Then create a backfill script in src/scripts/backfill-embedding.ts
13. PRIVACY & GDPR: BUILT-IN, NOT BOLTED-ON
13.1 Data Retention Policy
TypeScript
Copy
// src/core/services/DataRetentionService.ts
export class DataRetentionService {
  async deleteUserData(userId: string) {
    // 1. Soft delete ( GDPR "right to be forgotten" grace period)
    await this.userRepo.update(userId, { deletedAt: new Date() });
    
    // 2. Schedule hard delete after 30 days
    await this.scheduler.schedule('hard-delete-user', {
      userId,
      executeAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });
    
    // 3. Remove from search indexes
    await this.searchIndex.delete(`user_${userId}`);
  }
  
  async exportUserData(userId: string): Promise<Readable> {
    const user = await this.userRepo.findById(userId);
    const items = await this.itemRepo.findByUserId(userId);
    
    const exportData = {
      user: this.sanitize(user),
      items: items.map(this.sanitize),
      exportedAt: new Date().toISOString(),
    };
    
    return Readable.from([JSON.stringify(exportData, null, 2)]);
  }
}
13.2 Consent Management
TypeScript
Copy
// src/core/entities/UserConsent.ts
export class UserConsent {
  private consent = new Map<ConsentType, ConsentRecord>();
  
  grant(type: ConsentType, metadata: Record<string, any>) {
    this.consent.set(type, {
      granted: true,
      timestamp: new Date(),
      metadata,
    });
  }
  
  revoke(type: ConsentType) {
    this.consent.set(type, {
      granted: false,
      timestamp: new Date(),
    });
  }
  
  isGranted(type: ConsentType): boolean {
    return this.consent.get(type)?.granted === true;
  }
}
14. THE "VIBE CODE WITHOUT CHAOS" PLAYBOOK
14.1 Your AI Pair Programming Protocol
Step 1: PRD → Use Cases → Code
PRD Section → Use Case (TypeScript interface) → AI generates implementation
Step 2: One Prompt, One File
Copy
Don't: "Build the profile page"
Do: "Implement the `GetProfileUseCase.execute()` method that returns UserProfileDTO. 
Include unit tests. Follow existing patterns in src/core/use-cases/."
Step 3: Force AI to Use Your Abstractions
Copy
Always provide:
- Repository interface definition
- DTO types
- Example test
- Necessary imports

This prevents AI from "reaching around" your architecture.
Step 4: Automated Validation
bash
Copy
# After AI generates code:
npm run lint -- --fix
npm run type-check
npm run test:unit -- --watchAll=false
# Only commit if all pass
14.2 AI Prompt Library (Copy-Paste Ready)
Prompt 1: Generate Use Case
Copy
I need a use case for [FEATURE]. 
Business rules: [RULES]
Acceptance criteria: [CRITERIA]

Generate:
1. The use case class in src/core/use-cases/
2. Unit tests in src/core/use-cases/__tests__/
3. The repository interface method if needed
4. DTO types in src/shared/types/

Follow existing patterns. Use Zod for validation. Include error cases.
Prompt 2: Generate API Endpoint
Copy
I need a tRPC procedure for [ACTION].

Input: [ZOD_SCHEMA]
Output: [DTO_TYPE]
Authorization: [WHO_CAN_ACCESS]

Generate:
1. tRPC procedure in src/infrastructure/api/trpc/routers/
2. React hook in src/presentation/hooks/
3. Integration test

Use the existing [RepositoryName] repository. Don't bypass layers.
Prompt 3: Generate UI Component
Copy
I need a React component: [COMPONENT_NAME].

Props: [PROPS]
Design: [Figma link or description]
Accessibility: [A11Y_REQUIREMENTS]

Generate:
1. Component in src/presentation/components/
2. Storybook story
3. Unit tests with React Testing Library
4. CSS using Tailwind + cva

Use composition pattern. Keep under 200 LOC. Extract sub-components if needed.
15. SUCCESS METRICS & ITERATION CYCLE
15.1 Week-by-Week KPIs
Table
Copy
Week	Goal	Metric	Abort Criteria
1	Auth works	95% signup success	< 80% success rate
2	First item added	70% of users add item	< 50%
3	Profile shared	30% share rate	< 10%
4	Social follows	5 follows per user avg	< 1 avg
6	Performance	p95 < 500ms	p95 > 2s
8	Retention	40% weekly active	< 20%
15.2 Bi-Week Retro Questions
Which AI-generated code caused bugs? Why?
Which abstractions prevented AI mess?
What patterns need to be enforced more strictly?
What should be documented better for AI?
16. FINAL CHECKLIST: BEFORE YOU WRITE CODE
[ ] Environment: nvm use 20, docker-compose up -d postgres redis
[ ] Config: Validate .env with zod schema
[ ] DB: npx prisma generate && npx prisma migrate dev
[ ] Linting: ESLint + Prettier configured
[ ] Testing: Jest, Playwright, MSW installed
[ ] AI Guardrails: .eslintrc-ai.js active in pre-commit
[ ] Monitoring: Sentry DSN configured
[ ] Analytics: PostHog token set
[ ] CI: GitHub Actions secrets configured
[ ] Backup: Supabase auto-backups enabled
[ ] Security: Dependabot alerts enabled
17. THE ONE-PAGE CHEAT SHEET (Print & Pin)
Copy
┌─────────────────────────────────────────────────────────────┐
│ READFLEX DEVELOPMENT RULES                                  │
├─────────────────────────────────────────────────────────────┤
│ 1. NEVER import @prisma/client in /core                     │
│ 2. ALWAYS use use-cases for business logic                  │
│ 3. ALWAYS validate inputs with Zod                          │
│ 4. ALWAYS handle errors with ReadFlexError                  │
│ 5. ALWAYS add audit logs for state changes                  │
│ 6. ALWAYS rate-limit mutations (100/min)                    │
│ 7. ALWAYS test critical paths (signup → add → share)        │
│ 8. NEVER expose internal IDs in APIs                        │
│ 9. ALWAYS use cursor pagination for >50 items               │
│ 10. ALWAYS run lint/type-check/tests before commit          │
└─────────────────────────────────────────────────────────────┘
18. ANTI-PATTERNS TO AVOID (Learned from AI Failures)
❌ The "Big Ball of Mud": Letting AI generate a 500-line component
✅ Solution: Break into < 100 line components with single responsibility
❌ The "Prisma in Component": AI loves prisma.item.findMany() in React
✅ Solution: Repository interface + use-case layer enforces separation
❌ The "Any Type Tsunami": AI generates any when types get complex
✅ Solution: Strict ESLint rule: no-explicit-any: error
❌ The "Orphaned Feature": AI builds a feature but no tests
✅ Solution: Require tests in the same PR, enforced by CI
❌ The "Magic String Explosion": AI scatters API keys, URLs in code
✅ Solution: All config in src/shared/config/ with Zod validation
19. WHAT MAKES THIS PRD "AI-PROOF"
Clear boundaries: Each layer has strict import rules AI can follow
Atomic tasks: Prompts map 1:1 to use-cases/components
Validation at edges: Zod schemas catch AI mistakes before runtime
Testing required: Forces AI to think about edge cases
Pattern enforcement: ESLint rules guide AI toward correct abstractions
Incremental: Each phase is small enough for AI to not get lost
The result: You can vibe-code 80% of the codebase, but the 20% of critical infrastructure (auth, caching, error handling) is so well-defined that AI can't mess it up.