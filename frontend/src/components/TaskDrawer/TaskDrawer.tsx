import { useState, useEffect } from 'react';
import { Task, TaskStatus, TaskSource, Device, TaskUpdate, DeviceTaskStatus } from '@/types';
import { X, Save, Archive, Trash2, Clock, Calendar, CheckCircle, Activity, Edit3, Eye } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Timeline } from '../Timeline';
import { MarkdownContent } from '../MarkdownContent';
import { MarkdownEditor } from '../MarkdownEditor';
import { DeviceSelector } from '../DeviceSelector';

interface TaskDrawerProps {
  task: Task | null;
  devices: Device[];
  allUsers?: { id: string; username: string; display_name: string | null; email: string }[];
  currentUserId?: string;
  deviceAssignees?: Record<string, { user_id: string; username?: string | null; display_name?: string | null; email?: string | null }[]>;
  open: boolean;
  onClose: () => void;
  onSave: (data: TaskUpdate) => Promise<void>;
  onStatusChange: (status: TaskStatus, actualDate?: string, comment?: string) => Promise<void>;
  onDeviceStatusChange?: (deviceId: string, status: DeviceTaskStatus) => Promise<void>;
  onZentaoAdd?: (deviceId: string, zentaoType: string, zentaoId: string, zentaoTitle?: string, zentaoUrl?: string) => Promise<void>;
  onZentaoRemove?: (deviceId: string) => Promise<void>;
  onAssigneeAdd?: (deviceId: string, userId: string) => Promise<void>;
  onAssigneeRemove?: (deviceId: string, userId: string) => Promise<void>;
  onArchive?: () => Promise<void>;
  onDelete?: () => Promise<void>;
}

const SOURCE_COLORS: Record<TaskSource, { bg: string; text: string }> = {
  [TaskSource.INTERNAL_RD]: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
  [TaskSource.COMPETITOR_RESEARCH]: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300' },
  [TaskSource.CUSTOMER_FEEDBACK]: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
  [TaskSource.MARKET_ANALYSIS]: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' },
  [TaskSource.OTHER]: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300' },
};

const SOURCE_LABELS: Record<TaskSource, string> = {
  [TaskSource.INTERNAL_RD]: '内部研发',
  [TaskSource.COMPETITOR_RESEARCH]: '竞品调研',
  [TaskSource.CUSTOMER_FEEDBACK]: '客户反馈',
  [TaskSource.MARKET_ANALYSIS]: '市场分析',
  [TaskSource.OTHER]: '其他',
};

const PRIORITY_LABELS = { 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' };
const PRIORITY_COLORS = { 1: 'bg-blue-500', 2: 'bg-green-500', 3: 'bg-yellow-500', 4: 'bg-orange-500', 5: 'bg-red-500' };

const STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.BACKLOG]: '待处理',
  [TaskStatus.IN_PROGRESS]: '进行中',
  [TaskStatus.TESTING]: '测试中',
  [TaskStatus.CLOSED]: '已完结',
  [TaskStatus.ARCHIVED]: '已归档',
};

export function TaskDrawer({ task, devices, allUsers = [], currentUserId, deviceAssignees = {}, open, onClose, onSave, onStatusChange, onDeviceStatusChange, onZentaoAdd, onZentaoRemove, onAssigneeAdd, onAssigneeRemove, onArchive, onDelete }: TaskDrawerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<TaskUpdate>({});
  const [newStatus, setNewStatus] = useState<TaskStatus>(TaskStatus.BACKLOG);
  const [actualDate, setActualDate] = useState<string>('');
  const [statusComment, setStatusComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
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
      setIsEditing(false);
    }
  }, [task]);

  if (!open || !task) return null;

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onSave(formData);
      setIsEditing(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChangeInternal = async () => {
    if (newStatus === TaskStatus.CLOSED && !actualDate) {
      alert('Status: actual date required when closing task');
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
    <>
      <div className={cn('fixed inset-0 z-50 bg-black/30 backdrop-blur-sm transition-opacity', open ? 'opacity-100' : 'opacity-0 pointer-events-none')} onClick={onClose} />
      <div className={cn('fixed right-0 top-0 z-50 h-full w-full max-w-2xl transform bg-white dark:bg-gray-800 shadow-2xl transition-transform duration-300 ease-in-out', open ? 'translate-x-0' : 'translate-x-full')}>
        <div className="sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-start justify-between px-6 py-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-mono text-gray-500 dark:text-gray-400">{task.task_id}</span>
                {task.status === TaskStatus.CLOSED && task.actual_date && (
                  <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
                    <CheckCircle size={12} />
                    Closed
                  </span>
                )}
              </div>
              <div className="flex items-start justify-between gap-4">
                {isEditing ? (
                  <input type="text" value={formData.title || ''} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="flex-1 text-xl font-semibold bg-transparent border-b border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:border-primary-500 pb-1" placeholder="Enter task title" />
                ) : (
                  <h2 className="flex-1 text-xl font-semibold text-gray-900 dark:text-white">{task.title}</h2>
                )}
                <button onClick={() => setIsEditing(!isEditing)} className={cn('rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300', isEditing && 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300')} title={isEditing ? 'Cancel edit' : 'Edit task'}>
                  <Edit3 size={18} />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', SOURCE_COLORS[task.source].bg, SOURCE_COLORS[task.source].text)}>{SOURCE_LABELS[task.source]}</span>
                <div className="flex items-center gap-1.5">
                  <div className={cn('h-2 w-2 rounded-full', PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS])} />
                  <span className="text-xs text-gray-600 dark:text-gray-400">{PRIORITY_LABELS[task.priority as keyof typeof PRIORITY_LABELS]}</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="ml-2 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300">
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto h-[calc(100vh-4rem)] p-6 space-y-8">
          <section>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">基本信息</h3>
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">来源</label>
                  <select value={formData.source || TaskSource.INTERNAL_RD} onChange={(e) => setFormData({ ...formData, source: e.target.value as TaskSource })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
                    {Object.values(TaskSource).map((source) => <option key={source} value={source}>{SOURCE_LABELS[source]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">优先级</label>
                  <select value={formData.priority || 3} onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
                    {[1, 2, 3, 4, 5].map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p as keyof typeof PRIORITY_LABELS]}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5"><Clock size={14} className="inline mr-1" />计划日期</label>
                    <input type="date" value={formData.target_date || ''} onChange={(e) => setFormData({ ...formData, target_date: e.target.value || undefined })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5"><Calendar size={14} className="inline mr-1" />实际日期</label>
                    <input type="date" value={formData.actual_date || ''} onChange={(e) => setFormData({ ...formData, actual_date: e.target.value || undefined })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5"><Eye size={14} className="inline mr-1" />跟踪人</label>
                  <select
                    value={formData.tracker_id || ''}
                    onChange={(e) => setFormData({ ...formData, tracker_id: e.target.value || undefined })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">未指定</option>
                    {allUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.display_name || user.username}
                        {user.id === currentUserId ? ' (我)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-gray-500 dark:text-gray-400">来源</span><p className="mt-0.5 text-gray-900 dark:text-white font-medium">{SOURCE_LABELS[task.source]}</p></div>
                  <div><span className="text-gray-500 dark:text-gray-400">优先级</span><div className="mt-0.5 flex items-center gap-1.5"><div className={cn('h-2 w-2 rounded-full', PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS])} /><span className="text-gray-900 dark:text-white font-medium">{PRIORITY_LABELS[task.priority as keyof typeof PRIORITY_LABELS]}</span></div></div>
                  <div><span className="text-gray-500 dark:text-gray-400">计划日期</span><p className="mt-0.5 text-gray-900 dark:text-white font-medium">{task.target_date ? new Date(task.target_date).toLocaleDateString('zh-CN') : '未设置'}</p></div>
                  <div><span className="text-gray-500 dark:text-gray-400">实际日期</span><p className="mt-0.5 text-gray-900 dark:text-white font-medium">{task.actual_date ? new Date(task.actual_date).toLocaleDateString('zh-CN') : '未完成'}</p></div>
                  <div className="col-span-2"><span className="text-gray-500 dark:text-gray-400"><Eye size={12} className="inline mr-1" />跟踪人</span><p className="mt-0.5 text-gray-900 dark:text-white font-medium">{task.tracker_id ? (allUsers.find(u => u.id === task.tracker_id)?.display_name || allUsers.find(u => u.id === task.tracker_id)?.username || '未知用户') : '未指定'}</p></div>
                </div>
              </div>
            )}
          </section>
          <section>
            <div className="flex items-center justify-between mb-2"><h3 className="text-sm font-medium text-gray-900 dark:text-white">进度</h3><span className="text-2xl font-bold text-primary-600 dark:text-primary-400">{task.progress}%</span></div>
            <div className="h-3 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500" style={{ width: `${task.progress}%` }} />
            </div>
          </section>
          <section>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">描述</h3>
            {isEditing ? (
              <MarkdownEditor
                value={formData.description || ''}
                onChange={(value) => setFormData({ ...formData, description: value })}
                placeholder="输入任务描述（支持 Markdown，可粘贴图片）"
                rows={6}
              />
            ) : (
              <div className="prose dark:prose-invert max-w-none text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                {task.description ? (
                  <MarkdownContent content={task.description} />
                ) : (
                  <p className="text-gray-400">暂无描述</p>
                )}
              </div>
            )}
          </section>
          <section>
            <DeviceSelector
              devices={devices}
              selectedDeviceIds={isEditing ? (formData.device_ids || []) : task.devices.map(d => d.id)}
              deviceStatuses={Object.fromEntries(
                (task.devices || []).map(d => [d.id, d.device_status || DeviceTaskStatus.PENDING])
              )}
              deviceZentaoInfo={Object.fromEntries(
                (task.devices || []).map(d => [d.id, {
                  type: d.zentao_type,
                  id: d.zentao_id,
                  title: d.zentao_title,
                  url: d.zentao_url
                }])
              )}
              deviceAssignees={deviceAssignees}
              allUsers={allUsers}
              onSelectionChange={(ids) => setFormData({ ...formData, device_ids: ids })}
              onStatusChange={onDeviceStatusChange}
              onZentaoAdd={onZentaoAdd}
              onZentaoRemove={onZentaoRemove}
              onAssigneeAdd={onAssigneeAdd}
              onAssigneeRemove={onAssigneeRemove}
              isEditing={isEditing}
              taskId={task.id}
            />
          </section>
          <section>
            <div className="flex items-center gap-2 mb-3"><Activity size={16} className="text-gray-500" /><h3 className="text-sm font-medium text-gray-900 dark:text-white">状态变更</h3></div>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {[TaskStatus.BACKLOG, TaskStatus.IN_PROGRESS, TaskStatus.TESTING, TaskStatus.CLOSED].map((status) => (
                  <button key={status} onClick={() => setNewStatus(status)} disabled={isLoading} className={cn('rounded-lg px-4 py-2 text-sm font-medium transition-colors', newStatus === status ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 ring-2 ring-primary-500' : 'bg-white dark:bg-gray-700 text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600', isLoading && 'opacity-50 cursor-not-allowed')}>
                    {STATUS_LABELS[status]}
                  </button>
                ))}
              </div>
              {newStatus === TaskStatus.CLOSED && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">实际日期 <span className="text-red-500">*</span></label>
                  <input type="date" value={actualDate} onChange={(e) => setActualDate(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">备注（可选）</label>
                <input type="text" value={statusComment} onChange={(e) => setStatusComment(e.target.value)} placeholder="添加备注..." className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <button onClick={handleStatusChangeInternal} disabled={isLoading || (newStatus === TaskStatus.CLOSED && !actualDate)} className={cn('w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors', (newStatus === TaskStatus.CLOSED && !actualDate) ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700', isLoading && 'opacity-50')}>
                <Save size={16} />{isLoading ? '更新中...' : '更新状态'}
              </button>
            </div>
          </section>
          <section>
            <div className="flex items-center gap-2 mb-3"><Clock size={16} className="text-gray-500" /><h3 className="text-sm font-medium text-gray-900 dark:text-white">历史记录</h3><span className="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-400">{task.history.length}</span></div>
            <Timeline items={task.history} />
          </section>
        </div>
        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {onArchive && task.status !== TaskStatus.ARCHIVED && (
                <button onClick={onArchive} disabled={isLoading} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors">
                  <Archive size={16} />归档
                </button>
              )}
              {onDelete && (
                <button onClick={onDelete} disabled={isLoading} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors">
                  <Trash2 size={16} />删除
                </button>
              )}
            </div>
            {isEditing && (
              <div className="flex gap-2">
                <button onClick={() => setIsEditing(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors">取消</button>
                <button onClick={handleSave} disabled={isLoading} className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  <Save size={16} />{isLoading ? '保存中...' : '保存'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
