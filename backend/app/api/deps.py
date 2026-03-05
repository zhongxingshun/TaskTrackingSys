# -*- coding: utf-8 -*-
"""
API 依赖注入

提供通用的依赖项，如数据库会话、当前用户、权限校验等。
"""

from typing import Annotated, AsyncGenerator, Optional, Set

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import AsyncSessionLocal
from app.models.user import User
from app.core.security import decode_access_token
from app.services.auth_service import AuthService


# OAuth2 配置
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    获取数据库会话
    
    用于 FastAPI 依赖注入。
    
    Yields:
        AsyncSession: 数据库会话
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


async def get_current_user_optional(
    token: Annotated[Optional[str], Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
    x_user_id: Annotated[str, Header()] = "system"
) -> Optional[User]:
    """
    获取当前用户（可选）
    
    支持 JWT Token 和 X-User-Id 头两种方式。
    """
    # 优先使用 JWT Token
    if token:
        payload = decode_access_token(token)
        if payload and "sub" in payload:
            auth_service = AuthService(db)
            user = await auth_service.get_user_by_id(payload["sub"])
            if user and user.is_active:
                return user
    
    # 兼容旧的 X-User-Id 头方式（开发环境）
    if x_user_id and x_user_id != "system":
        auth_service = AuthService(db)
        user = await auth_service.get_user_by_id(x_user_id)
        if user:
            return user
    
    return None


async def get_current_user(
    user: Annotated[Optional[User], Depends(get_current_user_optional)]
) -> User:
    """
    获取当前用户（必须登录）
    """
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="未登录或登录已过期",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def get_current_user_id(
    user: Annotated[Optional[User], Depends(get_current_user_optional)],
    x_user_id: Annotated[str, Header()] = "system"
) -> str:
    """
    获取当前用户 ID
    
    兼容已有代码，返回用户ID字符串。
    """
    if user:
        return user.id
    return x_user_id


def require_permission(permission_code: str):
    """
    权限校验装饰器
    
    用法:
        @router.delete("/{task_id}")
        async def delete_task(
            task_id: str,
            _: None = Depends(require_permission("task:delete"))
        ):
            ...
    """
    async def permission_checker(
        user: Annotated[User, Depends(get_current_user)],
        db: Annotated[AsyncSession, Depends(get_db)]
    ) -> None:
        auth_service = AuthService(db)
        permissions = auth_service.get_user_permissions(user)
        
        # 超级管理员拥有所有权限
        if "*" in permissions:
            return None
        
        if permission_code not in permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"权限不足：需要 {permission_code} 权限"
            )
        return None
    
    return permission_checker


# 类型别名，简化依赖注入声明
DbSession = Annotated[AsyncSession, Depends(get_db)]
CurrentUser = Annotated[str, Depends(get_current_user_id)]
CurrentUserModel = Annotated[User, Depends(get_current_user)]
CurrentUserOptional = Annotated[Optional[User], Depends(get_current_user_optional)]
