# -*- coding: utf-8 -*-
"""
任务历史记录模型 (TaskHistory)

实现任务状态变更的完整审计轨迹，确保闭环思维。
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.task import Task


class TaskHistory(Base):
    """
    任务历史记录实体模型
    
    记录任务的所有状态变更，支持完整审计链。
    每次任务状态/进度变更时自动创建记录。
    
    Attributes:
        id: 主键 UUID
        task_id: 关联任务 ID (外键)
        changed_by: 操作人 ID
        action: 操作类型 (create/update/status_change/progress_change/close)
        old_status: 变更前状态
        new_status: 变更后状态
        old_progress: 变更前进度
        new_progress: 变更后进度
        comment: 变更说明
        snapshot: 变更时的任务快照 (JSON)
        timestamp: 变更时间戳
        
    Relationships:
        task: 关联的任务实体
    """
    
    __tablename__ = "task_history"
    
    # 主键
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        comment="主键 UUID"
    )
    
    # 外键关联
    task_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("tasks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="关联任务 ID"
    )
    
    # 操作人
    changed_by: Mapped[str] = mapped_column(
        String(36),
        nullable=False,
        default="system",
        index=True,
        comment="操作人 ID (单用户默认 system)"
    )
    
    # 操作类型
    action: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        comment="操作类型 (create/update/status_change/progress_change/close/archive)"
    )
    
    # 状态变更记录
    old_status: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True,
        comment="变更前状态"
    )
    
    new_status: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True,
        comment="变更后状态"
    )
    
    # 进度变更记录
    old_progress: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        comment="变更前进度"
    )
    
    new_progress: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        comment="变更后进度"
    )
    
    # 变更说明
    comment: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="变更说明"
    )
    
    # 任务快照 (JSON 格式存储变更时的完整任务状态)
    snapshot: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="变更时的任务快照 (JSON)"
    )
    
    # 时间戳
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
        comment="变更时间戳"
    )
    
    # 关系定义
    task: Mapped["Task"] = relationship(
        "Task",
        back_populates="history"
    )
    
    def __repr__(self) -> str:
        return (
            f"<TaskHistory(task_id={self.task_id}, action={self.action}, "
            f"changed_by={self.changed_by}, timestamp={self.timestamp})>"
        )
