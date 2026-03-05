# -*- coding: utf-8 -*-
"""
角色模型 (Role)

定义系统角色，用于权限分组管理。
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.user_role import UserRole
    from app.models.role_permission import RolePermission


class Role(Base):
    """
    角色实体模型
    
    Attributes:
        id: 主键 UUID
        name: 角色名称
        code: 角色代码
        description: 角色描述
        is_system: 是否系统内置
        created_at: 创建时间
    """
    
    __tablename__ = "roles"
    
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        comment="主键 UUID"
    )
    
    name: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="角色名称"
    )
    
    code: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        comment="角色代码"
    )
    
    description: Mapped[str] = mapped_column(
        String(200),
        nullable=True,
        default="",
        comment="角色描述"
    )
    
    is_system: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        comment="是否系统内置"
    )
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="创建时间"
    )
    
    # 关系定义
    user_roles: Mapped[List["UserRole"]] = relationship(
        "UserRole",
        back_populates="role",
        lazy="selectin"
    )
    
    role_permissions: Mapped[List["RolePermission"]] = relationship(
        "RolePermission",
        back_populates="role",
        lazy="selectin",
        cascade="all, delete-orphan"
    )
    
    def __repr__(self) -> str:
        return f"<Role(id={self.id}, name={self.name}, code={self.code})>"
