# -*- coding: utf-8 -*-
"""
认证服务

提供用户注册、登录、权限校验等功能。
"""

from datetime import datetime
from typing import List, Optional, Set

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.user import User
from app.models.role import Role
from app.models.permission import Permission
from app.models.user_role import UserRole
from app.models.role_permission import RolePermission


class AuthService:
    """认证服务"""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def get_user_by_email(self, email: str) -> Optional[User]:
        """通过邮箱获取用户"""
        stmt = select(User).where(User.email == email).options(
            selectinload(User.user_roles).selectinload(UserRole.role).selectinload(Role.role_permissions).selectinload(RolePermission.permission)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
    
    async def get_user_by_username(self, username: str) -> Optional[User]:
        """通过用户名获取用户"""
        stmt = select(User).where(User.username == username)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
    
    async def get_user_by_username_with_roles(self, username: str) -> Optional[User]:
        """通过用户名获取用户（包含角色信息）"""
        stmt = select(User).where(User.username == username).options(
            selectinload(User.user_roles).selectinload(UserRole.role).selectinload(Role.role_permissions).selectinload(RolePermission.permission)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
    
    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        """通过ID获取用户"""
        stmt = select(User).where(User.id == user_id).options(
            selectinload(User.user_roles).selectinload(UserRole.role).selectinload(Role.role_permissions).selectinload(RolePermission.permission)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
    
    async def create_user(
        self,
        username: str,
        email: str,
        password: str,
        display_name: Optional[str] = None,
        phone: Optional[str] = None,
        department: Optional[str] = None,
        is_superuser: bool = False
    ) -> User:
        """创建用户"""
        password_hash = get_password_hash(password)
        user = User(
            username=username,
            email=email,
            password_hash=password_hash,
            display_name=display_name or username,
            phone=phone,
            department=department,
            is_superuser=is_superuser
        )
        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)
        
        # 为新用户分配默认角色
        await self._assign_default_role(user.id)
        
        return await self.get_user_by_id(user.id)
    
    async def _assign_default_role(self, user_id: str) -> None:
        """为用户分配默认角色"""
        # 查找默认角色 (user)
        stmt = select(Role).where(Role.code == "user")
        result = await self.session.execute(stmt)
        role = result.scalar_one_or_none()
        
        if role:
            user_role = UserRole(user_id=user_id, role_id=role.id)
            self.session.add(user_role)
            await self.session.commit()
    
    async def authenticate(self, identifier: str, password: str) -> Optional[User]:
        """
        验证用户登录
        
        支持用户名或邮箱登录：
        - 先尝试用邮箱查找用户
        - 如果找不到，再尝试用用户名查找
        
        Args:
            identifier: 用户名或邮箱
            password: 密码
            
        Returns:
            验证成功返回用户对象，失败返回 None
        """
        # 先尝试用邮箱查找
        user = await self.get_user_by_email(identifier)
        
        # 如果邮箱找不到，尝试用用户名查找
        if not user:
            user = await self.get_user_by_username_with_roles(identifier)
        
        if not user:
            return None
        if not verify_password(password, user.password_hash):
            return None
        if not user.is_active:
            return None
        
        # 更新最后登录时间
        user.last_login_at = datetime.utcnow()
        await self.session.commit()
        
        return user
    
    async def create_token(self, user: User) -> str:
        """为用户创建 Token"""
        return create_access_token(data={"sub": user.id})
    
    def get_user_roles(self, user: User) -> List[str]:
        """获取用户角色代码列表"""
        if user.is_superuser:
            return ["superadmin"]
        return [ur.role.code for ur in user.user_roles if ur.role]
    
    def get_user_permissions(self, user: User) -> Set[str]:
        """获取用户权限代码集合"""
        if user.is_superuser:
            return {"*"}  # 超级管理员拥有所有权限
        
        permissions = set()
        for user_role in user.user_roles:
            if user_role.role:
                for rp in user_role.role.role_permissions:
                    if rp.permission:
                        permissions.add(rp.permission.code)
        return permissions
    
    async def change_password(self, user: User, old_password: str, new_password: str) -> bool:
        """修改密码"""
        if not verify_password(old_password, user.password_hash):
            return False
        user.password_hash = get_password_hash(new_password)
        await self.session.commit()
        return True
    
    async def get_all_users(
        self,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        department: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> tuple[List[User], int]:
        """获取用户列表"""
        stmt = select(User).options(
            selectinload(User.user_roles).selectinload(UserRole.role)
        )
        
        if search:
            stmt = stmt.where(
                (User.username.ilike(f"%{search}%")) |
                (User.email.ilike(f"%{search}%")) |
                (User.display_name.ilike(f"%{search}%"))
            )
        if department:
            stmt = stmt.where(User.department == department)
        if is_active is not None:
            stmt = stmt.where(User.is_active == is_active)
        
        # 获取总数
        count_stmt = select(User.id)
        if search:
            count_stmt = count_stmt.where(
                (User.username.ilike(f"%{search}%")) |
                (User.email.ilike(f"%{search}%")) |
                (User.display_name.ilike(f"%{search}%"))
            )
        if department:
            count_stmt = count_stmt.where(User.department == department)
        if is_active is not None:
            count_stmt = count_stmt.where(User.is_active == is_active)
        
        count_result = await self.session.execute(count_stmt)
        total = len(count_result.all())
        
        # 分页
        stmt = stmt.offset((page - 1) * page_size).limit(page_size)
        stmt = stmt.order_by(User.created_at.desc())
        
        result = await self.session.execute(stmt)
        users = list(result.scalars().all())
        
        return users, total
    
    async def update_user(self, user_id: str, **kwargs) -> Optional[User]:
        """更新用户信息"""
        user = await self.get_user_by_id(user_id)
        if not user:
            return None
        
        for key, value in kwargs.items():
            if value is not None and hasattr(user, key):
                setattr(user, key, value)
        
        await self.session.commit()
        return await self.get_user_by_id(user_id)
    
    async def delete_user(self, user_id: str) -> bool:
        """删除用户"""
        user = await self.get_user_by_id(user_id)
        if not user:
            return False
        
        await self.session.delete(user)
        await self.session.commit()
        return True
    
    async def assign_roles(self, user_id: str, role_ids: List[str]) -> Optional[User]:
        """为用户分配角色"""
        user = await self.get_user_by_id(user_id)
        if not user:
            return None
        
        # 删除现有角色
        stmt = select(UserRole).where(UserRole.user_id == user_id)
        result = await self.session.execute(stmt)
        for ur in result.scalars().all():
            await self.session.delete(ur)
        
        # 添加新角色
        for role_id in role_ids:
            user_role = UserRole(user_id=user_id, role_id=role_id)
            self.session.add(user_role)
        
        await self.session.commit()
        return await self.get_user_by_id(user_id)
