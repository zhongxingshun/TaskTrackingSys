# -*- coding: utf-8 -*-
"""
用户管理 API 路由

提供用户 CRUD、角色分配等管理端点。
"""

from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, status, Depends

from app.api.deps import DbSession, CurrentUserModel, require_permission
from app.schemas.auth import (
    UserResponse, UserCreate, UserUpdate, UserListResponse,
    RoleResponse, RoleListResponse, RoleCreate, RoleUpdate, PermissionResponse
)
from app.schemas.base import MessageResponse
from app.services.auth_service import AuthService
from app.services.role_service import RoleService

router = APIRouter()


# ========== 用户管理 ==========

@router.get(
    "",
    response_model=UserListResponse,
    summary="获取用户列表",
    description="获取所有用户（分页）"
)
async def list_users(
    db: DbSession,
    current_user: CurrentUserModel,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    department: Optional[str] = None,
    is_active: Optional[bool] = None,
    # _: None = Depends(require_permission("user:view"))
) -> UserListResponse:
    """获取用户列表"""
    auth_service = AuthService(db)
    users, total = await auth_service.get_all_users(
        page=page,
        page_size=page_size,
        search=search,
        department=department,
        is_active=is_active
    )
    
    items = []
    for user in users:
        items.append(UserResponse(
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
            roles=[ur.role.code for ur in user.user_roles if ur.role],
            permissions=[]  # 列表中不返回详细权限
        ))
    
    return UserListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    summary="获取用户详情",
    description="获取指定用户的详细信息"
)
async def get_user(
    user_id: str,
    db: DbSession,
    current_user: CurrentUserModel
) -> UserResponse:
    """获取用户详情"""
    auth_service = AuthService(db)
    user = await auth_service.get_user_by_id(user_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
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
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建用户",
    description="管理员创建新用户"
)
async def create_user(
    data: UserCreate,
    db: DbSession,
    current_user: CurrentUserModel,
    _: None = Depends(require_permission("user:create"))
) -> UserResponse:
    """创建用户"""
    auth_service = AuthService(db)
    
    # 检查邮箱是否已存在
    if await auth_service.get_user_by_email(data.email):
        raise HTTPException(status_code=400, detail="该邮箱已被注册")
    
    if await auth_service.get_user_by_username(data.username):
        raise HTTPException(status_code=400, detail="该用户名已被使用")
    
    # 创建用户
    user = await auth_service.create_user(
        username=data.username,
        email=data.email,
        password=data.password,
        display_name=data.display_name,
        phone=data.phone,
        department=data.department,
        is_superuser=data.is_superuser
    )
    
    # 分配角色
    if data.role_ids:
        await auth_service.assign_roles(user.id, data.role_ids)
        user = await auth_service.get_user_by_id(user.id)
    
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


@router.put(
    "/{user_id}",
    response_model=UserResponse,
    summary="更新用户",
    description="更新用户信息"
)
async def update_user(
    user_id: str,
    data: UserUpdate,
    db: DbSession,
    current_user: CurrentUserModel,
    _: None = Depends(require_permission("user:edit"))
) -> UserResponse:
    """更新用户"""
    auth_service = AuthService(db)
    
    user = await auth_service.update_user(
        user_id,
        username=data.username,
        email=data.email,
        display_name=data.display_name,
        avatar_url=data.avatar_url,
        phone=data.phone,
        department=data.department,
        is_active=data.is_active,
        is_superuser=data.is_superuser
    )
    
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
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


@router.delete(
    "/{user_id}",
    response_model=MessageResponse,
    summary="删除用户",
    description="删除指定用户"
)
async def delete_user(
    user_id: str,
    db: DbSession,
    current_user: CurrentUserModel,
    _: None = Depends(require_permission("user:delete"))
) -> MessageResponse:
    """删除用户"""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="不能删除自己")
    
    auth_service = AuthService(db)
    success = await auth_service.delete_user(user_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    return MessageResponse(message="用户已删除")


@router.put(
    "/{user_id}/roles",
    response_model=UserResponse,
    summary="分配角色",
    description="为用户分配角色"
)
async def assign_user_roles(
    user_id: str,
    role_ids: List[str],
    db: DbSession,
    current_user: CurrentUserModel,
    _: None = Depends(require_permission("user:assign_role"))
) -> UserResponse:
    """分配角色"""
    auth_service = AuthService(db)
    user = await auth_service.assign_roles(user_id, role_ids)
    
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
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


# ========== 角色管理 ==========

@router.get(
    "/roles/list",
    response_model=RoleListResponse,
    summary="获取角色列表",
    description="获取所有角色"
)
async def list_roles(
    db: DbSession,
    current_user: CurrentUserModel
) -> RoleListResponse:
    """获取角色列表"""
    role_service = RoleService(db)
    roles = await role_service.get_all_roles()
    
    items = []
    for role in roles:
        items.append(RoleResponse(
            id=role.id,
            name=role.name,
            code=role.code,
            description=role.description,
            is_system=role.is_system,
            created_at=role.created_at,
            permissions=role_service.get_role_permissions(role)
        ))
    
    return RoleListResponse(items=items, total=len(items))


@router.post(
    "/roles",
    response_model=RoleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建角色",
    description="创建新角色"
)
async def create_role(
    data: RoleCreate,
    db: DbSession,
    current_user: CurrentUserModel
) -> RoleResponse:
    """创建角色（仅限超级管理员）"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="只有超级管理员可以创建角色")
    """创建角色"""
    role_service = RoleService(db)
    
    if await role_service.get_role_by_code(data.code):
        raise HTTPException(status_code=400, detail="角色代码已存在")
    
    role = await role_service.create_role(
        name=data.name,
        code=data.code,
        description=data.description,
        permission_codes=data.permission_codes
    )
    
    return RoleResponse(
        id=role.id,
        name=role.name,
        code=role.code,
        description=role.description,
        is_system=role.is_system,
        created_at=role.created_at,
        permissions=role_service.get_role_permissions(role)
    )


@router.put(
    "/roles/{role_id}",
    response_model=RoleResponse,
    summary="更新角色",
    description="更新角色信息和权限"
)
async def update_role(
    role_id: str,
    data: RoleUpdate,
    db: DbSession,
    current_user: CurrentUserModel
) -> RoleResponse:
    """更新角色（仅限超级管理员）"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="只有超级管理员可以修改角色权限")
    role_service = RoleService(db)
    
    role = await role_service.update_role(
        role_id,
        name=data.name,
        description=data.description,
        permission_codes=data.permission_codes
    )
    
    if not role:
        raise HTTPException(status_code=404, detail="角色不存在")
    
    return RoleResponse(
        id=role.id,
        name=role.name,
        code=role.code,
        description=role.description,
        is_system=role.is_system,
        created_at=role.created_at,
        permissions=role_service.get_role_permissions(role)
    )


@router.delete(
    "/roles/{role_id}",
    response_model=MessageResponse,
    summary="删除角色",
    description="删除角色（系统角色不可删除）"
)
async def delete_role(
    role_id: str,
    db: DbSession,
    current_user: CurrentUserModel
) -> MessageResponse:
    """删除角色（仅限超级管理员）"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="只有超级管理员可以删除角色")
    role_service = RoleService(db)
    success = await role_service.delete_role(role_id)
    
    if not success:
        raise HTTPException(status_code=400, detail="角色不存在或为系统角色不可删除")
    
    return MessageResponse(message="角色已删除")


@router.get(
    "/permissions/list",
    response_model=List[PermissionResponse],
    summary="获取权限列表",
    description="获取所有可用权限"
)
async def list_permissions(
    db: DbSession,
    current_user: CurrentUserModel
) -> List[PermissionResponse]:
    """获取权限列表"""
    role_service = RoleService(db)
    permissions = await role_service.get_all_permissions()
    
    return [
        PermissionResponse(
            id=p.id,
            name=p.name,
            code=p.code,
            category=p.category,
            description=p.description
        )
        for p in permissions
    ]
