/**
 * Sapply AI - Root-only user delete API
 * DELETE /api/admin/deleteUser
 * Header: rootkey: <ROOT_KEY>
 * Body: { userId }
 *
 * 使用软删除（设置 status=forbidden），避免连带删除知识库/工作流等数据。
 * Upgrade note: This file is Sapply-only, no conflict with FastGPT core.
 */

import { NextAPI } from '@/service/middleware/entry';
import { type ApiRequestProps } from '@fastgpt/service/type/next';
import { MongoUser } from '@fastgpt/service/support/user/schema';
import { serviceEnv } from '@fastgpt/service/env';
import { ERROR_ENUM } from '@fastgpt/global/common/error/errorCode';
import { UserStatusEnum } from '@fastgpt/global/support/user/constant';

type DeleteUserBody = {
  userId: string;
};

async function handler(req: ApiRequestProps<DeleteUserBody>) {
  const rootkey = req.headers.rootkey as string;
  if (!rootkey || rootkey !== serviceEnv.ROOT_KEY) {
    return Promise.reject(ERROR_ENUM.unAuthorization);
  }

  const { userId } = req.body;
  if (!userId) {
    return Promise.reject(new Error('userId 不能为空'));
  }

  const user = await MongoUser.findById(userId);
  if (!user) {
    return Promise.reject(new Error('用户不存在'));
  }
  if (user.username === 'root') {
    return Promise.reject(new Error('不能删除 root 用户'));
  }

  await MongoUser.findByIdAndUpdate(userId, { status: UserStatusEnum.forbidden });

  return { message: `用户 "${user.username}" 已禁用` };
}

export default NextAPI(handler);
