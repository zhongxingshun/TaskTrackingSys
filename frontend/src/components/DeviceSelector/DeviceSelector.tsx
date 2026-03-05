/**
 * 设备选择器组件
 * 支持分类折叠、批量选择、设备状态管理、禅道关联
 */

import { useState, useMemo } from 'react';
import { Device, DeviceTaskStatus, ZentaoType } from '@/types';
import { ChevronDown, ChevronRight, Search, Check, Clock, Play, CheckCircle, Link2, Bug, FileText, X, ExternalLink } from 'lucide-react';
import { cn } from '@/utils/cn';

interface AssigneeInfo {
    user_id: string;
    username?: string | null;
    display_name?: string | null;
    email?: string | null;
}

interface DeviceSelectorProps {
    devices: Device[];
    selectedDeviceIds: string[];
    deviceStatuses?: Record<string, DeviceTaskStatus>;
    deviceZentaoInfo?: Record<string, { type?: ZentaoType | null; id?: string | null; title?: string | null; url?: string | null }>;
    deviceAssignees?: Record<string, AssigneeInfo[]>;
    onSelectionChange: (deviceIds: string[]) => void;
    onStatusChange?: (deviceId: string, status: DeviceTaskStatus) => void;
    onZentaoAdd?: (deviceId: string, zentaoType: string, zentaoId: string, zentaoTitle?: string, zentaoUrl?: string) => Promise<void>;
    onZentaoRemove?: (deviceId: string) => Promise<void>;
    onAssigneeAdd?: (deviceId: string, userId: string) => Promise<void>;
    onAssigneeRemove?: (deviceId: string, userId: string) => Promise<void>;
    allUsers?: { id: string; username: string; display_name: string | null; email: string }[];
    isEditing?: boolean;
    className?: string;
    taskId?: string;
}

const STATUS_CONFIG: Record<DeviceTaskStatus, { icon: typeof Check; label: string; color: string; bg: string }> = {
    [DeviceTaskStatus.PENDING]: {
        icon: Clock,
        label: '待处理',
        color: 'text-gray-500',
        bg: 'bg-gray-100',
    },
    [DeviceTaskStatus.IN_PROGRESS]: {
        icon: Play,
        label: '进行中',
        color: 'text-blue-600',
        bg: 'bg-blue-100',
    },
    [DeviceTaskStatus.COMPLETED]: {
        icon: CheckCircle,
        label: '已完成',
        color: 'text-green-600',
        bg: 'bg-green-100',
    },
};

// 禅道关联弹窗组件
function ZentaoLinkModal({
    deviceName,
    onClose,
    onSubmit,
    initialData
}: {
    deviceName: string;
    onClose: () => void;
    onSubmit: (type: string, id: string, title?: string, url?: string) => void;
    initialData?: { type?: string; id?: string; title?: string; url?: string };
}) {
    const [zentaoType, setZentaoType] = useState(initialData?.type || 'story');
    const [zentaoId, setZentaoId] = useState(initialData?.id || '');
    const [zentaoTitle, setZentaoTitle] = useState(initialData?.title || '');
    const [zentaoUrl, setZentaoUrl] = useState(initialData?.url || '');

    const handleSubmit = () => {
        if (!zentaoId.trim()) {
            alert('请输入禅道ID');
            return;
        }
        onSubmit(zentaoType, zentaoId, zentaoTitle || undefined, zentaoUrl || undefined);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        关联禅道需求/Bug
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    为设备 <span className="font-medium text-gray-900 dark:text-white">{deviceName}</span> 关联禅道项
                </p>

                <div className="space-y-4">
                    {/* 类型选择 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            类型
                        </label>
                        <div className="flex gap-3">
                            <label className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors",
                                zentaoType === 'story'
                                    ? "border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                                    : "border-gray-200 dark:border-gray-600 hover:border-gray-300"
                            )}>
                                <input
                                    type="radio"
                                    name="zentaoType"
                                    value="story"
                                    checked={zentaoType === 'story'}
                                    onChange={() => setZentaoType('story')}
                                    className="sr-only"
                                />
                                <FileText size={16} />
                                <span className="text-sm">需求 (Story)</span>
                            </label>
                            <label className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors",
                                zentaoType === 'bug'
                                    ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                    : "border-gray-200 dark:border-gray-600 hover:border-gray-300"
                            )}>
                                <input
                                    type="radio"
                                    name="zentaoType"
                                    value="bug"
                                    checked={zentaoType === 'bug'}
                                    onChange={() => setZentaoType('bug')}
                                    className="sr-only"
                                />
                                <Bug size={16} />
                                <span className="text-sm">Bug</span>
                            </label>
                        </div>
                    </div>

                    {/* 禅道ID */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            禅道ID <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={zentaoId}
                            onChange={(e) => setZentaoId(e.target.value)}
                            placeholder="例如: 12345"
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>

                    {/* 标题 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            标题 <span className="text-gray-400">(可选)</span>
                        </label>
                        <input
                            type="text"
                            value={zentaoTitle}
                            onChange={(e) => setZentaoTitle(e.target.value)}
                            placeholder="方便识别的标题"
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>

                    {/* 链接 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            禅道链接 <span className="text-gray-400">(可选)</span>
                        </label>
                        <input
                            type="url"
                            value={zentaoUrl}
                            onChange={(e) => setZentaoUrl(e.target.value)}
                            placeholder="http://zentao.example.com/..."
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
                    >
                        确认关联
                    </button>
                </div>
            </div>
        </div>
    );
}

// 负责人选择弹窗组件
function AssigneeModal({
    deviceName,
    currentAssignees,
    allUsers,
    onClose,
    onAdd,
    onRemove,
}: {
    deviceName: string;
    currentAssignees: AssigneeInfo[];
    allUsers: { id: string; username: string; display_name: string | null; email: string }[];
    onClose: () => void;
    onAdd: (userId: string) => Promise<void>;
    onRemove: (userId: string) => Promise<void>;
}) {
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState<string | null>(null);

    const currentAssigneeIds = new Set(currentAssignees.map(a => a.user_id));

    const filteredUsers = useMemo(() => {
        if (!search.trim()) return allUsers;
        const query = search.toLowerCase();
        return allUsers.filter(
            u => u.username.toLowerCase().includes(query) ||
                (u.display_name?.toLowerCase().includes(query)) ||
                u.email.toLowerCase().includes(query)
        );
    }, [allUsers, search]);

    const handleToggle = async (userId: string, isAssigned: boolean) => {
        setLoading(userId);
        try {
            if (isAssigned) {
                await onRemove(userId);
            } else {
                await onAdd(userId);
            }
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* 头部 */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        分配负责人
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* 设备名称 */}
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 text-sm text-gray-600 dark:text-gray-300">
                    设备: <span className="font-medium">{deviceName}</span>
                </div>

                {/* 搜索 */}
                <div className="px-4 py-3">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="搜索用户..."
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* 用户列表 */}
                <div className="flex-1 overflow-y-auto px-4 pb-4">
                    {filteredUsers.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            暂无可用用户
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredUsers.map(user => {
                                const isAssigned = currentAssigneeIds.has(user.id);
                                const isLoading = loading === user.id;
                                return (
                                    <div
                                        key={user.id}
                                        onClick={() => !isLoading && handleToggle(user.id, isAssigned)}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors",
                                            isAssigned
                                                ? "bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700"
                                                : "hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-transparent"
                                        )}
                                    >
                                        {/* 复选框 */}
                                        <div className={cn(
                                            "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                                            isAssigned
                                                ? "bg-primary-600 border-primary-600"
                                                : "border-gray-300 dark:border-gray-500"
                                        )}>
                                            {isAssigned && <Check size={12} className="text-white" />}
                                        </div>

                                        {/* 头像 */}
                                        <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 text-sm font-medium">
                                            {(user.display_name || user.username).charAt(0).toUpperCase()}
                                        </div>

                                        {/* 用户信息 */}
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
                                                {user.display_name || user.username}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                {user.email}
                                            </div>
                                        </div>

                                        {/* 加载状态 */}
                                        {isLoading && (
                                            <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* 底部 */}
                <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                            已选择 {currentAssignees.length} 人
                        </span>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
                        >
                            完成
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function DeviceSelector({
    devices,
    selectedDeviceIds,
    deviceStatuses = {},
    deviceZentaoInfo = {},
    deviceAssignees = {},
    onSelectionChange,
    onStatusChange,
    onZentaoAdd,
    onZentaoRemove,
    onAssigneeAdd,
    onAssigneeRemove,
    allUsers = [],
    isEditing = false,
    className = '',
    taskId: _taskId,
}: DeviceSelectorProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    const [zentaoModalDevice, setZentaoModalDevice] = useState<Device | null>(null);
    const [assigneeModalDevice, setAssigneeModalDevice] = useState<Device | null>(null);

    // 按分类分组设备
    const devicesByCategory = useMemo(() => {
        const grouped: Record<string, Device[]> = {};
        devices.forEach((device) => {
            const category = device.category || '未分类';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(device);
        });
        return grouped;
    }, [devices]);

    // 过滤设备
    const filteredDevicesByCategory = useMemo(() => {
        if (!searchQuery.trim()) return devicesByCategory;

        const query = searchQuery.toLowerCase();
        const filtered: Record<string, Device[]> = {};

        Object.entries(devicesByCategory).forEach(([category, devs]) => {
            const matchedDevices = devs.filter(
                (d) =>
                    d.name.toLowerCase().includes(query) ||
                    d.category.toLowerCase().includes(query)
            );
            if (matchedDevices.length > 0) {
                filtered[category] = matchedDevices;
            }
        });

        return filtered;
    }, [devicesByCategory, searchQuery]);

    // 切换分类展开/折叠
    const toggleCategory = (category: string) => {
        setExpandedCategories((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(category)) {
                newSet.delete(category);
            } else {
                newSet.add(category);
            }
            return newSet;
        });
    };

    // 选择/取消单个设备
    const toggleDevice = (deviceId: string) => {
        if (!isEditing) return;
        const newSelection = selectedDeviceIds.includes(deviceId)
            ? selectedDeviceIds.filter((id) => id !== deviceId)
            : [...selectedDeviceIds, deviceId];
        onSelectionChange(newSelection);
    };

    // 全选/取消一个分类
    const toggleCategorySelection = (category: string) => {
        if (!isEditing) return;
        const categoryDeviceIds = (filteredDevicesByCategory[category] || []).map((d) => d.id);
        const allSelected = categoryDeviceIds.every((id) => selectedDeviceIds.includes(id));

        if (allSelected) {
            onSelectionChange(selectedDeviceIds.filter((id) => !categoryDeviceIds.includes(id)));
        } else {
            const newSelection = new Set([...selectedDeviceIds, ...categoryDeviceIds]);
            onSelectionChange(Array.from(newSelection));
        }
    };

    // 处理禅道关联提交
    const handleZentaoSubmit = async (type: string, id: string, title?: string, url?: string) => {
        if (zentaoModalDevice && onZentaoAdd) {
            await onZentaoAdd(zentaoModalDevice.id, type, id, title, url);
        }
        setZentaoModalDevice(null);
    };

    // 统计信息
    const totalDevices = devices.length;
    const selectedCount = selectedDeviceIds.length;
    const completedCount = selectedDeviceIds.filter(
        (id) => deviceStatuses[id] === DeviceTaskStatus.COMPLETED
    ).length;

    const categories = Object.keys(filteredDevicesByCategory);

    return (
        <>
            <div className={cn('rounded-xl border border-gray-200 dark:border-gray-700', className)}>
                {/* 头部统计 */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-t-xl">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            关联设备
                        </h3>
                        <div className="flex items-center gap-2 text-xs">
                            <span className="px-2 py-1 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                                {selectedCount}/{totalDevices} 已关联
                            </span>
                            {selectedCount > 0 && (
                                <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                    {completedCount}/{selectedCount} 已完成
                                </span>
                            )}
                        </div>
                    </div>

                    {/* 搜索框 */}
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="搜索设备..."
                            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* 设备列表 */}
                <div className="max-h-96 overflow-y-auto">
                    {categories.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            <p className="text-sm">未找到匹配的设备</p>
                        </div>
                    ) : (
                        categories.map((category) => {
                            const categoryDevices = filteredDevicesByCategory[category];
                            const isExpanded = expandedCategories.has(category);
                            const categoryDeviceIds = categoryDevices.map((d) => d.id);
                            const selectedInCategory = categoryDeviceIds.filter((id) =>
                                selectedDeviceIds.includes(id)
                            ).length;
                            const allSelected =
                                categoryDeviceIds.length > 0 &&
                                categoryDeviceIds.every((id) => selectedDeviceIds.includes(id));
                            const someSelected = selectedInCategory > 0 && !allSelected;

                            return (
                                <div key={category} className="border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                                    {/* 分类头 */}
                                    <div
                                        className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                                        onClick={() => toggleCategory(category)}
                                    >
                                        <div className="flex items-center gap-2">
                                            {isExpanded ? (
                                                <ChevronDown size={16} className="text-gray-400" />
                                            ) : (
                                                <ChevronRight size={16} className="text-gray-400" />
                                            )}
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                {category}
                                            </span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                ({categoryDevices.length})
                                            </span>
                                            {selectedInCategory > 0 && (
                                                <span className="text-xs px-1.5 py-0.5 rounded bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                                                    {selectedInCategory} 已选
                                                </span>
                                            )}
                                        </div>

                                        {isEditing && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleCategorySelection(category);
                                                }}
                                                className={cn(
                                                    'text-xs px-2 py-1 rounded-lg transition-colors',
                                                    allSelected
                                                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                                                        : someSelected
                                                            ? 'bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-300'
                                                            : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600'
                                                )}
                                            >
                                                {allSelected ? '取消全选' : '全选'}
                                            </button>
                                        )}
                                    </div>

                                    {/* 设备列表 */}
                                    {isExpanded && (
                                        <div className="px-3 pb-3 space-y-2">
                                            {categoryDevices.map((device) => {
                                                const isSelected = selectedDeviceIds.includes(device.id);
                                                const status = deviceStatuses[device.id] || DeviceTaskStatus.PENDING;
                                                const statusConfig = STATUS_CONFIG[status];
                                                const StatusIcon = statusConfig.icon;
                                                const zentaoInfo = deviceZentaoInfo[device.id];
                                                const hasZentao = zentaoInfo?.id;

                                                return (
                                                    <div
                                                        key={device.id}
                                                        className={cn(
                                                            'rounded-lg transition-colors',
                                                            isSelected
                                                                ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800'
                                                                : 'bg-gray-50 dark:bg-gray-700/30 border border-transparent hover:border-gray-200 dark:hover:border-gray-600'
                                                        )}
                                                    >
                                                        {/* 设备主行 */}
                                                        <div
                                                            className={cn(
                                                                'flex items-center justify-between p-2.5',
                                                                isEditing ? 'cursor-pointer' : ''
                                                            )}
                                                            onClick={() => toggleDevice(device.id)}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                {/* 选择框 */}
                                                                {isEditing && (
                                                                    <div
                                                                        className={cn(
                                                                            'w-5 h-5 rounded flex items-center justify-center border-2 transition-colors',
                                                                            isSelected
                                                                                ? 'bg-primary-600 border-primary-600'
                                                                                : 'border-gray-300 dark:border-gray-500'
                                                                        )}
                                                                    >
                                                                        {isSelected && <Check size={12} className="text-white" />}
                                                                    </div>
                                                                )}

                                                                <div>
                                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                                        {device.name}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                        {device.category}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* 状态指示器 */}
                                                            {isSelected && (
                                                                <div className="flex items-center gap-2">
                                                                    {onStatusChange && !isEditing ? (
                                                                        <select
                                                                            value={status}
                                                                            onChange={(e) => {
                                                                                e.stopPropagation();
                                                                                onStatusChange(device.id, e.target.value as DeviceTaskStatus);
                                                                            }}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            className="text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1"
                                                                        >
                                                                            <option value={DeviceTaskStatus.PENDING}>待处理</option>
                                                                            <option value={DeviceTaskStatus.IN_PROGRESS}>进行中</option>
                                                                            <option value={DeviceTaskStatus.COMPLETED}>已完成</option>
                                                                        </select>
                                                                    ) : (
                                                                        <div
                                                                            className={cn(
                                                                                'flex items-center gap-1 px-2 py-1 rounded-full text-xs',
                                                                                statusConfig.bg,
                                                                                statusConfig.color
                                                                            )}
                                                                        >
                                                                            <StatusIcon size={12} />
                                                                            <span>{statusConfig.label}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* 禅道关联区域 - 仅已选设备且非编辑模式显示 */}
                                                        {isSelected && !isEditing && (
                                                            <div className="px-2.5 pb-2.5 pt-0">
                                                                {hasZentao ? (
                                                                    <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600">
                                                                        <div className="flex items-center gap-2">
                                                                            {zentaoInfo.type === 'bug' ? (
                                                                                <Bug size={14} className="text-red-500" />
                                                                            ) : (
                                                                                <FileText size={14} className="text-blue-500" />
                                                                            )}
                                                                            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                                                                {zentaoInfo.type === 'bug' ? 'Bug' : '需求'} #{zentaoInfo.id}
                                                                            </span>
                                                                            {zentaoInfo.title && (
                                                                                <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-32">
                                                                                    {zentaoInfo.title}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center gap-1">
                                                                            {zentaoInfo.url && (
                                                                                <a
                                                                                    href={zentaoInfo.url}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                    className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
                                                                                    title="在禅道中查看"
                                                                                >
                                                                                    <ExternalLink size={14} />
                                                                                </a>
                                                                            )}
                                                                            {onZentaoRemove && (
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        onZentaoRemove(device.id);
                                                                                    }}
                                                                                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                                                                    title="删除关联"
                                                                                >
                                                                                    <X size={14} />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    onZentaoAdd && (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setZentaoModalDevice(device);
                                                                            }}
                                                                            className="flex items-center gap-1,5 w-full p-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-xs text-gray-500 hover:text-primary-600 hover:border-primary-400 transition-colors"
                                                                        >
                                                                            <Link2 size={14} />
                                                                            <span>关联禅道需求/Bug</span>
                                                                        </button>
                                                                    )
                                                                )}

                                                                {/* 负责人区域 */}
                                                                {(deviceAssignees[device.id]?.length > 0 || onAssigneeAdd) && (
                                                                    <div className="flex items-center justify-between mt-2 p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-xs text-gray-500">负责人:</span>
                                                                            {deviceAssignees[device.id]?.length > 0 ? (
                                                                                <div className="flex items-center gap-1 flex-wrap">
                                                                                    {deviceAssignees[device.id]?.slice(0, 3).map(assignee => (
                                                                                        <span
                                                                                            key={assignee.user_id}
                                                                                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
                                                                                            title={assignee.email || ''}
                                                                                        >
                                                                                            {assignee.display_name || assignee.username}
                                                                                        </span>
                                                                                    ))}
                                                                                    {(deviceAssignees[device.id]?.length || 0) > 3 && (
                                                                                        <span className="text-xs text-gray-500">
                                                                                            +{(deviceAssignees[device.id]?.length || 0) - 3}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            ) : (
                                                                                <span className="text-xs text-gray-400">未分配</span>
                                                                            )}
                                                                        </div>
                                                                        {onAssigneeAdd && (
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setAssigneeModalDevice(device);
                                                                                }}
                                                                                className="px-2 py-1 text-xs text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded transition-colors"
                                                                            >
                                                                                {deviceAssignees[device.id]?.length > 0 ? '编辑' : '分配'}
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* 图例 */}
                {selectedCount > 0 && !isEditing && (
                    <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl">
                        <div className="flex items-center gap-4 text-xs">
                            <span className="text-gray-500">图例:</span>
                            {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                                const Icon = config.icon;
                                return (
                                    <div key={key} className="flex items-center gap-1">
                                        <Icon size={12} className={config.color} />
                                        <span className={config.color}>{config.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* 禅道关联弹窗 */}
            {zentaoModalDevice && (
                <ZentaoLinkModal
                    deviceName={zentaoModalDevice.name}
                    onClose={() => setZentaoModalDevice(null)}
                    onSubmit={handleZentaoSubmit}
                    initialData={deviceZentaoInfo[zentaoModalDevice.id] ? {
                        type: deviceZentaoInfo[zentaoModalDevice.id].type || undefined,
                        id: deviceZentaoInfo[zentaoModalDevice.id].id || undefined,
                        title: deviceZentaoInfo[zentaoModalDevice.id].title || undefined,
                        url: deviceZentaoInfo[zentaoModalDevice.id].url || undefined,
                    } : undefined}
                />
            )}

            {/* 负责人分配弹窗 */}
            {assigneeModalDevice && onAssigneeAdd && onAssigneeRemove && (
                <AssigneeModal
                    deviceName={assigneeModalDevice.name}
                    currentAssignees={deviceAssignees[assigneeModalDevice.id] || []}
                    allUsers={allUsers}
                    onClose={() => setAssigneeModalDevice(null)}
                    onAdd={async (userId) => {
                        await onAssigneeAdd(assigneeModalDevice.id, userId);
                    }}
                    onRemove={async (userId) => {
                        await onAssigneeRemove(assigneeModalDevice.id, userId);
                    }}
                />
            )}
        </>
    );
}

