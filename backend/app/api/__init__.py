# -*- coding: utf-8 -*-
"""
API 路由模块

汇总所有 API 端点路由。
"""

from fastapi import APIRouter

from app.api.tasks import router as tasks_router
from app.api.devices import router as devices_router
from app.api.uploads import router as uploads_router
from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.backup import router as backup_router

# 主路由器
api_router = APIRouter()

# 注册子路由
api_router.include_router(auth_router, prefix="/auth", tags=["Auth"])
api_router.include_router(users_router, prefix="/users", tags=["Users"])
api_router.include_router(tasks_router, prefix="/tasks", tags=["Tasks"])
api_router.include_router(devices_router, prefix="/devices", tags=["Devices"])
api_router.include_router(uploads_router, prefix="/uploads", tags=["Uploads"])
api_router.include_router(backup_router, tags=["Backup"])

__all__ = ["api_router"]
