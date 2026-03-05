# TaskFlow 任务追踪系统 - 功能说明文档

## 目录

1. [系统概述](#系统概述)
2. [认证说明](#认证说明)
3. [用户角色与权限](#用户角色与权限)
4. [API 端点详情](#api-端点详情)
   - [认证模块](#1-认证模块-apiv1auth)
   - [任务模块](#2-任务模块-apiv1tasks)
   - [设备模块](#3-设备模块-apiv1devices)
   - [用户管理模块](#4-用户管理模块-apiv1users)
5. [数据模型](#数据模型)
6. [错误码说明](#错误码说明)

---

## 系统概述

**TaskFlow** 是一个任务追踪系统，用于管理产品开发任务、关联设备机型、追踪进度和状态变更。

**技术栈**:
- 后端: FastAPI + SQLAlchemy + SQLite
- 前端: React + TypeScript + Vite
- 认证: JWT Token (Bearer)

**基础 URL**: `http://localhost:8000/api/v1`

---

## 认证说明

### JWT Token 认证

所有需要认证的 API 请求需要在 Header 中携带 JWT Token：

```
Authorization: Bearer <access_token>
```

Token 有效期：**7 天**

### 默认管理员账号

- **邮箱**: admin@taskflow.com
- **密码**: admin123
- **角色**: 超级管理员 (superadmin)

---

## 用户角色与权限

### 预设角色

| 角色代码 | 角色名称 | 说明 |
|---------|---------|------|
| superadmin | 超级管理员 | 拥有所有权限，可管理角色权限 |
| admin | 管理员 | 可管理任务和设备 |
| user | 普通用户 | 可查看和编辑任务 |
| guest | 访客 | 只能查看 |

### 权限列表

| 权限代码 | 权限名称 | 所属分类 |
|---------|---------|---------|
| task:view | 查看任务 | 任务管理 |
| task:create | 创建任务 | 任务管理 |
| task:edit | 编辑任务 | 任务管理 |
| task:delete | 删除任务 | 任务管理 |
| task:archive | 归档任务 | 任务管理 |
| task:assign | 分配负责人 | 任务管理 |
| device:view | 查看设备 | 设备管理 |
| device:create | 创建设备 | 设备管理 |
| device:edit | 编辑设备 | 设备管理 |
| device:delete | 删除设备 | 设备管理 |
| user:view | 查看用户 | 用户管理 |
| user:create | 创建用户 | 用户管理 |
| user:edit | 编辑用户 | 用户管理 |
| user:delete | 删除用户 | 用户管理 |
| user:assign_role | 分配角色 | 用户管理 |

---

## API 端点详情

### 1. 认证模块 (`/api/v1/auth`)

#### 1.1 用户注册

```
POST /api/v1/auth/register
```

**请求体 (JSON)**:
```json
{
  "username": "string (必填, 3-50字符, 字母数字下划线横线点)",
  "email": "string (必填, 有效邮箱格式)",
  "password": "string (必填, 至少6字符)",
  "display_name": "string (可选)",
  "phone": "string (可选)",
  "department": "string (可选)"
}
```

**响应 (201)**:
```json
{
  "id": "uuid",
  "username": "string",
  "email": "string",
  "display_name": "string",
  "avatar_url": "string|null",
  "phone": "string|null",
  "department": "string|null",
  "is_active": true,
  "is_superuser": false,
  "roles": ["user"],
  "permissions": ["task:view", "..."],
  "created_at": "datetime",
  "last_login_at": "datetime|null"
}
```

**错误**:
- `400`: 邮箱或用户名已存在

---

#### 1.2 用户登录 (OAuth2 格式)

```
POST /api/v1/auth/login
Content-Type: application/x-www-form-urlencoded
```

**请求体**:
```
username=admin@taskflow.com&password=admin123
```

**响应 (200)**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**错误**:
- `401`: 邮箱或密码错误

---

#### 1.3 用户登录 (JSON 格式)

```
POST /api/v1/auth/login/json
```

**请求体 (JSON)**:
```json
{
  "email": "admin@taskflow.com",
  "password": "admin123"
}
```

**响应 (200)**: 同 1.2

---

#### 1.4 获取当前用户信息

```
GET /api/v1/auth/me
Authorization: Bearer <token>
```

**响应 (200)**:
```json
{
  "id": "uuid",
  "username": "admin",
  "email": "admin@taskflow.com",
  "display_name": "系统管理员",
  "avatar_url": null,
  "phone": null,
  "department": null,
  "is_active": true,
  "is_superuser": true,
  "roles": ["superadmin"],
  "permissions": ["*"],
  "created_at": "2026-01-20T12:00:00",
  "last_login_at": "2026-01-20T13:00:00"
}
```

**错误**:
- `401`: 未登录或登录已过期

---

#### 1.5 修改密码

```
POST /api/v1/auth/change-password
Authorization: Bearer <token>
```

**请求体 (JSON)**:
```json
{
  "old_password": "string (必填)",
  "new_password": "string (必填, 至少6字符)"
}
```

**响应 (200)**:
```json
{
  "message": "密码修改成功"
}
```

**错误**:
- `400`: 原密码错误
- `401`: 未登录

---

### 2. 任务模块 (`/api/v1/tasks`)

#### 2.1 创建任务

```
POST /api/v1/tasks
Authorization: Bearer <token>
```

**请求体 (JSON)**:
```json
{
  "title": "string (必填, 1-200字符)",
  "source": "Internal_RD|Competitor_Research|Customer_Feedback|Market_Analysis|Other",
  "description": "string (可选, Markdown格式)",
  "priority": 1-5 (默认3),
  "target_date": "YYYY-MM-DD (可选)",
  "device_ids": ["uuid", "uuid"] (可选)
}
```

**响应 (201)**:
```json
{
  "id": "uuid",
  "task_id": "TASK-2026-21243A",
  "title": "新任务",
  "source": "Internal_RD",
  "description": "任务描述",
  "status": "Backlog",
  "priority": 3,
  "progress": 0,
  "target_date": "2026-02-01",
  "actual_date": null,
  "devices": [
    {
      "id": "uuid",
      "name": "C313W",
      "category": "嵌入式室内机",
      "device_status": "pending",
      "zentao_type": null,
      "zentao_id": null,
      "zentao_title": null,
      "zentao_url": null
    }
  ],
  "assignee_id": null,
  "creator_id": "uuid",
  "history": [],
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

---

#### 2.2 获取任务列表

```
GET /api/v1/tasks
Authorization: Bearer <token>
```

**查询参数**:
| 参数 | 类型 | 说明 |
|-----|------|-----|
| status | string | 按状态筛选 (Backlog/In_Progress/Testing/Closed/Archived) |
| source | string | 按来源筛选 |
| device_id | string | 按设备筛选 |
| assignee_id | string | 按负责人筛选 |
| search | string | 搜索关键词 |
| page | int | 页码 (默认1) |
| page_size | int | 每页数量 (默认20, 最大100) |

**响应 (200)**:
```json
{
  "items": [/* 任务对象数组 */],
  "total": 100,
  "page": 1,
  "page_size": 20,
  "has_next": true
}
```

---

#### 2.3 获取任务详情

```
GET /api/v1/tasks/{task_id}
Authorization: Bearer <token>
```

**路径参数**:
- `task_id`: UUID 或业务ID (如 TASK-2026-21243A)

**响应 (200)**: 任务对象

**错误**:
- `404`: 任务不存在

---

#### 2.4 更新任务

```
PUT /api/v1/tasks/{task_id}
Authorization: Bearer <token>
```

**请求体 (JSON)**:
```json
{
  "title": "string (可选)",
  "source": "string (可选)",
  "description": "string (可选)",
  "priority": 1-5 (可选),
  "target_date": "YYYY-MM-DD (可选)",
  "actual_date": "YYYY-MM-DD (可选)",
  "device_ids": ["uuid"] (可选),
  "assignee_id": "uuid (可选)"
}
```

**响应 (200)**: 更新后的任务对象

---

#### 2.5 更新任务状态

```
PATCH /api/v1/tasks/{task_id}/status
Authorization: Bearer <token>
```

**请求体 (JSON)**:
```json
{
  "status": "Backlog|In_Progress|Testing|Closed|Archived (必填)",
  "actual_date": "YYYY-MM-DD (Closed时必填)",
  "comment": "string (可选)"
}
```

**响应 (200)**: 更新后的任务对象

---

#### 2.6 更新任务进度

```
PATCH /api/v1/tasks/{task_id}/progress
Authorization: Bearer <token>
```

**请求体 (JSON)**:
```json
{
  "progress": 0-100 (必填),
  "comment": "string (可选)"
}
```

**响应 (200)**: 更新后的任务对象

---

#### 2.7 归档任务

```
POST /api/v1/tasks/{task_id}/archive
Authorization: Bearer <token>
```

**响应 (200)**: 归档后的任务对象

---

#### 2.8 删除任务

```
DELETE /api/v1/tasks/{task_id}
Authorization: Bearer <token>
```

**权限**: task:delete

**响应 (200)**:
```json
{
  "message": "任务 'TASK-2026-21243A' 已删除"
}
```

---

#### 2.9 更新设备状态

```
PATCH /api/v1/tasks/{task_id}/devices/{device_id}/status
Authorization: Bearer <token>
```

**查询参数**:
- `new_status`: pending | in_progress | completed

**响应 (200)**: 更新后的任务对象

---

#### 2.10 批量更新设备状态

```
PATCH /api/v1/tasks/{task_id}/devices/batch-status
Authorization: Bearer <token>
```

**查询参数**:
- `device_ids`: 设备ID列表
- `new_status`: pending | in_progress | completed

**响应 (200)**: 更新后的任务对象

---

#### 2.11 添加禅道关联

```
POST /api/v1/tasks/{task_id}/devices/{device_id}/zentao
Authorization: Bearer <token>
```

**查询参数**:
| 参数 | 类型 | 说明 |
|-----|------|-----|
| zentao_type | string | story 或 bug (必填) |
| zentao_id | string | 禅道ID (必填) |
| zentao_title | string | 标题 (可选) |
| zentao_url | string | 链接 (可选) |

**响应 (200)**: 更新后的任务对象

---

#### 2.12 删除禅道关联

```
DELETE /api/v1/tasks/{task_id}/devices/{device_id}/zentao
Authorization: Bearer <token>
```

**响应 (200)**: 更新后的任务对象

---

#### 2.13 获取设备负责人列表

```
GET /api/v1/tasks/{task_id}/devices/{device_id}/assignees
Authorization: Bearer <token>
```

**响应 (200)**:
```json
[
  {
    "user_id": "uuid",
    "username": "jeffrey",
    "display_name": "Jeffrey",
    "email": "jeffrey@example.com"
  }
]
```

---

#### 2.14 添加设备负责人

```
POST /api/v1/tasks/{task_id}/devices/{device_id}/assignees
Authorization: Bearer <token>
```

**查询参数**:
- `user_id`: 用户ID (必填)

**权限**: task:assign

**响应 (200)**: 更新后的任务对象

---

#### 2.15 删除设备负责人

```
DELETE /api/v1/tasks/{task_id}/devices/{device_id}/assignees/{user_id}
Authorization: Bearer <token>
```

**响应 (200)**: 更新后的任务对象

---

### 3. 设备模块 (`/api/v1/devices`)

#### 3.1 创建设备

```
POST /api/v1/devices
Authorization: Bearer <token>
```

**请求体 (JSON)**:
```json
{
  "name": "string (必填, 唯一)",
  "category": "string (必填)",
  "description": "string (可选)"
}
```

**响应 (201)**:
```json
{
  "id": "uuid",
  "name": "C313W",
  "category": "嵌入式室内机",
  "description": "...",
  "task_count": 0,
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

**错误**:
- `400`: 设备名称已存在

---

#### 3.2 获取设备列表

```
GET /api/v1/devices
Authorization: Bearer <token>
```

**查询参数**:
| 参数 | 类型 | 说明 |
|-----|------|-----|
| category | string | 按类别筛选 |
| search | string | 搜索关键词 |
| page | int | 页码 (默认1) |
| page_size | int | 每页数量 (默认20) |

**响应 (200)**:
```json
{
  "items": [/* 设备对象数组 */],
  "total": 50,
  "page": 1,
  "page_size": 20,
  "has_next": true
}
```

---

#### 3.3 获取所有设备

```
GET /api/v1/devices/all
Authorization: Bearer <token>
```

**响应 (200)**: 设备对象数组 (不分页)

---

#### 3.4 获取设备类别列表

```
GET /api/v1/devices/categories
Authorization: Bearer <token>
```

**响应 (200)**:
```json
["嵌入式室内机", "彩色门口机", "室外机", "..."]
```

---

#### 3.5 获取设备详情

```
GET /api/v1/devices/{device_id}
Authorization: Bearer <token>
```

**响应 (200)**: 设备对象

---

#### 3.6 更新设备

```
PUT /api/v1/devices/{device_id}
Authorization: Bearer <token>
```

**请求体 (JSON)**:
```json
{
  "name": "string (可选)",
  "category": "string (可选)",
  "description": "string (可选)"
}
```

**响应 (200)**: 更新后的设备对象

---

#### 3.7 删除设备

```
DELETE /api/v1/devices/{device_id}
Authorization: Bearer <token>
```

**响应 (200)**:
```json
{
  "message": "设备 'C313W' 已删除"
}
```

---

### 4. 用户管理模块 (`/api/v1/users`)

#### 4.1 获取用户列表

```
GET /api/v1/users
Authorization: Bearer <token>
```

**查询参数**:
| 参数 | 类型 | 说明 |
|-----|------|-----|
| page | int | 页码 (默认1) |
| page_size | int | 每页数量 (默认20) |
| search | string | 按用户名/邮箱/显示名搜索 |
| department | string | 按部门筛选 |
| is_active | bool | 按状态筛选 |

**响应 (200)**:
```json
{
  "items": [/* 用户对象数组 */],
  "total": 10,
  "page": 1,
  "page_size": 20,
  "has_next": false
}
```

---

#### 4.2 获取用户详情

```
GET /api/v1/users/{user_id}
Authorization: Bearer <token>
```

**响应 (200)**: 用户对象

---

#### 4.3 创建用户

```
POST /api/v1/users
Authorization: Bearer <token>
```

**权限**: user:create

**请求体 (JSON)**:
```json
{
  "username": "string (必填)",
  "email": "string (必填)",
  "password": "string (必填)",
  "display_name": "string (可选)",
  "phone": "string (可选)",
  "department": "string (可选)",
  "is_superuser": false,
  "role_ids": ["uuid"] (可选)
}
```

**响应 (201)**: 用户对象

---

#### 4.4 更新用户

```
PUT /api/v1/users/{user_id}
Authorization: Bearer <token>
```

**权限**: user:edit

**请求体 (JSON)**:
```json
{
  "display_name": "string (可选)",
  "phone": "string (可选)",
  "department": "string (可选)",
  "is_active": true/false (可选),
  "is_superuser": true/false (可选, 仅超管可设置)"
}
```

**响应 (200)**: 更新后的用户对象

---

#### 4.5 删除用户

```
DELETE /api/v1/users/{user_id}
Authorization: Bearer <token>
```

**权限**: user:delete

**限制**: 不能删除自己

**响应 (200)**:
```json
{
  "message": "用户已删除"
}
```

---

#### 4.6 分配用户角色

```
PUT /api/v1/users/{user_id}/roles
Authorization: Bearer <token>
```

**权限**: user:assign_role

**请求体 (JSON)**:
```json
["role_id_1", "role_id_2"]
```

**响应 (200)**: 更新后的用户对象

---

#### 4.7 获取角色列表

```
GET /api/v1/users/roles/list
Authorization: Bearer <token>
```

**响应 (200)**:
```json
{
  "items": [
    {
      "id": "uuid",
      "code": "admin",
      "name": "管理员",
      "description": "可以管理任务和设备",
      "is_system": true,
      "permissions": ["task:view", "task:create", "..."],
      "created_at": "datetime"
    }
  ],
  "total": 4
}
```

---

#### 4.8 创建角色

```
POST /api/v1/users/roles
Authorization: Bearer <token>
```

**限制**: 仅超级管理员

**请求体 (JSON)**:
```json
{
  "code": "string (必填, 唯一)",
  "name": "string (必填)",
  "description": "string (可选)",
  "permission_codes": ["task:view", "task:edit"]
}
```

**响应 (201)**: 角色对象

**错误**:
- `403`: 只有超级管理员可以创建角色

---

#### 4.9 更新角色

```
PUT /api/v1/users/roles/{role_id}
Authorization: Bearer <token>
```

**限制**: 仅超级管理员

**请求体 (JSON)**:
```json
{
  "name": "string (可选)",
  "description": "string (可选)",
  "permission_codes": ["task:view", "..."] (可选)"
}
```

**响应 (200)**: 更新后的角色对象

**错误**:
- `403`: 只有超级管理员可以修改角色权限
- `400`: 不能修改系统角色的代码

---

#### 4.10 删除角色

```
DELETE /api/v1/users/roles/{role_id}
Authorization: Bearer <token>
```

**限制**: 仅超级管理员

**响应 (200)**:
```json
{
  "message": "角色已删除"
}
```

**错误**:
- `403`: 只有超级管理员可以删除角色
- `400`: 不能删除系统角色

---

#### 4.11 获取权限列表

```
GET /api/v1/users/permissions/list
Authorization: Bearer <token>
```

**响应 (200)**:
```json
[
  {
    "id": "uuid",
    "code": "task:view",
    "name": "查看任务",
    "category": "任务管理",
    "description": "查看任务列表和详情"
  }
]
```

---

## 数据模型

### 任务状态 (TaskStatus)

| 值 | 显示名 |
|---|-------|
| Backlog | 待处理 |
| In_Progress | 进行中 |
| Testing | 测试中 |
| Closed | 已完结 |
| Archived | 已归档 |

### 任务来源 (TaskSource)

| 值 | 显示名 |
|---|-------|
| Internal_RD | 内部研发 |
| Competitor_Research | 竞品调研 |
| Customer_Feedback | 客户反馈 |
| Market_Analysis | 市场分析 |
| Other | 其他 |

### 设备任务状态 (DeviceTaskStatus)

| 值 | 显示名 |
|---|-------|
| pending | 待处理 |
| in_progress | 进行中 |
| completed | 已完成 |

### 禅道类型 (ZentaoType)

| 值 | 显示名 |
|---|-------|
| story | 需求 |
| bug | Bug |

---

## 错误码说明

| HTTP 状态码 | 说明 |
|------------|-----|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未登录或登录已过期 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

### 错误响应格式

```json
{
  "detail": "错误信息"
}
```

或（Pydantic 验证错误）：

```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "value is not a valid email address",
      "type": "value_error.email"
    }
  ]
}
```

---

## 测试注意事项

1. **认证测试**
   - 测试正确/错误的登录凭据
   - 测试 Token 过期情况
   - 测试无 Token 访问受保护资源

2. **权限测试**
   - 用不同角色用户测试各 API
   - 验证普通用户无法访问管理功能
   - 验证超管可以执行所有操作

3. **任务流程测试**
   - 完整的任务生命周期：创建 → 进行中 → 测试 → 完结 → 归档
   - 设备状态与任务进度的联动
   - 禅道关联和负责人分配

4. **边界条件测试**
   - 空值、空字符串处理
   - 最大/最小值边界
   - 重复创建检测

5. **并发测试**
   - 多用户同时操作同一任务
   - 乐观锁冲突处理

---

**文档版本**: 1.0  
**更新日期**: 2026-01-20  
**作者**: TaskFlow 开发团队
