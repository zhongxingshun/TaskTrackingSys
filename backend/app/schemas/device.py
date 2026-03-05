# -*- coding: utf-8 -*-
"""
设备机型 Schema

定义设备相关的请求/响应数据模型。
"""

from datetime import datetime
from typing import Optional

from pydantic import Field, field_validator

from app.schemas.base import BaseSchema, PaginatedResponse


class DeviceCreate(BaseSchema):
    """
    创建设备请求
    
    Attributes:
        name: 机型名称 (必填, 唯一)
        category: 设备类别 (必填)
        description: 机型描述
    """
    name: str = Field(..., min_length=1, max_length=100, description="机型名称")
    category: str = Field(..., min_length=1, max_length=50, description="设备类别")
    description: Optional[str] = Field(default=None, description="机型描述")
    
    @field_validator("name", "category")
    @classmethod
    def not_empty(cls, v: str) -> str:
        """验证字段不能为空白"""
        if not v.strip():
            raise ValueError("字段不能为空")
        return v.strip()


class DeviceUpdate(BaseSchema):
    """
    更新设备请求 (部分更新)
    """
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    category: Optional[str] = Field(default=None, min_length=1, max_length=50)
    description: Optional[str] = None
    
    @field_validator("name", "category")
    @classmethod
    def not_empty(cls, v: Optional[str]) -> Optional[str]:
        """验证字段不能为空白"""
        if v is not None and not v.strip():
            raise ValueError("字段不能为空")
        return v.strip() if v else None


class DeviceResponse(BaseSchema):
    """
    设备响应模型
    """
    id: str
    name: str
    category: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    # 关联任务数量 (可选)
    task_count: int = 0


class DeviceListResponse(PaginatedResponse[DeviceResponse]):
    """
    设备列表分页响应
    """
    pass


class DeviceFilterParams(BaseSchema):
    """
    设备筛选参数
    """
    category: Optional[str] = None
    search: Optional[str] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
