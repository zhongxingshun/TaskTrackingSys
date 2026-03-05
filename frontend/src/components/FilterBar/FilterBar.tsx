/**
 * 筛选器组件 - 清新自然风格
 */

import { TaskStatus, TaskSource } from '@/types';
import { Search, X, SlidersHorizontal, ChevronDown, Eye } from 'lucide-react';

interface FilterBarProps {
  status?: TaskStatus;
  source?: TaskSource;
  deviceId?: string;
  search?: string;
  myTracking?: boolean;
  onStatusChange: (status?: TaskStatus) => void;
  onSourceChange: (source?: TaskSource) => void;
  onDeviceChange: (deviceId?: string) => void;
  onSearchChange: (search?: string) => void;
  onMyTrackingChange?: (enabled: boolean) => void;
  devices?: { id: string; name: string; category: string }[];
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: TaskStatus.BACKLOG, label: '📋 待处理' },
  { value: TaskStatus.IN_PROGRESS, label: '🚀 进行中' },
  { value: TaskStatus.TESTING, label: '🧪 测试中' },
  { value: TaskStatus.CLOSED, label: '✅ 已完结' },
  { value: TaskStatus.ARCHIVED, label: '📦 已归档' },
];

const SOURCE_OPTIONS: { value: TaskSource; label: string }[] = [
  { value: TaskSource.INTERNAL_RD, label: '内部研发' },
  { value: TaskSource.COMPETITOR_RESEARCH, label: '竞品调研' },
  { value: TaskSource.CUSTOMER_FEEDBACK, label: '客户反馈' },
  { value: TaskSource.MARKET_ANALYSIS, label: '市场分析' },
  { value: TaskSource.OTHER, label: '其他' },
];

export function FilterBar({
  status,
  source,
  deviceId,
  search,
  myTracking,
  onStatusChange,
  onSourceChange,
  onDeviceChange,
  onSearchChange,
  onMyTrackingChange,
  devices = [],
}: FilterBarProps) {
  const hasActiveFilters = status || source || deviceId || search || myTracking;
  const activeFilterCount = [status, source, deviceId, search, myTracking].filter(Boolean).length;

  const clearAllFilters = () => {
    onStatusChange(undefined);
    onSourceChange(undefined);
    onDeviceChange(undefined);
    onSearchChange(undefined);
    onMyTrackingChange?.(false);
  };

  return (
    <div className="filter-section animate-fade-in">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-100">
            <SlidersHorizontal size={18} className="text-primary-600" />
          </div>
          <div>
            <h2 className="text-base font-display font-semibold text-text-primary">筛选任务</h2>
            {activeFilterCount > 0 && (
              <p className="text-xs text-primary-600 font-medium mt-0.5">
                {activeFilterCount} 个筛选条件已激活
              </p>
            )}
          </div>
        </div>

        {/* 我的跟踪按钮 */}
        <div className="flex items-center gap-3">
          {onMyTrackingChange && (
            <button
              onClick={() => onMyTrackingChange(!myTracking)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${myTracking
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25'
                  : 'bg-surface-secondary text-text-secondary hover:bg-primary-50 hover:text-primary-600'
                }`}
            >
              <Eye size={16} />
              <span>我的跟踪</span>
            </button>
          )}

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-text-muted hover:text-primary-600 hover:bg-primary-50 transition-colors"
            >
              <X size={16} />
              <span>清除全部</span>
            </button>
          )}
        </div>
      </div>

      {/* 搜索框 */}
      <div className="relative mb-6">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
        />
        <input
          type="text"
          value={search || ''}
          onChange={(e) => onSearchChange(e.target.value || undefined)}
          placeholder="搜索任务标题或ID..."
          className="input-field pl-12"
        />
        {search && (
          <button
            onClick={() => onSearchChange(undefined)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-text-muted hover:text-primary-600 hover:bg-primary-50 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* 筛选选项 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 状态筛选 */}
        <div>
          <label className="mb-2 block text-xs font-semibold text-text-muted uppercase tracking-wider">
            状态
          </label>
          <div className="relative">
            <select
              value={status || ''}
              onChange={(e) => onStatusChange(e.target.value ? (e.target.value as TaskStatus) : undefined)}
              className="filter-select w-full appearance-none pr-10"
            >
              <option value="">全部状态</option>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            />
          </div>
        </div>

        {/* 来源筛选 */}
        <div>
          <label className="mb-2 block text-xs font-semibold text-text-muted uppercase tracking-wider">
            来源
          </label>
          <div className="relative">
            <select
              value={source || ''}
              onChange={(e) => onSourceChange(e.target.value ? (e.target.value as TaskSource) : undefined)}
              className="filter-select w-full appearance-none pr-10"
            >
              <option value="">全部来源</option>
              {SOURCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            />
          </div>
        </div>

        {/* 设备筛选 */}
        <div>
          <label className="mb-2 block text-xs font-semibold text-text-muted uppercase tracking-wider">
            设备
          </label>
          <div className="relative">
            <select
              value={deviceId || ''}
              onChange={(e) => onDeviceChange(e.target.value || undefined)}
              className="filter-select w-full appearance-none pr-10"
            >
              <option value="">全部设备</option>
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name} ({device.category})
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

