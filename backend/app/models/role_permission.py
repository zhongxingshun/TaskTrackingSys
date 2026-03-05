# -*- coding: utf-8 -*-
"""
角色-权限关联表 (RolePermission)
"""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.role import Role
    from app.models.permission import Permission


class RolePermission(Base):
    """
    角色-权限关联表
    """
    
    __tablename__ = "role_permissions"
    
    role_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("roles.id", ondelete="CASCADE"),
        primary_key=True,
        comment="角色ID"
    )
    
    permission_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("permissions.id", ondelete="CASCADE"),
        primary_key=True,
        comment="权限ID"
    )
    
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="分配时间"
    )
    
    # 关系定义
    role: Mapped["Role"] = relationship(
        "Role",
        back_populates="role_permissions"
    )
    
    permission: Mapped["Permission"] = relationship(
        "Permission",
        lazy="selectin"
    )
    
    def __repr__(self) -> str:
        return f"<RolePermission(role_id={self.role_id}, permission_id={self.permission_id})>"
