import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { NextAPI } from '@/service/middleware/entry';
import {
  UpdateTeamBodySchema,
  UpdateTeamResponseSchema,
  type UpdateTeamResponseType
} from '@fastgpt/global/openapi/support/user/team/api';
import { authUserPer } from '@fastgpt/service/support/permission/user/auth';
import { updateTeam } from '@fastgpt/service/support/user/team/controller';
import { ManagePermissionVal } from '@fastgpt/global/support/permission/constant';
import { serviceEnv } from '@fastgpt/service/env';

async function handler(req: ApiRequestProps): Promise<UpdateTeamResponseType> {
  const body = UpdateTeamBodySchema.parse(req.body);

  const { teamId } = await authUserPer({ req, authToken: true, per: ManagePermissionVal });

  // Sapply: 只有 root 可以修改团队名称
  const updateBody = { ...body };
  if (updateBody.name !== undefined) {
    const rootkey = req.headers.rootkey as string;
    if (!rootkey || rootkey !== serviceEnv.ROOT_KEY) {
      delete updateBody.name;
    }
  }

  await updateTeam({ teamId, ...updateBody });

  return UpdateTeamResponseSchema.parse({});
}

export default NextAPI(handler);
