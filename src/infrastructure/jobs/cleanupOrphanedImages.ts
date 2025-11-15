import { PrismaClient } from '@prisma/client';
import { env } from '@/shared/config/env';

const inngest = {
  createFunction: (config: any, trigger: any, handler: any) => ({ config, trigger, handler })
};

function createClient(url: string, key: string) {
  return {
    storage: {
      from: (bucket: string) => ({
        list: async (path: string, options: any) => ({ data: [], error: null }),
        remove: async (paths: string[]) => ({ error: null })
      })
    }
  };
}

export const cleanupOrphanedImages = inngest.createFunction(
  { id: 'cleanup-orphaned-images' },
  { cron: '0 2 * * *' }, // Daily at 2 AM
  async ({ step }: { step: any }) => {
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const prisma = new PrismaClient();

    try {
      // Get all image paths from storage
      const { data: files, error } = await step.run('list-storage-files', async () => {
        return await supabase.storage.from('covers').list('covers', {
          limit: 1000,
          sortBy: { column: 'created_at', order: 'asc' }
        });
      });

      if (error) {
        throw new Error(`Failed to list storage files: ${error.message}`);
      }

      if (!files?.length) {
        return { deletedCount: 0, message: 'No files found in storage' };
      }

      // Extract item IDs from file paths
      const storageItemIds = new Set<string>();
      const filePaths: string[] = [];

      for (const file of files) {
        const match = file.name.match(/covers\/[^\/]+\/([^\/]+)\.webp$/);
        if (match) {
          storageItemIds.add(match[1]);
          filePaths.push(`covers/${file.name}`);
        }
      }

      // Get existing item IDs from database
      const existingItems = await step.run('get-existing-items', async () => {
        return await prisma.item.findMany({
          where: { id: { in: Array.from(storageItemIds) } },
          select: { id: true }
        });
      });

      const existingItemIds = new Set(existingItems.map((item: any) => item.id));

      // Find orphaned files
      const orphanedPaths = filePaths.filter(path => {
        const match = path.match(/covers\/[^\/]+\/([^\/]+)\.webp$/);
        return match && !existingItemIds.has(match[1]);
      });

      if (orphanedPaths.length === 0) {
        return { deletedCount: 0, message: 'No orphaned images found' };
      }

      // Delete orphaned files in batches
      const batchSize = 50;
      let deletedCount = 0;

      for (let i = 0; i < orphanedPaths.length; i += batchSize) {
        const batch = orphanedPaths.slice(i, i + batchSize);
        
        await step.run(`delete-batch-${Math.floor(i / batchSize)}`, async () => {
          const { error } = await supabase.storage.from('covers').remove(batch);
          if (error) {
            throw new Error(`Failed to delete batch: ${(error as any).message}`);
          }
          return batch.length;
        });

        deletedCount += batch.length;
      }

      return {
        deletedCount,
        message: `Successfully deleted ${deletedCount} orphaned images`
      };
    } finally {
      await prisma.$disconnect();
    }
  }
);