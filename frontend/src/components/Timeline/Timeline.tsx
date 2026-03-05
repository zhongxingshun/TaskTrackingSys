/**
 * 时间轴组件
 * 展示任务变更历史
 */

import { TaskHistory } from '@/types';
import { Activity, Edit3, Archive, Trash2, CheckCircle, Plus, TrendingUp } from 'lucide-react';
import { cn } from '@/utils/cn';

interface TimelineProps {
  items: TaskHistory[];
}

const ACTION_ICONS: Record<string, typeof Activity> = {
  create: Plus,
  update: Edit3,
  status_change: Activity,
  progress_change: TrendingUp,
  archive: Archive,
  delete: Trash2,
  close: CheckCircle,
};

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  update: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  status_change: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  progress_change: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
  archive: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  delete: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  close: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
};

const ACTION_LABELS: Record<string, string> = {
  create: '创建任务',
  update: '更新信息',
  status_change: '状态变更',
  progress_change: '进度更新',
  archive: '归档任务',
  delete: '删除任务',
  close: '完成任务',
};

const STATUS_LABELS: Record<string, string> = {
  Backlog: '待处理',
  In_Progress: '进行中',
  Testing: '测试中',
  Closed: '已完结',
  Archived: '已归档',
};

export function Timeline({ items }: TimelineProps) {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-gray-500 dark:text-gray-400">
        暂无变更历史
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const Icon = ACTION_ICONS[item.action] || Activity;
        const iconColor = ACTION_COLORS[item.action] || ACTION_COLORS.update;
        
        return (
          <div key={item.id} className="relative">
            {/* 时间轴连接线 */}
            {index !== items.length - 1 && (
              <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
            )}

            <div className="flex gap-3">
              {/* 图标 */}
              <div
                className={cn(
                  'relative z-10 flex h-8 w-8 items-center justify-center rounded-full shrink-0',
                  iconColor
                )}
              >
                <Icon size={16} />
              </div>

              {/* 内容 */}
              <div className="flex-1 pb-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {ACTION_LABELS[item.action] || item.action}
                      </span>
                      {item.changed_by && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          by {item.changed_by}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {new Date(item.timestamp).toLocaleString('zh-CN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                {/* 状态变更详情 */}
                {item.action === 'status_change' && (item.old_status || item.new_status) && (
                  <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 px-3 py-1.5 text-sm">
                    {item.old_status && (
                      <span className="text-gray-500 dark:text-gray-400">
                        {STATUS_LABELS[item.old_status] || item.old_status}
                      </span>
                    )}
                    {(item.old_status && item.new_status) && (
                      <span className="text-gray-400">→</span>
                    )}
                    {item.new_status && (
                      <span
                        className={cn(
                          'font-medium',
                          item.new_status === 'Closed' ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'
                        )}
                      >
                        {STATUS_LABELS[item.new_status] || item.new_status}
                      </span>
                    )}
                  </div>
                )}

                {/* 进度变更详情 */}
                {item.action === 'progress_change' && (item.old_progress !== null || item.new_progress !== null) && (
                  <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 px-3 py-1.5 text-sm">
                    {item.old_progress !== null && (
                      <span className="text-gray-500 dark:text-gray-400">
                        {item.old_progress}%
                      </span>
                    )}
                    {(item.old_progress !== null && item.new_progress !== null) && (
                      <span className="text-gray-400">→</span>
                    )}
                    {item.new_progress !== null && (
                      <span className="font-medium text-primary-600 dark:text-primary-400">
                        {item.new_progress}%
                      </span>
                    )}
                  </div>
                )}

                {/* 变更说明 */}
                {item.comment && (
                  <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                    {item.comment}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
