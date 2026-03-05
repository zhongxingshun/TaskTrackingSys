/**
 * 管理后台布局组件
 * 可扩展的侧边栏 + 内容区布局
 */

import { useState, useEffect } from 'react';
import { Link, useLocation, Outlet, Navigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Cpu,
    Settings,
    ChevronLeft,
    Users,
    FileText,
    BarChart3,
    Bell
} from 'lucide-react';
import { cn } from '@/utils/cn';

// 菜单配置 - 方便后续扩展
const MENU_ITEMS = [
    {
        id: 'dashboard',
        label: '仪表盘',
        icon: LayoutDashboard,
        path: '/admin',
        badge: null,
    },
    {
        id: 'devices',
        label: '设备管理',
        icon: Cpu,
        path: '/admin/devices',
        badge: null,
    },
    // 预留的菜单项 - 后续可启用
    {
        id: 'users',
        label: '用户管理',
        icon: Users,
        path: '/admin/users',
        badge: null,
    },
    {
        id: 'reports',
        label: '报表统计',
        icon: BarChart3,
        path: '/admin/reports',
        badge: 'soon',
        disabled: true,
    },
    {
        id: 'logs',
        label: '操作日志',
        icon: FileText,
        path: '/admin/logs',
        badge: 'soon',
        disabled: true,
    },
    {
        id: 'notifications',
        label: '通知设置',
        icon: Bell,
        path: '/admin/notifications',
        badge: 'soon',
        disabled: true,
    },
    {
        id: 'settings',
        label: '系统设置',
        icon: Settings,
        path: '/admin/settings',
        badge: 'soon',
        disabled: true,
    },
];

export function AdminLayout() {
    const location = useLocation();
    const [isLoading, setIsLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        // 检查用户权限
        const checkPermission = async () => {
            const token = localStorage.getItem('taskflow_token');
            if (!token) {
                setIsAdmin(false);
                setIsLoading(false);
                return;
            }

            try {
                const res = await fetch('/api/v1/auth/me', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const user = await res.json();
                    const admin = user.is_superuser ||
                        user.roles?.includes('superadmin') ||
                        user.roles?.includes('admin') ||
                        false;
                    setIsAdmin(admin);
                } else {
                    setIsAdmin(false);
                }
            } catch {
                setIsAdmin(false);
            }
            setIsLoading(false);
        };

        checkPermission();
    }, []);

    // 加载中
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-gray-500">加载中...</div>
            </div>
        );
    }

    // 权限检查：非管理员重定向到首页
    if (!isAdmin) {
        return <Navigate to="/" replace />;
    }


    return (
        <div className="min-h-screen flex">
            {/* 侧边栏 */}
            <aside className="w-64 bg-white border-r border-gray-100 flex flex-col fixed h-full">
                {/* Logo 区域 */}
                <div className="h-16 flex items-center px-6 border-b border-gray-100">
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="logo-mark w-9 h-9 text-sm">TF</div>
                        <div>
                            <h1 className="font-display font-semibold text-text-primary text-sm">
                                TaskFlow
                            </h1>
                            <p className="text-xs text-primary-600 font-medium">管理后台</p>
                        </div>
                    </Link>
                </div>

                {/* 导航菜单 */}
                <nav className="flex-1 py-6 px-4 overflow-y-auto">
                    <div className="space-y-1">
                        {MENU_ITEMS.map((item) => {
                            const isActive = location.pathname === item.path ||
                                (item.path !== '/admin' && location.pathname.startsWith(item.path));
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.id}
                                    to={item.disabled ? '#' : item.path}
                                    onClick={(e) => item.disabled && e.preventDefault()}
                                    className={cn(
                                        'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                                        isActive
                                            ? 'bg-primary-50 text-primary-700'
                                            : item.disabled
                                                ? 'text-text-muted cursor-not-allowed opacity-60'
                                                : 'text-text-secondary hover:bg-gray-50 hover:text-text-primary'
                                    )}
                                >
                                    <Icon size={18} className={isActive ? 'text-primary-600' : ''} />
                                    <span className="flex-1">{item.label}</span>
                                    {item.badge === 'soon' && (
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-text-muted">
                                            即将上线
                                        </span>
                                    )}
                                    {item.badge && item.badge !== 'soon' && (
                                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-100 text-primary-700">
                                            {item.badge}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </nav>

                {/* 底部返回按钮 */}
                <div className="p-4 border-t border-gray-100">
                    <Link
                        to="/"
                        className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-text-secondary hover:bg-gray-50 hover:text-text-primary transition-colors"
                    >
                        <ChevronLeft size={18} />
                        返回任务看板
                    </Link>
                </div>
            </aside>

            {/* 主内容区 */}
            <main className="flex-1 ml-64 bg-surface-primary min-h-screen">
                <Outlet />
            </main>
        </div>
    );
}
