/**
 * Sapply AI - Root-only user list API
 * GET /api/admin/listUsers
 * Header: rootkey: <ROOT_KEY>
 *
 * Returns all users with their default team info.
 * Upgrade note: This file is Sapply-only, no conflict with FastGPT core.
 */

import { NextAPI } from '@/service/middleware/entry';
import { type ApiRequestProps } from '@fastgpt/service/type/next';
import { MongoUser } from '@fastgpt/service/support/user/schema';
import { MongoTeam } from '@fastgpt/service/support/user/team/teamSchema';
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';
import { serviceEnv } from '@fastgpt/service/env';
import { ERROR_ENUM } from '@fastgpt/global/common/error/errorCode';

async function handler(req: ApiRequestProps) {
  const rootkey = req.headers.rootkey as string;
  if (!rootkey || rootkey !== serviceEnv.ROOT_KEY) {
    return Promise.reject(ERROR_ENUM.unAuthorization);
  }

  const users = await MongoUser.find({}, { username: 1, status: 1, createTime: 1 }).lean();

  // 批量查各用户的默认团队（找 owner 角色的 teamMember）
  const userIds = users.map((u) => String(u._id));

  const members = await MongoTeamMember.find(
    { userId: { $in: userIds }, role: 'owner' },
    { userId: 1, teamId: 1 }
  ).lean();

  const teamIds = members.map((m) => m.teamId);
  const teams = await MongoTeam.find({ _id: { $in: teamIds } }, { name: 1 }).lean();

  const teamMap = new Map(teams.map((t) => [String(t._id), t.name]));
  const memberMap = new Map(members.map((m) => [String(m.userId), String(m.teamId)]));

  const result = users.map((u) => {
    const uid = String(u._id);
    const teamId = memberMap.get(uid) || '';
    const teamName = teamId ? (teamMap.get(teamId) || '') : '';
    return {
      userId: uid,
      username: u.username,
      status: u.status,
      teamId,
      teamName,
      createTime: u.createTime
    };
  });

  return { users: result };
}

export default NextAPI(handler);
