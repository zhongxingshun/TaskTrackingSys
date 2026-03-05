/**
 * 类型定义
 * 与后端 Schema 保持一致
 */

export enum TaskStatus {
  BACKLOG = 'Backlog',
  IN_PROGRESS = 'In_Progress',
  TESTING = 'Testing',
  CLOSED = 'Closed',
  ARCHIVED = 'Archived',
}

export enum TaskSource {
  INTERNAL_RD = 'Internal_RD',
  COMPETITOR_RESEARCH = 'Competitor',
  CUSTOMER_FEEDBACK = 'Customer',
  MARKET_ANALYSIS = 'Market',
  OTHER = 'Other',
}

export enum DeviceTaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export enum ZentaoType {
  STORY = 'story',
  BUG = 'bug',
}

export interface Assignee {
  user_id: string;
  username: string | null;
  display_name: string | null;
  email: string | null;
}

export interface Device {
  id: string;
  name: string;
  category: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  task_count: number;
  // 设备在任务中的状态（可选，仅在任务上下文中使用）
  device_status?: DeviceTaskStatus;
  completed_at?: string | null;
  // 禅道关联信息（可选）
  zentao_type?: ZentaoType | null;
  zentao_id?: string | null;
  zentao_title?: string | null;
  zentao_url?: string | null;
  // 负责人（可选）
  assignees?: Assignee[];
}

export interface TaskHistory {
  id: string;
  task_id: string;
  changed_by: string;
  action: string;
  old_status: string | null;
  new_status: string | null;
  old_progress: number | null;
  new_progress: number | null;
  comment: string | null;
  timestamp: string;
}

export interface Task {
  id: string;
  task_id: string;
  title: string;
  source: TaskSource;
  description: string | null;
  progress: number;
  status: TaskStatus;
  priority: number;
  assignee_id: string | null;
  tracker_id: string | null;
  created_at: string;
  updated_at: string;
  target_date: string | null;
  actual_date: string | null;
  devices: Device[];
  history: TaskHistory[];
  device_count: number;
}

export interface TaskCreate {
  title: string;
  source?: TaskSource;
  description?: string;
  priority?: number;
  target_date?: string | null;
  device_ids?: string[];
  assignee_id?: string | null;
  tracker_id?: string | null;
}

export interface TaskUpdate {
  title?: string;
  source?: TaskSource;
  description?: string;
  priority?: number;
  target_date?: string | null;
  actual_date?: string | null;
  device_ids?: string[];
  assignee_id?: string | null;
  tracker_id?: string | null;
}

export interface TaskStatusUpdate {
  status: TaskStatus;
  actual_date?: string | null;
  comment?: string | null;
}

export interface TaskProgressUpdate {
  progress: number;
  comment?: string | null;
}

export interface TaskListResponse {
  items: Task[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
}

export interface TaskFilters {
  status?: TaskStatus;
  source?: TaskSource;
  device_id?: string;
  assignee_id?: string;
  tracker_id?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface DeviceCreate {
  name: string;
  category: string;
  description?: string | null;
}

export interface DeviceUpdate {
  name?: string;
  category?: string;
  description?: string | null;
}

export interface DeviceListResponse {
  items: Device[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
}
