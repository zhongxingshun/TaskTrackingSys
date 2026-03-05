# -*- coding: utf-8 -*-
"""
设备机型 API 路由

提供设备的 RESTful API 端点。
"""

from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import DbSession
from app.schemas.base import MessageResponse
from app.schemas.device import (
    DeviceCreate,
    DeviceFilterParams,
    DeviceListResponse,
    DeviceResponse,
    DeviceUpdate,
)
from app.services.device_service import DeviceService

router = APIRouter()


@router.post(
    "",
    response_model=DeviceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建设备",
    description="创建新的设备机型"
)
async def create_device(
    data: DeviceCreate,
    db: DbSession
) -> DeviceResponse:
    """
    创建新设备
    
    - **name**: 机型名称 (必填, 唯一)
    - **category**: 设备类别 (必填)
    - **description**: 机型描述
    """
    service = DeviceService(db)
    
    try:
        device = await service.create_device(data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    task_count = await service.get_device_task_count(device.id)
    
    return DeviceResponse(
        id=device.id,
        name=device.name,
        category=device.category,
        description=device.description,
        created_at=device.created_at,
        updated_at=device.updated_at,
        task_count=task_count
    )


@router.get(
    "",
    response_model=DeviceListResponse,
    summary="获取设备列表",
    description="获取设备列表，支持筛选和分页"
)
async def get_devices(
    db: DbSession,
    category: Optional[str] = Query(default=None, description="按类别筛选"),
    search: Optional[str] = Query(default=None, description="搜索关键词"),
    page: int = Query(default=1, ge=1, description="页码"),
    page_size: int = Query(default=20, ge=1, le=100, description="每页数量")
) -> DeviceListResponse:
    """
    获取设备列表
    
    支持按类别筛选和关键词搜索。
    """
    filters = DeviceFilterParams(
        category=category,
        search=search,
        page=page,
        page_size=page_size
    )
    
    service = DeviceService(db)
    devices, total = await service.get_devices(filters)
    
    items = []
    for device in devices:
        task_count = await service.get_device_task_count(device.id)
        items.append(DeviceResponse(
            id=device.id,
            name=device.name,
            category=device.category,
            description=device.description,
            created_at=device.created_at,
            updated_at=device.updated_at,
            task_count=task_count
        ))
    
    has_next = (page * page_size) < total
    
    return DeviceListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        has_next=has_next
    )


@router.get(
    "/all",
    response_model=List[DeviceResponse],
    summary="获取所有设备",
    description="获取所有设备（不分页），用于下拉选择"
)
async def get_all_devices(db: DbSession) -> List[DeviceResponse]:
    """
    获取所有设备
    
    返回所有设备列表，适用于任务创建时的设备选择。
    """
    service = DeviceService(db)
    devices = await service.get_all_devices()
    
    items = []
    for device in devices:
        task_count = await service.get_device_task_count(device.id)
        items.append(DeviceResponse(
            id=device.id,
            name=device.name,
            category=device.category,
            description=device.description,
            created_at=device.created_at,
            updated_at=device.updated_at,
            task_count=task_count
        ))
    
    return items


@router.get(
    "/categories",
    response_model=List[str],
    summary="获取设备类别",
    description="获取所有设备类别列表"
)
async def get_categories(db: DbSession) -> List[str]:
    """
    获取设备类别列表
    
    返回所有已存在的设备类别，用于筛选。
    """
    service = DeviceService(db)
    return await service.get_categories()


@router.get(
    "/{device_id}",
    response_model=DeviceResponse,
    summary="获取设备详情",
    description="根据 ID 获取设备详细信息"
)
async def get_device(
    device_id: str,
    db: DbSession
) -> DeviceResponse:
    """
    获取设备详情
    """
    service = DeviceService(db)
    device = await service.get_device_by_id(device_id)
    
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"设备 '{device_id}' 不存在"
        )
    
    task_count = await service.get_device_task_count(device.id)
    
    return DeviceResponse(
        id=device.id,
        name=device.name,
        category=device.category,
        description=device.description,
        created_at=device.created_at,
        updated_at=device.updated_at,
        task_count=task_count
    )


@router.put(
    "/{device_id}",
    response_model=DeviceResponse,
    summary="更新设备",
    description="更新设备信息"
)
async def update_device(
    device_id: str,
    data: DeviceUpdate,
    db: DbSession
) -> DeviceResponse:
    """
    更新设备信息
    
    仅更新提供的字段。
    """
    service = DeviceService(db)
    
    try:
        device = await service.update_device(device_id, data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"设备 '{device_id}' 不存在"
        )
    
    task_count = await service.get_device_task_count(device.id)
    
    return DeviceResponse(
        id=device.id,
        name=device.name,
        category=device.category,
        description=device.description,
        created_at=device.created_at,
        updated_at=device.updated_at,
        task_count=task_count
    )


@router.delete(
    "/{device_id}",
    response_model=MessageResponse,
    summary="删除设备",
    description="删除设备机型"
)
async def delete_device(
    device_id: str,
    db: DbSession
) -> MessageResponse:
    """
    删除设备
    
    ⚠️ 删除设备会同时解除与任务的关联。
    """
    service = DeviceService(db)
    success = await service.delete_device(device_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"设备 '{device_id}' 不存在"
        )
    
    return MessageResponse(message=f"设备 '{device_id}' 已删除")
