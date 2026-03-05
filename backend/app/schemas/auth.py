# -*- coding: utf-8 -*-
"""
认证相关 Schema

定义用户注册、登录、Token 等请求/响应数据模型。
"""

from datetime import datetime
from typing import List, Optional

from pydantic import Field, EmailStr, field_validator

from app.schemas.base import BaseSchema


class UserRegister(BaseSchema):
    """用户注册请求"""
    username: str = Field(..., min_length=3, max_length=50, description="用户名")
    email: EmailStr = Field(..., description="邮箱")
    password: str = Field(..., min_length=8, max_length=100, description="密码")
    display_name: Optional[str] = Field(None, max_length=100, description="显示名称")
    phone: Optional[str] = Field(None, max_length=20, description="手机号")
    department: Optional[str] = Field(None, max_length=100, description="部门")
    
    @field_validator('username')
    @classmethod
    def username_alphanumeric(cls, v: str) -> str:
        if not v.replace('_', '').replace('-', '').replace('.', '').isalnum():
            raise ValueError('用户名只能包含字母、数字、下划线、连字符和点号')
        return v


class UserLogin(BaseSchema):
    """用户登录请求"""
    email: EmailStr = Field(..., description="邮箱")
    password: str = Field(..., description="密码")


class Token(BaseSchema):
    """Token 响应"""
    access_token: str = Field(..., description="Access Token")
    token_type: str = Field(default="bearer", description="Token 类型")


class TokenPayload(BaseSchema):
    """Token 载荷"""
    sub: str = Field(..., description="用户ID")
    exp: Optional[datetime] = None


class UserResponse(BaseSchema):
    """用户信息响应"""
    id: str
    username: str
    email: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    is_active: bool
    is_superuser: bool
    created_at: datetime
    last_login_at: Optional[datetime] = None
    roles: List[str] = Field(default_factory=list, description="角色代码列表")
    permissions: List[str] = Field(default_factory=list, description="权限代码列表")


class UserCreate(BaseSchema):
    """管理员创建用户请求"""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    display_name: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    is_active: bool = True
    is_superuser: bool = False
    role_ids: List[str] = Field(default_factory=list, description="角色ID列表")


class UserUpdate(BaseSchema):
    """更新用户请求"""
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None


class PasswordChange(BaseSchema):
    """修改密码请求"""
    old_password: str = Field(..., description="旧密码")
    new_password: str = Field(..., min_length=8, max_length=100, description="新密码")


class RoleResponse(BaseSchema):
    """角色响应"""
    id: str
    name: str
    code: str
    description: Optional[str] = None
    is_system: bool
    created_at: datetime
    permissions: List[str] = Field(default_factory=list, description="权限代码列表")


class RoleCreate(BaseSchema):
    """创建角色请求"""
    name: str = Field(..., min_length=2, max_length=50)
    code: str = Field(..., min_length=2, max_length=50)
    description: Optional[str] = None
    permission_codes: List[str] = Field(default_factory=list, description="权限代码列表")


class RoleUpdate(BaseSchema):
    """更新角色请求"""
    name: Optional[str] = None
    description: Optional[str] = None
    permission_codes: Optional[List[str]] = None


class PermissionResponse(BaseSchema):
    """权限响应"""
    id: str
    name: str
    code: str
    category: str
    description: Optional[str] = None


class UserListResponse(BaseSchema):
    """用户列表响应"""
    items: List[UserResponse]
    total: int
    page: int = 1
    page_size: int = 20


class RoleListResponse(BaseSchema):
    """角色列表响应"""
    items: List[RoleResponse]
    total: int
