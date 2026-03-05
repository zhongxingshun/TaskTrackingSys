# 任务跟踪人功能设计方案

## 需求概述

用户希望能够在创建任务时指定"跟踪人"，默认为任务创建者自己。并能在首页快速筛选出自己需要跟踪的任务。

---

## 数据影响分析 ⚠️

### 现有数据会丢失吗？

**不会丢失任何数据！** 这是一个 **新增字段** 的变更，不涉及删除任何现有数据。

| 影响项 | 风险等级 | 说明 |
|--------|----------|------|
| 现有任务数据 | ✅ 无风险 | 新增字段使用 `nullable=True`，现有任务自动为 NULL |
| 数据库结构变更 | ✅ 低风险 | 仅新增1个字段，使用 ALTER TABLE ADD COLUMN |
| API 兼容性 | ✅ 无影响 | 新字段为可选参数，不破坏现有 API |

### 安全措施

根据 AGENTS.md 规定，变更前会执行：
```bash
# 1. 备份数据库
cp backend/taskflow.db backups/taskflow_$(date +%Y%m%d_%H%M%S).db

# 2. 导出任务表数据
sqlite3 backend/taskflow.db ".mode json" ".output backups/tasks_backup.json" "SELECT * FROM tasks;"
```

---

## 技术方案

### 方案一：新增 `tracker_id` 字段（推荐 ✅）

新增一个独立的 `tracker_id` 字段，与现有的 `assignee_id`（负责人）区分开。

**优点**：
- 语义清晰：跟踪人 vs 负责人
- 向后兼容：不影响任何现有功能
- 灵活性高：可以独立筛选

**缺点**：
- 增加一个字段

### 方案二：复用 `assignee_id` 字段

将现有的 `assignee_id` 改名或复用为跟踪人。

**不推荐**：会影响已存在的负责人逻辑，可能导致语义混乱。

### 方案三：创建 `task_trackers` 关联表（多对多）

支持多个跟踪人。

**不推荐**：需求为单人跟踪，过度设计。

---

## 推荐方案详细设计（方案一）

### 1. 数据库变更

```sql
-- 新增 tracker_id 字段
ALTER TABLE tasks ADD COLUMN tracker_id VARCHAR(36) NULL;

-- 可选：为现有任务设置默认跟踪人（使用创建者，需要有 creator_id 字段）
-- 如果没有 creator_id，可以根据 history 表中 action='create' 的记录推断
```

**新增字段**：

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| tracker_id | VARCHAR(36) | NULL | 跟踪人用户 ID |

### 2. 后端模型变更

**`app/models/task.py`**：
```python
# 新增字段
tracker_id: Mapped[Optional[str]] = mapped_column(
    String(36),
    nullable=True,
    index=True,
    comment="跟踪人 ID"
)
```

### 3. Schema 变更

**`app/schemas/task.py`**：

```python
# TaskCreate - 新增可选参数
tracker_id: Optional[str] = Field(default=None, description="跟踪人 ID")

# TaskUpdate - 新增可选参数
tracker_id: Optional[str] = Field(default=None, description="跟踪人 ID")

# TaskResponse - 新增返回字段
tracker_id: Optional[str] = None

# TaskFilterParams - 新增筛选参数
tracker_id: Optional[str] = None
```

### 4. 服务层变更

**`app/services/task_service.py`**：

- `create_task()`: 如果未指定 `tracker_id`，默认设为 `created_by.id`
- `get_tasks()`: 支持按 `tracker_id` 筛选

```python
# 创建任务时
if not data.tracker_id:
    task.tracker_id = created_by.id
else:
    task.tracker_id = data.tracker_id
```

### 5. API 变更

**`app/api/tasks.py`**：

```python
# GET /api/v1/tasks 新增查询参数
tracker_id: Optional[str] = Query(default=None, description="按跟踪人筛选")
```

### 6. 前端变更

#### 6.1 创建任务对话框
- 新增"跟踪人"选择器（下拉选择用户）
- 默认选中当前登录用户

#### 6.2 任务列表页
- 新增"我的跟踪"快捷筛选按钮
- 筛选逻辑：`tracker_id = current_user.id`

#### 6.3 任务详情页
- 显示跟踪人信息
- 支持编辑跟踪人

---

## 界面原型

### 首页筛选区

```
┌─────────────────────────────────────────────────────────┐
│  🔍 筛选: [全部] [我的跟踪✓] [待处理] [进行中] [测试中] │
└─────────────────────────────────────────────────────────┘
```

### 创建任务对话框

```
┌─────────────────────────────────────────────────────────┐
│  创建任务                                           ✕  │
├─────────────────────────────────────────────────────────┤
│  任务标题 *                                             │
│  ┌─────────────────────────────────────────────────┐    │
│  │                                                 │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  来源          优先级         跟踪人 👤                 │
│  ┌────────┐    ┌────────┐    ┌────────────────────┐    │
│  │内部研发▼│    │  中   ▼│    │ 张三（我） ✓     ▼│    │
│  └────────┘    └────────┘    └────────────────────┘    │
│                                                         │
│  ...                                                    │
└─────────────────────────────────────────────────────────┘
```

---

## 实施步骤

按顺序执行：

### 阶段 1：数据库变更（5 分钟）
1. ✅ 备份数据库
2. ✅ 新增 `tracker_id` 字段

### 阶段 2：后端变更（15 分钟）
1. 修改 `app/models/task.py` - 新增字段
2. 修改 `app/schemas/task.py` - 新增 Schema
3. 修改 `app/services/task_service.py` - 业务逻辑
4. 修改 `app/api/tasks.py` - API 端点

### 阶段 3：前端变更（20 分钟）
1. 修改 `TaskDialog.tsx` - 添加跟踪人选择器
2. 修改 `App.tsx` - 添加"我的跟踪"筛选按钮
3. 修改 `types/index.ts` - 更新类型定义

### 阶段 4：测试验证（10 分钟）
1. 创建新任务，验证默认跟踪人
2. 修改跟踪人
3. 使用"我的跟踪"筛选
4. 确认老数据不受影响

---

## 现有数据迁移策略

对于已存在的任务（tracker_id 为 NULL），有两个选项：

### 选项 A：保持 NULL（推荐）
- 老任务的 tracker_id 保持为空
- 在 UI 上显示为"未指定"
- 这些任务不会出现在"我的跟踪"筛选结果中

### 选项 B：批量更新为创建者
- 通过历史记录中的 `action='create'` 找到创建者
- 批量更新 tracker_id
```sql
-- 如果需要，可以执行此迁移
UPDATE tasks 
SET tracker_id = (
    SELECT changed_by FROM task_history 
    WHERE task_history.task_id = tasks.id AND action = 'create'
    LIMIT 1
)
WHERE tracker_id IS NULL;
```

---

## 总结

| 维度 | 评估 |
|------|------|
| 数据安全 | ✅ 不会丢失任何数据 |
| 复杂度 | 中等（新增1个字段 + 筛选逻辑） |
| 预计工时 | 约 50 分钟 |
| 风险等级 | 低 |

---

**请确认此方案后，我将开始实施。**
