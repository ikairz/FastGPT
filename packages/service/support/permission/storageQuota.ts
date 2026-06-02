/**
 * Sapply AI - User Storage Quota Control
 *
 * Controls storage quota based on username prefix:
 *   N* = Normal user  → limited (default 50MB)
 *   V* = seed (VIP)   → unlimited
 *   S* = Seed user    → unlimited
 *   P* = Paid user    → configurable
 *   other / root      → unlimited
 *
 * Config in config.json feConfigs.storageQuotaByPrefix:
 *   { "N": 50, "P": 200, "V": -1, "S": -1 }
 *   -1 = unlimited, value in MB
 *
 * Upgrade note: This file is isolated from FastGPT core.
 * When upgrading FastGPT, only re-apply changes to:
 *   1. This file (no changes needed unless logic changes)
 *   2. packages/service/core/dataset/collection/schema.ts (add fileSize field)
 *   3. packages/global/core/dataset/type.ts (add fileSize type)
 *   4. projects/app/src/pages/api/core/dataset/collection/create/localFile.ts (add quota check)
 */

import { connectionMongo } from '../../common/mongo';
import { MongoUser } from '../../support/user/schema';

const DatasetColCollectionName = 'dataset_collections';

/**
 * Get storage limit in bytes for a given username prefix.
 * Returns Infinity if unlimited, or bytes if limited.
 */
export function getStorageLimitBytes(username: string): number {
  const prefix = (username?.[0] ?? '').toUpperCase();

  // Read from config, fallback to defaults
  const quotaConfig: Record<string, number> =
    (global.feConfigs as any)?.storageQuotaByPrefix ?? {};

  // Default limits (MB): N=50, others=unlimited
  const defaultLimits: Record<string, number> = {
    N: 50
  };

  const limitMB =
    prefix in quotaConfig
      ? quotaConfig[prefix]
      : prefix in defaultLimits
        ? defaultLimits[prefix]
        : -1; // unlimited by default

  if (limitMB === -1 || limitMB === undefined) return Infinity;
  return limitMB * 1024 * 1024;
}

/**
 * Get total file size used by a team (sum of fileSize in dataset_collections).
 * Returns 0 if no data found.
 */
export async function getTeamTotalFileSize(teamId: string): Promise<number> {
  const { mongoose } = connectionMongo;
  const result = await mongoose.connection
    .collection(DatasetColCollectionName)
    .aggregate([
      {
        $match: {
          teamId: new mongoose.Types.ObjectId(teamId),
          fileSize: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$fileSize' }
        }
      }
    ])
    .toArray();

  return result[0]?.total ?? 0;
}

/**
 * Check if a user can upload a file of given size.
 * Throws error if quota exceeded.
 */
export async function checkUserStorageQuota({
  userId,
  teamId,
  fileSize
}: {
  userId: string;
  teamId: string;
  fileSize: number;
}): Promise<void> {
  const user = await MongoUser.findById(userId).lean();
  if (!user) return; // If user not found, allow (fail open)

  const limitBytes = getStorageLimitBytes(user.username);
  if (limitBytes === Infinity) return; // Unlimited

  const usedBytes = await getTeamTotalFileSize(teamId);

  if (usedBytes + fileSize > limitBytes) {
    const limitMB = Math.round(limitBytes / 1024 / 1024);
    const usedMB = Math.round(usedBytes / 1024 / 1024);
    const fileMB = Math.round(fileSize / 1024 / 1024 * 10) / 10;
    return Promise.reject(
      new Error(
        `存储空间不足。当前已用 ${usedMB}MB / 限额 ${limitMB}MB，本次文件 ${fileMB}MB。如需扩容请联系管理员。`
      )
    );
  }
}
