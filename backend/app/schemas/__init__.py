# -*- coding: utf-8 -*-
"""
Pydantic Schemas 模块

提供 API 请求/响应的数据验证与序列化。
"""

from app.schemas.task import (
    TaskCreate,
    TaskUpdate,
    TaskResponse,
    TaskListResponse,
    TaskStatusUpdate,
    TaskProgressUpdate,
)
from app.schemas.device import (
    DeviceCreate,
    DeviceUpdate,
    DeviceResponse,
    DeviceListResponse,
)
from app.schemas.task_history import (
    TaskHistoryResponse,
    TaskHistoryListResponse,
)

__all__ = [
    # Task
    "TaskCreate",
    "TaskUpdate",
    "TaskResponse",
    "TaskListResponse",
    "TaskStatusUpdate",
    "TaskProgressUpdate",
    # Device
    "DeviceCreate",
    "DeviceUpdate",
    "DeviceResponse",
    "DeviceListResponse",
    # History
    "TaskHistoryResponse",
    "TaskHistoryListResponse",
]
