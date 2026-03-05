#!/bin/bash
# =============================================================================
# TaskFlow 一键部署脚本
# =============================================================================
#
# 用法:
#   ./sync-deploy.sh          先 push 本地代码到 GitHub，再触发服务器拉取并重建
#   ./sync-deploy.sh --remote 只触发服务器拉取并重建（适合已经 push 过的情况）
#   ./sync-deploy.sh --local  只 push 本地代码到 GitHub
#
# =============================================================================

set -e

# ========================== 配置 ==========================
# 可通过环境变量覆盖，或在 .deploy.env 中配置
if [ -f "$(dirname "$0")/.deploy.env" ]; then
    source "$(dirname "$0")/.deploy.env"
fi

REMOTE_HOST="${DEPLOY_HOST:-192.168.24.10}"
REMOTE_USER="${DEPLOY_USER:-akuvox}"
REMOTE_PASS="${DEPLOY_PASS:?请设置 DEPLOY_PASS 环境变量或在 .deploy.env 中配置}"
REMOTE_DIR="${DEPLOY_DIR:-/home/${REMOTE_USER}/taskflow}"
LOCAL_PROXY="${DEPLOY_PROXY:-http://127.0.0.1:7897}"

# ========================== 颜色 ==========================
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $1"; }
ok()   { echo -e "${GREEN}[$(date +%H:%M:%S)] OK${NC} $1"; }
warn() { echo -e "${YELLOW}[$(date +%H:%M:%S)] !${NC} $1"; }
fail() { echo -e "${RED}[$(date +%H:%M:%S)] FAIL${NC} $1"; exit 1; }

SSH_CMD="sshpass -p '${REMOTE_PASS}' ssh -o StrictHostKeyChecking=no ${REMOTE_USER}@${REMOTE_HOST}"

# ========================== 本地 push ==========================
push_to_github() {
    log "推送本地代码到 GitHub..."

    # 检查是否有未提交的变更
    if [ -n "$(git status --porcelain)" ]; then
        warn "检测到未提交的变更:"
        git status --short
        echo ""
        read -p "是否自动提交？(y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            read -p "请输入 commit message: " msg
            git add -A
            git commit -m "${msg:-update}"
        else
            fail "请先手动提交变更后再部署"
        fi
    fi

    git -c http.proxy="${LOCAL_PROXY}" push origin main
    ok "代码已推送到 GitHub"
}

# ========================== 远程拉取并重建 ==========================
remote_deploy() {
    log "连接服务器 ${REMOTE_HOST}..."

    if ! command -v sshpass &> /dev/null; then
        fail "需要安装 sshpass: brew install hudochenkov/sshpass/sshpass"
    fi

    # 拉取最新代码
    log "拉取最新代码..."
    eval ${SSH_CMD} << 'REMOTE_SCRIPT'
cd /home/akuvox/taskflow
echo "当前版本: $(git log --oneline -1 2>/dev/null || echo 'N/A')"
git pull origin main
echo "更新到:   $(git log --oneline -1)"
REMOTE_SCRIPT

    ok "代码拉取完成"

    # 重建容器
    log "重新构建并启动容器..."
    eval ${SSH_CMD} << 'REMOTE_SCRIPT'
cd /home/akuvox/taskflow
docker compose up -d --build 2>&1 | tail -15
REMOTE_SCRIPT

    ok "容器重建完成"

    # 等待健康检查通过后显示状态
    log "等待服务启动..."
    eval ${SSH_CMD} << 'REMOTE_SCRIPT'
for i in 1 2 3 4 5 6; do
    status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3080/health 2>/dev/null)
    if [ "$status" = "200" ]; then
        break
    fi
    sleep 2
done

echo ""
docker ps --filter "name=taskflow" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
curl -s http://localhost:3080/health
echo ""
REMOTE_SCRIPT

    echo ""
    ok "部署完成! 访问 http://${REMOTE_HOST}:3080"
}

# ========================== 主入口 ==========================
case "${1:-}" in
    --remote)
        remote_deploy
        ;;
    --local)
        push_to_github
        ;;
    *)
        push_to_github
        echo ""
        remote_deploy
        ;;
esac
