#!/bin/bash
# =============================================================================
# TaskFlow 任务跟踪系统 - Linux 服务器部署脚本
# =============================================================================
# 用法: ./deploy.sh [install|start|stop|restart|status|update]
# 
# 前置要求:
#   - Python 3.11+
#   - Node.js 18+ & npm/pnpm
#   - Git
# =============================================================================

set -e

# ========================== 配置区域 ==========================
APP_NAME="taskflow"
APP_DIR="/opt/taskflow"
BACKEND_PORT=8000
FRONTEND_PORT=3003
PYTHON_VERSION="python3"
NODE_VERSION="node"

# 用户配置（建议使用非 root 用户运行）
APP_USER="${APP_USER:-taskflow}"

# 日志目录
LOG_DIR="/var/log/taskflow"

# 数据库备份目录
BACKUP_DIR="${APP_DIR}/backups"

# ========================== 颜色输出 ==========================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ========================== 检查依赖 ==========================
check_dependencies() {
    log_info "检查系统依赖..."
    
    # 检查 Python
    if ! command -v ${PYTHON_VERSION} &> /dev/null; then
        log_error "Python3 未安装，请先安装 Python 3.11+"
        exit 1
    fi
    
    PYTHON_VER=$(${PYTHON_VERSION} -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
    log_info "Python 版本: ${PYTHON_VER}"
    
    # 检查 Node.js
    if ! command -v ${NODE_VERSION} &> /dev/null; then
        log_error "Node.js 未安装，请先安装 Node.js 18+"
        exit 1
    fi
    
    NODE_VER=$(${NODE_VERSION} -v)
    log_info "Node.js 版本: ${NODE_VER}"
    
    # 检查 npm/pnpm
    if command -v pnpm &> /dev/null; then
        PKG_MANAGER="pnpm"
    elif command -v npm &> /dev/null; then
        PKG_MANAGER="npm"
    else
        log_error "npm 或 pnpm 未安装"
        exit 1
    fi
    log_info "包管理器: ${PKG_MANAGER}"
    
    log_success "依赖检查通过"
}

# ========================== 创建用户和目录 ==========================
setup_directories() {
    log_info "设置目录结构..."
    
    # 创建应用用户（如果不存在）
    if ! id "${APP_USER}" &>/dev/null; then
        log_info "创建应用用户: ${APP_USER}"
        sudo useradd -r -s /bin/false -m -d /home/${APP_USER} ${APP_USER} || true
    fi
    
    # 创建目录
    sudo mkdir -p ${APP_DIR}
    sudo mkdir -p ${LOG_DIR}
    sudo mkdir -p ${BACKUP_DIR}
    
    # 设置权限
    sudo chown -R ${APP_USER}:${APP_USER} ${APP_DIR}
    sudo chown -R ${APP_USER}:${APP_USER} ${LOG_DIR}
    
    log_success "目录设置完成"
}

# ========================== 安装后端 ==========================
install_backend() {
    log_info "安装后端服务..."
    
    cd ${APP_DIR}/backend
    
    # 创建虚拟环境
    ${PYTHON_VERSION} -m venv venv
    source venv/bin/activate
    
    # 升级 pip
    pip install --upgrade pip
    
    # 安装依赖
    pip install -r requirements.txt
    
    # 安装 gunicorn（生产环境 WSGI 服务器）
    pip install gunicorn uvloop httptools
    
    deactivate
    
    log_success "后端安装完成"
}

# ========================== 安装前端 ==========================
install_frontend() {
    log_info "安装前端服务..."
    
    cd ${APP_DIR}/frontend
    
    # 安装依赖
    ${PKG_MANAGER} install
    
    # 安装 serve（静态文件服务器）
    npm install -g serve
    
    # 构建生产版本
    ${PKG_MANAGER} run build
    
    log_success "前端构建完成"
}

# ========================== 创建环境配置 ==========================
create_env_file() {
    log_info "创建环境配置文件..."
    
    # 获取服务器 IP
    SERVER_IP=$(hostname -I | awk '{print $1}')
    
    cat > ${APP_DIR}/.env << EOF
# TaskFlow 环境配置
# 生成时间: $(date '+%Y-%m-%d %H:%M:%S')

# 应用环境
APP_ENV=production

# 后端配置
HOST=0.0.0.0
PORT=${BACKEND_PORT}
DATABASE_URL=sqlite+aiosqlite:///${APP_DIR}/backend/taskflow.db

# CORS 配置（允许局域网访问）
CORS_ORIGINS=http://${SERVER_IP}:${FRONTEND_PORT},http://localhost:${FRONTEND_PORT}

# 日志
SQL_ECHO=false
EOF

    sudo chown ${APP_USER}:${APP_USER} ${APP_DIR}/.env
    sudo chmod 600 ${APP_DIR}/.env
    
    log_success "环境配置创建完成: ${APP_DIR}/.env"
}

# ========================== 创建 Systemd 服务 ==========================
create_systemd_services() {
    log_info "创建 Systemd 服务..."
    
    # 后端服务
    sudo tee /etc/systemd/system/taskflow-backend.service > /dev/null << EOF
[Unit]
Description=TaskFlow Backend API
After=network.target

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}/backend
Environment="PATH=${APP_DIR}/backend/venv/bin"
EnvironmentFile=${APP_DIR}/.env
ExecStart=${APP_DIR}/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port ${BACKEND_PORT} --workers 2
Restart=always
RestartSec=5
StandardOutput=append:${LOG_DIR}/backend.log
StandardError=append:${LOG_DIR}/backend-error.log

[Install]
WantedBy=multi-user.target
EOF

    # 前端服务（使用 serve 作为静态文件服务器）
    sudo tee /etc/systemd/system/taskflow-frontend.service > /dev/null << EOF
[Unit]
Description=TaskFlow Frontend
After=network.target taskflow-backend.service

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}/frontend
ExecStart=/usr/local/bin/serve -s dist -l ${FRONTEND_PORT}
Restart=always
RestartSec=5
StandardOutput=append:${LOG_DIR}/frontend.log
StandardError=append:${LOG_DIR}/frontend-error.log

[Install]
WantedBy=multi-user.target
EOF

    # 重载 systemd
    sudo systemctl daemon-reload
    
    # 启用开机自启
    sudo systemctl enable taskflow-backend
    sudo systemctl enable taskflow-frontend
    
    log_success "Systemd 服务创建完成"
}

# ========================== 创建 Nginx 配置（可选） ==========================
create_nginx_config() {
    log_info "创建 Nginx 配置..."
    
    SERVER_IP=$(hostname -I | awk '{print $1}')
    
    sudo tee /etc/nginx/sites-available/taskflow > /dev/null << EOF
# TaskFlow Nginx 配置
server {
    listen 80;
    server_name ${SERVER_IP} localhost;

    # 前端静态文件
    location / {
        root ${APP_DIR}/frontend/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    # API 代理
    location /api {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_cache_bypass \$http_upgrade;
    }

    # 上传文件目录
    location /uploads {
        alias ${APP_DIR}/uploads;
    }

    # 健康检查
    location /health {
        proxy_pass http://127.0.0.1:${BACKEND_PORT}/health;
    }
}
EOF

    # 启用站点
    if [ -d /etc/nginx/sites-enabled ]; then
        sudo ln -sf /etc/nginx/sites-available/taskflow /etc/nginx/sites-enabled/
        sudo rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
    fi
    
    # 测试配置
    if command -v nginx &> /dev/null; then
        sudo nginx -t && sudo systemctl reload nginx
        log_success "Nginx 配置完成"
    else
        log_warn "Nginx 未安装，跳过配置。如需使用 Nginx，请手动安装并启用配置"
    fi
}

# ========================== 启动服务 ==========================
start_services() {
    log_info "启动服务..."
    
    sudo systemctl start taskflow-backend
    sleep 2
    sudo systemctl start taskflow-frontend
    
    log_success "服务已启动"
}

# ========================== 停止服务 ==========================
stop_services() {
    log_info "停止服务..."
    
    sudo systemctl stop taskflow-frontend 2>/dev/null || true
    sudo systemctl stop taskflow-backend 2>/dev/null || true
    
    log_success "服务已停止"
}

# ========================== 查看状态 ==========================
show_status() {
    echo ""
    log_info "========== TaskFlow 服务状态 =========="
    echo ""
    
    echo "后端服务:"
    sudo systemctl status taskflow-backend --no-pager -l || true
    echo ""
    
    echo "前端服务:"
    sudo systemctl status taskflow-frontend --no-pager -l || true
    echo ""
    
    SERVER_IP=$(hostname -I | awk '{print $1}')
    log_info "========== 访问地址 =========="
    echo "  前端: http://${SERVER_IP}:${FRONTEND_PORT}"
    echo "  API:  http://${SERVER_IP}:${BACKEND_PORT}"
    echo "  文档: http://${SERVER_IP}:${BACKEND_PORT}/docs"
    echo ""
}

# ========================== 备份数据库 ==========================
backup_database() {
    log_info "备份数据库..."
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="${BACKUP_DIR}/taskflow_${TIMESTAMP}.db"
    
    if [ -f "${APP_DIR}/backend/taskflow.db" ]; then
        cp "${APP_DIR}/backend/taskflow.db" "${BACKUP_FILE}"
        log_success "数据库已备份到: ${BACKUP_FILE}"
    else
        log_warn "数据库文件不存在，跳过备份"
    fi
}

# ========================== 更新代码 ==========================
update_code() {
    log_info "更新代码..."
    
    cd ${APP_DIR}
    
    # 备份数据库
    backup_database
    
    # 拉取最新代码
    git fetch origin
    git reset --hard origin/main
    
    # 重新安装依赖
    install_backend
    install_frontend
    
    # 重启服务
    stop_services
    start_services
    
    log_success "代码更新完成"
}

# ========================== 完整安装 ==========================
full_install() {
    log_info "========== 开始完整安装 =========="
    
    check_dependencies
    setup_directories
    
    # 复制代码到目标目录（如果当前不在目标目录）
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROJECT_DIR="$(dirname "${SCRIPT_DIR}")"
    
    if [ "${PROJECT_DIR}" != "${APP_DIR}" ]; then
        log_info "复制项目文件到 ${APP_DIR}..."
        sudo cp -r ${PROJECT_DIR}/* ${APP_DIR}/
        sudo chown -R ${APP_USER}:${APP_USER} ${APP_DIR}
    fi
    
    # 创建 uploads 目录
    mkdir -p ${APP_DIR}/uploads
    sudo chown -R ${APP_USER}:${APP_USER} ${APP_DIR}/uploads
    
    install_backend
    install_frontend
    create_env_file
    create_systemd_services
    
    # 询问是否配置 Nginx
    read -p "是否配置 Nginx 反向代理? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        create_nginx_config
    fi
    
    start_services
    
    echo ""
    log_success "========== 安装完成 =========="
    show_status
}

# ========================== 主入口 ==========================
case "${1:-install}" in
    install)
        full_install
        ;;
    start)
        start_services
        show_status
        ;;
    stop)
        stop_services
        ;;
    restart)
        stop_services
        start_services
        show_status
        ;;
    status)
        show_status
        ;;
    update)
        update_code
        show_status
        ;;
    backup)
        backup_database
        ;;
    *)
        echo "用法: $0 {install|start|stop|restart|status|update|backup}"
        exit 1
        ;;
esac
