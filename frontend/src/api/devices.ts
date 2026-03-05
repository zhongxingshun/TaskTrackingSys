/**
 * 设备 API
 */

import apiClient from './client';
import type { Device, DeviceCreate, DeviceListResponse, DeviceUpdate } from '@/types';

export const devicesApi = {
  /**
   * 获取设备列表
   */
  async getDevices(params?: { page?: number; page_size?: number; category?: string; search?: string }): Promise<DeviceListResponse> {
    return apiClient.get('/devices', { params });
  },

  /**
   * 获取所有设备（不分页，用于选择器）
   */
  async getAllDevices(): Promise<Device[]> {
    return apiClient.get('/devices/all');
  },

  /**
   * 获取设备类别列表
   */
  async getCategories(): Promise<string[]> {
    return apiClient.get('/devices/categories');
  },

  /**
   * 获取设备详情
   */
  async getDevice(deviceId: string): Promise<Device> {
    return apiClient.get(`/devices/${deviceId}`);
  },

  /**
   * 创建设备
   */
  async createDevice(data: DeviceCreate): Promise<Device> {
    return apiClient.post('/devices', data);
  },

  /**
   * 更新设备
   */
  async updateDevice(deviceId: string, data: DeviceUpdate): Promise<Device> {
    return apiClient.put(`/devices/${deviceId}`, data);
  },

  /**
   * 删除设备
   */
  async deleteDevice(deviceId: string): Promise<{ message: string }> {
    return apiClient.delete(`/devices/${deviceId}`);
  },
};
