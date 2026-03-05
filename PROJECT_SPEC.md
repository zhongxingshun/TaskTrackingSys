---

# PROJECT_SPEC: TaskFlow 任务跟踪系统需求文档

## 1. 项目愿景

构建一个高精度的任务全生命周期管理系统，核心解决任务与“硬件/设备机型”之间的复杂映射关系，确保每一个任务从发起、执行到闭环都有完整的追踪链路。

## 2. 核心功能模块 (Core Features)

### 2.1 任务管理 (Task Management)

* **任务登记**：包含标题、唯一 ID（自动生成，如 `TASK-2026-001`）。
* **归属来源**：明确任务的发起端（如：内部研发、竞品调研、客户反馈、市场分析）。
* **任务描述**：支持多行文本及 **Markdown** 格式。
* **附件参考**：支持本地路径引用或云端链接。

### 2.2 资产与进度关联 (Asset & Progress)

* **影响设备机型 (Critical)**：
* 支持关联多个设备型号（如：X100, X200-Pro）。
* 需具备“机型管理”功能，方便在任务中快速勾选。


* **进度追踪**：支持 0-100% 的进度条，并关联具体的“当前状态”（待处理、进行中、测试中、已完结）。

### 2.3 生命周期管理 (Timeline)

* **时间戳审计**：
* 创建日期 (自动)。
* 期望完结日期 (手动)。
* **实际完结日期 (必填)**：状态标记为“已完结”时必须录入，用于闭环评估。



## 3. 分层交互架构 (Layered UI/UX)

### L1：总看板层 (Executive Kanban Board)

* **核心视图**：采用 Kanban（看板）布局，按状态列展示任务。
* **可视化元素**：
* 任务卡片展示标题、来源标签。
* 进度条视觉化呈现。
* 关联机型数量标记。


* **过滤器**：支持按“来源”或“设备机型”进行快速筛选。

### L2：详情追踪层 (Deep Dive Detail View)

* **触发方式**：点击 Kanban 卡片弹出侧边抽屉 (Drawer) 或 Modal。
* **展示内容**：
* 全量 Markdown 任务描述。
* **历史记录时间轴 (Timeline)**：展示任务所有进度变更的历史轨迹（谁、什么时间、修改了什么）。
* 关联附件点击跳转。
* 受影响机型的详细列表。



## 4. 数据模型设计 (Data Model)

### Task 表 (核心)

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | UUID/String | 任务唯一标识 |
| `title` | String | 任务标题 |
| `source` | String | 归属来源 |
| `description` | Text | Markdown 内容 |
| `progress` | Integer | 0-100 |
| `status` | Enum | Backlog/In_Progress/Testing/Closed |
| `created_at` | DateTime | 创建时间 |
| `target_date` | DateTime | 计划完成时间 |
| `actual_date` | DateTime | 实际闭环时间 |

### DeviceModel 表

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | UUID | 型号 ID |
| `name` | String | 机型名称 (如 X100) |
| `category` | String | 类别 (如 智能锁/路由器) |

### TaskDeviceRelation (多对多)

* 连接 Task 与 DeviceModel。

## 5. 开发阶段划分 (Milestones)

* **Phase 1: 环境与模型搭建**
* 完成 FastAPI 后端基础。
* 实现基于 SQLite 的数据模型迁移。


* **Phase 2: 看板 (L1) 开发**
* 实现 Kanban 核心布局。
* 任务基础增删改查 API。


* **Phase 3: 详情页 (L2) 与关联逻辑**
* 实现详情抽屉。
* 实现任务与设备机型的关联管理。
* 接入时间轴记录 (Activity Log)。


* **Phase 4: 闭环逻辑与优化**
* 强制完结时间校验。



---

## 6. 技术实现与环境配置 (Technical Implementation)

### 6.1 技术栈 (Tech Stack)

*   **后端 (Backend)**: FastAPI (Python 3.14), SQLAlchemy, SQLite.
*   **前端 (Frontend)**: React, TypeScript, Vite, Tailwind CSS.
*   **交互与动效**: Lucide React (图标), Framer Motion (动画预留).
*   **设计系统**: "Fresh Natural" 清新自然风格，以翡翠绿 (#10b981) 为主色调。

### 6.2 运行配置 (Running Configuration)

*   **前端服务**: 运行在 `http://localhost:3003`。
*   **后端服务**: 运行在 `http://localhost:8000` (uvicorn)。
*   **API 代理**: 前端通过 Vite 代理 `/api` 到后台。

### 6.3 目录结构 (Project Structure)

*   `backend/`: FastAPI 应用代码。
*   `frontend/`: React 前端应用代码。
*   `uploads/`: 存放用户上传的图片附件。
*   `taskflow.db`: SQLite 数据库文件。

---

## 7. 增强功能说明 (Enhanced Features)

### 7.1 管理后台 (Admin Panel)

*   **入口**: 访问 `/admin` 进入管理后台。
*   **功能**:
    *   **设备管理**: 完整的设备 CRUD 功能。
    *   **分类管理**: 预选 12 类核心设备（智能锁、室内机、门口机、由于云平台、APP、梯控等）。
    *   **系统概览**: 统计设备与任务的分布情况。

### 7.2 高级编辑器

*   **Markdown 支持**: 任务描述及回复支持 Markdown 解析。
*   **图片粘贴上传**: 描述区域支持 `Ctrl+V` 直接粘贴图片、拖拽上传图片。图片存储在服务器 `uploads` 目录下。

---

## 8. 验收标准

1.  能在 Kanban 界面一眼看出哪些任务是属于“外部来源”的。
2.  点击任务能直接查看到受影响的机型列表。
3.  任务在标记为“已完成”后，系统必须能够查询到其实际闭环日期。
4.  **图片支持**: 粘贴图片能自动转为 Markdown 链接并在详情页渲染。
5.  **管理闭环**: 管理后台的操作能实时反映在任务关联的下拉列表中。

---