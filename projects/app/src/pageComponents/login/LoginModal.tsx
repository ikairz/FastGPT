import React from 'react';
import { Box, Flex } from '@chakra-ui/react';
import { LoginContainer } from '@/pageComponents/login';
import I18nLngSelector from '@/components/Select/I18nLngSelector';
import { useSystem } from '@fastgpt/web/hooks/useSystem';
import { type LoginSuccessResponseType } from '@fastgpt/global/openapi/support/user/account/login/api';

type LoginModalProps = {
  onSuccess: (e: LoginSuccessResponseType) => any;
};

const LoginModal = ({ onSuccess }: LoginModalProps) => {
  const { isPc } = useSystem();

  return (
    <Flex
      alignItems={'center'}
      justifyContent={'center'}
      bg={'white'}
      userSelect={'none'}
      minH={'100vh'}
      px={0}
      pt={0}
      pb={0}
    >
      {/* Language selector - login page */}
      {isPc && (
        <Box position="absolute" top="24px" right="24px" zIndex={10}>
          <I18nLngSelector />
        </Box>
      )}

      <Flex
        position="relative"
        alignItems={'center'}
        justifyContent={'center'}
        w={'100%'}
        maxW={['100%', '1328px']}
        h={'100vh'}
        minH={['100vh', '720px']}
        bg={['transparent', 'white']}
        borderRadius={[0, '24px']}
        overflow={'hidden'}
      >
        <Box
          position={'absolute'}
          top={['-190px', '-100px']}
          left={'50%'}
          w={['900px', '1230px']}
          h={['590px', '510px']}
          transform={'translateX(-50%)'}
          pointerEvents={'none'}
          bgImage={'url(/icon/login-gradient-bg.svg)'}
          bgRepeat={'no-repeat'}
          bgPosition={'center top'}
          bgSize={'100% 100%'}
        />

        <Flex
          flexDirection={'column'}
          w={['100%', '560px']}
          h={['100%', 'auto']}
          bg={['transparent', 'white']}
          px={['8', '90px']}
          py={['38px', '90px']}
          borderRadius={[0, '16px']}
          boxShadow={[
            '',
            '0px 16px 40px rgba(30, 64, 175, 0.10), 0px 1px 3px rgba(15, 23, 42, 0.06)'
          ]}
          position="relative"
          zIndex={1}
        >
          <LoginContainer onSuccess={onSuccess} />
        </Flex>
      </Flex>

      {/* Sapply: 备案信息 */}
      <Box
        position={'fixed'}
        bottom={'12px'}
        left={0}
        right={0}
        textAlign={'center'}
        fontSize={'12px'}
        color={'gray.400'}
        zIndex={10}
      >
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer" style={{color: 'inherit', marginRight: '12px'}}>
          闽ICP备2026016199号-1
        </a>
        <a href="https://beian.mps.gov.cn/#/query/webSearch?code=35020302037205" target="_blank" rel="noreferrer" style={{color: 'inherit'}}>
          闽公网安备35020302037205号
        </a>
      </Box>
    </Flex>
  );
};

export default LoginModal;
