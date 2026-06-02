'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Flex,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Select,
  useDisclosure,
  useToast
} from '@chakra-ui/react';
import { serviceSideProps } from '@/web/common/i18n/utils';
import { useUserStore } from '@/web/support/user/useUserStore';
import { useRouter } from 'next/router';
import { getErrText } from '@fastgpt/global/common/error/utils';

type UserItem = {
  userId: string;
  username: string;
  status: string;
  teamId: string;
  teamName: string;
  createTime?: string;
};

// 从 localStorage 拿 rootkey（实际是让 root 在本地临时存储，不传到浏览器 URL）
// 实际调用时从 headers 传，这里通过客户端 fetch 直接带上
function getRootkey(): string {
  if (typeof window === 'undefined') return '';
  return window.sessionStorage.getItem('sapply_rootkey') || '';
}

export default function UsersPage() {
  const { userInfo } = useUserStore();
  const router = useRouter();
  const toast = useToast();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [rootkey, setRootkeyState] = useState('');

  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const { isOpen: isRootkeyOpen, onOpen: onRootkeyOpen, onClose: onRootkeyClose } = useDisclosure();

  const [editingUser, setEditingUser] = useState<UserItem | null>(null);

  // 创建用户表单
  const [createForm, setCreateForm] = useState({ username: '', password: '', teamName: '' });
  // 编辑用户表单
  const [editForm, setEditForm] = useState({ password: '', teamName: '', status: 'active' });
  // rootkey 输入
  const [rootkeyInput, setRootkeyInput] = useState('');

  useEffect(() => {
    if (userInfo && userInfo.username !== 'root') {
      router.replace('/');
    }
  }, [userInfo, router]);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.sessionStorage.getItem('sapply_rootkey') || '' : '';
    setRootkeyState(stored);
    if (stored) {
      fetchUsers(stored);
    } else {
      onRootkeyOpen();
    }
  }, []);

  const fetchUsers = useCallback(async (key?: string) => {
    const k = key || rootkey;
    if (!k) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/listUsers', {
        headers: { rootkey: k }
      });
      const data = await res.json();
      if (data.code && data.code !== 200) throw new Error(data.message || '请求失败');
      setUsers(data.data?.users || []);
    } catch (e) {
      toast({ title: getErrText(e, '加载失败'), status: 'error', duration: 3000 });
    }
    setLoading(false);
  }, [rootkey, toast]);

  const handleRootkeySubmit = () => {
    if (!rootkeyInput.trim()) return;
    window.sessionStorage.setItem('sapply_rootkey', rootkeyInput.trim());
    setRootkeyState(rootkeyInput.trim());
    onRootkeyClose();
    fetchUsers(rootkeyInput.trim());
  };

  const handleCreate = async () => {
    if (!createForm.username || !createForm.password) {
      toast({ title: '用户名和密码不能为空', status: 'warning', duration: 2000 });
      return;
    }
    try {
      const res = await fetch('/api/admin/createUser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', rootkey },
        body: JSON.stringify(createForm)
      });
      const data = await res.json();
      if (data.code && data.code !== 200) throw new Error(data.message || '创建失败');
      toast({ title: data.data?.message || '创建成功', status: 'success', duration: 2000 });
      setCreateForm({ username: '', password: '', teamName: '' });
      onCreateClose();
      fetchUsers();
    } catch (e) {
      toast({ title: getErrText(e, '创建失败'), status: 'error', duration: 3000 });
    }
  };

  const handleEdit = async () => {
    if (!editingUser) return;
    const body: Record<string, string> = { userId: editingUser.userId };
    if (editForm.password) body.password = editForm.password;
    if (editForm.teamName) body.teamName = editForm.teamName;
    body.status = editForm.status;
    try {
      const res = await fetch('/api/admin/updateUser', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', rootkey },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.code && data.code !== 200) throw new Error(data.message || '更新失败');
      toast({ title: '更新成功', status: 'success', duration: 2000 });
      onEditClose();
      fetchUsers();
    } catch (e) {
      toast({ title: getErrText(e, '更新失败'), status: 'error', duration: 3000 });
    }
  };

  const handleDelete = async (user: UserItem) => {
    if (!window.confirm(`确认禁用用户 "${user.username}"？禁用后该用户无法登录，数据保留。`)) return;
    try {
      const res = await fetch('/api/admin/deleteUser', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', rootkey },
        body: JSON.stringify({ userId: user.userId })
      });
      const data = await res.json();
      if (data.code && data.code !== 200) throw new Error(data.message || '操作失败');
      toast({ title: data.data?.message || '已禁用', status: 'success', duration: 2000 });
      fetchUsers();
    } catch (e) {
      toast({ title: getErrText(e, '操作失败'), status: 'error', duration: 3000 });
    }
  };

  const openEdit = (user: UserItem) => {
    setEditingUser(user);
    setEditForm({ password: '', teamName: user.teamName, status: user.status || 'active' });
    onEditOpen();
  };

  return (
    <Box p={6} maxW="900px" mx="auto">
      <Flex mb={4} alignItems="center" justifyContent="space-between">
        <Box fontSize="xl" fontWeight="bold">用户管理</Box>
        <Flex gap={2}>
          <Button size="sm" variant="outline" onClick={() => fetchUsers()}>刷新</Button>
          <Button size="sm" colorScheme="blue" onClick={onCreateOpen}>+ 新建用户</Button>
        </Flex>
      </Flex>

      <Box bg="white" borderRadius="md" boxShadow="sm" overflow="auto">
        <Table size="sm">
          <Thead bg="gray.50">
            <Tr>
              <Th>用户名</Th>
              <Th>团队名</Th>
              <Th>状态</Th>
              <Th>操作</Th>
            </Tr>
          </Thead>
          <Tbody>
            {loading && (
              <Tr><Td colSpan={4} textAlign="center" color="gray.400">加载中...</Td></Tr>
            )}
            {!loading && users.length === 0 && (
              <Tr><Td colSpan={4} textAlign="center" color="gray.400">暂无用户</Td></Tr>
            )}
            {users.map((u) => (
              <Tr key={u.userId} opacity={u.username === 'root' ? 0.5 : 1}>
                <Td fontWeight={u.username === 'root' ? 'bold' : 'normal'}>{u.username}</Td>
                <Td>{u.teamName || '—'}</Td>
                <Td>
                  <Badge colorScheme={u.status === 'active' ? 'green' : 'red'}>
                    {u.status === 'active' ? '正常' : '已禁用'}
                  </Badge>
                </Td>
                <Td>
                  {u.username !== 'root' && (
                    <Flex gap={2}>
                      <Button size="xs" variant="outline" onClick={() => openEdit(u)}>编辑</Button>
                      <Button size="xs" colorScheme="red" variant="outline"
                        onClick={() => handleDelete(u)}
                        isDisabled={u.status === 'forbidden'}>
                        禁用
                      </Button>
                    </Flex>
                  )}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>

      {/* rootkey 输入框 */}
      <Modal isOpen={isRootkeyOpen} onClose={onRootkeyClose} closeOnOverlayClick={false}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>输入 Root Key</ModalHeader>
          <ModalBody>
            <FormControl>
              <FormLabel fontSize="sm">Root Key（docker-compose.yml 中的 ROOT_KEY）</FormLabel>
              <Input
                type="password"
                value={rootkeyInput}
                onChange={(e) => setRootkeyInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRootkeySubmit()}
                placeholder="输入 Root Key"
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" onClick={handleRootkeySubmit}>确认</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 新建用户 */}
      <Modal isOpen={isCreateOpen} onClose={onCreateClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>新建用户</ModalHeader>
          <ModalCloseButton />
          <ModalBody display="flex" flexDirection="column" gap={3}>
            <FormControl isRequired>
              <FormLabel fontSize="sm">用户名（N/P/V/S 开头）</FormLabel>
              <Input value={createForm.username}
                onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                placeholder="如 Nzhangsan" />
            </FormControl>
            <FormControl isRequired>
              <FormLabel fontSize="sm">初始密码</FormLabel>
              <Input type="password" value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                placeholder="至少6位" />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">团队名（英文字母/数字/连字符）</FormLabel>
              <Input value={createForm.teamName}
                onChange={(e) => setCreateForm({ ...createForm, teamName: e.target.value })}
                placeholder="如 sales-team（不填则自动生成）" />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onCreateClose}>取消</Button>
            <Button colorScheme="blue" onClick={handleCreate}>创建</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 编辑用户 */}
      <Modal isOpen={isEditOpen} onClose={onEditClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>编辑用户：{editingUser?.username}</ModalHeader>
          <ModalCloseButton />
          <ModalBody display="flex" flexDirection="column" gap={3}>
            <FormControl>
              <FormLabel fontSize="sm">新密码（留空则不修改）</FormLabel>
              <Input type="password" value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                placeholder="留空则不修改密码" />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">团队名（英文字母/数字/连字符）</FormLabel>
              <Input value={editForm.teamName}
                onChange={(e) => setEditForm({ ...editForm, teamName: e.target.value })}
                placeholder="如 sales-team" />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">状态</FormLabel>
              <Select value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                <option value="active">正常</option>
                <option value="forbidden">禁用</option>
              </Select>
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onEditClose}>取消</Button>
            <Button colorScheme="blue" onClick={handleEdit}>保存</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

export async function getServerSideProps(context: any) {
  return {
    props: {
      ...(await serviceSideProps(context, ['common']))
    }
  };
}
