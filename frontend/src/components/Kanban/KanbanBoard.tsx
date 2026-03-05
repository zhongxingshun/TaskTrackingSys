/**
 * 看板组件
 * 按状态列展示任务卡片
 */

import { Task, TaskStatus } from '@/types';
import { KanbanColumn } from './KanbanColumn';

const COLUMNS: { status: TaskStatus; title: string }[] = [
  { status: TaskStatus.BACKLOG, title: '待处理' },
  { status: TaskStatus.IN_PROGRESS, title: '进行中' },
  { status: TaskStatus.TESTING, title: '测试中' },
  { status: TaskStatus.CLOSED, title: '已完结' },
  { status: TaskStatus.ARCHIVED, title: '已归档' },
];

interface KanbanBoardProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export function KanbanBoard({ tasks, onTaskClick }: KanbanBoardProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((column) => (
        <KanbanColumn
          key={column.status}
          title={column.title}
          status={column.status}
          tasks={tasks.filter((t) => t.status === column.status)}
          onTaskClick={onTaskClick}
        />
      ))}
    </div>
  );
}
