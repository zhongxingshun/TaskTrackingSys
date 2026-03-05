# TaskFlow 部署指南

## 📋 系统要求

| 组件 | 最低版本 |
|------|----------|
| **操作系统** | Ubuntu 20.04+ / CentOS 8+ / Debian 11+ |
| **Python** | 3.11+ |
| **Node.js** | 18+ |
| **内存** | 1GB+ |
| **磁盘** | 5GB+ |

## 🚀 快速部署

### 1. 安装系统依赖

**Ubuntu/Debian:**
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Python
sudo apt install -y python3.11 python3.11-venv python3-pip

# 安装 Node.js (使用 NodeSource)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 可选: 安装 Nginx
sudo apt install -y nginx
```

**CentOS/RHEL:**
```bash
# 安装 Python
sudo dnf install -y python3.11 python3.11-pip

# 安装 Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo dnf install -y nodejs

# 可选: 安装 Nginx
sudo dnf install -y nginx
```

### 2. 上传项目代码

```bash
# 方式一: 使用 Git
git clone <your-repo-url> /opt/taskflow

# 方式二: 使用 SCP
scp -r ./TaskTrackingSys user@server:/opt/taskflow
```

### 3. 执行部署脚本

```bash
cd /opt/taskflow/deploy
chmod +x deploy.sh
sudo ./deploy.sh install
```

## 📖 脚本命令

| 命令 | 说明 |
|------|------|
| `./deploy.sh install` | 完整安装（首次部署） |
| `./deploy.sh start` | 启动服务 |
| `./deploy.sh stop` | 停止服务 |
| `./deploy.sh restart` | 重启服务 |
| `./deploy.sh status` | 查看服务状态 |
| `./deploy.sh update` | 更新代码并重启 |
| `./deploy.sh backup` | 备份数据库 |

## 🌐 访问地址

部署完成后，可通过以下地址访问：

- **前端界面**: `http://<服务器IP>:3003`
- **API 文档**: `http://<服务器IP>:8000/docs`
- **健康检查**: `http://<服务器IP>:8000/health`

如果配置了 Nginx，可直接访问 `http://<服务器IP>` (80端口)

## ⚙️ 配置说明

### 环境变量

部署后会自动生成 `/opt/taskflow/.env`，可根据需要修改：

```bash
# 应用环境
APP_ENV=production

# 后端配置
HOST=0.0.0.0
PORT=8000
DATABASE_URL=sqlite+aiosqlite:///./taskflow.db

# CORS 配置
CORS_ORIGINS=http://192.168.1.100:3003,http://localhost:3003
```

### 修改端口

编辑 `deploy.sh` 顶部的配置区域：

```bash
BACKEND_PORT=8000    # 后端端口
FRONTEND_PORT=3003   # 前端端口
```

修改后重新运行 `./deploy.sh install`

## 📁 目录结构

```
/opt/taskflow/
├── backend/           # 后端代码
│   ├── venv/          # Python 虚拟环境
│   ├── app/           # FastAPI 应用
│   └── taskflow.db    # SQLite 数据库
├── frontend/          # 前端代码
│   └── dist/          # 构建产物
├── uploads/           # 上传文件目录
├── backups/           # 数据库备份
├── deploy/            # 部署脚本
└── .env               # 环境配置

/var/log/taskflow/     # 日志目录
├── backend.log
├── backend-error.log
├── frontend.log
└── frontend-error.log
```

## 🔧 服务管理

```bash
# 查看后端日志
sudo journalctl -u taskflow-backend -f

# 查看前端日志
sudo journalctl -u taskflow-frontend -f

# 查看实时日志
tail -f /var/log/taskflow/backend.log
```

## 🛡️ 防火墙配置

```bash
# Ubuntu (ufw)
sudo ufw allow 80/tcp
sudo ufw allow 3003/tcp
sudo ufw allow 8000/tcp

# CentOS (firewalld)
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=3003/tcp
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --reload
```

## 🔄 数据库迁移到 PostgreSQL（可选）

如需迁移到 PostgreSQL：

1. 安装 PostgreSQL 并创建数据库
2. 修改 `.env` 中的 `DATABASE_URL`:
   ```
   DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/taskflow
   ```
3. 重启服务: `./deploy.sh restart`

## ❓ 常见问题

### Q: 服务启动失败
```bash
# 检查日志
sudo journalctl -u taskflow-backend -n 50
# 检查端口占用
sudo lsof -i :8000
```

### Q: 前端无法连接后端
- 检查 CORS 配置是否包含前端地址
- 检查防火墙是否开放端口
- 检查后端服务是否正常运行

### Q: 数据库权限问题
```bash
sudo chown -R taskflow:taskflow /opt/taskflow/backend/taskflow.db
```
