# -*- coding: utf-8 -*-
"""
任务 Schema

定义任务相关的请求/响应数据模型。
"""

from datetime import datetime
from typing import List, Optional

from pydantic import Field, field_validator

from app.models.task import TaskSource, TaskStatus
from app.schemas.base import BaseSchema, PaginatedResponse


class AssigneeSimple(BaseSchema):
    """负责人简要信息"""
    user_id: str
    username: Optional[str] = None
    display_name: Optional[str] = None
    email: Optional[str] = None


class DeviceSimple(BaseSchema):
    """
    设备简要信息 (用于任务响应中的嵌套)
    """
    id: str
    name: str
    category: str
    # 设备在任务中的状态 (仅在任务上下文中使用)
    device_status: Optional[str] = Field(default=None, description="设备状态: pending/in_progress/completed")
    completed_at: Optional[datetime] = Field(default=None, description="完成时间")
    # 禅道关联信息
    zentao_type: Optional[str] = Field(default=None, description="禅道类型: story/bug")
    zentao_id: Optional[str] = Field(default=None, description="禅道ID")
    zentao_title: Optional[str] = Field(default=None, description="禅道标题")
    zentao_url: Optional[str] = Field(default=None, description="禅道链接")
    # 负责人
    assignees: List[AssigneeSimple] = Field(default_factory=list, description="负责人列表")



class TaskHistorySimple(BaseSchema):
    """
    历史记录简要信息 (用于任务响应中的嵌套)
    """
    id: str
    action: str
    changed_by: str
    old_status: Optional[str] = None
    new_status: Optional[str] = None
    old_progress: Optional[int] = None
    new_progress: Optional[int] = None
    comment: Optional[str] = None
    timestamp: datetime


class TaskCreate(BaseSchema):
    """
    创建任务请求
    
    Attributes:
        title: 任务标题 (必填)
        source: 归属来源
        description: Markdown 描述
        priority: 优先级 (1-5)
        target_date: 计划完成时间
        device_ids: 关联设备 ID 列表
    """
    title: str = Field(..., min_length=1, max_length=200, description="任务标题")
    source: TaskSource = Field(default=TaskSource.INTERNAL_RD, description="归属来源")
    description: Optional[str] = Field(default=None, description="Markdown 描述")
    priority: int = Field(default=3, ge=1, le=5, description="优先级 (1-5)")
    target_date: Optional[datetime] = Field(default=None, description="计划完成时间")
    device_ids: Optional[List[str]] = Field(default=None, description="关联设备 ID 列表")
    assignee_id: Optional[str] = Field(default=None, description="负责人 ID")
    tracker_id: Optional[str] = Field(default=None, description="跟踪人 ID（默认为创建者）")
    
    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: str) -> str:
        """验证标题不能为空白"""
        if not v.strip():
            raise ValueError("任务标题不能为空")
        return v.strip()


class TaskUpdate(BaseSchema):
    """
    更新任务请求 (部分更新)
    
    所有字段均为可选，仅更新提供的字段。
    """
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    source: Optional[TaskSource] = None
    description: Optional[str] = None
    priority: Optional[int] = Field(default=None, ge=1, le=5)
    target_date: Optional[datetime] = None
    actual_date: Optional[datetime] = None
    device_ids: Optional[List[str]] = None
    assignee_id: Optional[str] = None
    tracker_id: Optional[str] = None
    
    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: Optional[str]) -> Optional[str]:
        """验证标题不能为空白"""
        if v is not None and not v.strip():
            raise ValueError("任务标题不能为空")
        return v.strip() if v else None


class TaskStatusUpdate(BaseSchema):
    """
    更新任务状态请求
    
    Attributes:
        status: 新状态
        actual_date: 实际完结日期 (状态为 Closed 时必填)
        comment: 状态变更说明
    """
    status: TaskStatus = Field(..., description="新状态")
    actual_date: Optional[datetime] = Field(default=None, description="实际完结日期")
    comment: Optional[str] = Field(default=None, max_length=500, description="变更说明")
    
    @field_validator("actual_date")
    @classmethod
    def validate_actual_date(cls, v: Optional[datetime], info) -> Optional[datetime]:
        """
        验证: 状态为 Closed 时必须提供实际完结日期
        """
        # 注意: 跨字段验证在 model_validator 中处理
        return v


class TaskProgressUpdate(BaseSchema):
    """
    更新任务进度请求
    
    Attributes:
        progress: 新进度 (0-100)
        comment: 进度变更说明
    """
    progress: int = Field(..., ge=0, le=100, description="进度百分比")
    comment: Optional[str] = Field(default=None, max_length=500, description="变更说明")


class TaskResponse(BaseSchema):
    """
    任务响应模型
    
    包含任务完整信息及关联数据。
    """
    id: str
    task_id: str
    title: str
    source: TaskSource
    description: Optional[str] = None
    progress: int
    status: TaskStatus
    priority: int
    assignee_id: Optional[str] = None
    tracker_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    target_date: Optional[datetime] = None
    actual_date: Optional[datetime] = None
    
    # 关联数据
    devices: List[DeviceSimple] = []
    history: List[TaskHistorySimple] = []
    
    # 计算属性
    device_count: int = 0
    
    @classmethod
    def from_orm_with_count(cls, task) -> "TaskResponse":
        """
        从 ORM 对象创建响应，包含设备数量计算
        """
        # 映射设备及其状态
        devices_with_status = []
        if task.devices:
            # 创建设备 ID 到关联信息的映射
            relation_map = {}
            if hasattr(task, 'device_relations') and task.device_relations:
                for r in task.device_relations:
                    relation_map[r.device_id] = {
                        'status': r.status.value if hasattr(r.status, 'value') else r.status,
                        'completed_at': r.completed_at,
                        'zentao_type': r.zentao_type.value if r.zentao_type and hasattr(r.zentao_type, 'value') else r.zentao_type,
                        'zentao_id': r.zentao_id,
                        'zentao_title': r.zentao_title,
                        'zentao_url': r.zentao_url,
                    }
            
            for device in task.devices:
                rel_info = relation_map.get(device.id, {})
                devices_with_status.append(DeviceSimple(
                    id=device.id,
                    name=device.name,
                    category=device.category,
                    device_status=rel_info.get('status'),
                    completed_at=rel_info.get('completed_at'),
                    zentao_type=rel_info.get('zentao_type'),
                    zentao_id=rel_info.get('zentao_id'),
                    zentao_title=rel_info.get('zentao_title'),
                    zentao_url=rel_info.get('zentao_url'),
                ))

        data = {
            "id": task.id,
            "task_id": task.task_id,
            "title": task.title,
            "source": task.source,
            "description": task.description,
            "progress": task.progress,
            "status": task.status,
            "priority": task.priority,
            "assignee_id": task.assignee_id,
            "tracker_id": task.tracker_id,
            "created_at": task.created_at,
            "updated_at": task.updated_at,
            "target_date": task.target_date,
            "actual_date": task.actual_date,
            "devices": devices_with_status,
            "history": task.history if task.history else [],
            "device_count": len(task.devices) if task.devices else 0,
        }
        return cls(**data)



class TaskListResponse(PaginatedResponse[TaskResponse]):
    """
    任务列表分页响应
    """
    pass


class TaskFilterParams(BaseSchema):
    """
    任务筛选参数
    """
    status: Optional[TaskStatus] = None
    source: Optional[TaskSource] = None
    device_id: Optional[str] = None
    assignee_id: Optional[str] = None
    tracker_id: Optional[str] = None
    search: Optional[str] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
