# -*- coding: utf-8 -*-
"""
设备机型模型 (DeviceModel)

用于管理硬件设备机型信息，支持与任务的多对多关联。
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.task import Task


class DeviceModel(Base):
    """
    设备机型实体模型
    
    存储硬件设备的型号信息，支持分类管理。
    
    Attributes:
        id: 主键 UUID
        name: 机型名称 (如 X100, X200-Pro)
        category: 设备类别 (如 智能锁/路由器)
        description: 机型描述
        created_at: 创建时间
        updated_at: 最后更新时间
        
    Relationships:
        tasks: 关联的任务列表
    """
    
    __tablename__ = "device_models"
    
    # 主键
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        comment="主键 UUID"
    )
    
    # 基本信息
    name: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
        comment="机型名称 (如 X100)"
    )
    
    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        comment="设备类别 (如 智能锁/路由器)"
    )
    
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="机型描述"
    )
    
    # 时间戳审计
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="创建时间"
    )
    
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
        comment="最后更新时间"
    )
    
    # 关系定义
    tasks: Mapped[List["Task"]] = relationship(
        "Task",
        secondary="task_device_relations",
        back_populates="devices",
        lazy="selectin",
        overlaps="device_relations"  # 消除与 Task.device_relations 的重叠警告
    )
    
    def __repr__(self) -> str:
        return f"<DeviceModel(name={self.name}, category={self.category})>"
