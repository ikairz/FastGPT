import type { NextApiResponse } from 'next';
import { type ApiRequestProps } from '@fastgpt/service/type/next';
import { NextAPI } from '@/service/middleware/entry';
import { authCert } from '@fastgpt/service/support/permission/auth/common';
import type { FastGPTFeConfigsType } from '@fastgpt/global/common/system/types';
import type { SubPlanType } from '@fastgpt/global/support/wallet/sub/type';
import type { SystemDefaultModelType, SystemModelItemType } from '@fastgpt/service/core/ai/type';
import type { AIProxyChannelsType, I18nStringStrictType } from '@fastgpt/global/sdk/fastgpt-plugin';
import { MongoTeam } from '@fastgpt/service/support/user/team/teamSchema';
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';

export type InitDateResponse = {
  bufferId?: string;

  feConfigs?: FastGPTFeConfigsType;
  subPlans?: SubPlanType;
  systemVersion?: string;

  activeModelList?: SystemModelItemType[];
  defaultModels?: SystemDefaultModelType;
  modelProviders?: { provider: string; value: I18nStringStrictType; avatar: string }[];
  aiproxyChannels?: AIProxyChannelsType;
};

// Sapply: 按团队名前缀过滤模型列表
async function filterActiveModelsByTeam(
  models: SystemModelItemType[],
  userId: string,
  isRoot: boolean
): Promise<SystemModelItemType[]> {
  if (isRoot) return models;
  const member = await MongoTeamMember.findOne({ userId, role: 'owner' }).lean();
  if (!member) return models;
  const team = await MongoTeam.findById(member.teamId).lean();
  const teamName = (team?.name || '').toLowerCase();
  return models.filter((m) => {
    const id = (m.model || '').toLowerCase();
    if (id.startsWith('public-')) return true;
    if (teamName && id.startsWith(teamName + '-')) return true;
    if (!m.model.includes('-')) return true;
    return false;
  });
}

async function handler(
  req: ApiRequestProps<Record<string, never>, { bufferId?: string }>,
  res: NextApiResponse
): Promise<InitDateResponse> {
  const { bufferId } = req.query;

  try {
    const { userId, isRoot } = await authCert({ req, authToken: true });
    // If bufferId is the same as the current bufferId, return directly (skip heavy reload but still filter models)
    if (bufferId && global.systemInitBufferId && global.systemInitBufferId === bufferId) {
      return {
        bufferId: global.systemInitBufferId,
        feConfigs: global.feConfigs,
        systemVersion: global.systemVersion
      };
    }

    // Sapply: 过滤模型列表
    const activeModelList = await filterActiveModelsByTeam(
      global.systemActiveDesensitizedModels,
      userId,
      isRoot
    );

    return {
      bufferId: global.systemInitBufferId,
      feConfigs: global.feConfigs,
      subPlans: global.subPlans,
      systemVersion: global.systemVersion,
      activeModelList,
      defaultModels: global.systemDefaultModel,
      modelProviders: global.ModelProviderRawCache,
      aiproxyChannels: global.aiproxyChannelsCache
    };
  } catch (error) {
    const referer = req.headers.referer;
    if (referer?.includes('/price')) {
      return {
        feConfigs: global.feConfigs,
        subPlans: global.subPlans,
        modelProviders: global.ModelProviderRawCache,
        aiproxyChannels: global.aiproxyChannelsCache,
        activeModelList: global.systemActiveDesensitizedModels
      };
    }

    const unAuthBufferId = global.systemInitBufferId ? `unAuth_${global.systemInitBufferId}` : '';
    if (bufferId && unAuthBufferId === bufferId) {
      return {
        bufferId: unAuthBufferId,
        modelProviders: global.ModelProviderRawCache,
        aiproxyChannels: global.aiproxyChannelsCache
      };
    }

    return {
      bufferId: unAuthBufferId,
      feConfigs: global.feConfigs,
      modelProviders: global.ModelProviderRawCache,
      aiproxyChannels: global.aiproxyChannelsCache
    };
  }
}

export default NextAPI(handler);
