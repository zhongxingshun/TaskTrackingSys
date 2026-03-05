# -*- coding: utf-8 -*-
"""
设备机型服务层

实现设备的 CRUD 操作。
"""

from typing import List, Optional, Tuple

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.device import DeviceModel
from app.models.task_device import TaskDeviceRelation
from app.schemas.device import (
    DeviceCreate,
    DeviceFilterParams,
    DeviceUpdate,
)


class DeviceService:
    """
    设备服务类
    
    提供设备机型的 CRUD 操作。
    """
    
    def __init__(self, session: AsyncSession):
        """
        初始化服务
        
        Args:
            session: 异步数据库会话
        """
        self.session = session
    
    async def create_device(self, data: DeviceCreate) -> DeviceModel:
        """
        创建新设备
        
        Args:
            data: 设备创建数据
            
        Returns:
            DeviceModel: 创建的设备实体
            
        Raises:
            ValueError: 设备名称已存在
        """
        # 检查名称唯一性
        existing = await self.get_device_by_name(data.name)
        if existing:
            raise ValueError(f"设备名称 '{data.name}' 已存在")
        
        device = DeviceModel(
            name=data.name,
            category=data.category,
            description=data.description,
        )
        
        self.session.add(device)
        await self.session.commit()
        await self.session.refresh(device)
        
        return device
    
    async def get_device_by_id(self, device_id: str) -> Optional[DeviceModel]:
        """
        根据 ID 获取设备
        
        Args:
            device_id: 设备 ID
            
        Returns:
            Optional[DeviceModel]: 设备实体或 None
        """
        stmt = (
            select(DeviceModel)
            .options(selectinload(DeviceModel.tasks))
            .where(DeviceModel.id == device_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
    
    async def get_device_by_name(self, name: str) -> Optional[DeviceModel]:
        """
        根据名称获取设备
        
        Args:
            name: 设备名称
            
        Returns:
            Optional[DeviceModel]: 设备实体或 None
        """
        stmt = select(DeviceModel).where(DeviceModel.name == name)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
    
    async def get_devices(
        self,
        filters: DeviceFilterParams
    ) -> Tuple[List[DeviceModel], int]:
        """
        获取设备列表 (支持筛选和分页)
        
        Args:
            filters: 筛选参数
            
        Returns:
            Tuple[List[DeviceModel], int]: (设备列表, 总数)
        """
        # 基础查询
        stmt = select(DeviceModel)
        count_stmt = select(func.count(DeviceModel.id))
        
        # 应用筛选条件
        if filters.category:
            stmt = stmt.where(DeviceModel.category == filters.category)
            count_stmt = count_stmt.where(DeviceModel.category == filters.category)
        
        if filters.search:
            search_pattern = f"%{filters.search}%"
            stmt = stmt.where(
                (DeviceModel.name.ilike(search_pattern)) |
                (DeviceModel.category.ilike(search_pattern))
            )
            count_stmt = count_stmt.where(
                (DeviceModel.name.ilike(search_pattern)) |
                (DeviceModel.category.ilike(search_pattern))
            )
        
        # 获取总数
        total_result = await self.session.execute(count_stmt)
        total = total_result.scalar() or 0
        
        # 分页和排序
        offset = (filters.page - 1) * filters.page_size
        stmt = (
            stmt
            .order_by(DeviceModel.name.asc())
            .offset(offset)
            .limit(filters.page_size)
        )
        
        result = await self.session.execute(stmt)
        devices = list(result.scalars().all())
        
        return devices, total
    
    async def get_all_devices(self) -> List[DeviceModel]:
        """
        获取所有设备 (不分页)
        
        Returns:
            List[DeviceModel]: 设备列表
        """
        stmt = select(DeviceModel).order_by(DeviceModel.name.asc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
    
    async def get_categories(self) -> List[str]:
        """
        获取所有设备类别
        
        Returns:
            List[str]: 类别列表
        """
        stmt = (
            select(DeviceModel.category)
            .distinct()
            .order_by(DeviceModel.category.asc())
        )
        result = await self.session.execute(stmt)
        return [row[0] for row in result.all()]
    
    async def update_device(
        self,
        device_id: str,
        data: DeviceUpdate
    ) -> Optional[DeviceModel]:
        """
        更新设备信息
        
        Args:
            device_id: 设备 ID
            data: 更新数据
            
        Returns:
            Optional[DeviceModel]: 更新后的设备或 None
            
        Raises:
            ValueError: 新名称已被其他设备使用
        """
        device = await self.get_device_by_id(device_id)
        if not device:
            return None
        
        # 检查名称唯一性 (如果要更新名称)
        if data.name and data.name != device.name:
            existing = await self.get_device_by_name(data.name)
            if existing:
                raise ValueError(f"设备名称 '{data.name}' 已存在")
        
        # 应用更新
        update_fields = data.model_dump(exclude_unset=True)
        for field, value in update_fields.items():
            if value is not None:
                setattr(device, field, value)
        
        await self.session.commit()
        await self.session.refresh(device)
        
        return device
    
    async def delete_device(self, device_id: str) -> bool:
        """
        删除设备
        
        Args:
            device_id: 设备 ID
            
        Returns:
            bool: 是否删除成功
        """
        device = await self.get_device_by_id(device_id)
        if not device:
            return False
        
        await self.session.delete(device)
        await self.session.commit()
        return True
    
    async def get_device_task_count(self, device_id: str) -> int:
        """
        获取设备关联的任务数量
        
        Args:
            device_id: 设备 ID
            
        Returns:
            int: 任务数量
        """
        stmt = (
            select(func.count(TaskDeviceRelation.task_id))
            .where(TaskDeviceRelation.device_id == device_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar() or 0
