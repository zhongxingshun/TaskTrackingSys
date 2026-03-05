/**
 * 设备管理页面
 * 管理设备分类和设备型号
 */

import { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    Cpu,
    FolderTree,
    X,
    Save,
    AlertCircle
} from 'lucide-react';
import { Device, DeviceCreate, DeviceUpdate } from '@/types';
import { devicesApi } from '@/api';

// 设备分类
const DEFAULT_CATEGORIES = [
    '智能锁',
    '嵌入式室内机',
    '安卓室内机',
    '对讲云',
    '家居云',
    '内部 IT 系统',
    '嵌入式门口机',
    '安卓门口机',
    '门禁',
    '梯控',
    '家居 APP',
    '对讲 APP',
];

export function DevicesPage() {
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // 对话框状态
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingDevice, setEditingDevice] = useState<Device | null>(null);
    const [formData, setFormData] = useState<DeviceCreate>({
        name: '',
        category: '',
        description: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 删除确认状态
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    // 加载设备列表
    const loadDevices = async () => {
        try {
            setLoading(true);
            const data = await devicesApi.getAllDevices();
            setDevices(data);
        } catch (error) {
            console.error('加载设备失败:', error);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        loadDevices();
    }, []);

    // 获取所有分类（包括设备中的分类）
    const allCategories = [...new Set([
        ...DEFAULT_CATEGORIES,
        ...devices.map(d => d.category)
    ])].sort();

    // 筛选设备
    const filteredDevices = devices.filter(device => {
        const matchesSearch = !searchQuery ||
            device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            device.category.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = !selectedCategory || device.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    // 按分类分组
    const devicesByCategory = filteredDevices.reduce((acc, device) => {
        if (!acc[device.category]) {
            acc[device.category] = [];
        }
        acc[device.category].push(device);
        return acc;
    }, {} as Record<string, Device[]>);

    // 打开创建/编辑对话框
    const openDialog = (device?: Device) => {
        if (device) {
            setEditingDevice(device);
            setFormData({
                name: device.name,
                category: device.category,
                description: device.description || '',
            });
        } else {
            setEditingDevice(null);
            setFormData({
                name: '',
                category: selectedCategory || '',
                description: '',
            });
        }
        setIsDialogOpen(true);
    };

    // 关闭对话框
    const closeDialog = () => {
        setIsDialogOpen(false);
        setEditingDevice(null);
        setFormData({ name: '', category: '', description: '' });
    };

    // 保存设备
    const handleSave = async () => {
        if (!formData.name.trim() || !formData.category.trim()) {
            alert('请填写设备名称和分类');
            return;
        }

        setIsSubmitting(true);
        try {
            if (editingDevice) {
                await devicesApi.updateDevice(editingDevice.id, formData as DeviceUpdate);
            } else {
                await devicesApi.createDevice(formData as DeviceCreate);
            }
            await loadDevices();
            closeDialog();
        } catch (error) {
            console.error('保存设备失败:', error);
            alert('保存失败: ' + (error as Error).message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // 删除设备
    const handleDelete = async (id: string) => {
        try {
            await devicesApi.deleteDevice(id);
            await loadDevices();
            setDeleteConfirm(null);
        } catch (error) {
            console.error('删除设备失败:', error);
            alert('删除失败: ' + (error as Error).message);
        }
    };

    return (
        <div className="p-8">
            {/* 页面标题 */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-display font-bold text-text-primary">
                        设备管理
                    </h1>
                    <p className="text-text-secondary mt-1">
                        管理设备分类和设备型号，共 {devices.length} 个设备
                    </p>
                </div>
                <button
                    onClick={() => openDialog()}
                    className="btn-glow flex items-center gap-2"
                >
                    <Plus size={18} />
                    添加设备
                </button>
            </div>

            {/* 搜索和筛选 */}
            <div className="flex gap-4 mb-6">
                {/* 搜索框 */}
                <div className="relative flex-1 max-w-md">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="搜索设备名称或分类..."
                        className="input-field pl-12"
                    />
                </div>

                {/* 分类筛选 */}
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={() => setSelectedCategory(null)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${!selectedCategory
                            ? 'bg-primary-100 text-primary-700'
                            : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                            }`}
                    >
                        全部
                    </button>
                    {allCategories.slice(0, 5).map(category => (
                        <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${selectedCategory === category
                                ? 'bg-primary-100 text-primary-700'
                                : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                                }`}
                        >
                            {category}
                        </button>
                    ))}
                </div>
            </div>

            {/* 设备列表 */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                        <span className="text-sm text-text-muted">加载中...</span>
                    </div>
                </div>
            ) : Object.keys(devicesByCategory).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-100">
                    <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mb-4">
                        <Cpu size={32} className="text-primary-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-text-primary mb-1">暂无设备</h3>
                    <p className="text-text-muted text-sm mb-4">
                        {searchQuery ? '没有找到匹配的设备' : '点击上方按钮添加第一个设备'}
                    </p>
                    {!searchQuery && (
                        <button
                            onClick={() => openDialog()}
                            className="btn-glow flex items-center gap-2 text-sm"
                        >
                            <Plus size={16} />
                            添加设备
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(devicesByCategory).map(([category, categoryDevices]) => (
                        <div key={category} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                            {/* 分类头部 */}
                            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-100">
                                <div className="flex items-center gap-3">
                                    <FolderTree size={18} className="text-primary-500" />
                                    <h3 className="font-semibold text-text-primary">{category}</h3>
                                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-200 text-text-muted">
                                        {categoryDevices.length} 个设备
                                    </span>
                                </div>
                                <button
                                    onClick={() => {
                                        setSelectedCategory(category);
                                        openDialog();
                                    }}
                                    className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                                >
                                    <Plus size={14} />
                                    添加
                                </button>
                            </div>

                            {/* 设备列表 */}
                            <div className="divide-y divide-gray-50">
                                {categoryDevices.map(device => (
                                    <div
                                        key={device.id}
                                        className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                                                <Cpu size={18} className="text-primary-500" />
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-text-primary">{device.name}</h4>
                                                {device.description && (
                                                    <p className="text-sm text-text-muted mt-0.5">{device.description}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-xs text-text-muted mr-4">
                                                关联 {device.task_count} 个任务
                                            </span>
                                            <button
                                                onClick={() => openDialog(device)}
                                                className="p-2 rounded-lg hover:bg-primary-50 text-text-muted hover:text-primary-600 transition-colors"
                                                title="编辑"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => setDeleteConfirm(device.id)}
                                                className="p-2 rounded-lg hover:bg-red-50 text-text-muted hover:text-red-600 transition-colors"
                                                title="删除"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 创建/编辑对话框 */}
            {isDialogOpen && (
                <div className="dialog-overlay" onClick={closeDialog}>
                    <div
                        className="dialog-panel max-w-md animate-slide-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="dialog-header">
                            <h2 className="text-lg font-display font-semibold text-text-primary">
                                {editingDevice ? '编辑设备' : '添加设备'}
                            </h2>
                            <button
                                onClick={closeDialog}
                                className="p-2 rounded-lg hover:bg-gray-100 text-text-muted transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="dialog-content space-y-5">
                            {/* 设备名称 */}
                            <div>
                                <label className="block text-sm font-semibold text-text-primary mb-2">
                                    设备型号 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="例如：S539"
                                    className="input-field"
                                />
                            </div>

                            {/* 设备分类 */}
                            <div>
                                <label className="block text-sm font-semibold text-text-primary mb-2">
                                    设备分类 <span className="text-red-500">*</span>
                                </label>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {DEFAULT_CATEGORIES.map(cat => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, category: cat })}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${formData.category === cat
                                                ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-200'
                                                : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                                                }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                                <input
                                    type="text"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    placeholder="或输入自定义分类"
                                    className="input-field"
                                />
                            </div>

                            {/* 描述 */}
                            <div>
                                <label className="block text-sm font-semibold text-text-primary mb-2">
                                    描述（可选）
                                </label>
                                <textarea
                                    value={formData.description || ''}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="输入设备描述..."
                                    rows={3}
                                    className="input-field resize-none"
                                />
                            </div>
                        </div>

                        <div className="dialog-footer">
                            <button
                                onClick={closeDialog}
                                className="px-5 py-2.5 rounded-xl text-sm font-medium text-text-secondary hover:bg-gray-100 transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSubmitting}
                                className="btn-glow flex items-center gap-2 text-sm disabled:opacity-50"
                            >
                                <Save size={16} />
                                {isSubmitting ? '保存中...' : '保存'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 删除确认对话框 */}
            {deleteConfirm && (
                <div className="dialog-overlay" onClick={() => setDeleteConfirm(null)}>
                    <div
                        className="dialog-panel max-w-sm animate-slide-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 text-center">
                            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                                <AlertCircle size={28} className="text-red-500" />
                            </div>
                            <h3 className="text-lg font-semibold text-text-primary mb-2">确认删除</h3>
                            <p className="text-text-muted text-sm mb-6">
                                确定要删除这个设备吗？此操作无法撤销。
                            </p>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="px-5 py-2.5 rounded-xl text-sm font-medium text-text-secondary bg-gray-100 hover:bg-gray-200 transition-colors"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={() => handleDelete(deleteConfirm)}
                                    className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
                                >
                                    确认删除
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
