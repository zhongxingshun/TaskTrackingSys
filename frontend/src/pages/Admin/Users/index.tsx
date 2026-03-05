/**
 * 用户管理页面
 */

import { useState, useEffect } from 'react';
import { Users, Shield, Search, UserPlus, Edit2, Check, X, Save, Trash2 } from 'lucide-react';

interface User {
    id: string;
    username: string;
    email: string;
    display_name: string | null;
    department: string | null;
    is_active: boolean;
    is_superuser: boolean;
    created_at: string;
    roles: string[];
}

interface Role {
    id: string;
    name: string;
    code: string;
    description: string;
    is_system: boolean;
    permissions: string[];
}

interface Permission {
    id: string;
    name: string;
    code: string;
    category: string;
    description: string;
}

export function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');

    // 新增用户弹窗
    const [showAddUser, setShowAddUser] = useState(false);
    const [newUser, setNewUser] = useState({ username: '', email: '', password: '', display_name: '', department: '' });
    const [newUserRoles, setNewUserRoles] = useState<string[]>(['user']);
    const [addUserError, setAddUserError] = useState('');
    const [addUserLoading, setAddUserLoading] = useState(false);

    // 编辑用户弹窗
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editUserRoles, setEditUserRoles] = useState<string[]>([]);

    // 编辑角色弹窗
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [editRolePermissions, setEditRolePermissions] = useState<string[]>([]);

    // 当前用户信息
    const [currentUser, setCurrentUser] = useState<{ is_superuser: boolean } | null>(null);

    const token = localStorage.getItem('taskflow_token');

    // 判断是否是超级管理员
    const isSuperAdmin = currentUser?.is_superuser || false;

    // 加载用户列表
    const loadUsers = async () => {
        try {
            const response = await fetch('/api/v1/users?' + new URLSearchParams({ search }), {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setUsers(data.items);
            }
        } catch (error) {
            console.error('加载用户失败:', error);
        }
    };

    // 加载角色列表
    const loadRoles = async () => {
        try {
            const response = await fetch('/api/v1/users/roles/list', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setRoles(data.items);
            }
        } catch (error) {
            console.error('加载角色失败:', error);
        }
    };

    // 加载权限列表
    const loadPermissions = async () => {
        try {
            const response = await fetch('/api/v1/users/permissions/list', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setPermissions(data);
            }
        } catch (error) {
            console.error('加载权限失败:', error);
        }
    };

    // 加载当前用户信息
    const loadCurrentUser = async () => {
        try {
            const response = await fetch('/api/v1/auth/me', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setCurrentUser(data);
            }
        } catch (error) {
            console.error('加载当前用户失败:', error);
        }
    };

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            await Promise.all([loadUsers(), loadRoles(), loadPermissions(), loadCurrentUser()]);
            setLoading(false);
        };
        load();
    }, []);

    useEffect(() => {
        if (!loading) {
            loadUsers();
        }
    }, [search]);

    // 切换用户状态
    const toggleUserActive = async (userId: string, isActive: boolean) => {
        try {
            await fetch(`/api/v1/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ is_active: isActive })
            });
            loadUsers();
        } catch (error) {
            console.error('更新用户失败:', error);
        }
    };

    // 删除用户
    const deleteUser = async (userId: string, userName: string) => {
        if (!confirm(`确定要删除用户 "${userName}" 吗？此操作不可撤销。`)) {
            return;
        }

        try {
            const response = await fetch(`/api/v1/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (response.ok) {
                loadUsers();
            } else if (response.status === 401) {
                // Token 失效，清除并刷新页面
                localStorage.removeItem('taskflow_token');
                window.location.reload();
            } else {
                const errorData = await response.json();
                alert('删除失败: ' + (errorData.detail || '未知错误'));
            }
        } catch (error) {
            console.error('删除用户失败:', error);
            alert('删除用户失败');
        }
    };

    // 开始编辑用户
    const startEditUser = (user: User) => {
        setEditingUser(user);
        setEditUserRoles(user.roles || []);
    };

    // 保存用户角色
    const saveUserRoles = async () => {
        if (!editingUser) return;

        try {
            // 找到对应的角色ID
            const roleIds = roles
                .filter(r => editUserRoles.includes(r.code))
                .map(r => r.id);

            const response = await fetch(`/api/v1/users/${editingUser.id}/roles`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(roleIds)
            });

            if (response.ok) {
                await loadUsers();
                setEditingUser(null);
            } else {
                const errorData = await response.json();
                alert('保存失败: ' + (errorData.detail || '未知错误'));
            }
        } catch (error) {
            console.error('保存用户角色失败:', error);
            alert('保存失败');
        }
    };

    // 切换用户角色
    const toggleUserRole = (roleCode: string) => {
        if (editUserRoles.includes(roleCode)) {
            setEditUserRoles(editUserRoles.filter(r => r !== roleCode));
        } else {
            setEditUserRoles([...editUserRoles, roleCode]);
        }
    };

    // 开始编辑角色
    const startEditRole = (role: Role) => {
        setEditingRole(role);
        setEditRolePermissions(role.permissions || []);
    };

    // 保存角色权限
    const saveRolePermissions = async () => {
        if (!editingRole) return;

        try {
            const response = await fetch(`/api/v1/users/roles/${editingRole.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: editingRole.name,
                    description: editingRole.description,
                    permission_codes: editRolePermissions
                })
            });

            if (response.ok) {
                await loadRoles();
                setEditingRole(null);
            } else {
                const errorData = await response.json();
                alert('保存失败: ' + (errorData.detail || '未知错误'));
            }
        } catch (error) {
            console.error('保存角色权限失败:', error);
            alert('保存失败');
        }
    };

    // 切换权限
    const togglePermission = (permCode: string) => {
        if (editRolePermissions.includes(permCode)) {
            setEditRolePermissions(editRolePermissions.filter(p => p !== permCode));
        } else {
            setEditRolePermissions([...editRolePermissions, permCode]);
        }
    };

    // 创建新用户
    const handleAddUser = async () => {
        if (!newUser.username || !newUser.email || !newUser.password) {
            setAddUserError('请填写用户名、邮箱和密码');
            return;
        }

        setAddUserLoading(true);
        setAddUserError('');

        try {
            // 找到对应的角色ID
            const roleIds = roles
                .filter(r => newUserRoles.includes(r.code))
                .map(r => r.id);

            const response = await fetch('/api/v1/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    username: newUser.username,
                    email: newUser.email,
                    password: newUser.password,
                    display_name: newUser.display_name || null,
                    department: newUser.department || null,
                    role_ids: roleIds
                })
            });

            if (response.ok) {
                await loadUsers();
                setShowAddUser(false);
            } else {
                const errorData = await response.json();
                setAddUserError(errorData.detail || '创建用户失败');
            }
        } catch (error) {
            console.error('创建用户失败:', error);
            setAddUserError('创建用户失败');
        } finally {
            setAddUserLoading(false);
        }
    };

    // 切换新用户角色
    const toggleNewUserRole = (roleCode: string) => {
        if (newUserRoles.includes(roleCode)) {
            setNewUserRoles(newUserRoles.filter(r => r !== roleCode));
        } else {
            setNewUserRoles([...newUserRoles, roleCode]);
        }
    };

    const getRoleLabel = (code: string) => {
        const labels: Record<string, string> = {
            superadmin: '超级管理员',
            admin: '管理员',
            user: '普通用户',
            guest: '访客'
        };
        return labels[code] || code;
    };

    const getRoleColor = (code: string) => {
        const colors: Record<string, string> = {
            superadmin: 'bg-red-100 text-red-700',
            admin: 'bg-purple-100 text-purple-700',
            user: 'bg-blue-100 text-blue-700',
            guest: 'bg-gray-100 text-gray-700'
        };
        return colors[code] || 'bg-gray-100 text-gray-700';
    };

    // 按分类分组权限（过滤掉系统设置分类）
    const groupedPermissions = permissions
        .filter(perm => perm.category !== '系统设置')
        .reduce((acc, perm) => {
            const category = perm.category || '其他';
            if (!acc[category]) acc[category] = [];
            acc[category].push(perm);
            return acc;
        }, {} as Record<string, Permission[]>);

    return (
        <div className="p-6">
            <div className="max-w-6xl mx-auto">
                {/* 标题 */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Users size={28} className="text-primary-600" />
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">用户管理</h1>
                    </div>
                    <button
                        onClick={() => {
                            setShowAddUser(true);
                            setNewUser({ username: '', email: '', password: '', display_name: '', department: '' });
                            setNewUserRoles(['user']);
                            setAddUserError('');
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                        <UserPlus size={18} />
                        新增用户
                    </button>
                </div>

                {/* 标签页 */}
                <div className="flex gap-1 mb-6 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${activeTab === 'users'
                            ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                            }`}
                    >
                        <Users size={16} />
                        用户列表
                    </button>
                    <button
                        onClick={() => setActiveTab('roles')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${activeTab === 'roles'
                            ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                            }`}
                    >
                        <Shield size={16} />
                        角色权限
                    </button>
                </div>

                {activeTab === 'users' ? (
                    <>
                        {/* 搜索框 */}
                        <div className="relative mb-4">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="搜索用户..."
                                className="w-full max-w-md pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-primary-500"
                            />
                        </div>

                        {/* 用户表格 */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">用户</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">部门</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">角色</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">状态</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                                加载中...
                                            </td>
                                        </tr>
                                    ) : users.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                                暂无用户
                                            </td>
                                        </tr>
                                    ) : (
                                        users.map((user) => (
                                            <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 font-medium">
                                                            {(user.display_name || user.username).charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-gray-900 dark:text-white">
                                                                {user.display_name || user.username}
                                                            </div>
                                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                                {user.email}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                                                    {user.department || '-'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-wrap gap-1">
                                                        {user.is_superuser ? (
                                                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                                                                超级管理员
                                                            </span>
                                                        ) : (
                                                            user.roles.map((role) => (
                                                                <span
                                                                    key={role}
                                                                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${getRoleColor(role)}`}
                                                                >
                                                                    {getRoleLabel(role)}
                                                                </span>
                                                            ))
                                                        )}
                                                        {!user.is_superuser && user.roles.length === 0 && (
                                                            <span className="text-xs text-gray-400">无角色</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${user.is_active
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-gray-100 text-gray-700'
                                                            }`}
                                                    >
                                                        {user.is_active ? (
                                                            <>
                                                                <Check size={12} /> 启用
                                                            </>
                                                        ) : (
                                                            <>
                                                                <X size={12} /> 禁用
                                                            </>
                                                        )}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => toggleUserActive(user.id, !user.is_active)}
                                                            className={`p-1.5 rounded-lg transition-colors ${user.is_active
                                                                ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                                                : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                                                                }`}
                                                            title={user.is_active ? '禁用' : '启用'}
                                                        >
                                                            {user.is_active ? <X size={16} /> : <Check size={16} />}
                                                        </button>
                                                        <button
                                                            onClick={() => startEditUser(user)}
                                                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                                                            title="编辑角色"
                                                            disabled={user.is_superuser}
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        {/* 删除按钮 - 不能删除超级管理员 */}
                                                        {!user.is_superuser && (
                                                            <button
                                                                onClick={() => deleteUser(user.id, user.display_name || user.username)}
                                                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                                title="删除用户"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    /* 角色权限 */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {roles.map((role) => (
                            <div
                                key={role.id}
                                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Shield size={18} className="text-primary-600" />
                                        <h3 className="font-medium text-gray-900 dark:text-white">{role.name}</h3>
                                        {role.is_system && (
                                            <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">系统</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500 font-mono">{role.code}</span>
                                        {/* 只有超级管理员可以编辑角色权限 */}
                                        {isSuperAdmin && role.code !== 'superadmin' && (
                                            <button
                                                onClick={() => startEditRole(role)}
                                                className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-primary-600"
                                                title="编辑权限"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                                    {role.description || '无描述'}
                                </p>
                                <div className="flex flex-wrap gap-1">
                                    {role.code === 'superadmin' ? (
                                        <span className="text-xs text-gray-400">所有权限</span>
                                    ) : role.permissions.length > 0 ? (
                                        role.permissions.slice(0, 5).map((perm) => (
                                            <span
                                                key={perm}
                                                className="px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded-full"
                                            >
                                                {perm}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-xs text-gray-400">无权限</span>
                                    )}
                                    {role.permissions.length > 5 && (
                                        <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                                            +{role.permissions.length - 5}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 编辑用户角色弹窗 */}
            {editingUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            编辑用户角色
                        </h3>
                        <div className="mb-4">
                            <p className="text-sm text-gray-500 mb-2">
                                用户：{editingUser.display_name || editingUser.username}
                            </p>
                            <p className="text-xs text-gray-400 mb-4">{editingUser.email}</p>

                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                选择角色
                            </label>
                            <div className="space-y-2">
                                {roles.filter(r => r.code !== 'superadmin').map((role) => (
                                    <label
                                        key={role.id}
                                        className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={editUserRoles.includes(role.code)}
                                            onChange={() => toggleUserRole(role.code)}
                                            className="w-4 h-4 text-primary-600 rounded border-gray-300"
                                        />
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900 dark:text-white">
                                                {role.name}
                                            </div>
                                            <div className="text-xs text-gray-500">{role.description}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setEditingUser(null)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                            >
                                取消
                            </button>
                            <button
                                onClick={saveUserRoles}
                                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                            >
                                <Save size={16} />
                                保存
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 编辑角色权限弹窗 */}
            {editingRole && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl mx-4 p-6 max-h-[80vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            编辑角色权限 - {editingRole.name}
                        </h3>

                        <div className="space-y-4">
                            {Object.entries(groupedPermissions).map(([category, perms]) => (
                                <div key={category} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">{category}</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {perms.map((perm) => (
                                            <label
                                                key={perm.id}
                                                className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={editRolePermissions.includes(perm.code)}
                                                    onChange={() => togglePermission(perm.code)}
                                                    className="w-4 h-4 text-primary-600 rounded border-gray-300"
                                                />
                                                <div>
                                                    <div className="text-sm text-gray-900 dark:text-white">{perm.name}</div>
                                                    <div className="text-xs text-gray-500">{perm.code}</div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setEditingRole(null)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                            >
                                取消
                            </button>
                            <button
                                onClick={saveRolePermissions}
                                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                            >
                                <Save size={16} />
                                保存
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 新增用户弹窗 */}
            {showAddUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            新增用户
                        </h3>

                        {addUserError && (
                            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                                {addUserError}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    用户名 *
                                </label>
                                <input
                                    type="text"
                                    value={newUser.username}
                                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                                    placeholder="请输入用户名"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    邮箱 *
                                </label>
                                <input
                                    type="email"
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                                    placeholder="请输入邮箱"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    密码 *
                                </label>
                                <input
                                    type="password"
                                    value={newUser.password}
                                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                                    placeholder="请输入密码"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    显示名称
                                </label>
                                <input
                                    type="text"
                                    value={newUser.display_name}
                                    onChange={(e) => setNewUser({ ...newUser, display_name: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                                    placeholder="请输入显示名称（可选）"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    部门
                                </label>
                                <input
                                    type="text"
                                    value={newUser.department}
                                    onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                                    placeholder="请输入部门（可选）"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    角色
                                </label>
                                <div className="space-y-2">
                                    {roles.filter(r => r.code !== 'superadmin').map((role) => (
                                        <label
                                            key={role.id}
                                            className="flex items-center gap-3 p-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={newUserRoles.includes(role.code)}
                                                onChange={() => toggleNewUserRole(role.code)}
                                                className="w-4 h-4 text-primary-600 rounded border-gray-300"
                                            />
                                            <div className="flex-1">
                                                <div className="font-medium text-gray-900 dark:text-white text-sm">
                                                    {role.name}
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowAddUser(false)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                disabled={addUserLoading}
                            >
                                取消
                            </button>
                            <button
                                onClick={handleAddUser}
                                disabled={addUserLoading}
                                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                            >
                                {addUserLoading ? '创建中...' : '创建'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
