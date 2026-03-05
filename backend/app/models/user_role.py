# -*- coding: utf-8 -*-
"""
用户-角色关联表 (UserRole)
"""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.role import Role


class UserRole(Base):
    """
    用户-角色关联表
    """
    
    __tablename__ = "user_roles"
    
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
        comment="用户ID"
    )
    
    role_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("roles.id", ondelete="CASCADE"),
        primary_key=True,
        comment="角色ID"
    )
    
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="分配时间"
    )
    
    # 关系定义
    user: Mapped["User"] = relationship(
        "User",
        back_populates="user_roles"
    )
    
    role: Mapped["Role"] = relationship(
        "Role",
        back_populates="user_roles"
    )
    
    def __repr__(self) -> str:
        return f"<UserRole(user_id={self.user_id}, role_id={self.role_id})>"
