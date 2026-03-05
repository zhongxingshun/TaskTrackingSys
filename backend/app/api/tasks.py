# -*- coding: utf-8 -*-
"""
任务 API 路由

提供任务的 RESTful API 端点。
"""

from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import CurrentUser, DbSession
from app.models.task import TaskSource, TaskStatus
from app.schemas.base import MessageResponse
from app.schemas.task import (
    TaskCreate,
    TaskFilterParams,
    TaskListResponse,
    TaskProgressUpdate,
    TaskResponse,
    TaskStatusUpdate,
    TaskUpdate,
)
from app.services.task_service import TaskService

router = APIRouter()


@router.post(
    "",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建任务",
    description="创建新任务，可同时关联设备机型"
)
async def create_task(
    data: TaskCreate,
    db: DbSession,
    current_user: CurrentUser
) -> TaskResponse:
    """
    创建新任务
    
    - **title**: 任务标题 (必填)
    - **source**: 归属来源
    - **description**: Markdown 格式描述
    - **priority**: 优先级 (1-5)
    - **target_date**: 计划完成时间
    - **device_ids**: 关联设备 ID 列表
    """
    service = TaskService(db)
    task = await service.create_task(data, created_by=current_user)
    return TaskResponse.from_orm_with_count(task)


@router.get(
    "",
    response_model=TaskListResponse,
    summary="获取任务列表",
    description="获取任务列表，支持筛选、搜索和分页"
)
async def get_tasks(
    db: DbSession,
    status: Optional[TaskStatus] = Query(default=None, description="按状态筛选"),
    source: Optional[TaskSource] = Query(default=None, description="按来源筛选"),
    device_id: Optional[str] = Query(default=None, description="按关联设备筛选"),
    assignee_id: Optional[str] = Query(default=None, description="按负责人筛选"),
    tracker_id: Optional[str] = Query(default=None, description="按跟踪人筛选"),
    search: Optional[str] = Query(default=None, description="搜索关键词"),
    page: int = Query(default=1, ge=1, description="页码"),
    page_size: int = Query(default=20, ge=1, le=100, description="每页数量")
) -> TaskListResponse:
    """
    获取任务列表
    
    支持按状态、来源、设备、负责人、跟踪人筛选，以及关键词搜索。
    """
    filters = TaskFilterParams(
        status=status,
        source=source,
        device_id=device_id,
        assignee_id=assignee_id,
        tracker_id=tracker_id,
        search=search,
        page=page,
        page_size=page_size
    )
    
    service = TaskService(db)
    tasks, total = await service.get_tasks(filters)
    
    items = [TaskResponse.from_orm_with_count(task) for task in tasks]
    has_next = (page * page_size) < total
    
    return TaskListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        has_next=has_next
    )


@router.get(
    "/{task_id}",
    response_model=TaskResponse,
    summary="获取任务详情",
    description="根据 ID 获取任务详细信息"
)
async def get_task(
    task_id: str,
    db: DbSession
) -> TaskResponse:
    """
    获取任务详情
    
    支持使用 UUID 或业务 ID (TASK-YYYY-XXX) 查询。
    """
    service = TaskService(db)
    task = await service.get_task_by_id(task_id)
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"任务 '{task_id}' 不存在"
        )
    
    return TaskResponse.from_orm_with_count(task)


@router.put(
    "/{task_id}",
    response_model=TaskResponse,
    summary="更新任务",
    description="更新任务基本信息"
)
async def update_task(
    task_id: str,
    data: TaskUpdate,
    db: DbSession,
    current_user: CurrentUser
) -> TaskResponse:
    """
    更新任务基本信息
    
    仅更新提供的字段，未提供的字段保持不变。
    """
    service = TaskService(db)
    task = await service.update_task(task_id, data, updated_by=current_user)
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"任务 '{task_id}' 不存在"
        )
    
    return TaskResponse.from_orm_with_count(task)


@router.patch(
    "/{task_id}/status",
    response_model=TaskResponse,
    summary="更新任务状态",
    description="更新任务状态，状态为 Closed 时必须提供实际完结日期"
)
async def update_task_status(
    task_id: str,
    data: TaskStatusUpdate,
    db: DbSession,
    current_user: CurrentUser
) -> TaskResponse:
    """
    更新任务状态
    
    - **status**: 新状态 (Backlog/In_Progress/Testing/Closed/Archived)
    - **actual_date**: 实际完结日期 (状态为 Closed 时必填)
    - **comment**: 状态变更说明
    """
    service = TaskService(db)
    
    try:
        task = await service.update_status(task_id, data, updated_by=current_user)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"任务 '{task_id}' 不存在"
        )
    
    return TaskResponse.from_orm_with_count(task)


@router.patch(
    "/{task_id}/progress",
    response_model=TaskResponse,
    summary="更新任务进度",
    description="更新任务进度百分比"
)
async def update_task_progress(
    task_id: str,
    data: TaskProgressUpdate,
    db: DbSession,
    current_user: CurrentUser
) -> TaskResponse:
    """
    更新任务进度
    
    - **progress**: 进度百分比 (0-100)
    - **comment**: 进度变更说明
    """
    service = TaskService(db)
    task = await service.update_progress(task_id, data, updated_by=current_user)
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"任务 '{task_id}' 不存在"
        )
    
    return TaskResponse.from_orm_with_count(task)


@router.post(
    "/{task_id}/archive",
    response_model=TaskResponse,
    summary="归档任务",
    description="将任务标记为归档状态"
)
async def archive_task(
    task_id: str,
    db: DbSession,
    current_user: CurrentUser
) -> TaskResponse:
    """
    归档任务
    
    将任务状态设置为 Archived。
    """
    service = TaskService(db)
    task = await service.archive_task(task_id, archived_by=current_user)
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"任务 '{task_id}' 不存在"
        )
    
    return TaskResponse.from_orm_with_count(task)


@router.delete(
    "/{task_id}",
    response_model=MessageResponse,
    summary="删除任务",
    description="永久删除任务及其关联数据"
)
async def delete_task(
    task_id: str,
    db: DbSession,
    current_user: CurrentUser
) -> MessageResponse:
    """
    删除任务
    
    ⚠️ 此操作不可恢复，建议使用归档功能代替。
    """
    service = TaskService(db)
    success = await service.delete_task(task_id, deleted_by=current_user)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"任务 '{task_id}' 不存在"
        )
    
    return MessageResponse(message=f"任务 '{task_id}' 已删除")


@router.patch(
    "/{task_id}/devices/{device_id}/status",
    response_model=TaskResponse,
    summary="更新设备状态",
    description="更新任务中单个设备的完成状态"
)
async def update_device_status(
    task_id: str,
    device_id: str,
    new_status: str = Query(..., description="设备状态: pending/in_progress/completed"),
    db: DbSession = None,
    current_user: CurrentUser = None
) -> TaskResponse:
    """
    更新设备状态
    
    - **new_status**: 设备状态 (pending/in_progress/completed)
    """
    from app.models.task_device import DeviceTaskStatus
    
    # 验证状态值
    try:
        device_status_enum = DeviceTaskStatus(new_status)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"无效的状态值: {new_status}。有效值: pending, in_progress, completed"
        )
    
    service = TaskService(db)
    task = await service.update_device_status(task_id, device_id, device_status_enum, updated_by=current_user)
    
    if not task:
        raise HTTPException(
            status_code=404,
            detail=f"任务 '{task_id}' 或设备 '{device_id}' 不存在"
        )
    
    return TaskResponse.from_orm_with_count(task)


@router.patch(
    "/{task_id}/devices/batch-status",
    response_model=TaskResponse,
    summary="批量更新设备状态",
    description="批量更新任务中多个设备的完成状态"
)
async def batch_update_device_status(
    task_id: str,
    device_ids: list[str] = Query(..., description="设备ID列表"),
    new_status: str = Query(..., description="设备状态: pending/in_progress/completed"),
    db: DbSession = None,
    current_user: CurrentUser = None
) -> TaskResponse:
    """
    批量更新设备状态
    
    - **device_ids**: 设备ID列表
    - **new_status**: 设备状态 (pending/in_progress/completed)
    """
    from app.models.task_device import DeviceTaskStatus
    
    # 验证状态值
    try:
        device_status_enum = DeviceTaskStatus(new_status)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"无效的状态值: {new_status}。有效值: pending, in_progress, completed"
        )
    
    service = TaskService(db)
    task = await service.batch_update_device_status(task_id, device_ids, device_status_enum, updated_by=current_user)
    
    if not task:
        raise HTTPException(
            status_code=404,
            detail=f"任务 '{task_id}' 不存在"
        )
    
    return TaskResponse.from_orm_with_count(task)


@router.post(
    "/{task_id}/devices/{device_id}/zentao",
    response_model=TaskResponse,
    summary="添加禅道关联",
    description="为任务中的设备添加禅道需求/Bug关联"
)
async def add_zentao_link(
    task_id: str,
    device_id: str,
    zentao_type: str = Query(..., description="禅道类型: story/bug"),
    zentao_id: str = Query(..., description="禅道ID"),
    zentao_title: Optional[str] = Query(None, description="禅道标题"),
    zentao_url: Optional[str] = Query(None, description="禅道链接"),
    db: DbSession = None,
    current_user: CurrentUser = None
) -> TaskResponse:
    """
    添加禅道关联
    
    - **zentao_type**: 禅道类型 (story/bug)
    - **zentao_id**: 禅道需求或Bug ID
    - **zentao_title**: 禅道标题 (可选)
    - **zentao_url**: 禅道链接 (可选)
    """
    service = TaskService(db)
    task = await service.update_device_zentao(
        task_id=task_id,
        device_id=device_id,
        zentao_type=zentao_type,
        zentao_id=zentao_id,
        zentao_title=zentao_title,
        zentao_url=zentao_url,
        updated_by=current_user
    )
    
    if not task:
        raise HTTPException(
            status_code=404,
            detail=f"任务 '{task_id}' 或设备 '{device_id}' 不存在"
        )
    
    return TaskResponse.from_orm_with_count(task)


@router.delete(
    "/{task_id}/devices/{device_id}/zentao",
    response_model=TaskResponse,
    summary="删除禅道关联",
    description="删除任务中设备的禅道关联"
)
async def remove_zentao_link(
    task_id: str,
    device_id: str,
    db: DbSession = None,
    current_user: CurrentUser = None
) -> TaskResponse:
    """
    删除禅道关联
    """
    service = TaskService(db)
    task = await service.remove_device_zentao(
        task_id=task_id,
        device_id=device_id,
        updated_by=current_user
    )
    
    if not task:
        raise HTTPException(
            status_code=404,
            detail=f"任务 '{task_id}' 或设备 '{device_id}' 不存在"
        )
    
    return TaskResponse.from_orm_with_count(task)


# ========== 设备负责人管理 ==========

@router.get(
    "/{task_id}/devices/{device_id}/assignees",
    response_model=list,
    summary="获取设备负责人列表",
    description="获取任务中设备的负责人列表"
)
async def get_device_assignees(
    task_id: str,
    device_id: str,
    db: DbSession = None
):
    """获取设备负责人列表"""
    service = TaskService(db)
    assignees = await service.get_device_assignees(task_id, device_id)
    return [
        {
            "user_id": a.user_id,
            "username": a.user.username if a.user else None,
            "display_name": a.user.display_name if a.user else None,
            "email": a.user.email if a.user else None,
            "assigned_at": a.assigned_at.isoformat() if a.assigned_at else None
        }
        for a in assignees
    ]


@router.post(
    "/{task_id}/devices/{device_id}/assignees",
    response_model=TaskResponse,
    summary="添加设备负责人",
    description="为任务中的设备添加负责人"
)
async def add_device_assignee(
    task_id: str,
    device_id: str,
    user_id: str = Query(..., description="负责人用户ID"),
    db: DbSession = None,
    current_user: CurrentUser = None
) -> TaskResponse:
    """添加设备负责人"""
    service = TaskService(db)
    task = await service.add_device_assignee(
        task_id=task_id,
        device_id=device_id,
        user_id=user_id,
        assigned_by=current_user
    )
    
    if not task:
        raise HTTPException(
            status_code=404,
            detail=f"任务 '{task_id}' 或设备 '{device_id}' 不存在"
        )
    
    return TaskResponse.from_orm_with_count(task)


@router.delete(
    "/{task_id}/devices/{device_id}/assignees/{user_id}",
    response_model=TaskResponse,
    summary="删除设备负责人",
    description="从设备中移除负责人"
)
async def remove_device_assignee(
    task_id: str,
    device_id: str,
    user_id: str,
    db: DbSession = None,
    current_user: CurrentUser = None
) -> TaskResponse:
    """删除设备负责人"""
    service = TaskService(db)
    task = await service.remove_device_assignee(
        task_id=task_id,
        device_id=device_id,
        user_id=user_id
    )
    
    if not task:
        raise HTTPException(
            status_code=404,
            detail=f"任务 '{task_id}' 或设备 '{device_id}' 不存在"
        )
    
    return TaskResponse.from_orm_with_count(task)

