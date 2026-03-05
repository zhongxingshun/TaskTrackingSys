# -*- coding: utf-8 -*-
"""
权限模型 (Permission)

定义系统细粒度权限点。
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Permission(Base):
    """
    权限实体模型
    
    Attributes:
        id: 主键 UUID
        name: 权限名称
        code: 权限代码
        category: 权限分类
        description: 权限描述
    """
    
    __tablename__ = "permissions"
    
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        comment="主键 UUID"
    )
    
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="权限名称"
    )
    
    code: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        comment="权限代码"
    )
    
    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="权限分类"
    )
    
    description: Mapped[str] = mapped_column(
        String(200),
        nullable=True,
        default="",
        comment="权限描述"
    )
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="创建时间"
    )
    
    def __repr__(self) -> str:
        return f"<Permission(id={self.id}, code={self.code})>"
