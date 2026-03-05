# -*- coding: utf-8 -*-
"""
设备负责人关联表 (TaskDeviceAssignee)

存储任务中每个设备的负责人。
"""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class TaskDeviceAssignee(Base):
    """
    任务-设备-负责人关联表
    
    一个设备可以有多个负责人。
    """
    
    __tablename__ = "task_device_assignees"
    
    # 三元复合主键
    task_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("tasks.id", ondelete="CASCADE"),
        primary_key=True,
        comment="任务ID"
    )
    
    device_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("device_models.id", ondelete="CASCADE"),
        primary_key=True,
        comment="设备ID"
    )
    
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
        comment="负责人ID"
    )
    
    # 审计字段
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="分配时间"
    )
    
    assigned_by: Mapped[str] = mapped_column(
        String(36),
        nullable=False,
        default="system",
        comment="分配人ID"
    )
    
    # 关系定义
    user: Mapped["User"] = relationship(
        "User",
        lazy="selectin"
    )
    
    def __repr__(self) -> str:
        return f"<TaskDeviceAssignee(task_id={self.task_id}, device_id={self.device_id}, user_id={self.user_id})>"
