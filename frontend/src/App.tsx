/**
 * 主应用组件
 * TaskFlow 任务跟踪系统
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { KanbanBoard } from './components/Kanban';
import { TaskDrawer } from './components/TaskDrawer';
import { TaskDialog } from './components/TaskDialog';
import { FilterBar } from './components/FilterBar';
import { Plus, RefreshCw, Settings, LogOut, KeyRound } from 'lucide-react';
import { tasksApi, devicesApi, usersApi } from './api';
import { Task, Device, TaskFilters, TaskCreate, TaskUpdate, TaskStatus } from './types';
import { LoginPage } from './pages/LoginPage';
import { AuthProvider } from './contexts';

// Token 存储
const TOKEN_KEY = 'taskflow_token';

// 用户信息类型
interface UserInfo {
  id: string;
  username: string;
  display_name: string | null;
  email: string;
}

// 设备负责人类型
interface DeviceAssignee {
  user_id: string;
  username?: string | null;
  display_name?: string | null;
  email?: string | null;
}

function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userLoading, setUserLoading] = useState(true);  // 用户信息加载状态
  const [tasks, setTasks] = useState<Task[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [allUsers, setAllUsers] = useState<UserInfo[]>([]);
  const [deviceAssignees, setDeviceAssignees] = useState<Record<string, DeviceAssignee[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [filters, setFilters] = useState<TaskFilters>({});
  const [myTracking, setMyTracking] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);


  // 处理登录
  const handleLogin = (accessToken: string) => {
    localStorage.setItem(TOKEN_KEY, accessToken);
    setToken(accessToken);
    setUserLoading(true);  // 重新加载用户信息
  };

  // 处理登出
  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setCurrentUser(null);
    setUserLoading(false);
  };

  // 获取当前用户信息
  useEffect(() => {
    let cancelled = false;

    if (token) {
      setUserLoading(true);
      fetch('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('未授权');
        })
        .then(user => {
          if (!cancelled) {
            setCurrentUser(user);
            setUserLoading(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            // 直接清理状态，而不是调用 handleLogout
            localStorage.removeItem(TOKEN_KEY);
            setToken(null);
            setCurrentUser(null);
            setUserLoading(false);
          }
        });
    } else {
      setUserLoading(false);
    }

    return () => { cancelled = true; };
  }, [token]);

  // 加载任务列表
  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await tasksApi.getTasks(filters);
      setTasks(response.items);
    } catch (error) {
      console.error('加载任务失败:', error);
      alert('加载任务失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 加载设备列表
  const loadDevices = async () => {
    try {
      const data = await devicesApi.getAllDevices();
      setDevices(data);
    } catch (error) {
      console.error('加载设备失败:', error);
    }
  };

  // 加载用户列表
  const loadUsers = async () => {
    try {
      const response = await usersApi.getUsers({ page_size: 100 });
      setAllUsers(response.items);
    } catch (error) {
      console.error('加载用户失败:', error);
    }
  };

  // 加载设备负责人
  const loadDeviceAssignees = async (taskId: string, deviceIds: string[]) => {
    const assigneesMap: Record<string, DeviceAssignee[]> = {};
    for (const deviceId of deviceIds) {
      try {
        const assignees = await tasksApi.getDeviceAssignees(taskId, deviceId);
        assigneesMap[deviceId] = assignees;
      } catch (error) {
        console.error(`加载设备 ${deviceId} 负责人失败:`, error);
      }
    }
    setDeviceAssignees(assigneesMap);
  };

  // 添加设备负责人
  const handleAddAssignee = async (deviceId: string, userId: string) => {
    if (!selectedTask) return;
    try {
      await tasksApi.addDeviceAssignee(selectedTask.id, deviceId, userId);
      await loadDeviceAssignees(selectedTask.id, selectedTask.devices.map(d => d.id));
    } catch (error) {
      console.error('添加负责人失败:', error);
      alert('添加负责人失败: ' + (error as Error).message);
    }
  };

  // 删除设备负责人
  const handleRemoveAssignee = async (deviceId: string, userId: string) => {
    if (!selectedTask) return;
    try {
      await tasksApi.removeDeviceAssignee(selectedTask.id, deviceId, userId);
      await loadDeviceAssignees(selectedTask.id, selectedTask.devices.map(d => d.id));
    } catch (error) {
      console.error('删除负责人失败:', error);
      alert('删除负责人失败: ' + (error as Error).message);
    }
  };

  // 加载数据的 useEffect - 必须在条件返回之前
  useEffect(() => {
    if (token && !userLoading && currentUser) {
      // 如果启用了"我的跟踪"，将当前用户 ID 作为 tracker_id
      const effectiveFilters = myTracking
        ? { ...filters, tracker_id: currentUser.id }
        : { ...filters, tracker_id: undefined };

      const loadData = async () => {
        try {
          setLoading(true);
          const response = await tasksApi.getTasks(effectiveFilters);
          setTasks(response.items);
        } catch (error) {
          console.error('加载任务失败:', error);
          alert('加载任务失败，请稍后重试');
        } finally {
          setLoading(false);
        }
      };

      loadData();
      loadDevices();
      loadUsers();
    }
  }, [token, userLoading, currentUser, filters, myTracking]);

  // 如果未登录，显示登录页
  if (!token) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // 用户信息加载中
  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-primary">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  // 创建任务
  const handleCreateTask = async (data: TaskCreate | TaskUpdate) => {
    try {
      await tasksApi.createTask(data as TaskCreate);
      await loadTasks();
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('创建任务失败:', error);
      alert('创建任务失败: ' + (error as Error).message);
    }
  };

  // 更新任务
  const handleUpdateTask = async (data: TaskUpdate) => {
    if (!selectedTask) return;
    try {
      await tasksApi.updateTask(selectedTask.id, data);
      await loadTasks();
    } catch (error) {
      console.error('更新任务失败:', error);
      alert('更新任务失败: ' + (error as Error).message);
    }
  };

  // 更新任务状态
  const handleStatusChange = async (status: TaskStatus, actualDate?: string, comment?: string) => {
    if (!selectedTask) return;
    try {
      await tasksApi.updateStatus(selectedTask.id, {
        status,
        actual_date: actualDate ? new Date(actualDate).toISOString() : undefined,
        comment,
      });
      await loadTasks();
      setSelectedTask(null);
      setIsTaskDrawerOpen(false);
    } catch (error) {
      console.error('更新状态失败:', error);
      alert('更新状态失败: ' + (error as Error).message);
    }
  };

  // 归档任务
  const handleArchiveTask = async () => {
    if (!selectedTask) return;
    if (!confirm(`确定要归档任务 "${selectedTask.title}" 吗？归档后任务将从看板中隐藏。`)) {
      return;
    }
    try {
      await tasksApi.archiveTask(selectedTask.id);
      await loadTasks();
      setIsTaskDrawerOpen(false);
      setSelectedTask(null);
    } catch (error) {
      console.error('归档任务失败:', error);
      alert('归档任务失败: ' + (error as Error).message);
    }
  };

  // 删除任务
  const handleDeleteTask = async () => {
    if (!selectedTask) return;
    if (!confirm(`确定要删除任务 "${selectedTask.title}" 吗？此操作不可恢复。`)) {
      return;
    }
    try {
      await tasksApi.deleteTask(selectedTask.id);
      await loadTasks();
      setIsTaskDrawerOpen(false);
      setSelectedTask(null);
    } catch (error) {
      console.error('删除任务失败:', error);
      alert('删除任务失败: ' + (error as Error).message);
    }
  };

  // 打开创建对话框
  const openCreateDialog = () => {
    setSelectedTask(null);
    setIsCreateDialogOpen(true);
  };

  // 打开任务详情
  const openTaskDetail = (task: Task) => {
    setSelectedTask(task);
    setIsTaskDrawerOpen(true);
    // 加载设备负责人
    if (task.devices.length > 0) {
      loadDeviceAssignees(task.id, task.devices.map(d => d.id));
    }
  };

  // 更新设备状态
  const handleDeviceStatusChange = async (deviceId: string, status: any) => {
    if (!selectedTask) return;
    try {
      const updatedTask = await tasksApi.updateDeviceStatus(selectedTask.id, deviceId, status);
      setSelectedTask(updatedTask);
      await loadTasks();
    } catch (error) {
      console.error('更新设备状态失败:', error);
      alert('更新设备状态失败: ' + (error as Error).message);
    }
  };

  // 添加禅道关联
  const handleZentaoAdd = async (deviceId: string, zentaoType: string, zentaoId: string, zentaoTitle?: string, zentaoUrl?: string) => {
    if (!selectedTask) return;
    try {
      const updatedTask = await tasksApi.addZentaoLink(selectedTask.id, deviceId, zentaoType, zentaoId, zentaoTitle, zentaoUrl);
      setSelectedTask(updatedTask);
      await loadTasks();
    } catch (error) {
      console.error('关联禅道失败:', error);
      alert('关联禅道失败: ' + (error as Error).message);
    }
  };

  // 删除禅道关联
  const handleZentaoRemove = async (deviceId: string) => {
    if (!selectedTask) return;
    try {
      const updatedTask = await tasksApi.removeZentaoLink(selectedTask.id, deviceId);
      setSelectedTask(updatedTask);
      await loadTasks();
    } catch (error) {
      console.error('删除禅道关联失败:', error);
      alert('删除禅道关联失败: ' + (error as Error).message);
    }
  };


  // 检查是否是管理员
  const isAdmin = currentUser?.is_superuser ||
    currentUser?.roles?.includes('superadmin') ||
    currentUser?.roles?.includes('admin') ||
    false;

  return (
    <AuthProvider user={currentUser} token={token} onLogout={handleLogout}>
      <div className="min-h-screen relative">
        {/* 顶部导航栏 */}
        <header className="nav-header">
          <div className="mx-auto max-w-[1800px] px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              {/* Logo */}
              <div className="flex items-center gap-4">
                <div className="logo-mark">TF</div>
                <div>
                  <h1 className="font-display text-lg font-semibold text-text-primary tracking-tight">
                    TaskFlow
                  </h1>
                  <p className="text-xs text-text-muted font-mono">任务追踪系统</p>
                </div>
              </div>

              {/* 右侧操作按钮 */}
              <div className="flex items-center gap-3">
                <button
                  onClick={loadTasks}
                  disabled={loading}
                  className="btn-ghost flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                  <span className="hidden sm:inline">刷新</span>
                </button>
                {/* 只有管理员可以看到管理后台入口 */}
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="btn-ghost flex items-center gap-2 text-sm"
                    title="管理后台"
                  >
                    <Settings size={16} />
                    <span className="hidden sm:inline">管理</span>
                  </Link>
                )}
                <button
                  onClick={openCreateDialog}
                  className="btn-glow flex items-center gap-2 text-sm"
                >
                  <Plus size={16} />
                  创建任务
                </button>

                {/* 用户信息 */}
                <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-200 dark:border-gray-700">
                  {currentUser && (
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {currentUser.display_name || currentUser.username}
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
                      setPasswordError('');
                      setIsPasswordDialogOpen(true);
                    }}
                    className="btn-ghost flex items-center gap-1 text-sm"
                    title="修改密码"
                  >
                    <KeyRound size={16} />
                  </button>
                  <button
                    onClick={handleLogout}
                    className="btn-ghost flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                    title="退出登录"
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* 主内容区域 */}
        <main className="mx-auto max-w-[1800px] px-6 lg:px-8 py-8 relative z-10">
          {/* 筛选器 */}
          <FilterBar
            status={filters.status}
            source={filters.source}
            deviceId={filters.device_id}
            search={filters.search}
            myTracking={myTracking}
            onStatusChange={(value) => setFilters({ ...filters, status: value })}
            onSourceChange={(value) => setFilters({ ...filters, source: value })}
            onDeviceChange={(value) => setFilters({ ...filters, device_id: value })}
            onSearchChange={(value) => setFilters({ ...filters, search: value })}
            onMyTrackingChange={setMyTracking}
            devices={devices}
          />

          {/* 看板 */}
          <div className="mt-8">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-4">
                  <RefreshCw size={32} className="animate-spin text-accent" />
                  <span className="text-sm text-text-muted font-mono">加载中...</span>
                </div>
              </div>
            ) : tasks.length === 0 ? (
              <div className="empty-state glass-card">
                <div className="empty-state-icon">
                  <Plus size={32} />
                </div>
                <h3 className="text-lg font-display font-semibold text-text-primary">
                  没有找到任务
                </h3>
                <p className="mt-2 text-sm text-text-muted max-w-sm">
                  {Object.values(filters).some(Boolean)
                    ? '尝试清除筛选条件或创建新任务'
                    : '点击下方按钮创建您的第一个任务'}
                </p>
                {!Object.values(filters).some(Boolean) && (
                  <button
                    onClick={openCreateDialog}
                    className="mt-6 btn-glow flex items-center gap-2 text-sm"
                  >
                    <Plus size={16} />
                    创建任务
                  </button>
                )}
              </div>
            ) : (
              <KanbanBoard
                tasks={tasks}
                onTaskClick={openTaskDetail}
              />
            )}
          </div>
        </main>

        {/* 任务抽屉 */}
        <TaskDrawer
          task={selectedTask}
          devices={devices}
          allUsers={allUsers}
          currentUserId={currentUser?.id}
          deviceAssignees={deviceAssignees}
          open={isTaskDrawerOpen}
          onClose={() => {
            setIsTaskDrawerOpen(false);
            setSelectedTask(null);
            setDeviceAssignees({});
          }}
          onSave={handleUpdateTask}
          onStatusChange={handleStatusChange}
          onDeviceStatusChange={handleDeviceStatusChange}
          onZentaoAdd={handleZentaoAdd}
          onZentaoRemove={handleZentaoRemove}
          onAssigneeAdd={handleAddAssignee}
          onAssigneeRemove={handleRemoveAssignee}
          onArchive={handleArchiveTask}
          onDelete={handleDeleteTask}
        />


        {/* 创建任务对话框 */}
        <TaskDialog
          task={null}
          devices={devices}
          allUsers={allUsers}
          currentUserId={currentUser?.id}
          open={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
          onSave={handleCreateTask}
          onStatusChange={async () => { }}
          mode="create"
        />

        {/* 修改密码弹窗 */}
        {isPasswordDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50" onClick={() => setIsPasswordDialogOpen(false)} />
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">修改密码</h3>

              {passwordError && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{passwordError}</div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">原密码</label>
                  <input
                    type="password"
                    value={passwordForm.oldPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    placeholder="请输入原密码"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">新密码</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    placeholder="请输入新密码（至少6位）"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">确认新密码</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    placeholder="请再次输入新密码"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setIsPasswordDialogOpen(false)}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  取消
                </button>
                <button
                  disabled={passwordLoading}
                  onClick={async () => {
                    setPasswordError('');
                    if (!passwordForm.oldPassword) { setPasswordError('请输入原密码'); return; }
                    if (passwordForm.newPassword.length < 6) { setPasswordError('新密码至少6位'); return; }
                    if (passwordForm.newPassword !== passwordForm.confirmPassword) { setPasswordError('两次输入的新密码不一致'); return; }
                    try {
                      setPasswordLoading(true);
                      await usersApi.changePassword(passwordForm.oldPassword, passwordForm.newPassword);
                      setIsPasswordDialogOpen(false);
                      alert('密码修改成功，请重新登录');
                      handleLogout();
                    } catch (err) {
                      setPasswordError((err as Error).message || '修改失败');
                    } finally {
                      setPasswordLoading(false);
                    }
                  }}
                  className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {passwordLoading ? '提交中...' : '确认修改'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthProvider>
  );
}

export default App;
