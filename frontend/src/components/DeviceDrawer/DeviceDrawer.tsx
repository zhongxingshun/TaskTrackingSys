/**
 * 设备管理抽屉
 * 用于创建和编辑设备机型
 */

import { useState } from 'react';
import { Device, DeviceCreate, DeviceUpdate } from '@/types';
import { X, Save, Trash2, Plus } from 'lucide-react';
import { cn } from '@/utils/cn';

interface DeviceDrawerProps {
  device: Device | null;
  open: boolean;
  onClose: () => void;
  onSave: (data: DeviceCreate | DeviceUpdate) => Promise<void>;
  onDelete?: () => Promise<void>;
  mode?: 'view' | 'create' | 'edit';
}

const CATEGORIES = ['智能锁', '路由器', '摄像头', '传感器', '网关', '其他'];

export function DeviceDrawer({
  device,
  open,
  onClose,
  onSave,
  onDelete,
  mode = 'view',
}: DeviceDrawerProps) {
  const [isEditing, _setIsEditing] = useState(mode === 'create' || mode === 'edit');
  const [formData, setFormData] = useState<DeviceCreate | DeviceUpdate>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');

  const isEditMode = mode === 'edit' || mode === 'create';

  const handleSave = async () => {
    if (!formData.name || !formData.name.trim()) {
      alert('请输入设备名称');
      return;
    }
    if (!formData.category || !formData.category.trim()) {
      alert('请选择或输入设备类别');
      return;
    }

    setIsLoading(true);
    try {
      await onSave(formData);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCategory = () => {
    if (newCategory && newCategory.trim()) {
      const category = newCategory.trim();
      setFormData({ ...formData, category });
      setShowNewCategory(false);
      setNewCategory('');
    }
  };

  if (!open) return null;

  return (
    <>
      {/* 背景遮罩 */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/30 backdrop-blur-sm transition-opacity',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* 抽屉 */}
      <div
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-full max-w-md transform bg-white dark:bg-gray-800 shadow-2xl transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* 头部 */}
        <div className="sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {mode === 'create' ? '创建设备' : isEditing ? '编辑设备' : '设备详情'}
            </h2>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="overflow-y-auto h-[calc(100vh-4rem)] p-6 space-y-6">
          {/* 基本信息 */}
          <div className="space-y-4">
            {isEditMode ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    设备名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="例如：X100"
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    设备类别 <span className="text-red-500">*</span>
                  </label>
                  {showNewCategory ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="输入新类别名称"
                        className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <button
                        onClick={handleAddCategory}
                        className="rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
                      >
                        添加
                      </button>
                      <button
                        onClick={() => setShowNewCategory(false)}
                        className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <select
                        value={formData.category || ''}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">选择类别</option>
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => setShowNewCategory(true)}
                        className="rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                        title="添加新类别"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    描述
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    placeholder="输入设备描述（可选）"
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </>
            ) : device ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    设备名称
                  </label>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {device.name}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    设备类别
                  </label>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {device.category}
                  </p>
                </div>

                {device.description && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      描述
                    </label>
                    <p className="text-gray-700 dark:text-gray-300">{device.description}</p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    关联任务数量
                  </label>
                  <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                    {device.task_count}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {mode === 'view' && onDelete && (
                <button
                  onClick={onDelete}
                  disabled={isLoading}
                  className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 size={16} />
                  删除
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
              >
                取消
              </button>
              {isEditMode && (
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Save size={16} />
                  {isLoading ? '保存中...' : mode === 'create' ? '创建' : '保存'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
