/**
 * 任务 API
 */

import apiClient from './client';
import type {
  Task,
  TaskCreate,
  TaskFilters,
  TaskListResponse,
  TaskProgressUpdate,
  TaskStatusUpdate,
  TaskUpdate,
} from '@/types';

export const tasksApi = {
  /**
   * 获取任务列表
   */
  async getTasks(filters: TaskFilters = {}): Promise<TaskListResponse> {
    return apiClient.get('/tasks', { params: filters });
  },

  /**
   * 获取任务详情
   */
  async getTask(taskId: string): Promise<Task> {
    return apiClient.get(`/tasks/${taskId}`);
  },

  /**
   * 创建任务
   */
  async createTask(data: TaskCreate): Promise<Task> {
    return apiClient.post('/tasks', data);
  },

  /**
   * 更新任务
   */
  async updateTask(taskId: string, data: TaskUpdate): Promise<Task> {
    return apiClient.put(`/tasks/${taskId}`, data);
  },

  /**
   * 更新任务状态
   */
  async updateStatus(taskId: string, data: TaskStatusUpdate): Promise<Task> {
    return apiClient.patch(`/tasks/${taskId}/status`, data);
  },

  /**
   * 更新任务进度
   */
  async updateProgress(taskId: string, data: TaskProgressUpdate): Promise<Task> {
    return apiClient.patch(`/tasks/${taskId}/progress`, data);
  },

  /**
   * 归档任务
   */
  async archiveTask(taskId: string): Promise<Task> {
    return apiClient.post(`/tasks/${taskId}/archive`);
  },

  /**
   * 删除任务
   */
  async deleteTask(taskId: string): Promise<{ message: string }> {
    return apiClient.delete(`/tasks/${taskId}`);
  },

  /**
   * 更新单个设备状态
   */
  async updateDeviceStatus(taskId: string, deviceId: string, status: string): Promise<Task> {
    return apiClient.patch(`/tasks/${taskId}/devices/${deviceId}/status`, null, {
      params: { status }
    });
  },

  /**
   * 批量更新设备状态
   */
  async batchUpdateDeviceStatus(taskId: string, deviceIds: string[], status: string): Promise<Task> {
    return apiClient.patch(`/tasks/${taskId}/devices/batch-status`, null, {
      params: { device_ids: deviceIds, status }
    });
  },

  /**
   * 添加/更新设备禅道关联
   */
  async addZentaoLink(
    taskId: string,
    deviceId: string,
    zentaoType: string,
    zentaoId: string,
    zentaoTitle?: string,
    zentaoUrl?: string
  ): Promise<Task> {
    return apiClient.post(`/tasks/${taskId}/devices/${deviceId}/zentao`, null, {
      params: {
        zentao_type: zentaoType,
        zentao_id: zentaoId,
        zentao_title: zentaoTitle,
        zentao_url: zentaoUrl
      }
    });
  },

  /**
   * 删除设备禅道关联
   */
  async removeZentaoLink(taskId: string, deviceId: string): Promise<Task> {
    return apiClient.delete(`/tasks/${taskId}/devices/${deviceId}/zentao`);
  },

  /**
   * 获取设备负责人列表
   */
  async getDeviceAssignees(taskId: string, deviceId: string): Promise<any[]> {
    return apiClient.get(`/tasks/${taskId}/devices/${deviceId}/assignees`);
  },

  /**
   * 添加设备负责人
   */
  async addDeviceAssignee(taskId: string, deviceId: string, userId: string): Promise<Task> {
    return apiClient.post(`/tasks/${taskId}/devices/${deviceId}/assignees`, null, {
      params: { user_id: userId }
    });
  },

  /**
   * 删除设备负责人
   */
  async removeDeviceAssignee(taskId: string, deviceId: string, userId: string): Promise<Task> {
    return apiClient.delete(`/tasks/${taskId}/devices/${deviceId}/assignees/${userId}`);
  },
};

