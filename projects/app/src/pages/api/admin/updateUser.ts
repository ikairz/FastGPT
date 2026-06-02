/**
 * Sapply AI - Root-only user update API
 * PUT /api/admin/updateUser
 * Header: rootkey: <ROOT_KEY>
 * Body: { userId, password?, status?, teamName? }
 *
 * Upgrade note: This file is Sapply-only, no conflict with FastGPT core.
 */

import { NextAPI } from '@/service/middleware/entry';
import { type ApiRequestProps } from '@fastgpt/service/type/next';
import { MongoUser } from '@fastgpt/service/support/user/schema';
import { MongoTeam } from '@fastgpt/service/support/user/team/teamSchema';
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';
import { serviceEnv } from '@fastgpt/service/env';
import { ERROR_ENUM } from '@fastgpt/global/common/error/errorCode';
import { hashStr } from '@fastgpt/global/common/string/tools';
import { UserStatusEnum } from '@fastgpt/global/support/user/constant';

type UpdateUserBody = {
  userId: string;
  password?: string;
  status?: string;
  teamName?: string;
};

async function handler(req: ApiRequestProps<UpdateUserBody>) {
  const rootkey = req.headers.rootkey as string;
  if (!rootkey || rootkey !== serviceEnv.ROOT_KEY) {
    return Promise.reject(ERROR_ENUM.unAuthorization);
  }

  const { userId, password, status, teamName } = req.body;
  if (!userId) {
    return Promise.reject(new Error('userId 不能为空'));
  }

  const user = await MongoUser.findById(userId);
  if (!user) {
    return Promise.reject(new Error('用户不存在'));
  }
  if (user.username === 'root') {
    return Promise.reject(new Error('不能修改 root 用户'));
  }

  // Sapply: 团队名格式验证
  if (teamName !== undefined && teamName !== '') {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/.test(teamName)) {
      return Promise.reject(new Error('团队名只能包含英文字母、数字、连字符（-），且不能以连字符开头或结尾'));
    }
  }

  const userUpdate: Record<string, unknown> = {};
  if (password) userUpdate.password = hashStr(password);
  if (status && (status === UserStatusEnum.active || status === UserStatusEnum.forbidden)) {
    userUpdate.status = status;
  }

  if (Object.keys(userUpdate).length > 0) {
    await MongoUser.findByIdAndUpdate(userId, userUpdate);
  }

  // 更新团队名（找用户的 owner 团队）
  if (teamName !== undefined && teamName !== '') {
    const member = await MongoTeamMember.findOne({ userId, role: 'owner' }).lean();
    if (member) {
      await MongoTeam.findByIdAndUpdate(member.teamId, { name: teamName });
    }
  }

  return { message: '更新成功' };
}

export default NextAPI(handler);
