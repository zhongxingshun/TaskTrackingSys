/**
 * 管理后台仪表盘首页
 */

import { Link } from 'react-router-dom';
import { Cpu, Users, BarChart3, FileText, ArrowRight } from 'lucide-react';

// 功能卡片配置
const FEATURE_CARDS = [
    {
        id: 'devices',
        title: '设备管理',
        description: '管理设备分类和设备型号',
        icon: Cpu,
        path: '/admin/devices',
        color: 'primary',
        available: true,
    },
    {
        id: 'users',
        title: '用户管理',
        description: '管理系统用户和权限',
        icon: Users,
        path: '/admin/users',
        color: 'blue',
        available: true,
    },
    {
        id: 'reports',
        title: '报表统计',
        description: '查看任务完成情况报表',
        icon: BarChart3,
        path: '/admin/reports',
        color: 'purple',
        available: false,
    },
    {
        id: 'logs',
        title: '操作日志',
        description: '查看系统操作历史记录',
        icon: FileText,
        path: '/admin/logs',
        color: 'orange',
        available: false,
    },
];

const COLOR_MAP: Record<string, { bg: string; iconBg: string; text: string }> = {
    primary: { bg: 'bg-primary-50', iconBg: 'bg-primary-100', text: 'text-primary-600' },
    blue: { bg: 'bg-blue-50', iconBg: 'bg-blue-100', text: 'text-blue-600' },
    purple: { bg: 'bg-purple-50', iconBg: 'bg-purple-100', text: 'text-purple-600' },
    orange: { bg: 'bg-orange-50', iconBg: 'bg-orange-100', text: 'text-orange-600' },
};

export function AdminDashboard() {
    return (
        <div className="p-8">
            {/* 页面标题 */}
            <div className="mb-8">
                <h1 className="text-2xl font-display font-bold text-text-primary">
                    管理后台
                </h1>
                <p className="text-text-secondary mt-1">
                    欢迎使用 TaskFlow 管理后台，在这里您可以管理系统的各项配置。
                </p>
            </div>

            {/* 功能卡片网格 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {FEATURE_CARDS.map((card) => {
                    const Icon = card.icon;
                    const colors = COLOR_MAP[card.color];

                    return (
                        <Link
                            key={card.id}
                            to={card.available ? card.path : '#'}
                            onClick={(e) => !card.available && e.preventDefault()}
                            className={`
                group relative p-6 rounded-2xl border transition-all
                ${card.available
                                    ? 'bg-white border-gray-100 hover:border-primary-200 hover:shadow-lg cursor-pointer'
                                    : 'bg-gray-50 border-gray-100 cursor-not-allowed opacity-70'
                                }
              `}
                        >
                            {/* 图标 */}
                            <div className={`w-12 h-12 rounded-xl ${colors.iconBg} ${colors.text} flex items-center justify-center mb-4`}>
                                <Icon size={24} />
                            </div>

                            {/* 标题和描述 */}
                            <h3 className="font-semibold text-text-primary mb-1 group-hover:text-primary-600 transition-colors">
                                {card.title}
                            </h3>
                            <p className="text-sm text-text-muted">
                                {card.description}
                            </p>

                            {/* 箭头或即将上线标签 */}
                            {card.available ? (
                                <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ArrowRight size={20} className="text-primary-500" />
                                </div>
                            ) : (
                                <div className="absolute top-4 right-4">
                                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-gray-200 text-text-muted">
                                        即将上线
                                    </span>
                                </div>
                            )}
                        </Link>
                    );
                })}
            </div>

            {/* 快速统计（预留） */}
            <div className="mt-12">
                <h2 className="text-lg font-display font-semibold text-text-primary mb-4">
                    系统概览
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-5 bg-white rounded-xl border border-gray-100">
                        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">设备总数</p>
                        <p className="text-2xl font-bold text-text-primary">--</p>
                    </div>
                    <div className="p-5 bg-white rounded-xl border border-gray-100">
                        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">任务总数</p>
                        <p className="text-2xl font-bold text-text-primary">--</p>
                    </div>
                    <div className="p-5 bg-white rounded-xl border border-gray-100">
                        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">本月完成</p>
                        <p className="text-2xl font-bold text-text-primary">--</p>
                    </div>
                    <div className="p-5 bg-white rounded-xl border border-gray-100">
                        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">完成率</p>
                        <p className="text-2xl font-bold text-text-primary">--%</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
