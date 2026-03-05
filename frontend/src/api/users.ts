/**
 * 用户相关 API
 */

import apiClient from './client';

export interface UserInfo {
    id: string;
    username: string;
    email: string;
    display_name: string | null;
    department: string | null;
    is_active: boolean;
}

export const usersApi = {
    /**
     * 获取用户列表
     */
    async getUsers(params?: { search?: string; page?: number; page_size?: number }): Promise<{
        items: UserInfo[];
        total: number;
    }> {
        return apiClient.get('/users', { params });
    },

    /**
     * 获取当前用户信息
     */
    async getCurrentUser(): Promise<UserInfo> {
        return apiClient.get('/auth/me');
    },

    /**
     * 修改密码
     */
    async changePassword(oldPassword: string, newPassword: string): Promise<{ message: string }> {
        return apiClient.post('/auth/change-password', {
            old_password: oldPassword,
            new_password: newPassword,
        });
    },
};
