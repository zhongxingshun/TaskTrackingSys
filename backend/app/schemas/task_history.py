# -*- coding: utf-8 -*-
"""
任务历史记录 Schema

定义历史记录相关的响应数据模型。
"""

from datetime import datetime
from typing import Optional

from pydantic import Field

from app.schemas.base import BaseSchema, PaginatedResponse


class TaskHistoryResponse(BaseSchema):
    """
    任务历史记录响应模型
    """
    id: str
    task_id: str
    changed_by: str
    action: str
    old_status: Optional[str] = None
    new_status: Optional[str] = None
    old_progress: Optional[int] = None
    new_progress: Optional[int] = None
    comment: Optional[str] = None
    snapshot: Optional[str] = None
    timestamp: datetime


class TaskHistoryListResponse(PaginatedResponse[TaskHistoryResponse]):
    """
    历史记录列表分页响应
    """
    pass


class TaskHistoryFilterParams(BaseSchema):
    """
    历史记录筛选参数
    """
    task_id: Optional[str] = None
    action: Optional[str] = None
    changed_by: Optional[str] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=200)
