# -*- coding: utf-8 -*-
"""
认证 API 路由

提供用户注册、登录、个人信息等端点。
"""

from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import DbSession, CurrentUserModel, CurrentUserOptional, require_permission, Depends
from app.schemas.auth import (
    UserRegister, UserLogin, Token, UserResponse, UserCreate, UserUpdate,
    PasswordChange, UserListResponse, RoleResponse, RoleListResponse,
    RoleCreate, RoleUpdate, PermissionResponse
)
from app.schemas.base import MessageResponse
from app.services.auth_service import AuthService
from app.services.role_service import RoleService

router = APIRouter()


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="用户注册",
    description="注册新用户账号"
)
async def register(
    data: UserRegister,
    db: DbSession
) -> UserResponse:
    """用户注册"""
    auth_service = AuthService(db)
    
    # 检查邮箱是否已存在
    if await auth_service.get_user_by_email(data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该邮箱已被注册"
        )
    
    # 检查用户名是否已存在
    if await auth_service.get_user_by_username(data.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该用户名已被使用"
        )
    
    # 创建用户
    user = await auth_service.create_user(
        username=data.username,
        email=data.email,
        password=data.password,
        display_name=data.display_name,
        phone=data.phone,
        department=data.department
    )
    
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        phone=user.phone,
        department=user.department,
        is_active=user.is_active,
        is_superuser=user.is_superuser,
        created_at=user.created_at,
        last_login_at=user.last_login_at,
        roles=auth_service.get_user_roles(user),
        permissions=list(auth_service.get_user_permissions(user))
    )


@router.post(
    "/login",
    response_model=Token,
    summary="用户登录",
    description="使用邮箱和密码登录"
)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: DbSession = None
) -> Token:
    """用户登录（OAuth2 兼容）"""
    auth_service = AuthService(db)
    
    # 验证用户
    user = await auth_service.authenticate(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="邮箱或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 生成 Token
    access_token = await auth_service.create_token(user)
    
    return Token(access_token=access_token)


@router.post(
    "/login/json",
    response_model=Token,
    summary="用户登录（JSON）",
    description="使用 JSON 格式的邮箱和密码登录"
)
async def login_json(
    data: UserLogin,
    db: DbSession
) -> Token:
    """用户登录（JSON 格式）"""
    auth_service = AuthService(db)
    
    # 验证用户
    user = await auth_service.authenticate(data.email, data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="邮箱或密码错误"
        )
    
    # 生成 Token
    access_token = await auth_service.create_token(user)
    
    return Token(access_token=access_token)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="获取当前用户信息",
    description="获取当前登录用户的详细信息"
)
async def get_me(
    current_user: CurrentUserModel,
    db: DbSession
) -> UserResponse:
    """获取当前用户信息"""
    auth_service = AuthService(db)
    
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        display_name=current_user.display_name,
        avatar_url=current_user.avatar_url,
        phone=current_user.phone,
        department=current_user.department,
        is_active=current_user.is_active,
        is_superuser=current_user.is_superuser,
        created_at=current_user.created_at,
        last_login_at=current_user.last_login_at,
        roles=auth_service.get_user_roles(current_user),
        permissions=list(auth_service.get_user_permissions(current_user))
    )


@router.post(
    "/change-password",
    response_model=MessageResponse,
    summary="修改密码",
    description="修改当前用户的密码"
)
async def change_password(
    data: PasswordChange,
    current_user: CurrentUserModel,
    db: DbSession
) -> MessageResponse:
    """修改密码"""
    auth_service = AuthService(db)
    
    success = await auth_service.change_password(
        current_user, data.old_password, data.new_password
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="原密码错误"
        )
    
    return MessageResponse(message="密码修改成功")
