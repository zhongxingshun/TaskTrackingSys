# -*- coding: utf-8 -*-
"""
任务服务层

实现任务的 CRUD 操作及状态管理，包含完整审计追踪。
"""

import json
from datetime import datetime
from typing import List, Optional, Tuple

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.device import DeviceModel
from app.models.task import Task, TaskStatus
from app.models.task_device import TaskDeviceRelation
from app.models.task_history import TaskHistory
from app.schemas.task import (
    TaskCreate,
    TaskFilterParams,
    TaskProgressUpdate,
    TaskStatusUpdate,
    TaskUpdate,
)


class TaskService:
    """
    任务服务类
    
    提供任务的完整生命周期管理，包括：
    - CRUD 操作
    - 状态流转
    - 进度更新
    - 设备关联
    - 审计追踪
    """
    
    def __init__(self, session: AsyncSession):
        """
        初始化服务
        
        Args:
            session: 异步数据库会话
        """
        self.session = session
    
    async def create_task(
        self,
        data: TaskCreate,
        created_by: str = "system"
    ) -> Task:
        """
        创建新任务
        
        Args:
            data: 任务创建数据
            created_by: 创建人 ID
            
        Returns:
            Task: 创建的任务实体
        """
        # 创建任务实体
        task = Task(
            title=data.title,
            source=data.source,
            description=data.description,
            priority=data.priority,
            target_date=data.target_date,
            assignee_id=data.assignee_id,
            # 跟踪人：如果未指定则默认为创建者
            tracker_id=data.tracker_id if data.tracker_id else (created_by.id if hasattr(created_by, 'id') else str(created_by)),
        )
        
        self.session.add(task)
        await self.session.flush()  # 获取生成的 ID
        
        # 关联设备
        if data.device_ids:
            await self._update_device_relations(
                task.id,
                data.device_ids,
                created_by
            )
        
        # 记录创建历史
        await self._create_history(
            task_id=task.id,
            action="create",
            changed_by=created_by,
            new_status=task.status.value,
            new_progress=task.progress,
            comment="任务创建",
            task=task
        )
        
        await self.session.commit()
        
        # 重新加载关联数据
        return await self.get_task_by_id(task.id)
    
    async def get_task_by_id(self, task_id: str) -> Optional[Task]:
        """
        根据 ID 获取任务
        
        Args:
            task_id: 任务 ID (UUID 或 task_id)
            
        Returns:
            Optional[Task]: 任务实体或 None
        """
        stmt = (
            select(Task)
            .options(
                selectinload(Task.devices),
                selectinload(Task.device_relations),
                selectinload(Task.history)
            )
            .where(
                (Task.id == task_id) | (Task.task_id == task_id)
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
    
    async def get_tasks(
        self,
        filters: TaskFilterParams
    ) -> Tuple[List[Task], int]:
        """
        获取任务列表 (支持筛选和分页)
        
        Args:
            filters: 筛选参数
            
        Returns:
            Tuple[List[Task], int]: (任务列表, 总数)
        """
        # 基础查询
        stmt = select(Task).options(
            selectinload(Task.devices),
            selectinload(Task.device_relations),
            selectinload(Task.history)
        )
        count_stmt = select(func.count(Task.id))
        
        # 应用筛选条件
        if filters.status:
            stmt = stmt.where(Task.status == filters.status)
            count_stmt = count_stmt.where(Task.status == filters.status)
        
        if filters.source:
            stmt = stmt.where(Task.source == filters.source)
            count_stmt = count_stmt.where(Task.source == filters.source)
        
        if filters.assignee_id:
            stmt = stmt.where(Task.assignee_id == filters.assignee_id)
            count_stmt = count_stmt.where(Task.assignee_id == filters.assignee_id)
        
        if filters.search:
            search_pattern = f"%{filters.search}%"
            stmt = stmt.where(
                (Task.title.ilike(search_pattern)) |
                (Task.task_id.ilike(search_pattern))
            )
            count_stmt = count_stmt.where(
                (Task.title.ilike(search_pattern)) |
                (Task.task_id.ilike(search_pattern))
            )
        
        if filters.device_id:
            # 子查询: 关联指定设备的任务
            device_subquery = (
                select(TaskDeviceRelation.task_id)
                .where(TaskDeviceRelation.device_id == filters.device_id)
            )
            stmt = stmt.where(Task.id.in_(device_subquery))
            count_stmt = count_stmt.where(Task.id.in_(device_subquery))
        
        if filters.tracker_id:
            stmt = stmt.where(Task.tracker_id == filters.tracker_id)
            count_stmt = count_stmt.where(Task.tracker_id == filters.tracker_id)
        
        # 获取总数
        total_result = await self.session.execute(count_stmt)
        total = total_result.scalar() or 0
        
        # 分页和排序
        offset = (filters.page - 1) * filters.page_size
        stmt = (
            stmt
            .order_by(Task.updated_at.desc())
            .offset(offset)
            .limit(filters.page_size)
        )
        
        result = await self.session.execute(stmt)
        tasks = list(result.scalars().all())
        
        return tasks, total
    
    async def update_task(
        self,
        task_id: str,
        data: TaskUpdate,
        updated_by: str = "system"
    ) -> Optional[Task]:
        """
        更新任务基本信息
        
        Args:
            task_id: 任务 ID
            data: 更新数据
            updated_by: 更新人 ID
            
        Returns:
            Optional[Task]: 更新后的任务或 None
        """
        task = await self.get_task_by_id(task_id)
        if not task:
            return None
        
        # 记录变更前状态
        old_snapshot = self._create_snapshot(task)
        
        # 应用更新
        update_fields = data.model_dump(exclude_unset=True, exclude={"device_ids"})
        for field, value in update_fields.items():
            if value is not None:
                setattr(task, field, value)
        
        # 更新设备关联
        if data.device_ids is not None:
            await self._update_device_relations(
                task.id,
                data.device_ids,
                updated_by
            )
        
        # 记录更新历史
        await self._create_history(
            task_id=task.id,
            action="update",
            changed_by=updated_by,
            comment="任务信息更新",
            task=task,
            old_snapshot=old_snapshot
        )
        
        await self.session.commit()
        return await self.get_task_by_id(task.id)
    
    async def update_status(
        self,
        task_id: str,
        data: TaskStatusUpdate,
        updated_by: str = "system"
    ) -> Optional[Task]:
        """
        更新任务状态
        
        状态为 Closed 时必须提供 actual_date。
        
        Args:
            task_id: 任务 ID
            data: 状态更新数据
            updated_by: 更新人 ID
            
        Returns:
            Optional[Task]: 更新后的任务或 None
            
        Raises:
            ValueError: 状态为 Closed 但未提供 actual_date
        """
        task = await self.get_task_by_id(task_id)
        if not task:
            return None
        
        # 验证: Closed 状态必须有 actual_date
        if data.status == TaskStatus.CLOSED and not data.actual_date:
            raise ValueError("状态标记为已完结时，必须提供实际完结日期")
        
        old_status = task.status.value
        old_progress = task.progress
        
        # 更新状态
        task.status = data.status
        if data.actual_date:
            task.actual_date = data.actual_date
        
        # 状态为 Closed 时自动设置进度为 100
        if data.status == TaskStatus.CLOSED:
            task.progress = 100
        
        # 记录状态变更历史
        await self._create_history(
            task_id=task.id,
            action="status_change",
            changed_by=updated_by,
            old_status=old_status,
            new_status=data.status.value,
            old_progress=old_progress,
            new_progress=task.progress,
            comment=data.comment or f"状态从 {old_status} 变更为 {data.status.value}",
            task=task
        )
        
        await self.session.commit()
        return await self.get_task_by_id(task.id)
    
    async def update_progress(
        self,
        task_id: str,
        data: TaskProgressUpdate,
        updated_by: str = "system"
    ) -> Optional[Task]:
        """
        更新任务进度
        
        Args:
            task_id: 任务 ID
            data: 进度更新数据
            updated_by: 更新人 ID
            
        Returns:
            Optional[Task]: 更新后的任务或 None
        """
        task = await self.get_task_by_id(task_id)
        if not task:
            return None
        
        old_progress = task.progress
        task.progress = data.progress
        
        # 记录进度变更历史
        await self._create_history(
            task_id=task.id,
            action="progress_change",
            changed_by=updated_by,
            old_progress=old_progress,
            new_progress=data.progress,
            comment=data.comment or f"进度从 {old_progress}% 更新为 {data.progress}%",
            task=task
        )
        
        await self.session.commit()
        return await self.get_task_by_id(task.id)
    
    async def delete_task(
        self,
        task_id: str,
        deleted_by: str = "system"
    ) -> bool:
        """
        删除任务
        
        Args:
            task_id: 任务 ID
            deleted_by: 删除人 ID
            
        Returns:
            bool: 是否删除成功
        """
        task = await self.get_task_by_id(task_id)
        if not task:
            return False
        
        # 记录删除历史 (在删除前)
        await self._create_history(
            task_id=task.id,
            action="delete",
            changed_by=deleted_by,
            old_status=task.status.value,
            comment="任务删除",
            task=task
        )
        
        await self.session.delete(task)
        await self.session.commit()
        return True
    
    async def archive_task(
        self,
        task_id: str,
        archived_by: str = "system"
    ) -> Optional[Task]:
        """
        归档任务
        
        Args:
            task_id: 任务 ID
            archived_by: 归档人 ID
            
        Returns:
            Optional[Task]: 归档后的任务或 None
        """
        task = await self.get_task_by_id(task_id)
        if not task:
            return None
        
        old_status = task.status.value
        task.status = TaskStatus.ARCHIVED
        
        await self._create_history(
            task_id=task.id,
            action="archive",
            changed_by=archived_by,
            old_status=old_status,
            new_status=TaskStatus.ARCHIVED.value,
            comment="任务归档",
            task=task
        )
        
        await self.session.commit()
        return await self.get_task_by_id(task.id)
    
    async def _update_device_relations(
        self,
        task_id: str,
        device_ids: List[str],
        created_by: str
    ) -> None:
        """
        更新任务的设备关联
        
        Args:
            task_id: 任务 ID
            device_ids: 新的设备 ID 列表
            created_by: 操作人 ID
        """
        # 删除现有关联
        stmt = select(TaskDeviceRelation).where(
            TaskDeviceRelation.task_id == task_id
        )
        result = await self.session.execute(stmt)
        existing_relations = result.scalars().all()
        
        for relation in existing_relations:
            await self.session.delete(relation)
        
        # 创建新关联
        for device_id in device_ids:
            # 验证设备存在
            device_stmt = select(DeviceModel).where(DeviceModel.id == device_id)
            device_result = await self.session.execute(device_stmt)
            if device_result.scalar_one_or_none():
                relation = TaskDeviceRelation(
                    task_id=task_id,
                    device_id=device_id,
                    created_by=created_by
                )
                self.session.add(relation)
    
    async def _create_history(
        self,
        task_id: str,
        action: str,
        changed_by: str,
        old_status: Optional[str] = None,
        new_status: Optional[str] = None,
        old_progress: Optional[int] = None,
        new_progress: Optional[int] = None,
        comment: Optional[str] = None,
        task: Optional[Task] = None,
        old_snapshot: Optional[str] = None
    ) -> TaskHistory:
        """
        创建任务历史记录
        
        Args:
            task_id: 任务 ID
            action: 操作类型
            changed_by: 操作人 ID
            old_status: 变更前状态
            new_status: 变更后状态
            old_progress: 变更前进度
            new_progress: 变更后进度
            comment: 变更说明
            task: 任务实体 (用于生成快照)
            old_snapshot: 变更前快照
            
        Returns:
            TaskHistory: 历史记录实体
        """
        snapshot = old_snapshot or (self._create_snapshot(task) if task else None)
        
        history = TaskHistory(
            task_id=task_id,
            action=action,
            changed_by=changed_by,
            old_status=old_status,
            new_status=new_status,
            old_progress=old_progress,
            new_progress=new_progress,
            comment=comment,
            snapshot=snapshot
        )
        
        self.session.add(history)
        return history
    
    def _create_snapshot(self, task: Task) -> str:
        """
        创建任务快照 (JSON)
        
        Args:
            task: 任务实体
            
        Returns:
            str: JSON 格式的快照
        """
        snapshot_data = {
            "id": task.id,
            "task_id": task.task_id,
            "title": task.title,
            "source": task.source.value if task.source else None,
            "description": task.description,
            "progress": task.progress,
            "status": task.status.value if task.status else None,
            "priority": task.priority,
            "assignee_id": task.assignee_id,
            "tracker_id": task.tracker_id,
            "target_date": task.target_date.isoformat() if task.target_date else None,
            "actual_date": task.actual_date.isoformat() if task.actual_date else None,
            "created_at": task.created_at.isoformat() if task.created_at else None,
            "updated_at": task.updated_at.isoformat() if task.updated_at else None,
        }
        return json.dumps(snapshot_data, ensure_ascii=False)

    async def update_device_status(
        self,
        task_id: str,
        device_id: str,
        status: "DeviceTaskStatus",
        updated_by: str = "system"
    ) -> Optional[Task]:
        """
        更新单个设备的完成状态
        
        Args:
            task_id: 任务 ID
            device_id: 设备 ID
            status: 新状态
            updated_by: 更新人 ID
            
        Returns:
            Optional[Task]: 更新后的任务或 None
        """
        from app.models.task_device import DeviceTaskStatus
        
        # 查找关联关系
        stmt = select(TaskDeviceRelation).where(
            TaskDeviceRelation.task_id == task_id,
            TaskDeviceRelation.device_id == device_id
        )
        result = await self.session.execute(stmt)
        relation = result.scalar_one_or_none()
        
        if not relation:
            return None
        
        old_status = relation.status.value
        relation.status = status
        
        # 如果状态为已完成，记录完成时间
        if status == DeviceTaskStatus.COMPLETED:
            relation.completed_at = datetime.now()
        else:
            relation.completed_at = None
        
        # 记录历史
        task = await self.get_task_by_id(task_id)
        if task:
            await self._create_history(
                task_id=task.id,
                action="device_status_change",
                changed_by=updated_by,
                comment=f"设备状态从 {old_status} 变更为 {status.value}",
                task=task
            )
        
        await self.session.commit()
        return await self.get_task_by_id(task_id)

    async def batch_update_device_status(
        self,
        task_id: str,
        device_ids: List[str],
        status: "DeviceTaskStatus",
        updated_by: str = "system"
    ) -> Optional[Task]:
        """
        批量更新设备的完成状态
        
        Args:
            task_id: 任务 ID
            device_ids: 设备 ID 列表
            status: 新状态
            updated_by: 更新人 ID
            
        Returns:
            Optional[Task]: 更新后的任务或 None
        """
        from app.models.task_device import DeviceTaskStatus
        
        task = await self.get_task_by_id(task_id)
        if not task:
            return None
        
        updated_count = 0
        for device_id in device_ids:
            stmt = select(TaskDeviceRelation).where(
                TaskDeviceRelation.task_id == task_id,
                TaskDeviceRelation.device_id == device_id
            )
            result = await self.session.execute(stmt)
            relation = result.scalar_one_or_none()
            
            if relation:
                relation.status = status
                if status == DeviceTaskStatus.COMPLETED:
                    relation.completed_at = datetime.now()
                else:
                    relation.completed_at = None
                updated_count += 1
        
        if updated_count > 0:
            await self._create_history(
                task_id=task.id,
                action="device_batch_status_change",
                changed_by=updated_by,
                comment=f"批量更新 {updated_count} 个设备状态为 {status.value}",
                task=task
            )
        
        await self.session.commit()
        return await self.get_task_by_id(task_id)

    async def get_device_relations(self, task_id: str) -> List[TaskDeviceRelation]:
        """
        获取任务的所有设备关联（包含状态信息）
        
        Args:
            task_id: 任务 ID
            
        Returns:
            List[TaskDeviceRelation]: 设备关联列表
        """
        stmt = select(TaskDeviceRelation).where(
            TaskDeviceRelation.task_id == task_id
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def update_device_zentao(
        self,
        task_id: str,
        device_id: str,
        zentao_type: str,
        zentao_id: str,
        zentao_title: Optional[str] = None,
        zentao_url: Optional[str] = None,
        updated_by: str = "system"
    ) -> Optional[Task]:
        """
        更新设备的禅道关联信息
        
        Args:
            task_id: 任务 ID
            device_id: 设备 ID
            zentao_type: 禅道类型 (story/bug)
            zentao_id: 禅道ID
            zentao_title: 禅道标题
            zentao_url: 禅道链接
            updated_by: 更新人 ID
            
        Returns:
            Optional[Task]: 更新后的任务或 None
        """
        from app.models.task_device import ZentaoType
        
        # 查找关联关系
        stmt = select(TaskDeviceRelation).where(
            TaskDeviceRelation.task_id == task_id,
            TaskDeviceRelation.device_id == device_id
        )
        result = await self.session.execute(stmt)
        relation = result.scalar_one_or_none()
        
        if not relation:
            return None
        
        # 验证并设置禅道类型
        try:
            relation.zentao_type = ZentaoType(zentao_type)
        except ValueError:
            relation.zentao_type = None
        
        relation.zentao_id = zentao_id
        relation.zentao_title = zentao_title
        relation.zentao_url = zentao_url
        
        # 记录历史
        task = await self.get_task_by_id(task_id)
        if task:
            await self._create_history(
                task_id=task.id,
                action="zentao_link",
                changed_by=updated_by,
                comment=f"设备关联禅道: {zentao_type} #{zentao_id}",
                task=task
            )
        
        await self.session.commit()
        return await self.get_task_by_id(task_id)

    async def remove_device_zentao(
        self,
        task_id: str,
        device_id: str,
        updated_by: str = "system"
    ) -> Optional[Task]:
        """
        删除设备的禅道关联信息
        
        Args:
            task_id: 任务 ID
            device_id: 设备 ID
            updated_by: 更新人 ID
            
        Returns:
            Optional[Task]: 更新后的任务或 None
        """
        # 查找关联关系
        stmt = select(TaskDeviceRelation).where(
            TaskDeviceRelation.task_id == task_id,
            TaskDeviceRelation.device_id == device_id
        )
        result = await self.session.execute(stmt)
        relation = result.scalar_one_or_none()
        
        if not relation:
            return None
        
        old_zentao_id = relation.zentao_id
        relation.zentao_type = None
        relation.zentao_id = None
        relation.zentao_title = None
        relation.zentao_url = None
        
        # 记录历史
        task = await self.get_task_by_id(task_id)
        if task:
            await self._create_history(
                task_id=task.id,
                action="zentao_unlink",
                changed_by=updated_by,
                comment=f"取消设备禅道关联: #{old_zentao_id}",
                task=task
            )
        
        await self.session.commit()
        return await self.get_task_by_id(task_id)

    async def get_device_assignees(
        self,
        task_id: str,
        device_id: str
    ) -> List:
        """
        获取设备负责人列表
        """
        from app.models.task_device_assignee import TaskDeviceAssignee
        
        stmt = select(TaskDeviceAssignee).where(
            TaskDeviceAssignee.task_id == task_id,
            TaskDeviceAssignee.device_id == device_id
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def add_device_assignee(
        self,
        task_id: str,
        device_id: str,
        user_id: str,
        assigned_by: str = "system"
    ) -> Optional[Task]:
        """
        添加设备负责人
        """
        from app.models.task_device_assignee import TaskDeviceAssignee
        
        # 检查是否已存在
        stmt = select(TaskDeviceAssignee).where(
            TaskDeviceAssignee.task_id == task_id,
            TaskDeviceAssignee.device_id == device_id,
            TaskDeviceAssignee.user_id == user_id
        )
        result = await self.session.execute(stmt)
        if result.scalar_one_or_none():
            return await self.get_task_by_id(task_id)  # 已存在，直接返回
        
        # 添加负责人
        assignee = TaskDeviceAssignee(
            task_id=task_id,
            device_id=device_id,
            user_id=user_id,
            assigned_by=assigned_by
        )
        self.session.add(assignee)
        
        # 记录历史
        task = await self.get_task_by_id(task_id)
        if task:
            await self._create_history(
                task_id=task.id,
                action="assignee_add",
                changed_by=assigned_by,
                comment=f"添加设备负责人",
                task=task
            )
        
        await self.session.commit()
        return await self.get_task_by_id(task_id)

    async def remove_device_assignee(
        self,
        task_id: str,
        device_id: str,
        user_id: str
    ) -> Optional[Task]:
        """
        移除设备负责人
        """
        from app.models.task_device_assignee import TaskDeviceAssignee
        
        stmt = select(TaskDeviceAssignee).where(
            TaskDeviceAssignee.task_id == task_id,
            TaskDeviceAssignee.device_id == device_id,
            TaskDeviceAssignee.user_id == user_id
        )
        result = await self.session.execute(stmt)
        assignee = result.scalar_one_or_none()
        
        if not assignee:
            return await self.get_task_by_id(task_id)
        
        await self.session.delete(assignee)
        await self.session.commit()
        return await self.get_task_by_id(task_id)

