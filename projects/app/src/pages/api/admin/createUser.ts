/**
 * Sapply AI - Root-only user creation API
 * POST /api/admin/createUser
 *
 * Header: rootkey: <ROOT_KEY from docker-compose.yml>
 * Body: { username: string, password: string }
 *
 * Username prefix rules:
 *   N* = Normal user (50MB storage limit)
 *   P* = Paid user (200MB storage limit)
 *   V* / S* = Seed user (unlimited)
 *
 * Upgrade note: This file is Sapply-only, no conflict with FastGPT core.
 */

import { NextAPI } from '@/service/middleware/entry';
import { type ApiRequestProps } from '@fastgpt/service/type/next';
import { MongoUser } from '@fastgpt/service/support/user/schema';
import { createDefaultTeam } from '@fastgpt/service/support/user/team/controller';
import { connectionMongo } from '@fastgpt/service/common/mongo';
import { UserStatusEnum } from '@fastgpt/global/support/user/constant';
import { serviceEnv } from '@fastgpt/service/env';
import { ERROR_ENUM } from '@fastgpt/global/common/error/errorCode';

const { startSession } = connectionMongo;

type CreateUserBody = {
  username: string;
  password: string;
  teamName?: string;
};

async function handler(req: ApiRequestProps<CreateUserBody>) {
  // 验证 root 权限
  const rootkey = req.headers.rootkey as string;
  if (!rootkey || rootkey !== serviceEnv.ROOT_KEY) {
    return Promise.reject(ERROR_ENUM.unAuthorization);
  }

  const { username, password, teamName } = req.body;

  if (!username || !password) {
    return Promise.reject(new Error('username 和 password 不能为空'));
  }
  if (username === 'root') {
    return Promise.reject(new Error('不能创建 root 用户'));
  }
  if (username.length < 3) {
    return Promise.reject(new Error('用户名至少3个字符'));
  }

  // 检查用户名是否已存在
  const existing = await MongoUser.findOne({ username });
  if (existing) {
    return Promise.reject(new Error(`用户名 "${username}" 已存在`));
  }

  // 用户名前缀说明
  const prefix = username[0].toUpperCase();
  const prefixDesc: Record<string, string> = {
    N: '普通用户（50MB存储限额）',
    P: '付费用户（200MB存储限额）',
    V: '种子用户（不限存储）',
    S: '种子用户（不限存储）'
  };

  const session = await startSession();
  try {
    session.startTransaction();

    // 创建用户（password 由 schema setter 自动 SHA256 加密）
    const [user] = await MongoUser.create(
      [
        {
          username,
          password,
          status: UserStatusEnum.active,
          timezone: 'Asia/Shanghai',
          language: 'zh-CN'
        }
      ],
      { session }
    );

    // 创建默认团队
    await createDefaultTeam({
      userId: String(user._id),
      teamName: teamName || `${username} 的团队`,
      session
    });

    await session.commitTransaction();

    return {
      userId: user._id,
      username: user.username,
      userType: prefixDesc[prefix] || '普通用户（不限存储）',
      message: `用户 "${username}" 创建成功`
    };
  } catch (error) {
    await session.abortTransaction();
    return Promise.reject(error);
  } finally {
    session.endSession();
  }
}

export default NextAPI(handler);
