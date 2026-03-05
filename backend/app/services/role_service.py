# -*- coding: utf-8 -*-
"""
角色服务

提供角色和权限管理功能。
"""

from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.role import Role
from app.models.permission import Permission
from app.models.role_permission import RolePermission


class RoleService:
    """角色服务"""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def get_all_roles(self) -> List[Role]:
        """获取所有角色"""
        stmt = select(Role).options(
            selectinload(Role.role_permissions).selectinload(RolePermission.permission)
        ).order_by(Role.created_at)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
    
    async def get_role_by_id(self, role_id: str) -> Optional[Role]:
        """通过ID获取角色"""
        stmt = select(Role).where(Role.id == role_id).options(
            selectinload(Role.role_permissions).selectinload(RolePermission.permission)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
    
    async def get_role_by_code(self, code: str) -> Optional[Role]:
        """通过代码获取角色"""
        stmt = select(Role).where(Role.code == code)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
    
    async def create_role(
        self,
        name: str,
        code: str,
        description: Optional[str] = None,
        permission_codes: Optional[List[str]] = None
    ) -> Role:
        """创建角色"""
        role = Role(
            name=name,
            code=code,
            description=description or ""
        )
        self.session.add(role)
        await self.session.commit()
        await self.session.refresh(role)
        
        # 分配权限
        if permission_codes:
            await self.assign_permissions(role.id, permission_codes)
        
        return await self.get_role_by_id(role.id)
    
    async def update_role(
        self,
        role_id: str,
        name: Optional[str] = None,
        description: Optional[str] = None,
        permission_codes: Optional[List[str]] = None
    ) -> Optional[Role]:
        """更新角色"""
        role = await self.get_role_by_id(role_id)
        if not role:
            return None
        
        if name:
            role.name = name
        if description is not None:
            role.description = description
        
        await self.session.commit()
        
        # 更新权限
        if permission_codes is not None:
            await self.assign_permissions(role_id, permission_codes)
        
        return await self.get_role_by_id(role_id)
    
    async def delete_role(self, role_id: str) -> bool:
        """删除角色"""
        role = await self.get_role_by_id(role_id)
        if not role:
            return False
        if role.is_system:
            return False  # 系统角色不可删除
        
        await self.session.delete(role)
        await self.session.commit()
        return True
    
    async def assign_permissions(self, role_id: str, permission_codes: List[str]) -> None:
        """为角色分配权限"""
        # 删除现有权限
        stmt = select(RolePermission).where(RolePermission.role_id == role_id)
        result = await self.session.execute(stmt)
        for rp in result.scalars().all():
            await self.session.delete(rp)
        
        # 添加新权限
        for code in permission_codes:
            permission = await self.get_permission_by_code(code)
            if permission:
                rp = RolePermission(role_id=role_id, permission_id=permission.id)
                self.session.add(rp)
        
        await self.session.commit()
    
    async def get_all_permissions(self) -> List[Permission]:
        """获取所有权限"""
        stmt = select(Permission).order_by(Permission.category, Permission.code)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
    
    async def get_permission_by_code(self, code: str) -> Optional[Permission]:
        """通过代码获取权限"""
        stmt = select(Permission).where(Permission.code == code)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
    
    def get_role_permissions(self, role: Role) -> List[str]:
        """获取角色的权限代码列表"""
        return [rp.permission.code for rp in role.role_permissions if rp.permission]
