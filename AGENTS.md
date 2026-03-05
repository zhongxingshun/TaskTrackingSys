# AGENTS.md - AI 编程助手项目治理规范 (通用工程版)
> **版本**：2026.01.15
> **目标**：定义 AI Agent 在 macOS 环境下的开发准则、安全基线与交付流程，确保代码具备工业级鲁棒性。
---
## 👤 开发者上下文
* **环境**：macOS (Apple Silicon) / zsh / pnpm 或 venv
* **核心思维**：
  * **闭环思维**：所有任务必须有始有终，状态流转必须触发时间戳记录。
  * **防御性编程**：假设外部输入不可信，假设 AI 辅助的逆向分析是常态。
  * **架构解耦**：业务逻辑与 UI 实现分离。
  * **任务原子性与审计轨迹**：每个任务状态变更（创建 → 进行中 → 已完成 → 已归档）必须自动记录操作人（即使单用户也记录为 "system" 或用户 ID）、时间戳与变更前后的快照，确保完整审计链。
---
## 🔒 安全规范（硬性基线）
### 1. 代码安全检查清单 (Security Audit)
在输出任何代码前，AI 必须进行自检：
| 风险类型       | 检查项                                      | 处理方式                                      |
| -------------- | ------------------------------------------- | --------------------------------------------- |
| **代码执行 (RCE)** | 禁止使用 `eval()`, `exec()`, 或不安全的序列化 (如 `pickle`) | 使用 JSON 或 Pydantic                         |
| **输入验证**   | 所有的 API 输入必须经过 Schema 校验         | 强制使用 Pydantic 或 TypeScript Interface     |
| **SSRF 防护**  | 涉及外部链接/附件抓取时，必须校验 URL        | 白名单域名限制，禁止访问内网 IP                |
| **注入防护**   | 数据库操作、命令执行                        | 必须使用参数化查询 (ORM) 或 Shell 转义        |
| **敏感信息**   | API Keys、数据库凭证                        | 严禁硬编码，统一从 `.env` 读取                 |
| **权限绕过**   | 多用户场景下任务的读写权限                  | 使用 FastAPI Depends + Pydantic 进行 RBAC 校验，单用户模式下可暂不实现但预留接口 |

### 2. 环境隔离
* **Python**：必须在 `.venv` 虚拟环境中操作，严禁 `sudo pip`。
* **Node.js/Frontend**：优先使用 `pnpm` 确保依赖版本锁定。
---
## 🛠️ 工程化准则 (Engineering Standards)
### 1. 技术栈偏好
* **后端**：Python (FastAPI) + SQLAlchemy 2.0 (类型提示友好)。
* **前端**：TailwindCSS + 响应式布局（适配 macOS 大屏）。
* **数据库**：本地开发优先使用 SQLite (WAL 模式)，预留迁移至 PostgreSQL 的能力。
* **数据库模型核心字段建议**：
  - Task：id, title, description, status (enum: todo/in_progress/done/archived), priority, created_at, updated_at, completed_at, assignee_id (可选多用户)
  - TaskHistory：task_id, changed_by, old_status, new_status, timestamp, comment (用于审计)

### 2. 代码风格
* **类型声明**：所有函数必须包含类型提示 (Type Hints)。
* **异步优先**：I/O 密集型操作（数据库、API）必须使用 `async/await`。
* **注释规范**：复杂逻辑必须配有 Mermaid 流程图或 JSDoc/Docstring。

### 3. 测试规范
* 后端：必须使用 pytest + pytest-asyncio，覆盖率目标 >85%。
* 前端：优先 Vitest 或 Playwright 做 E2E 测试（任务创建 → 状态流转 → 时间戳显示）。
* 本地测试命令示例：`pytest backend/tests/` 和手动启动 FastAPI + 前端访问 localhost。

### 4. 数据保护规则（硬性要求）
⚠️ **生产数据保护是最高优先级！**

| 场景 | 必须执行的操作 |
|------|---------------|
| **涉及数据清理/重置** | 必须先将数据库备份到 `backups/` 目录 |
| **运行可能破坏数据的测试** | 先导出受影响的数据表 |
| **数据库结构变更 (Migration)** | 备份完整数据库 + 导出关键表数据为 JSON |
| **执行 DELETE/TRUNCATE** | 严禁直接执行，必须先确认备份存在 |

**备份命令示例**：
```bash
# 备份数据库
cp backend/taskflow.db backups/taskflow_$(date +%Y%m%d_%H%M%S).db

# 导出特定表数据为 JSON（使用 sqlite3）
sqlite3 backend/taskflow.db ".mode json" ".output backups/tasks_backup.json" "SELECT * FROM tasks;"
```

**恢复命令示例**：
```bash
# 从备份恢复
cp backups/taskflow_YYYYMMDD_HHMMSS.db backend/taskflow.db
```

**备份目录结构**：
```
backups/
├── taskflow_20260121_105930.db  # 完整数据库备份
├── tasks_backup.json            # 任务表导出
└── devices_backup.json          # 设备表导出
```
---
## 🔄 交付与 Git 工作流（硬性要求）
本项目遵循 **“本地开发 -> 验收 -> 同步”** 的三段式流程：
### 详细步骤：
1. **本地开发**：在 `/Users/` 对应的工作目录下进行。
2. **本地测试**：运行服务并验证核心逻辑（如任务状态变更是否记录了时间戳）。
3. **用户验收**：**⚠️ 必须等待用户在 Chat 中确认“测试通过”**。
4. **代码提交**：
* 格式：`<type>: <description>` (例: `feat: 实现设备机型多对多关联`)。
* 排除：`.env`, `*.db`, `node_modules`, `venv`。
5. **部署/同步**：若涉及服务器，使用 `git fetch + git reset --hard` 确保环境一致性。
---
## 📁 任务跟踪系统专项结构 (Project Layout)
```text
ProjectRoot/
├── AGENTS.md # 本文件
├── PROJECT_SPEC.md # 具体项目需求文档
├── .env.example # 环境变量模板
├── backend/
│   ├── app/
│   │   ├── models/ # 包含设备关联逻辑
│   │   ├── services/ # 核心业务（如进度自动计算）
│   │   └── security/ # 安全校验逻辑
│   └── requirements.txt
└── frontend/ # 前端展示层
```
---
## 🤝 协作协议 (Context Management)

### 1. HANDOFF.md 机制

当对话接近 Token 限制或需要切换 IDE (如从 Windsurf 切换到 Cursor) 时，必须更新 `HANDOFF.md`：

* **当前状态**：哪些任务已登记，哪些设备模型已关联。
* **待办项**：下一步需要实现的具体 UI 或 API。
* **阻碍点**：例如某个 API 被封锁或数据关联逻辑冲突。

### 2. 决策记录 (ADR)

任何重大的技术选型变更（如更改数据库架构）必须记录在 `docs/adr/` 下。

---

## ✅ AI Agent 最终自检清单 (Pre-flight Check)

* [ ] 代码是否满足 **ODCE/SQLi** 安全基线？
* [ ] 是否所有新函数都添加了 **Type Hints**？
* [ ] 敏感信息是否已外置于 `.env`？
* [ ] 是否已准备好在用户确认后执行 **Git 提交**？
* [ ] 是否已为核心 API（如 /tasks/{id}/status）编写了单元测试骨架？

---