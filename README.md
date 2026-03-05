# TaskFlow - 任务追踪系统

高精度的任务全生命周期管理系统，核心解决**任务与硬件设备机型之间的复杂映射关系**。

## 功能特性

### 任务管理
- **看板视图** — 按状态分列的 Kanban 看板，直观掌握任务全局
- **生命周期管理** — 完整的状态流转：`Backlog → In Progress → Testing → Closed → Archived`
- **进度追踪** — 0-100% 进度管理，关闭时自动设为 100%
- **优先级** — 1-5 级优先级标识
- **来源分类** — 支持内部研发、竞品调研、客户反馈、市场分析等来源
- **Markdown 描述** — 任务描述支持 Markdown 格式和图片上传

### 设备关联
- **多对多映射** — 任务与设备机型的灵活关联
- **独立状态** — 每个设备在任务中有独立的完成状态（pending / in_progress / completed）
- **设备负责人** — 每个设备可独立分配负责人
- **禅道集成** — 支持关联禅道 Story/Bug，记录禅道 ID、标题、链接

### 审计与追踪
- **完整历史** — 所有状态变更、进度更新、设备操作均有记录
- **JSON 快照** — 每次变更保存任务完整快照，支持追溯
- **操作人追踪** — 每条历史记录关联操作人

### 用户与权限
- **JWT 认证** — 基于 JWT Token 的用户认证
- **角色权限** — RBAC 角色权限管理
- **管理后台** — 超级管理员可管理用户和设备

### 其他
- **筛选与搜索** — 按状态、来源、设备、关键字筛选任务
- **"我的跟踪"** — 快速筛选自己跟踪的任务
- **数据库备份** — 每天凌晨 2:00 自动备份

## 技术栈

| 层面 | 技术 |
|------|------|
| 后端 | Python 3.12 · FastAPI · SQLAlchemy 2.0 (async) · SQLite |
| 前端 | React 18 · TypeScript · Vite · Tailwind CSS |
| 部署 | Docker Compose · Nginx |

## 快速部署（Docker）

### 前置要求

- Docker 20+
- Docker Compose v2+

### 部署步骤

```bash
# 1. 克隆仓库
git clone https://github.com/zhongxingshun/TaskTrackingSys.git
cd TaskTrackingSys

# 2. 创建环境配置
cp .env.example .env
# 编辑 .env，修改 JWT_SECRET_KEY 和端口

# 3. 启动服务
docker compose up -d --build

# 4. 访问
# http://<服务器IP>:<APP_PORT>
```

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `APP_PORT` | 对外暴露端口 | `80` |
| `JWT_SECRET_KEY` | JWT 签名密钥（**必须修改**） | `please-change-this-secret-key` |

### 数据持久化

所有数据存储在 Docker Volume `taskflow_taskflow-data` 中：

```
/data/
├── taskflow.db     # SQLite 数据库
├── uploads/        # 上传的图片
└── backups/        # 自动备份
```

### 常用命令

```bash
# 查看状态
docker compose ps

# 查看日志
docker compose logs -f

# 重启服务
docker compose restart

# 停止服务
docker compose down

# 更新代码后重新部署
git pull && docker compose up -d --build
```

## 传统部署（无 Docker）

参考 `deploy/deploy.sh`，支持 systemd 服务管理：

```bash
cd deploy
chmod +x deploy.sh
./deploy.sh install
```

## 项目结构

```
├── backend/
│   └── app/
│       ├── main.py              # 应用入口
│       ├── api/                 # 路由层（tasks, devices, auth, users, uploads, backup）
│       ├── models/              # ORM 模型
│       ├── schemas/             # Pydantic Schema
│       ├── services/            # 业务逻辑
│       └── core/                # 安全、初始化数据
├── frontend/
│   └── src/
│       ├── App.tsx              # 主页面（看板）
│       ├── components/          # UI 组件
│       ├── api/                 # API 客户端
│       ├── types/               # TypeScript 类型
│       ├── pages/               # 登录页、管理后台
│       └── contexts/            # React Context
├── Dockerfile.backend
├── Dockerfile.frontend
├── docker-compose.yml
└── nginx.conf
```

## 默认账户

首次启动会自动创建超级管理员：

- **邮箱**: `admin@taskflow.com`
- **密码**: `admin123`

> 请登录后立即修改密码。
