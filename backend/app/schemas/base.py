# -*- coding: utf-8 -*-
"""
Schema 基础配置

提供通用的 Pydantic 配置和工具类。
"""

from datetime import datetime
from typing import Generic, List, Optional, TypeVar

from pydantic import BaseModel, ConfigDict


class BaseSchema(BaseModel):
    """
    所有 Schema 的基类
    
    启用 ORM 模式以支持从 SQLAlchemy 模型自动转换。
    """
    model_config = ConfigDict(
        from_attributes=True,
        str_strip_whitespace=True,
        json_encoders={
            datetime: lambda v: v.isoformat() if v else None
        }
    )


# 泛型类型变量
T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """
    分页响应通用模型
    
    Attributes:
        items: 数据列表
        total: 总数量
        page: 当前页码
        page_size: 每页数量
        has_next: 是否有下一页
    """
    items: List[T]
    total: int
    page: int = 1
    page_size: int = 20
    has_next: bool = False
    
    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    """
    通用消息响应
    """
    message: str
    success: bool = True
    
    model_config = ConfigDict(from_attributes=True)
