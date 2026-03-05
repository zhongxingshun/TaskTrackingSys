/**
 * 看板列组件 - 清新自然风格
 */

import { Task, TaskStatus } from '@/types';
import { TaskCard } from './TaskCard';

interface KanbanColumnProps {
  title: string;
  status: TaskStatus;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const STATUS_CONFIG: Record<TaskStatus, { color: string; emoji: string }> = {
  [TaskStatus.BACKLOG]: { color: '#6366f1', emoji: '📋' },
  [TaskStatus.IN_PROGRESS]: { color: '#3b82f6', emoji: '🚀' },
  [TaskStatus.TESTING]: { color: '#a855f7', emoji: '🧪' },
  [TaskStatus.CLOSED]: { color: '#10b981', emoji: '✅' },
  [TaskStatus.ARCHIVED]: { color: '#64748b', emoji: '📦' },
};

export function KanbanColumn({ title, status, tasks, onTaskClick }: KanbanColumnProps) {
  const config = STATUS_CONFIG[status];

  return (
    <div className="flex-shrink-0 w-80 animate-fade-in">
      <div className="kanban-column h-full">
        {/* 列头 */}
        <div
          className="kanban-column-header"
          style={{
            borderTop: `3px solid ${config.color}`,
            borderRadius: '20px 20px 0 0'
          }}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-lg">{config.emoji}</span>
            <h2 className="font-display font-semibold text-sm">
              {title}
            </h2>
          </div>

          <span
            className="count-badge"
            style={{
              background: `${config.color}15`,
              color: config.color
            }}
          >
            {tasks.length}
          </span>
        </div>

        {/* 任务卡片列表 */}
        <div className="p-3 space-y-3 min-h-[200px]">
          {tasks.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div
                  className="w-12 h-12 mx-auto rounded-2xl border-2 border-dashed flex items-center justify-center mb-3"
                  style={{ borderColor: `${config.color}40` }}
                >
                  <span className="text-2xl opacity-50">{config.emoji}</span>
                </div>
                <p className="text-sm text-text-muted font-medium">暂无任务</p>
              </div>
            </div>
          ) : (
            tasks.map((task, index) => (
              <div
                key={task.id}
                style={{ animationDelay: `${index * 60}ms` }}
                className="animate-slide-up"
              >
                <TaskCard
                  task={task}
                  onClick={() => onTaskClick(task)}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
