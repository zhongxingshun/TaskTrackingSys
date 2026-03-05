# -*- coding: utf-8 -*-
"""
任务模型 (Task)

核心业务实体，支持完整的生命周期管理与审计追踪。
"""

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import DateTime, Enum, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.device import DeviceModel
    from app.models.task_device import TaskDeviceRelation
    from app.models.task_history import TaskHistory


class TaskStatus(str, enum.Enum):
    """
    任务状态枚举
    
    状态流转: Backlog → In_Progress → Testing → Closed
    支持归档状态用于历史数据管理
    """
    BACKLOG = "Backlog"           # 待处理
    IN_PROGRESS = "In_Progress"   # 进行中
    TESTING = "Testing"           # 测试中
    CLOSED = "Closed"             # 已完结
    ARCHIVED = "Archived"         # 已归档


class TaskSource(str, enum.Enum):
    """
    任务来源枚举
    
    用于标识任务的发起端
    """
    INTERNAL_RD = "Internal_RD"           # 内部研发
    COMPETITOR_RESEARCH = "Competitor"    # 竞品调研
    CUSTOMER_FEEDBACK = "Customer"        # 客户反馈
    MARKET_ANALYSIS = "Market"            # 市场分析
    OTHER = "Other"                       # 其他


def generate_task_id() -> str:
    """
    生成任务唯一标识符
    
    格式: TASK-YYYY-XXX (年份-序号)
    注意: 实际生产中应使用数据库序列或分布式 ID 生成器
    
    Returns:
        str: 任务 ID
    """
    # 使用 UUID 的后 8 位作为序号部分
    year = datetime.now().year
    short_uuid = uuid.uuid4().hex[:6].upper()
    return f"TASK-{year}-{short_uuid}"


class Task(Base):
    """
    任务实体模型
    
    核心业务表，存储任务的完整生命周期数据。
    
    Attributes:
        id: 主键 UUID
        task_id: 业务标识符 (TASK-YYYY-XXX)
        title: 任务标题
        source: 归属来源
        description: Markdown 格式描述
        progress: 进度百分比 (0-100)
        status: 当前状态
        priority: 优先级 (1-5, 5 最高)
        assignee_id: 负责人 ID (预留多用户)
        created_at: 创建时间
        updated_at: 最后更新时间
        target_date: 计划完成时间
        actual_date: 实际闭环时间
        
    Relationships:
        devices: 关联的设备机型列表
        history: 状态变更历史记录
    """
    
    __tablename__ = "tasks"
    
    # 主键
    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        comment="主键 UUID"
    )
    
    # 业务标识符
    task_id: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        nullable=False,
        default=generate_task_id,
        index=True,
        comment="业务标识符 (TASK-YYYY-XXX)"
    )
    
    # 基本信息
    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        comment="任务标题"
    )
    
    source: Mapped[TaskSource] = mapped_column(
        Enum(TaskSource),
        nullable=False,
        default=TaskSource.INTERNAL_RD,
        comment="归属来源"
    )
    
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Markdown 格式描述"
    )
    
    # 进度与状态
    progress: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="进度百分比 (0-100)"
    )
    
    status: Mapped[TaskStatus] = mapped_column(
        Enum(TaskStatus),
        nullable=False,
        default=TaskStatus.BACKLOG,
        index=True,
        comment="当前状态"
    )
    
    priority: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=3,
        comment="优先级 (1-5, 5 最高)"
    )
    
    # 用户关联 (预留多用户扩展)
    assignee_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        nullable=True,
        index=True,
        comment="负责人 ID (预留多用户)"
    )
    
    # 跟踪人
    tracker_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        nullable=True,
        index=True,
        comment="跟踪人 ID"
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
    
    target_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="计划完成时间"
    )
    
    actual_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="实际闭环时间"
    )
    
    # 关系定义
    devices: Mapped[List["DeviceModel"]] = relationship(
        "DeviceModel",
        secondary="task_device_relations",
        back_populates="tasks",
        lazy="selectin",
        viewonly=True
    )

    device_relations: Mapped[List["TaskDeviceRelation"]] = relationship(
        "TaskDeviceRelation",
        primaryjoin="Task.id == TaskDeviceRelation.task_id",
        lazy="selectin",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    
    history: Mapped[List["TaskHistory"]] = relationship(
        "TaskHistory",
        back_populates="task",
        lazy="selectin",
        order_by="TaskHistory.timestamp.desc()",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    
    def __repr__(self) -> str:
        return f"<Task(task_id={self.task_id}, title={self.title}, status={self.status})>"
    
    def validate_progress(self) -> bool:
        """
        验证进度值是否在有效范围内
        
        Returns:
            bool: 验证结果
        """
        return 0 <= self.progress <= 100
    
    def validate_priority(self) -> bool:
        """
        验证优先级是否在有效范围内
        
        Returns:
            bool: 验证结果
        """
        return 1 <= self.priority <= 5
    
    def can_close(self) -> bool:
        """
        检查任务是否可以关闭
        
        关闭条件: 必须有实际完结日期
        
        Returns:
            bool: 是否可以关闭
        """
        return self.actual_date is not None
