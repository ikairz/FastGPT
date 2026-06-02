import React from 'react';
import { Box, Flex } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import PageContainer from '@/components/PageContainer';
import SideTabs from '@/components/SideTabs';
import { useSystem } from '@fastgpt/web/hooks/useSystem';
import LightRowTabs from '@fastgpt/web/components/common/Tabs/LightRowTabs';

enum ConfigTabEnum {
  tool = 'tool',
  users = 'users'
}

const tabList = [
  {
    icon: 'common/model',
    label: '工具管理',
    value: ConfigTabEnum.tool
  },
  {
    icon: 'support/user/usersLight',
    label: '用户管理',
    value: ConfigTabEnum.users
  }
];

const ConfigContainer = ({
  children,
  isLoading
}: {
  children: React.ReactNode;
  isLoading?: boolean;
}) => {
  const router = useRouter();
  const { isPc } = useSystem();

  const currentTab = router.pathname.startsWith('/config/users')
    ? ConfigTabEnum.users
    : ConfigTabEnum.tool;

  const setCurrentTab = (tab: string) => {
    router.push('/config/' + tab);
  };

  return (
    <PageContainer isLoading={isLoading}>
      <Flex flexDirection={['column', 'row']} h={'100%'} pt={[4, 0]}>
        {isPc ? (
          <Flex
            flexDirection={'column'}
            p={4}
            h={'100%'}
            flex={'0 0 200px'}
            borderRight={'1px solid'}
            borderColor={'myGray.200'}
          >
            <SideTabs<ConfigTabEnum>
              flex={1}
              mx={'auto'}
              mt={2}
              w={'100%'}
              list={tabList}
              value={currentTab}
              onChange={setCurrentTab}
            />
          </Flex>
        ) : (
          <Box mb={3}>
            <LightRowTabs<ConfigTabEnum>
              m={'auto'}
              w={'100%'}
              size={'sm'}
              list={tabList}
              value={currentTab}
              onChange={setCurrentTab}
            />
          </Box>
        )}
        <Box flex={'1 0 0'} h={'100%'} pb={[4, 0]} overflow={'auto'}>
          {children}
        </Box>
      </Flex>
    </PageContainer>
  );
};

export default ConfigContainer;
