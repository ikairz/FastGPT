/**
 * Sapply AI - Get current user storage usage and quota
 * GET /api/support/user/storageUsage
 *
 * Returns used bytes and quota limit for the current user.
 * Upgrade note: This file is Sapply-only, no conflict with FastGPT core.
 */

import { NextAPI } from '@/service/middleware/entry';
import { type ApiRequestProps } from '@fastgpt/service/type/next';
import { authUserPer } from '@fastgpt/service/support/permission/user/auth';
import { ReadPermissionVal } from '@fastgpt/global/support/permission/constant';
import {
  getStorageLimitBytes,
  getTeamTotalFileSize
} from '@fastgpt/service/support/permission/storageQuota';
import { MongoUser } from '@fastgpt/service/support/user/schema';

async function handler(req: ApiRequestProps) {
  const { teamId, userId } = await authUserPer({ req, authToken: true, per: ReadPermissionVal });

  const user = await MongoUser.findById(userId, { username: 1 }).lean();
  const username = user?.username || '';

  const limitBytes = getStorageLimitBytes(username);
  const usedBytes = await getTeamTotalFileSize(teamId);

  return {
    usedBytes,
    limitBytes,
    limitMB: limitBytes === -1 ? -1 : Math.round(limitBytes / 1024 / 1024)
  };
}

export default NextAPI(handler);
