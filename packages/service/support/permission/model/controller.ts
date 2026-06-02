import { PerResourceTypeEnum } from '@fastgpt/global/support/permission/constant';
import { getGroupsByTmbId } from '../memberGroup/controllers';
import { getOrgsByTmbId } from '../org/controllers';
import { MongoResourcePermission } from '../schema';
import { getCollaboratorId } from '@fastgpt/global/support/permission/utils';
import { isProVersion } from '../../../common/system/constants';
import { MongoTeam } from '../../user/team/teamSchema';

// Sapply: 根据模型ID前缀过滤
// 规则：模型ID以 "public-" 开头 → 所有人可见；以 "团队名-" 开头 → 仅该团队可见；无 "-" → 所有人可见（兼容旧数据）
async function filterModelsByTeamName(modelIds: string[], teamId: string): Promise<string[]> {
  const team = await MongoTeam.findById(teamId).lean();
  const teamName = team?.name || '';
  return modelIds.filter((modelId) => {
    const id = modelId.toLowerCase();
    if (id.startsWith('public-')) return true;
    if (teamName && id.startsWith(teamName.toLowerCase() + '-')) return true;
    if (!modelId.includes('-')) return true;
    return false;
  });
}

export const getMyModels = async ({
  teamId,
  tmbId,
  isTeamOwner,
  isRoot = false
}: {
  teamId: string;
  tmbId: string;
  isTeamOwner: boolean;
  isRoot?: boolean;
}) => {
  // Sapply: 只有 root 返回全集；普通用户（含团队 owner）按团队名前缀过滤
  if (isRoot || !isProVersion()) {
    return global.systemModelList.map((m) => m.model);
  }
  const [groups, orgs] = await Promise.all([
    getGroupsByTmbId({
      teamId,
      tmbId
    }),
    getOrgsByTmbId({
      teamId,
      tmbId
    })
  ]);

  const myIdSet = new Set([tmbId, ...groups.map((g) => g._id), ...orgs.map((o) => o._id)]);

  const rps = await MongoResourcePermission.find({
    teamId,
    resourceType: PerResourceTypeEnum.model
  }).lean();

  const permissionConfiguredModelSet = new Set(rps.map((rp) => rp.resourceName));
  const unconfiguredModels = global.systemModelList.filter(
    (model) => !permissionConfiguredModelSet.has(model.model)
  );

  const myModels = rps.filter((rp) => myIdSet.has(getCollaboratorId(rp)));

  const ids = [...unconfiguredModels.map((m) => m.model), ...myModels.map((m) => m.resourceName)];
  return filterModelsByTeamName(ids, teamId);
};
