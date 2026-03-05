/**
 * API 客户端
 * 基于 axios 封装，提供统一的请求配置和错误处理
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 添加 JWT Token
    const token = localStorage.getItem('taskflow_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    // 添加用户 ID 头 (兼容)
    config.headers['X-User-Id'] = localStorage.getItem('userId') || 'system';
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const message = error.response?.data?.detail || error.message || '请求失败';
    return Promise.reject(new Error(message));
  }
);

export default apiClient;
