# -*- coding: utf-8 -*-
"""
任务-设备关联模型 (TaskDeviceRelation)

实现任务与设备机型的多对多关联关系，支持设备级完成状态追踪。
"""

import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class DeviceTaskStatus(str, enum.Enum):
    """
    设备任务状态枚举
    
    用于标识单个设备在任务中的完成状态
    """
    PENDING = "pending"           # 待处理
    IN_PROGRESS = "in_progress"   # 进行中
    COMPLETED = "completed"       # 已完成


class ZentaoType(str, enum.Enum):
    """
    禅道关联类型枚举
    """
    STORY = "story"   # 需求
    BUG = "bug"       # Bug


class TaskDeviceRelation(Base):
    """
    任务-设备关联表
    
    实现 Task 与 DeviceModel 的多对多关系。
    记录关联创建时间、设备级完成状态和禅道关联信息，支持审计追踪。
    
    Attributes:
        task_id: 任务 ID (外键)
        device_id: 设备机型 ID (外键)
        status: 设备在此任务中的完成状态
        completed_at: 完成时间
        notes: 备注
        zentao_type: 禅道关联类型 (story/bug)
        zentao_id: 禅道需求或Bug ID
        zentao_title: 禅道标题 (缓存)
        zentao_url: 禅道链接
        created_at: 关联创建时间
        created_by: 创建人 ID (预留多用户)
    """
    
    __tablename__ = "task_device_relations"
    
    # 复合主键
    task_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("tasks.id", ondelete="CASCADE"),
        primary_key=True,
        comment="任务 ID"
    )
    
    device_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("device_models.id", ondelete="CASCADE"),
        primary_key=True,
        comment="设备机型 ID"
    )
    
    # 设备状态字段
    status: Mapped[DeviceTaskStatus] = mapped_column(
        Enum(DeviceTaskStatus),
        nullable=False,
        default=DeviceTaskStatus.PENDING,
        comment="设备在此任务中的完成状态"
    )
    
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="完成时间"
    )
    
    notes: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
        comment="备注"
    )
    
    # 禅道关联字段
    zentao_type: Mapped[Optional[ZentaoType]] = mapped_column(
        Enum(ZentaoType),
        nullable=True,
        comment="禅道关联类型: story(需求) / bug"
    )
    
    zentao_id: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        comment="禅道需求或Bug ID"
    )
    
    zentao_title: Mapped[Optional[str]] = mapped_column(
        String(200),
        nullable=True,
        comment="禅道标题 (缓存显示用)"
    )
    
    zentao_url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
        comment="禅道链接"
    )
    
    # 审计字段
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="关联创建时间"
    )
    
    created_by: Mapped[str] = mapped_column(
        String(36),
        nullable=False,
        default="system",
        comment="创建人 ID (预留多用户)"
    )
    
    def __repr__(self) -> str:
        return f"<TaskDeviceRelation(task_id={self.task_id}, device_id={self.device_id}, status={self.status})>"

