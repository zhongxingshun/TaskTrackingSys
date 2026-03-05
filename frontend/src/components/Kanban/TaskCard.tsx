/**
 * 任务卡片组件 - 清新自然风格
 * 展示任务摘要信息，带有柔和的悬浮效果
 */

import { Task, TaskSource } from '@/types';
import { Clock, CheckCircle, Layers } from 'lucide-react';
import { cn } from '@/utils/cn';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

const SOURCE_CONFIG: Record<TaskSource, { class: string; label: string }> = {
  [TaskSource.INTERNAL_RD]: { class: 'tag-internal', label: '内部研发' },
  [TaskSource.COMPETITOR_RESEARCH]: { class: 'tag-competitor', label: '竞品调研' },
  [TaskSource.CUSTOMER_FEEDBACK]: { class: 'tag-customer', label: '客户反馈' },
  [TaskSource.MARKET_ANALYSIS]: { class: 'tag-market', label: '市场分析' },
  [TaskSource.OTHER]: { class: 'tag-other', label: '其他' },
};

const PRIORITY_CONFIG: Record<number, { color: string; bg: string }> = {
  5: { color: '#ef4444', bg: '#fef2f2' },
  4: { color: '#f97316', bg: '#fff7ed' },
  3: { color: '#eab308', bg: '#fefce8' },
  2: { color: '#22c55e', bg: '#f0fdf4' },
  1: { color: '#3b82f6', bg: '#eff6ff' },
};

export function TaskCard({ task, onClick }: TaskCardProps) {
  const sourceConfig = SOURCE_CONFIG[task.source];
  const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG[3];

  return (
    <div
      onClick={onClick}
      className="task-card group"
    >
      {/* 优先级指示条 */}
      <div
        className="status-indicator"
        style={{
          background: `linear-gradient(180deg, ${priorityConfig.color}88 0%, ${priorityConfig.color} 100%)`
        }}
      />

      <div className="ml-3 space-y-3 relative z-10">
        {/* 任务标题 */}
        <h3 className="font-semibold text-text-primary line-clamp-2 transition-colors group-hover:text-primary-600">
          {task.title}
        </h3>

        {/* 来源标签和设备数量 */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('tag', sourceConfig.class)}>
            {sourceConfig.label}
          </span>

          {task.device_count > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs text-text-muted font-medium">
              <Layers size={12} className="text-primary-500" />
              <span>{task.device_count}</span>
              <span>设备</span>
            </span>
          )}
        </div>

        {/* 进度条 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-text-secondary">
              {task.progress}%
            </span>
            {task.actual_date && task.status === 'Closed' ? (
              <span className="flex items-center gap-1 text-xs font-medium text-primary-600">
                <CheckCircle size={12} />
                <span>已闭环</span>
              </span>
            ) : task.target_date ? (
              <span className="flex items-center gap-1 text-xs text-text-muted">
                <Clock size={12} />
                <span>
                  {new Date(task.target_date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                </span>
              </span>
            ) : null}
          </div>

          {/* 进度条 */}
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${task.progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
