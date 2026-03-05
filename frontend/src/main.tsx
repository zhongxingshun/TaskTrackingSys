/**
 * 应用入口
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import { AdminLayout } from './layouts';
import { AdminDashboard, DevicesPage, UsersPage } from './pages/Admin';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* 主应用 - 任务看板 */}
        <Route path="/" element={<App />} />

        {/* 管理后台 */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="devices" element={<DevicesPage />} />
          <Route path="users" element={<UsersPage />} />
          {/* 预留的路由 - 后续可添加 */}
          {/* <Route path="reports" element={<ReportsPage />} /> */}
          {/* <Route path="logs" element={<LogsPage />} /> */}
          {/* <Route path="settings" element={<SettingsPage />} /> */}
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
