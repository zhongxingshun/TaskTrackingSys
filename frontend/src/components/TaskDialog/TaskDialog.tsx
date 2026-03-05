/**
 * 任务详情对话框
 * 支持查看和编辑任务
 */

import { useState, useEffect } from 'react';
import { Task, TaskStatus, TaskSource, Device, TaskCreate, TaskUpdate } from '@/types';
import { X, Save, Archive, Trash2, Clock, CheckCircle, Activity, Eye } from 'lucide-react';
import { cn } from '@/utils/cn';
import { MarkdownEditor } from '@/components/MarkdownEditor';
import { MarkdownContent } from '@/components/MarkdownContent';
import { DeviceSelector } from '@/components/DeviceSelector';
import { DeviceTaskStatus } from '@/types';

interface UserInfo {
  id: string;
  username: string;
  display_name: string | null;
  email: string;
}

interface TaskDialogProps {
  task: Task | null;
  devices: Device[];
  allUsers?: UserInfo[];
  currentUserId?: string;
  open: boolean;
  onClose: () => void;
  onSave: (data: TaskCreate | TaskUpdate) => Promise<void>;
  onStatusChange: (status: TaskStatus, actualDate?: string, comment?: string) => Promise<void>;
  onArchive?: () => Promise<void>;
  onDelete?: () => Promise<void>;
  mode?: 'view' | 'edit' | 'create';
}

export function TaskDialog({
  task,
  devices,
  allUsers = [],
  currentUserId,
  open,
  onClose,
  onSave,
  onStatusChange,
  onArchive,
  onDelete,
  mode = 'view',
}: TaskDialogProps) {
  const [isEditing, setIsEditing] = useState(mode === 'create');
  const [formData, setFormData] = useState<TaskCreate | TaskUpdate>({});
  const [newStatus, setNewStatus] = useState<TaskStatus>(task?.status || TaskStatus.BACKLOG);
  const [actualDate, setActualDate] = useState<string>(task?.actual_date?.split('T')[0] || '');
  const [statusComment, setStatusComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 默认表单初始值
  const defaultFormData: TaskCreate = {
    title: '',
    source: TaskSource.INTERNAL_RD,
    description: '',
    priority: 3,
    target_date: undefined,
    device_ids: [],
    tracker_id: currentUserId, // 默认跟踪人为当前用户
  };

  useEffect(() => {
    if (!open) return; // 对话框关闭时不处理

    if (task) {
      setFormData({
        title: task.title,
        source: task.source,
        description: task.description || undefined,
        priority: task.priority,
        target_date: task.target_date?.split('T')[0] || undefined,
        device_ids: task.devices.map((d) => d.id),
        assignee_id: task.assignee_id || undefined,
        tracker_id: task.tracker_id || undefined,
      });
      setNewStatus(task.status);
      setActualDate(task.actual_date?.split('T')[0] || '');
      setStatusComment('');
    } else if (mode === 'create') {
      // 创建模式：完全重置表单为初始值
      setFormData({ ...defaultFormData });
      setNewStatus(TaskStatus.BACKLOG);
      setActualDate('');
      setStatusComment('');
    }
  }, [task, mode, open]);

  if (!open) return null;

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onSave(formData);
      if (mode === 'create') {
        onClose();
      } else {
        setIsEditing(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async () => {
    if (newStatus === TaskStatus.CLOSED && !actualDate) {
      alert('状态为已完结时，必须提供实际完结日期');
      return;
    }
    setIsLoading(true);
    try {
      await onStatusChange(newStatus, actualDate, statusComment || undefined);
      setStatusComment('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dialog-overlay animate-fade-in" onClick={onClose}>
      {/* 对话框内容 */}
      <div
        className="dialog-panel animate-slide-up relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="dialog-header">
          <div>
            <h2 className="text-lg font-display font-semibold text-text-primary">
              {mode === 'create' ? '创建任务' : isEditing ? '编辑任务' : '任务详情'}
            </h2>
            {task && !isEditing && (
              <span className="text-sm text-text-muted font-mono">
                {task.task_id}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-text-muted hover:text-text-primary hover:bg-surface-tertiary transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="dialog-content space-y-6">
          {/* 模式切换按钮 */}
          {mode !== 'create' && (
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  !isEditing
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                )}
              >
                查看
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  isEditing
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                )}
              >
                编辑
              </button>
            </div>
          )}

          {/* 表单字段 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                任务标题
              </label>
              {isEditing || mode === 'create' ? (
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="输入任务标题"
                />
              ) : (
                <p className="text-gray-900 dark:text-white font-medium">{task?.title}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  来源
                </label>
                {isEditing || mode === 'create' ? (
                  <select
                    value={formData.source || TaskSource.INTERNAL_RD}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value as TaskSource })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {Object.values(TaskSource).map((source) => (
                      <option key={source} value={source}>
                        {source === 'Internal_RD' ? '内部研发' :
                          source === 'Competitor' ? '竞品调研' :
                            source === 'Customer' ? '客户反馈' :
                              source === 'Market' ? '市场分析' : '其他'}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-gray-900 dark:text-white">
                    {task?.source === 'Internal_RD' ? '内部研发' :
                      task?.source === 'Competitor' ? '竞品调研' :
                        task?.source === 'Customer' ? '客户反馈' :
                          task?.source === 'Market' ? '市场分析' : '其他'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  优先级
                </label>
                {isEditing || mode === 'create' ? (
                  <select
                    value={formData.priority || 3}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {[1, 2, 3, 4, 5].map((p) => (
                      <option key={p} value={p}>
                        {p === 5 ? '极高' : p === 4 ? '高' : p === 3 ? '中' : p === 2 ? '低' : '极低'}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-gray-900 dark:text-white">
                    {task?.priority === 5 ? '极高' : task?.priority === 4 ? '高' : task?.priority === 3 ? '中' : task?.priority === 2 ? '低' : '极低'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Eye size={14} className="inline mr-1" />
                  跟踪人
                </label>
                {isEditing || mode === 'create' ? (
                  <select
                    value={formData.tracker_id || currentUserId || ''}
                    onChange={(e) => setFormData({ ...formData, tracker_id: e.target.value || undefined })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">未指定</option>
                    {allUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.display_name || user.username}
                        {user.id === currentUserId ? ' (我)' : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-gray-900 dark:text-white">
                    {task?.tracker_id
                      ? allUsers.find(u => u.id === task.tracker_id)?.display_name
                      || allUsers.find(u => u.id === task.tracker_id)?.username
                      || '未知用户'
                      : '未指定'}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                描述
              </label>
              {isEditing || mode === 'create' ? (
                <MarkdownEditor
                  value={formData.description || ''}
                  onChange={(value) => setFormData({ ...formData, description: value })}
                  placeholder="输入任务描述（支持 Markdown，可粘贴图片）"
                  rows={4}
                />
              ) : (
                <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
                  {task?.description ? (
                    <MarkdownContent content={task.description} />
                  ) : (
                    <p className="text-gray-400">暂无描述</p>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Clock size={14} className="inline mr-1" />
                  计划完成日期
                </label>
                {isEditing || mode === 'create' ? (
                  <input
                    type="date"
                    value={formData.target_date || ''}
                    onChange={(e) => setFormData({ ...formData, target_date: e.target.value || undefined })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">
                    {task?.target_date ? new Date(task.target_date).toLocaleDateString('zh-CN') : '未设置'}
                  </p>
                )}
              </div>

              {/* 实际完成日期 - 仅在非创建模式下显示（只读） */}
              {mode !== 'create' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <CheckCircle size={14} className="inline mr-1" />
                    实际完成日期
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {task?.actual_date ? new Date(task.actual_date).toLocaleDateString('zh-CN') : '未完成'}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <DeviceSelector
                devices={devices}
                selectedDeviceIds={formData.device_ids || []}
                deviceStatuses={Object.fromEntries(
                  (task?.devices || []).map(d => [d.id, d.device_status || DeviceTaskStatus.PENDING])
                )}
                onSelectionChange={(ids) => setFormData({ ...formData, device_ids: ids })}
                isEditing={isEditing || mode === 'create'}
              />
            </div>

            {/* 状态变更 */}
            {task && !isEditing && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Activity size={14} className="inline mr-1" />
                  状态变更
                </label>
                <div className="flex flex-wrap gap-2">
                  {[TaskStatus.BACKLOG, TaskStatus.IN_PROGRESS, TaskStatus.TESTING, TaskStatus.CLOSED].map((status) => (
                    <button
                      key={status}
                      onClick={() => setNewStatus(status)}
                      disabled={isLoading}
                      className={cn(
                        'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        newStatus === status
                          ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600',
                        isLoading && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      {status === 'Backlog' ? '待处理' :
                        status === 'In_Progress' ? '进行中' :
                          status === 'Testing' ? '测试中' :
                            status === 'Closed' ? '已完结' : '已归档'}
                    </button>
                  ))}
                </div>

                {newStatus === TaskStatus.CLOSED && (
                  <div className="mt-3">
                    <input
                      type="date"
                      value={actualDate}
                      onChange={(e) => setActualDate(e.target.value)}
                      className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                )}

                <div className="mt-3">
                  <input
                    type="text"
                    value={statusComment}
                    onChange={(e) => setStatusComment(e.target.value)}
                    placeholder="添加变更说明（可选）"
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <button
                  onClick={handleStatusChange}
                  disabled={isLoading || (newStatus === TaskStatus.CLOSED && !actualDate)}
                  className={cn(
                    'mt-3 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors',
                    (newStatus === TaskStatus.CLOSED && !actualDate)
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-primary-600 hover:bg-primary-700',
                    isLoading && 'opacity-50'
                  )}
                >
                  <Save size={16} />
                  更新状态
                </button>
              </div>
            )}

            {/* 历史记录 */}
            {task && !isEditing && task.history.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  变更历史
                </h3>
                <div className="space-y-3 max-h-60 overflow-auto">
                  {task.history.slice(0, 5).map((history) => (
                    <div
                      key={history.id}
                      className="rounded-lg bg-gray-50 dark:bg-gray-700/50 px-3 py-2 text-sm"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {history.action === 'create' ? '创建' :
                            history.action === 'update' ? '更新' :
                              history.action === 'status_change' ? '状态变更' :
                                history.action === 'progress_change' ? '进度更新' : history.action}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(history.timestamp).toLocaleString('zh-CN')}
                        </span>
                      </div>
                      {history.comment && (
                        <p className="text-gray-600 dark:text-gray-300">{history.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="sticky bottom-0 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-6 py-4 flex items-center justify-between">
          <div className="flex gap-2">
            {mode !== 'create' && onArchive && task?.status !== TaskStatus.ARCHIVED && (
              <button
                onClick={onArchive}
                disabled={isLoading}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
              >
                <Archive size={16} />
                归档
              </button>
            )}
            {mode !== 'create' && onDelete && (
              <button
                onClick={onDelete}
                disabled={isLoading}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
              >
                <Trash2 size={16} />
                删除
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
            >
              取消
            </button>
            {(isEditing || mode === 'create') && (
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save size={16} />
                {isLoading ? '保存中...' : mode === 'create' ? '创建' : '保存'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
