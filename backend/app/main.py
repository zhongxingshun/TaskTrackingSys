# -*- coding: utf-8 -*-
"""
TaskFlow 应用入口

FastAPI 应用实例配置与启动。
"""

import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_router
from app.models.base import init_db, AsyncSessionLocal
from app.core.init_data import init_data


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    应用生命周期管理
    
    启动时初始化数据库，关闭时清理资源。
    """
    # 启动时
    print("🚀 TaskFlow 正在启动...")
    await init_db()
    print("✅ 数据库初始化完成")
    
    # 初始化预设数据
    async with AsyncSessionLocal() as session:
        await init_data(session)
    
    # 启动数据库备份调度器
    from app.services.backup_service import get_backup_service
    backup_service = get_backup_service()
    backup_service.start_scheduler(hour=2, minute=0)  # 每天凌晨 02:00 备份
    
    yield
    
    # 关闭时
    backup_service.stop_scheduler()
    print("👋 TaskFlow 正在关闭...")


def create_app() -> FastAPI:
    """
    创建 FastAPI 应用实例
    
    Returns:
        FastAPI: 应用实例
    """
    app = FastAPI(
        title="TaskFlow API",
        description="""
## TaskFlow 任务跟踪系统 API

高精度的任务全生命周期管理系统，核心解决任务与硬件/设备机型之间的复杂映射关系。

### 核心功能

- 📋 **任务管理**: 创建、更新、状态流转、进度追踪
- 🔧 **设备关联**: 任务与设备机型的多对多关联
- 📊 **审计追踪**: 完整的状态变更历史记录
- 🏷️ **来源分类**: 支持多种任务来源标识

### 状态流转

```
Backlog → In_Progress → Testing → Closed → Archived
```

### 认证说明

当前为单用户模式，通过 `X-User-Id` 请求头标识操作人（默认 "system"）。
        """,
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan
    )
    
    # CORS 配置
    app.add_middleware(
        CORSMiddleware,
        allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # 注册路由
    app.include_router(api_router, prefix="/api/v1")
    
    # 健康检查端点
    @app.get("/health", tags=["Health"])
    async def health_check():
        """健康检查"""
        return {"status": "healthy", "service": "TaskFlow"}
    
    @app.get("/", tags=["Root"])
    async def root():
        """根路径"""
        return {
            "message": "Welcome to TaskFlow API",
            "docs": "/docs",
            "version": "0.1.0"
        }
    
    return app


# 应用实例
app = create_app()


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "backend.app.main:app",
        host=os.getenv("HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", "8000")),
        reload=os.getenv("APP_ENV", "development") == "development"
    )
